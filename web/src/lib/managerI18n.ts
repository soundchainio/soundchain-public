// ─── Manager polyglot layer ───────────────────────────────────────────────────
// The agent speaks on the pro's behalf in the VISITOR's language. A promoter in
// Japan lands on a USA DJ's page → greeting, intent prompt, and CTAs render in
// Japanese, and the greeting is spoken in a Japanese neural voice. Self-contained
// static i18n (instant, free, offline) + a language→voice map onto the existing
// 66-locale TTS. English is always the fallback.

export interface ManagerLocale {
  code: string   // BCP-47 base, e.g. 'ja'
  name: string   // endonym shown in the picker
  voice: string  // default Edge-TTS neural voice for spoken greeting
  rtl?: boolean
}

// Languages with strong neural-voice coverage. Voice names are standard Edge-TTS
// voices (msedge-tts accepts them directly — no need to be in voices.ts).
export const MANAGER_LOCALES: ManagerLocale[] = [
  { code: 'en', name: 'English', voice: 'en-US-EmmaMultilingualNeural' },
  { code: 'es', name: 'Español', voice: 'es-ES-ElviraNeural' },
  { code: 'fr', name: 'Français', voice: 'fr-FR-DeniseNeural' },
  { code: 'de', name: 'Deutsch', voice: 'de-DE-KatjaNeural' },
  { code: 'pt', name: 'Português', voice: 'pt-BR-FranciscaNeural' },
  { code: 'it', name: 'Italiano', voice: 'it-IT-ElsaNeural' },
  { code: 'ja', name: '日本語', voice: 'ja-JP-NanamiNeural' },
  { code: 'ko', name: '한국어', voice: 'ko-KR-SunHiNeural' },
  { code: 'zh', name: '中文', voice: 'zh-CN-XiaoxiaoNeural' },
  { code: 'ru', name: 'Русский', voice: 'ru-RU-SvetlanaNeural' },
  { code: 'ar', name: 'العربية', voice: 'ar-SA-ZariyahNeural', rtl: true },
  { code: 'hi', name: 'हिन्दी', voice: 'hi-IN-SwaraNeural' },
]

type Dict = Record<string, string>

