import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { AirQualitySnapshot } from '../shared/schemas/aqi.schema';
import type { CommunityChecklist } from '../shared/schemas/community.schema';
import type { PersonalizedDailyPlan } from '../shared/schemas/plan.schema';
import type { HouseholdProfile, Language } from '../shared/schemas/profile.schema';

const app = initializeApp(firebaseConfig);
export const db = getFirestoreWithDatabase(app);
export const auth = getAuth(app);

function getFirestoreWithDatabase(firebaseApp: ReturnType<typeof initializeApp>) {
  // Lazy-imported style helper kept synchronous via top-level import below
  return getFirestoreInstance(firebaseApp);
}

import { getFirestore } from 'firebase/firestore';
function getFirestoreInstance(firebaseApp: ReturnType<typeof initializeApp>) {
  return getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Throws structured FirestoreErrorInfo JSON for observability and ErrorBoundary capture.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export interface SavedPlanRecord {
  id: string;
  locationLabel: string;
  aqi: number;
  category: AirQualitySnapshot['category'];
  personalizationSummary: string;
  planData: PersonalizedDailyPlan;
}

const SAFE_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

function createSafeId(prefix: string): string {
  const raw = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return SAFE_ID_RE.test(raw) ? raw : `${prefix}-${Date.now()}`;
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signInAsGuest(): Promise<User> {
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

async function ensureUserAccountDoc(user: User, preferredLanguage: Language): Promise<void> {
  const userPath = `users/${user.uid}`;
  const fallbackName = user.isAnonymous ? 'Guest Family' : 'CleanBreath Member';
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        displayName: (user.displayName || fallbackName).slice(0, 80),
        preferredLanguage,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

/**
 * Saves the household profile and daily plan to Firestore for an authenticated user.
 */
export async function savePlanToCloud(
  user: User,
  profile: HouseholdProfile,
  aqi: AirQualitySnapshot,
  plan: PersonalizedDailyPlan,
): Promise<string> {
  await ensureUserAccountDoc(user, profile.language);

  const profileId = 'primary';
  const profileRef = doc(db, 'users', user.uid, 'profiles', profileId);
  const profilePath = `users/${user.uid}/profiles/${profileId}`;
  const mutableProfileFields = {
    city: profile.location.city.slice(0, 80),
    locality: profile.location.locality.slice(0, 100),
    commuteMode: profile.commuteMode,
    homeType: profile.homeType,
    ownsAirPurifier: profile.ownsAirPurifier,
    budgetLevel: profile.budgetLevel,
    language: profile.language,
    household: profile.household,
    updatedAt: serverTimestamp(),
  };

  try {
    const existingProfile = await getDoc(profileRef);
    if (existingProfile.exists()) {
      await updateDoc(profileRef, mutableProfileFields);
    } else {
      await setDoc(profileRef, {
        ownerUid: user.uid,
        ...mutableProfileFields,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, profilePath);
  }

  const planId = createSafeId('plan');
  const planPath = `users/${user.uid}/plans/${planId}`;
  try {
    await setDoc(doc(db, 'users', user.uid, 'plans', planId), {
      ownerUid: user.uid,
      locationLabel: aqi.locationLabel.slice(0, 140),
      aqi: aqi.aqi,
      category: aqi.category,
      personalizationSummary: plan.personalizationSummary.slice(0, 400),
      planData: plan,
      createdAt: serverTimestamp(),
    });
    return planId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, planPath);
  }
}

/**
 * Lists up to 10 recent saved plans belonging strictly to the signed-in user.
 */
export async function listUserSavedPlans(user: User): Promise<SavedPlanRecord[]> {
  const path = `users/${user.uid}/plans`;
  try {
    const q = query(
      collection(db, 'users', user.uid, 'plans'),
      where('ownerUid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(10),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as {
        locationLabel: string;
        aqi: number;
        category: AirQualitySnapshot['category'];
        personalizationSummary: string;
        planData: PersonalizedDailyPlan;
      };
      return {
        id: d.id,
        locationLabel: data.locationLabel,
        aqi: data.aqi,
        category: data.category,
        personalizationSummary: data.personalizationSummary,
        planData: data.planData,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Deletes a saved plan owned by the user.
 */
export async function deleteUserSavedPlan(user: User, planId: string): Promise<void> {
  if (!SAFE_ID_RE.test(planId)) {
    throw new Error('Invalid plan identifier');
  }
  const path = `users/${user.uid}/plans/${planId}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'plans', planId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Publishes a shareable community checklist document to Firestore.
 */
export async function saveCommunityChecklistToCloud(
  user: User,
  checklist: CommunityChecklist,
  isPublic = true,
): Promise<string> {
  const checklistId = createSafeId('chk');
  const path = `community_checklists/${checklistId}`;
  try {
    await setDoc(doc(db, 'community_checklists', checklistId), {
      ownerUid: user.uid,
      isPublic,
      settingType: checklist.settingType,
      locality: checklist.locality.slice(0, 120),
      aqi: checklist.aqi,
      shareableText: checklist.shareableText.slice(0, 4000),
      items: checklist.items.slice(0, 12),
      createdAt: serverTimestamp(),
    });
    return checklistId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
