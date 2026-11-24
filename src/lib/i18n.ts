// Popup / UI strings in English and Nepali.
// Nepali translations are plain, everyday language — the point of the
// Nepali mode is that a non-technical user understands the warning.

export type Lang = 'en' | 'ne';

export interface UiStrings {
  appTagline: string;
  xrayButton: string;
  checking: string;
  verdictRed: string;
  verdictRedSub: string;
  verdictYellow: string;
  verdictYellowSub: string;
  verdictGreen: string;
  verdictGreenSub: string;
  verdictGray: string;
  verdictGraySub: string;
  reasonsTitle: string;
  checkedTitle: string;
  reportButton: string;
  reportDone: string;
  officialSiteButton: string;
  privacyNote: string;
  privacyLink: string;
  languageLabel: string;
  noLoginForm: string;
}

export const STRINGS: Record<Lang, UiStrings> = {
  en: {
    appTagline: 'Shows why a login page looks fake, before you type your password.',
    xrayButton: 'X-ray this page',
    checking: 'Checking this page…',
    verdictRed: 'Looks fake — do not log in',
    verdictRedSub: 'Strong signs this page imitates a real brand.',
    verdictYellow: 'Suspicious — proceed carefully',
    verdictYellowSub: 'Something here does not look right. Check the address bar.',
    verdictGreen: 'No warning signs found',
    verdictGreenSub: 'This is a verified official domain. Still, never share your OTP or PIN with anyone.',
    verdictGray: 'Unknown site — no claim',
    verdictGraySub: 'Sachet found nothing to warn about, and nothing to confirm.',
    reasonsTitle: 'Why this verdict',
    checkedTitle: 'What was checked',
    reportButton: 'Report this page',
    reportDone: 'Reported. Thank you — reports help protect other users.',
    officialSiteButton: 'Open the official site',
    privacyNote: 'All checks run on your device. No URLs, page text or typed values ever leave this browser.',
    privacyLink: 'Privacy policy',
    languageLabel: 'नेपाली',
    noLoginForm: 'No login form on this page.',
  },
  ne: {
    appTagline: 'पासवर्ड टाइप गर्नु अघि, लगइन पेज किन नक्कली देखिन्छ भनेर देखाउँछ।',
    xrayButton: 'यो पेज जाँच्नुहोस्',
    checking: 'यो पेज जाँचिँदैछ…',
    verdictRed: 'नक्कली देखिन्छ — लगइन नगर्नुहोस्',
    verdictRedSub: 'यो पेजले वास्तविक ब्रान्डको नक्कल गरेको बलियो संकेत छ।',
    verdictYellow: 'शंकास्पद छ — होसियारीपूर्वक अघि बढ्नुहोस्',
    verdictYellowSub: 'यहाँ केही कुरा ठीक देखिँदैन। ठेगाना बार (address bar) जाँच्नुहोस्।',
    verdictGreen: 'कुनै चेतावनी संकेत भेटिएन',
    verdictGreenSub: 'यो प्रमाणित आधिकारिक डोमेन हो। तापनि, आफ्नो OTP वा PIN कसैलाई पनि नदिनुहोस्।',
    verdictGray: 'अपरिचित साइट — कुनै दाबी छैन',
    verdictGraySub: 'Sachet ले चेतावनी दिनुपर्ने केही भेटेन, र पुष्टि गर्ने केही पनि भेटेन।',
    reasonsTitle: 'यो निष्कर्ष किन',
    checkedTitle: 'के-के जाँचियो',
    reportButton: 'यो पेज रिपोर्ट गर्नुहोस्',
    reportDone: 'रिपोर्ट भयो। धन्यवाद — रिपोर्टले अरू प्रयोगकर्तालाई जोगाउन मद्दत गर्छ।',
    officialSiteButton: 'आधिकारिक साइट खोल्नुहोस्',
    privacyNote: 'सबै जाँच तपाईंको आफ्नै डिभाइसमा हुन्छ। कुनै URL, पेजको पाठ वा टाइप गरेको कुरा यो ब्राउजरबाट बाहिर जाँदैन।',
    privacyLink: 'गोपनीयता नीति',
    languageLabel: 'English',
    noLoginForm: 'यो पेजमा कुनै लगइन फारम छैन।',
  },
};

export function getStrings(lang: Lang): UiStrings {
  return STRINGS[lang];
}
