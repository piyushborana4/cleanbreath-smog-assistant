import type { Language } from '../shared/schemas/profile.schema';

export interface Translations {
  skipToContent: string;
  brandName: string;
  tabToday: string;
  tabHacks: string;
  tabAsk: string;
  tabCommunity: string;
  tabSettings: string;
  disclaimerBar: string;
  onboardingSkip: string;
  onboardingStep1Title: string;
  onboardingStep1Sub: string;
  onboardingStep2Title: string;
  onboardingStep2Sub: string;
  onboardingStep3Title: string;
  onboardingStep3Sub: string;
  useGps: string;
  locating: string;
  cityLabel: string;
  localityLabel: string;
  householdSizeLabel: string;
  nextHousehold: string;
  nextLifestyle: string;
  seeTodayPlan: string;
  back: string;
  outdoorAqiLabel: string;
  keyPollutants: string;
  forecast24h: string;
  todayPlanTitle: string;
  sustainableTitle: string;
  indoorHacksTitle: string;
  indoorHacksSub: string;
  askTitle: string;
  askPlaceholder: string;
  communityTitle: string;
  communitySub: string;
  societyOption: string;
  schoolOption: string;
  shareBtn: string;
  copiedNotice: string;
  settingsTitle: string;
  settingsSub: string;
  languageHeading: string;
  displayHeading: string;
  textSizeLabel: string;
  reduceMotionTitle: string;
  reduceMotionSub: string;
  privacyHeading: string;
  privacyBody: string;
  clearDataBtn: string;
  clearedNotice: string;
  signInGoogle: string;
  signInGuest: string;
  guestSessionLabel: string;
  switchGoogle: string;
  signOut: string;
  savePlanCloud: string;
  savedSuccess: string;
  whyLabel: string;
  effectLabel: string;
  confidenceLabel: string;
  escalationTitle: string;
  escalationBody: string;
  offlineBanner: string;
}

const EN: Translations = {
  skipToContent: 'Skip to main content',
  brandName: 'CleanBreath',
  tabToday: 'Today',
  tabHacks: 'Hacks',
  tabAsk: 'Ask',
  tabCommunity: 'Community',
  tabSettings: 'Settings',
  disclaimerBar:
    'General air-quality guidance only—not medical advice. Consult a doctor for breathing symptoms.',
  onboardingSkip: 'Skip',
  onboardingStep1Title: 'Where does your family live?',
  onboardingStep1Sub:
    'We use your neighbourhood station to give calm, hourly smog timing—your location stays under your control.',
  onboardingStep2Title: 'Who is in your household?',
  onboardingStep2Sub:
    'Select all that apply so we adjust safe outdoor thresholds and indoor alerts.',
  onboardingStep3Title: 'Your daily routine & home',
  onboardingStep3Sub: 'We match recommendations to what you already have and your budget.',
  useGps: 'Use current location',
  locating: 'Detecting location…',
  cityLabel: 'City',
  localityLabel: 'Locality / Sector',
  householdSizeLabel: 'Household size',
  nextHousehold: 'Next: Household',
  nextLifestyle: 'Next: Lifestyle',
  seeTodayPlan: 'See today’s air plan',
  back: 'Back',
  outdoorAqiLabel: 'Outdoor Air Quality',
  keyPollutants: 'Key pollutants',
  forecast24h: 'Upcoming hourly forecast',
  todayPlanTitle: 'Today’s family plan',
  sustainableTitle: 'Low-emission sustainable alternatives',
  indoorHacksTitle: 'Indoor air hacks',
  indoorHacksSub: 'Practical ways to cut indoor PM2.5, sorted by budget.',
  askTitle: 'Ask CleanBreath',
  askPlaceholder: 'Ask about masks, windows, or kids…',
  communityTitle: 'Community checklist',
  communitySub: 'Neighbourhood, RWA, and school actions to cut local winter smoke together.',
  societyOption: 'Apartment Society / RWA',
  schoolOption: 'School Campus',
  shareBtn: 'Share',
  copiedNotice: 'Checklist summary copied—ready to paste into your society or school group.',
  settingsTitle: 'Settings & Accessibility',
  settingsSub: 'Personalize language, reading comfort, cloud sync, and privacy.',
  languageHeading: 'Language / भाषा',
  displayHeading: 'Display & Comfort',
  textSizeLabel: 'Text size',
  reduceMotionTitle: 'Reduce motion',
  reduceMotionSub: 'Disable transitions and motion animations.',
  privacyHeading: 'Privacy & Data',
  privacyBody:
    'Your household profile stays on this device unless you sign in with Google to save plans to Firestore.',
  clearDataBtn: 'Clear saved household data',
  clearedNotice: 'Saved household preferences cleared from this device.',
  signInGoogle: 'Sign in with Google',
  signInGuest: 'Continue as guest',
  guestSessionLabel: 'Guest session (anonymous)',
  switchGoogle: 'Sign in with Google',
  signOut: 'Sign out',
  savePlanCloud: 'Save plan',
  savedSuccess: 'Saved to your account',
  whyLabel: 'Why it helps',
  effectLabel: 'Estimated impact',
  confidenceLabel: 'Confidence',
  escalationTitle: 'When to seek urgent medical care',
  escalationBody:
    'Seek immediate emergency care if anyone experiences severe shortness of breath, chest pain, persistent wheezing, dizziness, or bluish lips.',
  offlineBanner:
    'Live AI or upstream AQI is temporarily limited—showing conservative built-in guidance.',
};

