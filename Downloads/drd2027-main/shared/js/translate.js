/*
  translate.js
  Full translate dictionary and helper functions for Arabic (ar), English (en), Urdu (ur)
  - Exports:
    - translations: object with keys -> languages
    - COUNTRIES: array of { code, en, ar, ur }
    - RELIGIONS: array of { id, en, ar, ur }
    - LANGUAGES: array of { code, name }
    - setLanguage(lang), getLanguage(), translate(keyPath), applyTranslations(root)
    - initTranslations(options)

  Usage:
    import T, { setLanguage, translate, applyTranslations, initTranslations, COUNTRIES, RELIGIONS } from './translate.js'
    - mark elements you want translated with data-i18n="path.to.key"
    - call initTranslations() on page load
    - call setLanguage('ar') to switch language programmatically
*/

const DEFAULT_LANG = 'en';

// --- TRANSLATIONS ---
const translations = {
  general: {
    siteName: { en: 'CodeBank', ar: 'كودبانك', ur: 'کوڈ بینک' },
    loading: { en: 'Loading...', ar: 'جار التحميل...', ur: 'لوڈ ہو رہا ہے...' },
    save: { en: 'Save', ar: 'حفظ', ur: 'محفوظ کریں' },
    cancel: { en: 'Cancel', ar: 'إلغاء', ur: 'منسوخ کریں' },
    continue: { en: 'Continue', ar: 'متابعة', ur: 'جاری رکھیں' },
    yes: { en: 'Yes', ar: 'نعم', ur: 'ہاں' },
    no: { en: 'No', ar: 'لا', ur: 'نہیں' },
    ok: { en: 'OK', ar: 'حسناً', ur: 'ٹھیک ہے' },
    search: { en: 'Search', ar: 'بحث', ur: 'تلاش' },
    placeholderSearch: { en: 'Search videos, posts, users...', ar: 'ابحث عن فيديوهات، منشورات، مستخدمين...', ur: 'ویڈیوز، پوسٹس، یوزرز تلاش کریں...' }
  },

  navigation: {
    home: { en: 'Home', ar: 'الرئيسية', ur: 'ہوم' },
    explore: { en: 'Explore', ar: 'استكشاف', ur: 'دریافت کریں' },
    upload: { en: 'Upload', ar: 'رفع', ur: 'اپلوڈ' },
    notifications: { en: 'Notifications', ar: 'الإشعارات', ur: 'اطلاعات' },
    messages: { en: 'Messages', ar: 'الرسائل', ur: 'پیغامات' },
    profile: { en: 'Profile', ar: 'الملف الشخصي', ur: 'پروفائل' },
    settings: { en: 'Settings', ar: 'الإعدادات', ur: 'ترتیبات' },
    logout: { en: 'Logout', ar: 'تسجيل الخروج', ur: 'لاگ آؤٹ' }
  },

  services: {
    samma3ny: { en: 'Samma3ny', ar: 'سماعني', ur: 'سمعنی' },
    farragna: { en: 'Farragna', ar: 'فرّاغنة', ur: 'فرّاغنا' },
    oneworld: { en: 'OneWorld', ar: 'عالم واحد', ur: 'ون ورلڈ' },
    codebank: { en: 'CodeBank', ar: 'كودبانك', ur: 'کوڈ بینک' }
  },

  sections: {
    home: { en: 'Home', ar: 'القناة الرسمية', ur: 'ہوم' },
    nour: { en: 'Nour', ar: 'نور', ur: 'نور' },
    afra7: { en: 'Afra7', ar: 'افراح', ur: 'افراح' }
  },

  sectionPopups: {
    afra7: { en: 'Afra7', ar: 'افراح', ur: 'افراح' },
    home: { en: 'Home', ar: 'القناة الرسمية', ur: 'ہوم' },
    nour: { en: 'Nour', ar: 'نور', ur: 'نور' }
  },

  extraMode: {
    silver: { en: 'Extra Silver', ar: 'سبيكة فضة', ur: 'ایکسٹرا سلور' },
    gold: { en: 'Extra Gold', ar: 'سبيكة ذهب', ur: 'ایکسٹرا گولڈ' },
    challengePress: { en: 'CHALLENGE: PRESS NOW!', ar: 'التحدي: اضغط الآن!', ur: 'چیلنج: اب دبائیں!' },
    challengePassed: { en: 'Challenge Passed! ✅ Continuing Extra Mode...', ar: 'تم تجاوز التحدي! ✅ متابعة الوضع الإضافي...', ur: 'چیلنج پاس! ✅ ایکسٹرا موڈ جاری رکھتے ہوئے...' },
    challengeFailed: { en: 'Challenge Failed! ❌ Extra Mode will deactivate...', ar: 'فشل في التحدي! ❌ سيتم إلغاء الوضع الإضافي...', ur: 'چیلنج ناکام! ❌ ایکسٹرا موڈ غیر فعال ہو جائے گا...' }
  },

  newsTicker: {
    content: { en: 'TIMUR NEWS: Breaking news and updates from around the world. | NEWS: Lorem ipsum dolor sit amet | SPORTS: Aliquam erat volutpat. Sed varius nulla non condimentum consequat | TIMUR CHANNEL ANNOUNCEMENT: Quisque malesuada magna ac dolor tincidunt, ac dictum risus sollicitudin. | WEATHER: Sed eget lacus vitae nulla laoreet ultricies. Nunc eu sapien in velit varius vulputate. | COMMUNITY: In hac habitasse platea dictumst. Donec non ornare enim. | SPECIAL PROMO: Sed nec arcu ipsum. Aliquam in pharetra est. TIMUR NEWS: ...', ar: 'أخبار تيمور: أحدث الأخبار والتحديثات من حول العالم. | أخبار: لوريم إيبسوم دولور سيت أميت | رياضة: ألي كوام إرات فولوبات. سيد فاريوس نولا نون كونديمينتوم كونسيكوات | إعلان قناة تيمور: كويسكي ماليسوادا ماجنا أك دولور تينسيدونت، أك ديكتوم ريسوس سوليسيتودين. | طقس: سيد إجيت لاكوس فيتاي نولا لاوريت أولتريسيس. نونك إيو سابين إن فيليت فاريوس فولوبات. | مجتمع: إن هاك هابيتاسي بلاتيا ديكتومست. دونيك نون أورناري إنيم. | عرض خاص: سيد نيك أركو إيبسوم. ألي كوام إن فيريترا إست. أخبار تيمور: ...', ur: 'تیمور خبریں: دنیا بھر سے توڑنے والی خبریں اور اپ ڈیٹس۔ | خبریں: لوریم ایپسوم ڈالر سٹ ایمیٹ | کھیل: الی کوام ایرات وولوپیٹ۔ سیڈ واریوس نولا نون کونڈیمنٹم کونسیکواٹ | تیمور چینل اعلان: کوئیسکی میل سوادا ماگنا اک ڈالر ٹن سیڈنٹ، اک ڈکٹم رسوس سول سیٹوڈن۔ | موسم: سیڈ ایجٹ لیکوس ویٹائی نولا لوریٹ الٹریسیس۔ ننک ایو سابیئن ان ویلٹ واریوس وولوپیٹ۔ | کمیونٹی: ان ہاک ہیبیٹاسی پلیٹیا ڈکٹمست۔ ڈونیک نون ارناری اینم۔ | خصوصی پرومو: سیڈ نیک آر کو ایپسوم۔ الی کوام ان فیرٹرا ایسٹ۔ تیمور خبریں: ...' }
  },

  screenshot: {
    title: { en: 'Screenshot Taken', ar: 'تم التقاط لقطة شاشة', ur: 'سکرین شاٹ لیا گیا' },
    download: { en: 'Download', ar: 'تحميل', ur: 'ڈاؤن لوڈ' },
    close: { en: 'Close', ar: 'إغلاق', ur: 'بند کریں' }
  },

  buttons: {
    soundToggle: { en: '🔊', ar: '🔊', ur: '🔊' },
    takeScreenshot: { en: 'Take Screenshot', ar: 'التقط لقطة شاشة', ur: 'سکرین شاٹ لیں' },
    playPause: { en: 'Play/Pause', ar: 'تشغيل/إيقاف', ur: 'پلے/پاز' },
    longPressCodebank: { en: 'Long press for CodeBank', ar: 'اضغط مطولاً للبنك الكودي', ur: 'کوڈ بینک کے لیے لمبی پریس' },
    longPressAzan: { en: 'Long press for Azan Clock', ar: 'اضغط مطولاً لساعة الأذان', ur: 'اذان گھڑی کے لیے لمبی پریس' }
  },

  labels: {
    waitingForCode: { en: 'Waiting for code...', ar: 'في انتظار الكود...', ur: 'کوڈ کا انتظار...' },
    watchToEarnCodes: { en: 'Watch to earn codes!', ar: 'شاهد لكسب الأكواد!', ur: 'کوڈز کمانے کے لیے دیکھیں!' },
    tokenAmount: { en: 'Token Amount', ar: 'كمية الرمز', ur: 'ٹوکن کی مقدار' }
  },

  popup: {
    title: { en: 'Tell us about yourself', ar: 'أخبرنا عن نفسك', ur: 'اپنے بارے میں بتائیں' },
    description: { en: 'Select your country, religion and language to personalize your experience.', ar: 'اختر بلدك ودينك ولغتك لتخصيص تجربتك.', ur: 'اپنا ملک، مذہب اور زبان منتخب کریں تاکہ آپ کے تجربے کو ذاتی بنایا جا سکے۔' },
    countryLabel: { en: 'Country', ar: 'البلد', ur: 'ملک' },
    religionLabel: { en: 'Religion', ar: 'الديانة', ur: 'مذہب' },
    languageLabel: { en: 'Language', ar: 'اللغة', ur: 'زبان' },
    continueBtn: { en: 'Continue', ar: 'متابعة', ur: 'جاری رکھیں' },
    requiredField: { en: 'This field is required', ar: 'هذا الحقل مطلوب', ur: 'یہ فیلڈ ضروری ہے' }
  },

  player: {
    play: { en: 'Play', ar: 'تشغيل', ur: 'پلے' },
    pause: { en: 'Pause', ar: 'إيقاف مؤقت', ur: 'وقف' },
    mute: { en: 'Mute', ar: 'كتم الصوت', ur: 'خاموش' },
    unmute: { en: 'Unmute', ar: 'إظهار الصوت', ur: 'آن کریں' },
    fullscreen: { en: 'Fullscreen', ar: 'ملء الشاشة', ur: 'مکمل سکرین' },
    exitFullscreen: { en: 'Exit Fullscreen', ar: 'خروج من ملء الشاشة', ur: 'مکمل سکرین سے باہر آئیں' },
    quality: { en: 'Quality', ar: 'جودة', ur: 'معیار' }
  },

  counter: {
    viewers: { en: 'Viewers', ar: 'المشاهدون', ur: 'ناظرین' },
    likes: { en: 'Likes', ar: 'الإعجابات', ur: 'لائکس' },
    shares: { en: 'Shares', ar: 'المشاركات', ur: 'شیئرز' }
  },

  upload: {
    dropFiles: { en: 'Drop files here or click to upload', ar: 'اس جگہ الملفات واسحبها أو انقر للرفع', ur: 'فائلیں یہاں ڈراپ کریں یا اپلوڈ کے لیے کلک کریں' },
    title: { en: 'Title', ar: 'العنوان', ur: 'عنوان' },
    description: { en: 'Description', ar: 'الوصف', ur: 'تفصیل' },
    tags: { en: 'Tags', ar: 'الوسوم', ur: 'ٹیگز' },
    publish: { en: 'Publish', ar: 'نشر', ur: 'شائع کریں' }
  },

  profile: {
    editProfile: { en: 'Edit Profile', ar: 'تعديل الملف الشخصي', ur: 'پروفائل میں ترمیم' },
    followers: { en: 'Followers', ar: 'المتابعون', ur: 'فالورز' },
    following: { en: 'Following', ar: 'المتابَعون', ur: 'فالو کر رہے ہیں' }
  },

  auth: {
    login: { en: 'Login', ar: 'تسجيل الدخول', ur: 'لاگ ان' },
    signup: { en: 'Sign up', ar: 'إنشاء حساب', ur: 'سائن اپ' },
    email: { en: 'Email', ar: 'البريد الإلكتروني', ur: 'ای میل' },
    password: { en: 'Password', ar: 'كلمة المرور', ur: 'پاس ورڈ' },
    forgotPassword: { en: 'Forgot Password?', ar: 'نسيت كلمة المرور؟', ur: 'پاسورڈ بھول گئے؟' }
  },

  errors: {
    unknown: { en: 'An unknown error occurred', ar: 'حدث خطأ غير معروف', ur: 'ایک نامعلوم خرابی ہوئی' },
    network: { en: 'Network error. Please try again.', ar: 'خطأ في الشبكة. حاول مرة أخرى.', ur: 'نیٹ ورک کی خرابی۔ براہ کرم دوبارہ کوشش کریں۔' },
    required: { en: 'This field is required.', ar: 'هذا الحقل مطلوب.', ur: 'یہ فیلڈ ضروری ہے۔' }
  },

  notifications: {
    welcome: { en: 'Welcome back!', ar: 'مرحباً بعودتك!', ur: 'خوش آمدید!' },
    saved: { en: 'Saved successfully', ar: 'تم الحفظ بنجاح', ur: 'خوبی سے محفوظ ہو گیا' }
  },

  footer: {
    copyright: { en: '© {year} CodeBank. All rights reserved.', ar: '© {year} كودبانك. كل الحقوق محفوظة.', ur: '© {year} کوڈ بینک۔ جملہ حقوق محفوظ ہیں۔' },
    terms: { en: 'Terms of Service', ar: 'شروط الخدمة', ur: 'خدمات کی شرائط' },
    privacy: { en: 'Privacy Policy', ar: 'سياسة الخصوصية', ur: 'رازداری کی پالیسی' }
  },

  admin: {
    dashboard: { en: 'Admin Dashboard', ar: 'لوحة تحكم المسؤول', ur: 'ایڈمن ڈیش بورڈ' },
    users: { en: 'Users', ar: 'المستخدمون', ur: 'صارفین' },
    reports: { en: 'Reports', ar: 'التقارير', ur: 'رپورٹس' }
  },

  moderation: {
    flag: { en: 'Flag', ar: 'الإبلاغ', ur: 'جھنڈا' },
    remove: { en: 'Remove', ar: 'إزالة', ur: 'ہٹائیں' },
    approve: { en: 'Approve', ar: 'الموافقة', ur: 'منظور کریں' }
  },

  searchUI: {
    results: { en: 'Search Results', ar: 'نتائج البحث', ur: 'تلاش کے نتائج' },
    noResults: { en: 'No results found', ar: 'لم يتم العثور على نتائج', ur: 'کوئی نتیجہ نہیں ملا' }
  },

  chat: {
    send: { en: 'Send', ar: 'إرسال', ur: 'بھیجیں' },
    typing: { en: 'is typing...', ar: 'يكتب...', ur: 'لکھ رہا ہے...' }
  }
};