// {name} is interpolated. Keep strings short + natural — the spoken hook in the
// visitor's language is the magic; rich details live in the Booking Details card.
const STRINGS: Record<string, Dict> = {
  en: {
    greetingLead: "Welcome. You've reached the manager for {name}.",
    intro: 'How can I help you today? You can book a show, propose a collaboration, or make a business inquiry.',
    intentQuestion: 'What brings you here?',
    book: 'Book', collab: 'Collaborate', business: 'Business', hire: 'Hire',
    bookDesc: 'Shows, events, residencies',
    collabDesc: 'Features, remixes, co-writes',
    businessDesc: 'Licensing, press, management',
    profile: 'Full Profile', profileDesc: 'Listen, follow, explore',
    play: 'Play', stop: 'Stop', loading: 'Loading',
    language: 'Language', bookingDetails: 'Booking Details',
  },
  es: {
    greetingLead: 'Bienvenido. Has contactado con el representante de {name}.',
    intro: '¿En qué puedo ayudarte hoy? Puedes reservar un show, proponer una colaboración o hacer una consulta de negocios.',
    intentQuestion: '¿Qué te trae por aquí?',
    book: 'Reservar', collab: 'Colaborar', business: 'Negocios', hire: 'Contratar',
    bookDesc: 'Shows, eventos, residencias',
    collabDesc: 'Colaboraciones, remixes, co-escritura',
    businessDesc: 'Licencias, prensa, management',
    profile: 'Perfil completo', profileDesc: 'Escucha, sigue, explora',
    play: 'Reproducir', stop: 'Detener', loading: 'Cargando',
    language: 'Idioma', bookingDetails: 'Detalles de reserva',
  },
  fr: {
    greetingLead: 'Bienvenue. Vous êtes en contact avec le manager de {name}.',
    intro: "Comment puis-je vous aider aujourd'hui ? Vous pouvez réserver un concert, proposer une collaboration ou faire une demande professionnelle.",
    intentQuestion: "Qu'est-ce qui vous amène ?",
    book: 'Réserver', collab: 'Collaborer', business: 'Professionnel', hire: 'Engager',
    bookDesc: 'Concerts, événements, résidences',
    collabDesc: 'Featurings, remixes, co-écritures',
    businessDesc: 'Licences, presse, management',
    profile: 'Profil complet', profileDesc: 'Écouter, suivre, explorer',
    play: 'Lecture', stop: 'Arrêter', loading: 'Chargement',
    language: 'Langue', bookingDetails: 'Détails de réservation',
  },
  de: {
    greetingLead: 'Willkommen. Sie haben das Management von {name} erreicht.',
    intro: 'Wie kann ich Ihnen heute helfen? Sie können einen Auftritt buchen, eine Zusammenarbeit vorschlagen oder eine geschäftliche Anfrage stellen.',
    intentQuestion: 'Was führt Sie her?',
    book: 'Buchen', collab: 'Zusammenarbeit', business: 'Geschäftlich', hire: 'Engagieren',
    bookDesc: 'Auftritte, Events, Residenzen',
    collabDesc: 'Features, Remixe, Co-Writing',
    businessDesc: 'Lizenzen, Presse, Management',
    profile: 'Vollständiges Profil', profileDesc: 'Hören, folgen, entdecken',
    play: 'Abspielen', stop: 'Stopp', loading: 'Lädt',
    language: 'Sprache', bookingDetails: 'Buchungsdetails',
  },
  pt: {
    greetingLead: 'Bem-vindo. Você falou com o empresário de {name}.',
    intro: 'Como posso ajudar hoje? Você pode agendar um show, propor uma colaboração ou fazer uma consulta comercial.',
    intentQuestion: 'O que traz você aqui?',
    book: 'Agendar', collab: 'Colaborar', business: 'Negócios', hire: 'Contratar',
    bookDesc: 'Shows, eventos, residências',
    collabDesc: 'Participações, remixes, co-autoria',
    businessDesc: 'Licenciamento, imprensa, gestão',
    profile: 'Perfil completo', profileDesc: 'Ouça, siga, explore',
    play: 'Reproduzir', stop: 'Parar', loading: 'Carregando',
    language: 'Idioma', bookingDetails: 'Detalhes da reserva',
  },
  it: {
    greetingLead: 'Benvenuto. Hai raggiunto il manager di {name}.',
    intro: 'Come posso aiutarti oggi? Puoi prenotare uno show, proporre una collaborazione o fare una richiesta commerciale.',
    intentQuestion: 'Cosa ti porta qui?',
    book: 'Prenota', collab: 'Collabora', business: 'Affari', hire: 'Ingaggia',
    bookDesc: 'Show, eventi, residenze',
    collabDesc: 'Featuring, remix, co-scrittura',
    businessDesc: 'Licenze, stampa, management',
    profile: 'Profilo completo', profileDesc: 'Ascolta, segui, esplora',
    play: 'Riproduci', stop: 'Ferma', loading: 'Caricamento',
    language: 'Lingua', bookingDetails: 'Dettagli prenotazione',
  },
  ja: {
    greetingLead: 'ようこそ。{name}のマネージャーです。',
    intro: '本日はどのようなご用件でしょうか？ ライブのご予約、コラボのご提案、ビジネスのお問い合わせが可能です。',
    intentQuestion: 'ご用件をお選びください。',
    book: '予約', collab: 'コラボ', business: 'ビジネス', hire: '依頼',
    bookDesc: 'ライブ・イベント・レジデンシー',
    collabDesc: '客演・リミックス・共作',
    businessDesc: 'ライセンス・取材・マネジメント',
    profile: 'プロフィール', profileDesc: '視聴・フォロー・探索',
    play: '再生', stop: '停止', loading: '読み込み中',
    language: '言語', bookingDetails: '予約の詳細',
  },
  ko: {
    greetingLead: '환영합니다. {name}님의 매니저입니다.',
    intro: '무엇을 도와드릴까요? 공연 예약, 협업 제안, 비즈니스 문의가 가능합니다.',
    intentQuestion: '어떻게 오셨나요?',
    book: '예약', collab: '협업', business: '비즈니스', hire: '섭외',
    bookDesc: '공연, 이벤트, 레지던시',
    collabDesc: '피처링, 리믹스, 공동작업',
    businessDesc: '라이선스, 언론, 매니지먼트',
    profile: '전체 프로필', profileDesc: '감상, 팔로우, 탐색',
    play: '재생', stop: '정지', loading: '로딩 중',
    language: '언어', bookingDetails: '예약 정보',
  },
  zh: {
    greetingLead: '欢迎。这里是 {name} 的经纪人。',
    intro: '今天有什么可以帮您？您可以预订演出、提出合作或商务咨询。',
    intentQuestion: '请问您的来意？',
    book: '预订', collab: '合作', business: '商务', hire: '聘请',
    bookDesc: '演出、活动、驻场',
    collabDesc: '客串、混音、合作创作',
    businessDesc: '授权、媒体、经纪',
    profile: '完整资料', profileDesc: '试听、关注、探索',
    play: '播放', stop: '停止', loading: '加载中',
    language: '语言', bookingDetails: '预订详情',
  },
  ru: {
    greetingLead: 'Добро пожаловать. Вы связались с менеджером {name}.',
    intro: 'Чем я могу помочь? Вы можете заказать выступление, предложить сотрудничество или отправить деловой запрос.',
    intentQuestion: 'Что вас привело?',
    book: 'Заказать', collab: 'Сотрудничество', business: 'Бизнес', hire: 'Нанять',
    bookDesc: 'Выступления, события, резиденции',
    collabDesc: 'Фиты, ремиксы, со-авторство',
    businessDesc: 'Лицензии, пресса, менеджмент',
    profile: 'Полный профиль', profileDesc: 'Слушать, подписаться, открыть',
    play: 'Воспроизвести', stop: 'Стоп', loading: 'Загрузка',
    language: 'Язык', bookingDetails: 'Детали бронирования',
  },
  ar: {
    greetingLead: 'مرحبًا. لقد وصلت إلى مدير أعمال {name}.',
    intro: 'كيف يمكنني مساعدتك اليوم؟ يمكنك حجز حفلة، أو اقتراح تعاون، أو تقديم استفسار تجاري.',
    intentQuestion: 'ما الذي أتى بك إلى هنا؟',
    book: 'حجز', collab: 'تعاون', business: 'أعمال', hire: 'توظيف',
    bookDesc: 'حفلات، فعاليات، إقامات',
    collabDesc: 'مشاركات، ريمكسات، تأليف مشترك',
    businessDesc: 'تراخيص، صحافة، إدارة',
    profile: 'الملف الكامل', profileDesc: 'استمع، تابع، استكشف',
    play: 'تشغيل', stop: 'إيقاف', loading: 'جارٍ التحميل',
    language: 'اللغة', bookingDetails: 'تفاصيل الحجز',
  },
  hi: {
    greetingLead: 'स्वागत है। आप {name} के मैनेजर से जुड़े हैं।',
    intro: 'आज मैं आपकी कैसे मदद कर सकता हूँ? आप शो बुक कर सकते हैं, सहयोग का प्रस्ताव दे सकते हैं, या व्यावसायिक पूछताछ कर सकते हैं।',
    intentQuestion: 'आप किस लिए आए हैं?',
    book: 'बुक करें', collab: 'सहयोग', business: 'व्यापार', hire: 'नियुक्त करें',
    bookDesc: 'शो, इवेंट, रेज़िडेंसी',
    collabDesc: 'फ़ीचर, रीमिक्स, को-राइट',
    businessDesc: 'लाइसेंसिंग, प्रेस, प्रबंधन',
    profile: 'पूरा प्रोफ़ाइल', profileDesc: 'सुनें, फ़ॉलो करें, एक्सप्लोर करें',
    play: 'चलाएँ', stop: 'रोकें', loading: 'लोड हो रहा है',
    language: 'भाषा', bookingDetails: 'बुकिंग विवरण',
  },
}

export function baseLang(lang: string | undefined): string {
  return (lang || 'en').toLowerCase().split('-')[0]
}

export function localeFor(lang: string | undefined): ManagerLocale {
  const base = baseLang(lang)
  return MANAGER_LOCALES.find(l => l.code === base) || MANAGER_LOCALES[0]
}

export function t(lang: string | undefined, key: string, vars?: Record<string, string>): string {
  const dict = STRINGS[baseLang(lang)] || STRINGS.en
  let s = dict[key] || STRINGS.en[key] || key
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(vars[k])
  return s
}

// The whole spoken greeting in the visitor's language (lead + intro).
export function localizedGreeting(lang: string | undefined, name: string): string {
  return `${t(lang, 'greetingLead', { name })} ${t(lang, 'intro')}`
}

export function detectVisitorLang(): string {
  if (typeof navigator === 'undefined') return 'en'
  return navigator.language || (navigator.languages && navigator.languages[0]) || 'en'
}