const HI: Translations = {
  skipToContent: 'मुख्य सामग्री पर जाएं',
  brandName: 'CleanBreath',
  tabToday: 'आज',
  tabHacks: 'उपाय',
  tabAsk: 'पूछें',
  tabCommunity: 'समुदाय',
  tabSettings: 'सेटिंग्स',
  disclaimerBar:
    'केवल सामान्य वायु-गुणवत्ता मार्गदर्शन—चिकित्सीय सलाह नहीं। सांस की तकलीफ होने पर डॉक्टर से मिलें।',
  onboardingSkip: 'छोड़ें',
  onboardingStep1Title: 'आपका परिवार कहाँ रहता है?',
  onboardingStep1Sub: 'हम आपके आस-पास के स्टेशन के आधार पर हर घंटे का स्मॉग समय दिखाते हैं।',
  onboardingStep2Title: 'आपके घर में कौन-कौन रहता है?',
  onboardingStep2Sub: 'सही विकल्प चुनें ताकि हम सुरक्षित बाहरी समय और इनडोर अलर्ट सेट कर सकें।',
  onboardingStep3Title: 'आपकी दैनिक दिनचर्या और घर',
  onboardingStep3Sub: 'हम सुझाव आपके उपलब्ध संसाधनों और बजट के अनुसार देते हैं।',
  useGps: 'वर्तमान स्थान उपयोग करें',
  locating: 'स्थान खोजा जा रहा है…',
  cityLabel: 'शहर',
  localityLabel: 'इलाका / सेक्टर',
  householdSizeLabel: 'परिवार के सदस्य',
  nextHousehold: 'आगे: परिवार',
  nextLifestyle: 'आगे: जीवनशैली',
  seeTodayPlan: 'आज की वायु योजना देखें',
  back: 'पीछे',
  outdoorAqiLabel: 'बाहरी वायु गुणवत्ता',
  keyPollutants: 'प्रमुख प्रदूषक',
  forecast24h: 'आने वाले घंटों का पूर्वानुमान',
  todayPlanTitle: 'आज की पारिवारिक योजना',
  sustainableTitle: 'कम-उत्सर्जन टिकाऊ विकल्प',
  indoorHacksTitle: 'इनडोर एयर उपाय',
  indoorHacksSub: 'बजट के अनुसार घर की हवा से PM2.5 कम करने के व्यावहारिक तरीके।',
  askTitle: 'CleanBreath से पूछें',
  askPlaceholder: 'मास्क, खिड़कियों या बच्चों के बारे में पूछें…',
  communityTitle: 'समुदाय कार्य सूची',
  communitySub: 'सर्दियों का धुआँ कम करने के लिए सोसायटी और स्कूल के साझा कदम।',
  societyOption: 'अपार्टमेंट सोसायटी / RWA',
  schoolOption: 'स्कूल परिसर',
  shareBtn: 'साझा करें',
  copiedNotice: 'चेकलिस्ट कॉपी हो गई—अब आप इसे अपने व्हाट्सएप ग्रुप में पेस्ट कर सकते हैं।',
  settingsTitle: 'सेटिंग्स और सुगम्यता',
  settingsSub: 'भाषा, टेक्स्ट आकार, क्लाउड सिंक और गोपनीयता चुनें।',
  languageHeading: 'Language / भाषा',
  displayHeading: 'डिस्प्ले और सुविधा',
  textSizeLabel: 'टेक्स्ट आकार',
  reduceMotionTitle: 'मोशन कम करें',
  reduceMotionSub: 'एनिमेशन और ट्रांज़िशन बंद करें।',
  privacyHeading: 'गोपनीयता और डेटा',
  privacyBody:
    'आपकी पारिवारिक प्रोफ़ाइल इसी डिवाइस पर रहती है, जब तक आप Google साइन इन से योजनाएं सहेजें नहीं।',
  clearDataBtn: 'सहेजा गया डेटा हटाएं',
  clearedNotice: 'इस डिवाइस से सहेजी गई प्राथमिकताएं हटा दी गईं।',
  signInGoogle: 'Google से साइन इन करें',
  signInGuest: 'अतिथि के रूप में जारी रखें',
  guestSessionLabel: 'अतिथि सत्र (गुमनाम)',
  switchGoogle: 'Google खाते से साइन इन करें',
  signOut: 'साइन आउट',
  savePlanCloud: 'योजना सहेजें',
  savedSuccess: 'खाते में सहेजा गया',
  whyLabel: 'यह क्यों मदद करता है',
  effectLabel: 'अनुमानित प्रभाव',
  confidenceLabel: 'विश्वसनीयता',
  escalationTitle: 'आपातकालीन चिकित्सा कब लें',
  escalationBody:
    'यदि किसी को सांस लेने में गंभीर कठिनाई, सीने में दर्द, लगातार घरघराहट, चक्कर या होंठ नीले पड़ें तो तुरंत डॉक्टर के पास जाएं।',
  offlineBanner: 'लाइव AI या बाहरी डेटा अस्थायी रूप से सीमित है—सुरक्षित ऑफलाइन मार्गदर्शन दिखाया जा रहा है।',
};

export function getTranslations(language: Language): Translations {
  return language === 'hi' ? HI : EN;
}
