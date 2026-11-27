import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import type { AirQualitySnapshot } from '../shared/schemas/aqi.schema';
import type { CommunityChecklist, CommunitySetting } from '../shared/schemas/community.schema';
import type { PersonalizedDailyPlan } from '../shared/schemas/plan.schema';
import type { HouseholdProfile } from '../shared/schemas/profile.schema';
import { fetchCommunityChecklist, fetchDailyPlan, fetchLiveAqi } from '../services/apiClient';
import {
  deleteUserSavedPlan,
  listUserSavedPlans,
  saveCommunityChecklistToCloud,
  savePlanToCloud,
  signInAsGuest,
  signInWithGoogle,
  signOutUser,
  subscribeToAuth,
  type SavedPlanRecord,
} from '../services/firebase';

const PROFILE_STORAGE_KEY = 'cleanbreath_profile_v1';

export const DEFAULT_PROFILE: HouseholdProfile = {
  location: {
    city: 'New Delhi',
    locality: 'Rohini Sector 13',
  },
  household: {
    householdSize: 4,
    hasChildren: true,
    hasElderly: true,
    hasRespiratorySensitivity: false,
    hasPets: false,
  },
  commuteMode: 'public_transit',
  homeType: 'apartment_high_rise',
  ownsAirPurifier: false,
  budgetLevel: 'low',
  language: 'en',
};

function loadSavedProfile(): HouseholdProfile {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<HouseholdProfile>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function useCleanBreath() {
  const [profile, setProfile] = useState<HouseholdProfile>(loadSavedProfile);
  const [aqi, setAqi] = useState<AirQualitySnapshot | null>(null);
  const [plan, setPlan] = useState<PersonalizedDailyPlan | null>(null);
  const [checklist, setChecklist] = useState<CommunityChecklist | null>(null);
  const [communitySetting, setCommunitySetting] = useState<CommunitySetting>('apartment_society');
  const [loading, setLoading] = useState<boolean>(false);
  const [checklistLoading, setChecklistLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedPlanRecord[]>([]);
  const [cloudStatus, setCloudStatus] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage quota errors
    }
  }, [profile]);

  useEffect(() => {
    const unsub = subscribeToAuth(async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          const items = await listUserSavedPlans(nextUser);
          setSavedPlans(items);
        } catch {
          // Non-fatal if rules/index not ready
        }
      } else {
        setSavedPlans([]);
      }
    });
    return unsub;
  }, []);

  const refreshAqiAndPlan = useCallback(
    async (targetProfile: HouseholdProfile, setting: CommunitySetting = communitySetting) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const liveAqi = await fetchLiveAqi(
          {
            city: targetProfile.location.city,
            locality: targetProfile.location.locality,
            lat: targetProfile.location.lat,
            lng: targetProfile.location.lng,
            lang: targetProfile.language,
          },
          controller.signal,
        );
        setAqi(liveAqi);

        const [dailyPlan, commChecklist] = await Promise.all([
          fetchDailyPlan({ profile: targetProfile, aqi: liveAqi }, controller.signal),
          fetchCommunityChecklist(
            {
              settingType: setting,
              locality: `${targetProfile.location.locality}, ${targetProfile.location.city}`,
              aqi: liveAqi.aqi,
              category: liveAqi.category,
              language: targetProfile.language,
            },
            controller.signal,
          ),
        ]);

        setPlan(dailyPlan);
        setChecklist(commChecklist);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Unable to refresh air quality plan.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [communitySetting],
  );

  // Initial load with a slight debounce
  useEffect(() => {
    debounceTimerRef.current = window.setTimeout(() => {
      void refreshAqiAndPlan(profile, communitySetting);
    }, 150);

    return () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      abortRef.current?.abort();
    };
    // Run once on mount; subsequent updates are triggered explicitly or via language toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchCommunitySetting = useCallback(
    async (nextSetting: CommunitySetting) => {
      setCommunitySetting(nextSetting);
      if (!aqi) return;
      setChecklistLoading(true);
      try {
        const nextChecklist = await fetchCommunityChecklist({
          settingType: nextSetting,
          locality: `${profile.location.locality}, ${profile.location.city}`,
          aqi: aqi.aqi,
          category: aqi.category,
          language: profile.language,
        });
        setChecklist(nextChecklist);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load community checklist.');
      } finally {
        setChecklistLoading(false);
      }
    },
    [aqi, profile.language, profile.location.city, profile.location.locality],
  );

  const toggleLanguage = useCallback(() => {
    setProfile((prev) => {
      const nextLang = prev.language === 'en' ? 'hi' : 'en';
      const updated = { ...prev, language: nextLang } as HouseholdProfile;
      void refreshAqiAndPlan(updated, communitySetting);
      return updated;
    });
  }, [communitySetting, refreshAqiAndPlan]);

  const handleSignIn = useCallback(async () => {
    setCloudStatus(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setCloudStatus(err instanceof Error ? err.message : 'Sign-in cancelled.');
    }
  }, []);

  const handleSignInAnonymously = useCallback(async () => {
    setCloudStatus(null);
    try {
      await signInAsGuest();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Guest sign-in unavailable.';
      if (msg.includes('operation-not-allowed') || msg.includes('admin-restricted-operation')) {
        setCloudStatus(
          'Anonymous sign-in is disabled in Firebase Console. Enable Authentication > Sign-in method > Anonymous, or sign in with Google.',
        );
      } else {
        setCloudStatus(msg);
      }
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOutUser();
    setCloudStatus(null);
  }, []);

  const handleSavePlan = useCallback(async () => {
    if (!user || !aqi || !plan) return;
    setCloudStatus('Saving...');
    try {
      await savePlanToCloud(user, profile, aqi, plan);
      const updated = await listUserSavedPlans(user);
      setSavedPlans(updated);
      setCloudStatus('saved');
    } catch (err) {
      setCloudStatus(err instanceof Error ? err.message : 'Could not save plan.');
    }
  }, [aqi, plan, profile, user]);

  const handleDeletePlan = useCallback(
    async (planId: string) => {
      if (!user) return;
      await deleteUserSavedPlan(user, planId);
      setSavedPlans((prev) => prev.filter((p) => p.id !== planId));
    },
    [user],
  );

  const handlePublishChecklist = useCallback(async () => {
    if (!user || !checklist) return null;
    return saveCommunityChecklistToCloud(user, checklist, true);
  }, [checklist, user]);

  return {
    profile,
    setProfile,
    aqi,
    plan,
    checklist,
    communitySetting,
    loading,
    checklistLoading,
    error,
    user,
    savedPlans,
    cloudStatus,
    refreshAqiAndPlan,
    switchCommunitySetting,
    toggleLanguage,
    handleSignIn,
    handleSignInAnonymously,
    handleSignOut,
    handleSavePlan,
    handleDeletePlan,
    handlePublishChecklist,
  };
}