// --- COUNTRIES (ISO-3166-like with translations) ---
// For brevity this list includes all standard countries. Keep updating if new countries are needed.
const COUNTRIES = [
  { code: 'AF', en: 'Afghanistan', ar: 'أفغانستان', ur: 'افغانستان' },
  { code: 'AX', en: 'Åland Islands', ar: 'جزر آلاند', ur: 'آلینڈ جزائر' },
  { code: 'AL', en: 'Albania', ar: 'ألبانيا', ur: 'البانیا' },
  { code: 'DZ', en: 'Algeria', ar: 'الجزائر', ur: 'الجزائر' },
  { code: 'AS', en: 'American Samoa', ar: 'ساموا الأمريكية', ur: 'امریکی سموآ' },
  { code: 'AD', en: 'Andorra', ar: 'أندورا', ur: 'انڈورا' },
  { code: 'AO', en: 'Angola', ar: 'أنغولا', ur: 'انگولا' },
  { code: 'AI', en: 'Anguilla', ar: 'أنغويلا', ur: 'اینگویلا' },
  { code: 'AQ', en: 'Antarctica', ar: 'القارة القطبية الجنوبية', ur: 'انٹارکٹیکا' },
  { code: 'AG', en: 'Antigua and Barbuda', ar: 'أنتيغوا وباربودا', ur: 'انتگوا اور باربوڈا' },
  { code: 'AR', en: 'Argentina', ar: 'الأرجنتين', ur: 'ارجنٹینا' },
  { code: 'AM', en: 'Armenia', ar: 'أرمينيا', ur: 'ارمینیا' },
  { code: 'AW', en: 'Aruba', ar: 'أروبا', ur: 'اروبا' },
  { code: 'AU', en: 'Australia', ar: 'أستراليا', ur: 'آسٹریلیا' },
  { code: 'AT', en: 'Austria', ar: 'النمسا', ur: 'آسٹریا' },
  { code: 'AZ', en: 'Azerbaijan', ar: 'أذربيجان', ur: 'آذربائيجان' },
  { code: 'BS', en: 'Bahamas', ar: 'الباهاماس', ur: 'بہاماس' },
  { code: 'BH', en: 'Bahrain', ar: 'البحرين', ur: 'بحرین' },
  { code: 'BD', en: 'Bangladesh', ar: 'بنغلاديش', ur: 'بنگلہ دیش' },
  { code: 'BB', en: 'Barbados', ar: 'بربادوس', ur: 'بارباڈوس' },
  { code: 'BY', en: 'Belarus', ar: 'بيلاروسيا', ur: 'بیلاروس' },
  { code: 'BE', en: 'Belgium', ar: 'بلجيكا', ur: 'بیلجیم' },
  { code: 'BZ', en: 'Belize', ar: 'بليز', ur: 'بیلیز' },
  { code: 'BJ', en: 'Benin', ar: 'بنين', ur: 'بینن' },
  { code: 'BM', en: 'Bermuda', ar: 'بيرمودا', ur: 'برمودا' },
  { code: 'BT', en: 'Bhutan', ar: 'بوتان', ur: 'بھوٹان' },
  { code: 'BO', en: 'Bolivia', ar: 'بوليفيا', ur: 'بولیویا' },
  { code: 'BQ', en: 'Bonaire', ar: 'بونير', ur: 'بونیر' },
  { code: 'BA', en: 'Bosnia and Herzegovina', ar: 'البوسنة والهرسك', ur: 'بوسنیا اور ہرزیگووینا' },
  { code: 'BW', en: 'Botswana', ar: 'بتسوانا', ur: 'بوتسوانا' },
  { code: 'BV', en: 'Bouvet Island', ar: 'جزيرة بوفه', ur: 'بوویٹ جزیرہ' },
  { code: 'BR', en: 'Brazil', ar: 'البرازيل', ur: 'برازیل' },
  { code: 'IO', en: 'British Indian Ocean Territory', ar: 'إقليم المحيط الهندي البريطاني', ur: 'برطانوی انڈین اوشین خطہ' },
  { code: 'BN', en: 'Brunei Darussalam', ar: 'بروناي', ur: 'برونائی' },
  { code: 'BG', en: 'Bulgaria', ar: 'بلغاريا', ur: 'بلغاریہ' },
  { code: 'BF', en: 'Burkina Faso', ar: 'بوركينا فاسو', ur: 'برکینا فاسو' },
  { code: 'BI', en: 'Burundi', ar: 'بوروندي', ur: 'برونڈی' },
  { code: 'CV', en: 'Cabo Verde', ar: 'الرأس الأخضر', ur: 'کیپ وردے' },
  { code: 'KH', en: 'Cambodia', ar: 'كمبوديا', ur: 'کمبوڈیا' },
  { code: 'CM', en: 'Cameroon', ar: 'الكاميرون', ur: 'کیمرون' },
  { code: 'CA', en: 'Canada', ar: 'كندا', ur: 'کینیڈا' },
  { code: 'KY', en: 'Cayman Islands', ar: 'جزر الكايمان', ur: 'کیمین جزائر' },
  { code: 'CF', en: 'Central African Republic', ar: 'جمهورية افريقيا الوسطى', ur: 'وسطی افریقی جمہوریہ' },
  { code: 'TD', en: 'Chad', ar: 'تشاد', ur: 'چاڈ' },
  { code: 'CL', en: 'Chile', ar: 'تشيلي', ur: 'چلی' },
  { code: 'CN', en: 'China', ar: 'الصين', ur: 'چین' },
  { code: 'CX', en: 'Christmas Island', ar: 'جزيرة الكريسماس', ur: 'کرسمس جزیرہ' },
  { code: 'CC', en: 'Cocos (Keeling) Islands', ar: 'جزر كوكوس', ur: 'کاکو جزائر' },
  { code: 'CO', en: 'Colombia', ar: 'كولومبيا', ur: 'کولمبیا' },
  { code: 'KM', en: 'Comoros', ar: 'جزر القمر', ur: 'قمر جزائر' },
  { code: 'CG', en: 'Congo', ar: 'الكونغو', ur: 'کانگو' },
  { code: 'CD', en: 'Congo (Democratic Republic)', ar: 'جمهورية الكونغو الديمقراطية', ur: 'کانگو ڈیموکریٹک ریپبلک' },
  { code: 'CK', en: 'Cook Islands', ar: 'جزر كوك', ur: 'کک جزائر' },
  { code: 'CR', en: 'Costa Rica', ar: 'كوستاريكا', ur: 'کوسٹا ریکا' },
  { code: 'CI', en: 'Côte d\'Ivoire', ar: 'كوت ديفوار', ur: 'کوت دیووائر' },
  { code: 'HR', en: 'Croatia', ar: 'كرواتيا', ur: 'کروشیا' },
  { code: 'CU', en: 'Cuba', ar: 'كوبا', ur: 'کیوبا' },
  { code: 'CW', en: 'Curaçao', ar: 'كوراساو', ur: 'کیوراکاؤ' },
  { code: 'CY', en: 'Cyprus', ar: 'قبرص', ur: 'قبرص' },
  { code: 'CZ', en: 'Czechia', ar: 'التشيك', ur: 'چیکیا' },
  { code: 'DK', en: 'Denmark', ar: 'الدانمارك', ur: 'ڈنمارک' },
  { code: 'DJ', en: 'Djibouti', ar: 'جيبوتي', ur: 'جبوتی' },
  { code: 'DM', en: 'Dominica', ar: 'دومينيكا', ur: 'ڈومینیکا' },
  { code: 'DO', en: 'Dominican Republic', ar: 'جمهورية الدومينيكان', ur: 'ڈومینیکن جمہوریہ' },
  { code: 'EC', en: 'Ecuador', ar: 'الاكوادور', ur: 'ایکواڈور' },
  { code: 'EG', en: 'Egypt', ar: 'مصر', ur: 'مصر' },
  { code: 'SV', en: 'El Salvador', ar: 'السلفادور', ur: 'ایل سلواڈور' },
  { code: 'GQ', en: 'Equatorial Guinea', ar: 'غينيا الاستوائية', ur: 'استوائی گنی' },
  { code: 'ER', en: 'Eritrea', ar: 'اريتريا', ur: 'اریٹیریا' },
  { code: 'EE', en: 'Estonia', ar: 'استونيا', ur: 'اسٹونیا' },
  { code: 'SZ', en: 'Eswatini', ar: 'إسواتيني', ur: 'اسواتینی' },
  { code: 'ET', en: 'Ethiopia', ar: 'اثيوبيا', ur: 'ایتھوپیا' },
  { code: 'FK', en: 'Falkland Islands', ar: 'جزر فوكلاند', ur: 'فالکلینڈ جزائر' },
  { code: 'FO', en: 'Faroe Islands', ar: 'جزر فارو', ur: 'فیرو جزائر' },
  { code: 'FJ', en: 'Fiji', ar: 'فيجي', ur: 'فجی' },
  { code: 'FI', en: 'Finland', ar: 'فنلندا', ur: 'فن لینڈ' },
  { code: 'FR', en: 'France', ar: 'فرنسا', ur: 'فرانس' },
  { code: 'GF', en: 'French Guiana', ar: 'غيانا الفرنسية', ur: 'فرانسیسی گیانا' },
  { code: 'PF', en: 'French Polynesia', ar: 'بولينيزيا الفرنسية', ur: 'فرانسیسی پولینیشیا' },
  { code: 'TF', en: 'French Southern Territories', ar: 'المقاطعات الجنوبية الفرنسية', ur: 'فرانسیسی جنوبی علاقے' },
  { code: 'GA', en: 'Gabon', ar: 'الغابون', ur: 'گبون' },
  { code: 'GM', en: 'Gambia', ar: 'غامبيا', ur: 'گیمبیا' },
  { code: 'GE', en: 'Georgia', ar: 'جورجيا', ur: 'جارجیا' },
  { code: 'DE', en: 'Germany', ar: 'ألمانيا', ur: 'جرمنی' },
  { code: 'GH', en: 'Ghana', ar: 'غانا', ur: 'گھانا' },
  { code: 'GI', en: 'Gibraltar', ar: 'جبل طارق', ur: 'جبل الطارق' },
  { code: 'GR', en: 'Greece', ar: 'اليونان', ur: 'یونان' },
  { code: 'GL', en: 'Greenland', ar: 'جرينلاند', ur: 'گرین لینڈ' },
  { code: 'GD', en: 'Grenada', ar: 'غرينادا', ur: 'گریناڈا' },
  { code: 'GP', en: 'Guadeloupe', ar: 'جوادلوب', ur: 'گواڈیلوپ' },
  { code: 'GU', en: 'Guam', ar: 'غوام', ur: 'گوام' },
  { code: 'GT', en: 'Guatemala', ar: 'جواتيمالا', ur: 'گواٹے مالا' },
  { code: 'GG', en: 'Guernsey', ar: 'جيرنزي', ur: 'گیرنسی' },
  { code: 'GN', en: 'Guinea', ar: 'غينيا', ur: 'گنی' },
  { code: 'GW', en: 'Guinea-Bissau', ar: 'غينيا بيساو', ur: 'گنی بساؤ' },
  { code: 'GY', en: 'Guyana', ar: 'غيانا', ur: 'گویانہ' },
  { code: 'HT', en: 'Haiti', ar: 'هايتي', ur: 'ہیٹی' },
  { code: 'HM', en: 'Heard Island and McDonald Islands', ar: 'جزيرة هيرد وجزر ماكدونالد', ur: 'ہرڈ جزیرہ اور میک ڈونلڈ جزائر' },
  { code: 'VA', en: 'Holy See', ar: 'الكرسي الرسولي', ur: 'ہولی سی' },
  { code: 'HN', en: 'Honduras', ar: 'هندوراس', ur: 'ہونڈوراس' },
  { code: 'HK', en: 'Hong Kong', ar: 'هونغ كونغ', ur: 'ہانگ کانگ' },
  { code: 'HU', en: 'Hungary', ar: 'المجر', ur: 'ہنگری' },
  { code: 'IS', en: 'Iceland', ar: 'أيسلندا', ur: 'آئس لینڈ' },
  { code: 'IN', en: 'India', ar: 'الهند', ur: 'بھارت' },
  { code: 'ID', en: 'Indonesia', ar: 'أندونيسيا', ur: 'انڈونیشیا' },
  { code: 'IR', en: 'Iran', ar: 'إيران', ur: 'ایران' },
  { code: 'IQ', en: 'Iraq', ar: 'العراق', ur: 'عراق' },
  { code: 'IE', en: 'Ireland', ar: 'ايرلندا', ur: 'آئرلینڈ' },
  { code: 'IM', en: 'Isle of Man', ar: 'جزيرة مان', ur: 'آئل آف مین' },
  { code: 'IL', en: 'Israel', ar: 'اسرائيل', ur: 'اسرائیل' },
  { code: 'IT', en: 'Italy', ar: 'إيطاليا', ur: 'اٹلی' },
  { code: 'JM', en: 'Jamaica', ar: 'جامايكا', ur: 'جمیکا' },
  { code: 'JP', en: 'Japan', ar: 'اليابان', ur: 'جاپان' },
  { code: 'JE', en: 'Jersey', ar: 'جيرسي', ur: 'جرسی' },
  { code: 'JO', en: 'Jordan', ar: 'الأردن', ur: 'اردن' },
  { code: 'KZ', en: 'Kazakhstan', ar: 'كازاخستان', ur: 'قازقستان' },
  { code: 'KE', en: 'Kenya', ar: 'كينيا', ur: 'کینیا' },
  { code: 'KI', en: 'Kiribati', ar: 'كيريباتي', ur: 'کریباتی' },
  { code: 'KP', en: 'North Korea', ar: 'كوريا الشمالية', ur: 'شمالی کوریا' },
  { code: 'KR', en: 'South Korea', ar: 'كوريا الجنوبية', ur: 'جنوبی کوریا' },
  { code: 'KW', en: 'Kuwait', ar: 'الكويت', ur: 'کویت' },
  { code: 'KG', en: 'Kyrgyzstan', ar: 'قيرغيزستان', ur: 'کرغزستان' },
  { code: 'LA', en: 'Laos', ar: 'لاوس', ur: 'لاوس' },
  { code: 'LV', en: 'Latvia', ar: 'لاتفيا', ur: 'لاتھویا' },
  { code: 'LB', en: 'Lebanon', ar: 'لبنان', ur: 'لبنان' },
  { code: 'LS', en: 'Lesotho', ar: 'ليسوتو', ur: 'لیسوٹو' },
  { code: 'LR', en: 'Liberia', ar: 'ليبيريا', ur: 'لائبیریا' },
  { code: 'LY', en: 'Libya', ar: 'ليبيا', ur: 'لیبیا' },
  { code: 'LI', en: 'Liechtenstein', ar: 'ليختنشتاين', ur: 'لیکٹنسٹائن' },
  { code: 'LT', en: 'Lithuania', ar: 'ليتوانيا', ur: 'لتھوانیا' },
  { code: 'LU', en: 'Luxembourg', ar: 'لوكسمبورج', ur: 'لکسمبرگ' },
  { code: 'MO', en: 'Macao', ar: 'ماكاو', ur: 'مکاؤ' },
  { code: 'MG', en: 'Madagascar', ar: 'مدغشقر', ur: 'مدغاسکر' },
  { code: 'MW', en: 'Malawi', ar: 'ملاوي', ur: 'ملاوی' },
  { code: 'MY', en: 'Malaysia', ar: 'ماليزيا', ur: 'ملائیشیا' },
  { code: 'MV', en: 'Maldives', ar: 'جزر المالديف', ur: 'مالدیوز' },
  { code: 'ML', en: 'Mali', ar: 'مالي', ur: 'مالی' },
  { code: 'MT', en: 'Malta', ar: 'مالطا', ur: 'مالٹا' },
  { code: 'MH', en: 'Marshall Islands', ar: 'جزر مارشال', ur: 'مارشل جزائر' },
  { code: 'MQ', en: 'Martinique', ar: 'مارتينيك', ur: 'مارٹینیک' },
  { code: 'MR', en: 'Mauritania', ar: 'موريتانيا', ur: 'موریطانیہ' },
  { code: 'MU', en: 'Mauritius', ar: 'موريشيوس', ur: 'ماریشس' },
  { code: 'YT', en: 'Mayotte', ar: 'مايوت', ur: 'مایوٹ' },
  { code: 'MX', en: 'Mexico', ar: 'المكسيك', ur: 'میریکو' },
  { code: 'FM', en: 'Micronesia', ar: 'ميكرونيزيا', ur: 'مائکرونیشیا' },
  { code: 'MD', en: 'Moldova', ar: 'مولدوفا', ur: 'مالدووا' },
  { code: 'MC', en: 'Monaco', ar: 'موناكو', ur: 'موناکو' },
  { code: 'MN', en: 'Mongolia', ar: 'منغوليا', ur: 'منگولیا' },
  { code: 'ME', en: 'Montenegro', ar: 'الجبل الأسود', ur: 'مونٹینیگرو' },
  { code: 'MS', en: 'Montserrat', ar: 'مونتسيرات', ur: 'مونٹسیراٹ' },
  { code: 'MA', en: 'Morocco', ar: 'المغرب', ur: 'موروکو' },
  { code: 'MZ', en: 'Mozambique', ar: 'موزمبيق', ur: 'موزمبیق' },
  { code: 'MM', en: 'Myanmar', ar: 'ميانمار', ur: 'میانمار' },
  { code: 'NA', en: 'Namibia', ar: 'ناميبيا', ur: 'نامیبیا' },
  { code: 'NR', en: 'Nauru', ar: 'نورو', ur: 'نیورو' },
  { code: 'NP', en: 'Nepal', ar: 'نيبال', ur: 'نیپال' },
  { code: 'NL', en: 'Netherlands', ar: 'هولندا', ur: 'نیدرلینڈز' },
  { code: 'NC', en: 'New Caledonia', ar: 'كاليدونيا الجديدة', ur: 'نیو کیلڈونیا' },
  { code: 'NZ', en: 'New Zealand', ar: 'نيوزيلندا', ur: 'نیوزی لینڈ' },
  { code: 'NI', en: 'Nicaragua', ar: 'نيكاراغوا', ur: 'نکاراگوا' },
  { code: 'NE', en: 'Niger', ar: 'النيجر', ur: 'نائیجر' },
  { code: 'NG', en: 'Nigeria', ar: 'نيجيريا', ur: 'نائجریا' },
  { code: 'NU', en: 'Niue', ar: 'نيوي', ur: 'نیو' },
  { code: 'NF', en: 'Norfolk Island', ar: 'جزيرة نورفولك', ur: 'نارفولک جزیرہ' },
  { code: 'MK', en: 'North Macedonia', ar: 'مقدونيا الشمالية', ur: 'شمالی مقدونیہ' },
  { code: 'MP', en: 'Northern Mariana Islands', ar: 'جزر ماريانا الشمالية', ur: 'شمالی ماریانا جزائر' },
  { code: 'NO', en: 'Norway', ar: 'النرويج', ur: 'ناروے' },
  { code: 'OM', en: 'Oman', ar: 'عمان', ur: 'عمان' },
  { code: 'PK', en: 'Pakistan', ar: 'باكستان', ur: 'پاکستان' },
  { code: 'PW', en: 'Palau', ar: 'بالاو', ur: 'پالاؤ' },
  { code: 'PS', en: 'Palestine', ar: 'فلسطين', ur: 'فلسطین' },
  { code: 'PA', en: 'Panama', ar: 'بنما', ur: ' پاناما' },
  { code: 'PG', en: 'Papua New Guinea', ar: 'بابوا غينيا الجديدة', ur: 'پاپوا نیو گنی' },
  { code: 'PY', en: 'Paraguay', ar: 'باراغواي', ur: 'پیراگوئے' },
  { code: 'PE', en: 'Peru', ar: 'بيرو', ur: 'پیرو' },
  { code: 'PH', en: 'Philippines', ar: 'الفلبين', ur: 'فلپائن' },
  { code: 'PN', en: 'Pitcairn Islands', ar: 'جزر بيتكيرن', ur: 'پٹکرن جزائر' },
  { code: 'PL', en: 'Poland', ar: 'بولندا', ur: 'پولینڈ' },
  { code: 'PT', en: 'Portugal', ar: 'البرتغال', ur: 'پرتگال' },
  { code: 'PR', en: 'Puerto Rico', ar: 'بورتو ريكو', ur: 'پورٹو ریکو' },
  { code: 'QA', en: 'Qatar', ar: 'قطر', ur: 'قطر' },
  { code: 'RE', en: 'Réunion', ar: 'لا ريونيون', ur: 'ری یونین' },
  { code: 'RO', en: 'Romania', ar: 'رومانيا', ur: 'رومانیا' },
  { code: 'RU', en: 'Russian Federation', ar: 'روسيا', ur: 'روسی فیڈریشن' },
  { code: 'RW', en: 'Rwanda', ar: 'رواندا', ur: 'روانڈا' },
  { code: 'BL', en: 'Saint Barthélemy', ar: 'سانت بارتيلمي', ur: 'سینٹbarthélemy' },
  { code: 'SH', en: 'Saint Helena', ar: 'سانت هيلينا', ur: 'سینٹ ہیلینا' },
  { code: 'KN', en: 'Saint Kitts and Nevis', ar: 'سانت كيتس ونيفيس', ur: 'سینٹ کٹس اور نیوس' },
  { code: 'LC', en: 'Saint Lucia', ar: 'سانت لوسيا', ur: 'سینٹ لوسیا' },
  { code: 'MF', en: 'Saint Martin', ar: 'سانت مارتن', ur: 'سینٹ مارٹن' },
  { code: 'PM', en: 'Saint Pierre and Miquelon', ar: 'سانت بيار وميكلون', ur: 'سینٹ پیئر اور میکیلون' },
  { code: 'VC', en: 'Saint Vincent and the Grenadines', ar: 'سانت فينسنت وجزر غرينادين', ur: 'سینٹ ونسنٹ اور گریناڈائنز' },
  { code: 'WS', en: 'Samoa', ar: 'ساموا', ur: 'ساموا' },
  { code: 'SM', en: 'San Marino', ar: 'سان مارينو', ur: 'سان مارینو' },
  { code: 'ST', en: 'Sao Tome and Principe', ar: 'ساو تومي وبرينسيبي', ur: 'ساؤ ٹوم اور پرنسپ' },
  { code: 'SA', en: 'Saudi Arabia', ar: 'السعودية', ur: 'سعودی عرب' },
  { code: 'SN', en: 'Senegal', ar: 'السنغال', ur: 'سینیگال' },
  { code: 'RS', en: 'Serbia', ar: 'صربيا', ur: 'سربیا' },
  { code: 'SC', en: 'Seychelles', ar: 'سيشيل', ur: 'سیچلس' },
  { code: 'SL', en: 'Sierra Leone', ar: 'سيرا ليون', ur: 'سیرالئون' },
  { code: 'SG', en: 'Singapore', ar: 'سنغافورة', ur: 'سنگاپور' },
  { code: 'SX', en: 'Sint Maarten', ar: 'سينت مارتن', ur: 'سنت مارٹن' },
  { code: 'SK', en: 'Slovakia', ar: 'سلوفاكيا', ur: 'سلوواکیا' },
  { code: 'SI', en: 'Slovenia', ar: 'سلوفينيا', ur: 'سلووینیا' },
  { code: 'SB', en: 'Solomon Islands', ar: 'جزر سليمان', ur: 'سولومن جزائر' },
  { code: 'SO', en: 'Somalia', ar: 'الصومال', ur: 'صومالیہ' },
  { code: 'ZA', en: 'South Africa', ar: 'جنوب أفريقيا', ur: 'جنوبی افریقہ' },
  { code: 'GS', en: 'South Georgia & South Sandwich Islands', ar: 'جزيرة جورجيا الجنوبية وجزر ساندويتش الجنوبية', ur: 'جنوبی جارجیا اور ساؤتھ سینڈوچ جزائر' },
  { code: 'SS', en: 'South Sudan', ar: 'جنوب السودان', ur: 'جنوبی سوڈان' },
  { code: 'ES', en: 'Spain', ar: 'اسبانيا', ur: 'سپین' },
  { code: 'LK', en: 'Sri Lanka', ar: 'سريلانكا', ur: 'سری لنکا' },
  { code: 'SD', en: 'Sudan', ar: 'السودان', ur: 'سوڈان' },
  { code: 'SR', en: 'Suriname', ar: 'سورينام', ur: 'سورینام' },
  { code: 'SJ', en: 'Svalbard and Jan Mayen', ar: 'سفالبارد وجان ماين', ur: 'سوالبارڈ اور جان مایین' },
  { code: 'SE', en: 'Sweden', ar: 'السويد', ur: 'سویڈن' },
  { code: 'CH', en: 'Switzerland', ar: 'سويسرا', ur: 'سوئٹزرلینڈ' },
  { code: 'SY', en: 'Syrian Arab Republic', ar: 'الجمهورية العربية السورية', ur: 'شامی عرب ریاست' },
  { code: 'TW', en: 'Taiwan', ar: 'تايوان', ur: 'تائیوان' },
  { code: 'TJ', en: 'Tajikistan', ar: 'طاجيكستان', ur: 'تاجکستان' },
  { code: 'TZ', en: 'Tanzania', ar: 'تنزانيا', ur: 'تنزانیہ' },
  { code: 'TH', en: 'Thailand', ar: 'تايلاند', ur: 'تھائی لینڈ' },
  { code: 'TL', en: 'Timor-Leste', ar: 'تيمور الشرقية', ur: 'تيمور لستے' },
  { code: 'TG', en: 'Togo', ar: 'توغو', ur: 'ٹوگو' },
  { code: 'TK', en: 'Tokelau', ar: 'توكيلاو', ur: 'ٹوکیلاو' },
  { code: 'TO', en: 'Tonga', ar: 'تونغا', ur: 'تونگا' },
  { code: 'TT', en: 'Trinidad and Tobago', ar: 'ترينيداد وتوباغو', ur: 'ٹرینیڈاڈ اور ٹوباگو' },
  { code: 'TN', en: 'Tunisia', ar: 'تونس', ur: 'تیونس' },
  { code: 'TR', en: 'Turkey', ar: 'تركيا', ur: 'ترکی' },
  { code: 'TM', en: 'Turkmenistan', ar: 'تركمانستان', ur: 'ترکمانستان' },
  { code: 'TC', en: 'Turks and Caicos Islands', ar: 'جزر توركس وكايكوس', ur: 'ترکس اور کایکوس جزائر' },
  { code: 'TV', en: 'Tuvalu', ar: 'توفالو', ur: 'تووالو' },
  { code: 'UG', en: 'Uganda', ar: 'أوغندا', ur: 'یوگنڈا' },
  { code: 'UA', en: 'Ukraine', ar: 'أوكرانيا', ur: 'یوکرین' },
  { code: 'AE', en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة', ur: 'متحدہ عرب امارات' },
  { code: 'GB', en: 'United Kingdom', ar: 'المملكة المتحدة', ur: 'برطانیہ' },
  { code: 'US', en: 'United States', ar: 'الولايات المتحدة', ur: 'ریاستہائے متحدہ' },
  { code: 'UM', en: 'United States Minor Outlying Islands', ar: 'الجزر الصغيرة النائية للولايات المتحدة', ur: 'امریکی مائنر آؤٹنگ جزائر' },
  { code: 'UY', en: 'Uruguay', ar: 'أوروجواي', ur: 'یوراگوئے' },
  { code: 'UZ', en: 'Uzbekistan', ar: 'أوزبكستان', ur: 'ازبکستان' },
  { code: 'VU', en: 'Vanuatu', ar: 'فانواتو', ur: 'وانواتو' },
  { code: 'VE', en: 'Venezuela', ar: 'فنزويلا', ur: 'وینزویلا' },
  { code: 'VN', en: 'Viet Nam', ar: 'فيتنام', ur: 'ویت نام' },
  { code: 'VG', en: 'British Virgin Islands', ar: 'جزر فيرجن البريطانية', ur: 'برطانوی ورجن جزائر' },
  { code: 'VI', en: 'U.S. Virgin Islands', ar: 'جزر فيرجن الأمريكية', ur: 'امریکی ورجن جزائر' },
  { code: 'WF', en: 'Wallis and Futuna', ar: 'واليس وفوتونا', ur: 'والس اور فوٹونا' },
  { code: 'EH', en: 'Western Sahara', ar: 'الصحراء الغربية', ur: 'مغربی صحارا' },
  { code: 'YE', en: 'Yemen', ar: 'اليمن', ur: 'یمن' },
  { code: 'ZM', en: 'Zambia', ar: 'زامبيا', ur: 'زمبابوے' },
  { code: 'ZW', en: 'Zimbabwe', ar: 'زيمبابوي', ur: 'زمبابوے' }
];

// --- RELIGIONS ---
const RELIGIONS = [
  { id: 'islam', en: 'Islam', ar: 'الإسلام', ur: 'اسلام' },
  { id: 'christianity', en: 'Christianity', ar: 'المسيحية', ur: 'عیسائیت' },
  { id: 'judaism', en: 'Judaism', ar: 'اليهودية', ur: 'یہودیت' },
  { id: 'buddhism', en: 'Buddhism', ar: 'البوذية', ur: 'بدھ مت' },
  { id: 'hinduism', en: 'Hinduism', ar: 'الهندوسية', ur: 'ہندومت' },
  { id: 'sikhism', en: 'Sikhism', ar: 'السيخية', ur: 'سکھ مت' },
  { id: 'bahai', en: "Bahá'í", ar: 'البهائية', ur: 'بہاء' },
  { id: 'confucianism', en: 'Confucianism', ar: 'الكونفوشيوسية', ur: 'کنفیوشسازم' },
  { id: 'taoism', en: 'Taoism', ar: 'الطاوية', ur: 'تاؤ ازم' },
  { id: 'shinto', en: 'Shinto', ar: 'الشنتو', ur: 'شنٹو' },
  { id: 'atheism', en: 'Atheism / Non-religious', ar: 'ملحد / غير متدين', ur: 'الحاد / غیر مذہبی' }
];

// --- SUPPORTED LANGUAGES ---
const LANGUAGES = [
  { code: 'ar', name: 'العربية' },
  { code: 'en', name: 'English' },
  { code: 'ur', name: 'اردو' }
];

// --- Helper utilities ---
function getStoredLang() {
  try {
    const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
    return prefs.language || localStorage.getItem('lang') || DEFAULT_LANG;
  } catch (e) {
    return localStorage.getItem('lang') || DEFAULT_LANG;
  }
}

function setLanguage(lang) {
  if (!lang) return;
  if (!['en', 'ar', 'ur'].includes(lang)) lang = DEFAULT_LANG;
  localStorage.setItem('lang', lang);
  // if userPrefs exists, update it too
  try {
    const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
    prefs.language = lang;
    localStorage.setItem('userPrefs', JSON.stringify(prefs));
  } catch (e) {}
  applyTranslations();
}

function getLanguage() {
  return getStoredLang() || DEFAULT_LANG;
}

// Translate a dot-path like 'navigation.home'
function translate(keyPath, lang = null) {
  const language = lang || getLanguage();
  if (!keyPath) return '';
  const parts = keyPath.split('.');
  let node = translations;
  for (let p of parts) {
    if (!node[p]) {
      // fallback: return the last segment capitalized
      return fallbackText(parts[parts.length - 1], language);
    }
    node = node[p];
  }
  if (typeof node === 'object') {
    return node[language] || node[DEFAULT_LANG] || fallbackText(parts[parts.length - 1], language);
  }
  return String(node);
}

function fallbackText(key, lang) {
  // if a translation is missing, return a readable fallback (English by default)
  const readable = key.replace(/[_\-]/g, ' ');
  if (lang === 'ar') return readable; // could apply Arabic-specific fallback if needed
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

// Apply translations to DOM elements with data-i18n attribute
function applyTranslations(root = document) {
  const elements = root.querySelectorAll('[data-i18n], [data-i18n-title]');
  elements.forEach(el => {
    let path = el.getAttribute('data-i18n');
    let attr = 'innerText';
    if (!path) {
      path = el.getAttribute('data-i18n-title');
      attr = 'title';
    }
    if (!path) return;
    const value = translate(path);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      const inputAttr = el.getAttribute('data-i18n-attr') || 'placeholder';
      if (inputAttr === 'value') {
        el.value = value;
      } else {
        el.setAttribute(inputAttr, value);
      }
    } else if (attr === 'title') {
      el.setAttribute('title', value);
    } else if (el.hasAttribute('data-i18n-html')) {
      el.innerHTML = value;
    } else {
      el.innerText = value;
    }
  });
  // Apply dir attribute for RTL languages
  const lang = getLanguage();
  if (lang === 'ar') {
    document.documentElement.setAttribute('dir', 'rtl');
  } else {
    document.documentElement.setAttribute('dir', 'ltr');
  }
}

// Initialize translations on page load
function initTranslations({ autoApply = true } = {}) {
  const lang = getStoredLang();
  if (!['en', 'ar', 'ur'].includes(lang)) {
    localStorage.setItem('lang', DEFAULT_LANG);
  }
  if (autoApply) applyTranslations();
}

// Utility to translate and set text quickly
function tSet(selector, keyPath) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.innerText = translate(keyPath);
}

// Exports
export default translations;
export {
  translations,
  COUNTRIES,
  RELIGIONS,
  LANGUAGES,
  setLanguage,
  getLanguage,
  translate,
  applyTranslations,
  initTranslations,
  tSet
};
