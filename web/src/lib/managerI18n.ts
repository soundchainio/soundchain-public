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
  // ── Global "C-3PO" expansion — fluent across the world's major tongues. Each
  // greeting is translated below; UI labels fall back to English where untranslated. ──
  { code: 'tr', name: 'Türkçe', voice: 'tr-TR-EmelNeural' },
  { code: 'vi', name: 'Tiếng Việt', voice: 'vi-VN-HoaiMyNeural' },
  { code: 'id', name: 'Bahasa Indonesia', voice: 'id-ID-GadisNeural' },
  { code: 'th', name: 'ไทย', voice: 'th-TH-PremwadeeNeural' },
  { code: 'pl', name: 'Polski', voice: 'pl-PL-ZofiaNeural' },
  { code: 'nl', name: 'Nederlands', voice: 'nl-NL-ColetteNeural' },
  { code: 'uk', name: 'Українська', voice: 'uk-UA-PolinaNeural' },
  { code: 'el', name: 'Ελληνικά', voice: 'el-GR-AthinaNeural' },
  { code: 'he', name: 'עברית', voice: 'he-IL-HilaNeural', rtl: true },
  { code: 'fa', name: 'فارسی', voice: 'fa-IR-DilaraNeural', rtl: true },
  { code: 'ur', name: 'اردو', voice: 'ur-PK-UzmaNeural', rtl: true },
  { code: 'sv', name: 'Svenska', voice: 'sv-SE-SofieNeural' },
  { code: 'nb', name: 'Norsk', voice: 'nb-NO-PernilleNeural' },
  { code: 'da', name: 'Dansk', voice: 'da-DK-ChristelNeural' },
  { code: 'fi', name: 'Suomi', voice: 'fi-FI-NooraNeural' },
  { code: 'cs', name: 'Čeština', voice: 'cs-CZ-VlastaNeural' },
  { code: 'ro', name: 'Română', voice: 'ro-RO-AlinaNeural' },
  { code: 'hu', name: 'Magyar', voice: 'hu-HU-NoemiNeural' },
  { code: 'bg', name: 'Български', voice: 'bg-BG-KalinaNeural' },
  { code: 'sk', name: 'Slovenčina', voice: 'sk-SK-ViktoriaNeural' },
  { code: 'hr', name: 'Hrvatski', voice: 'hr-HR-GabrijelaNeural' },
  { code: 'sr', name: 'Српски', voice: 'sr-RS-SophieNeural' },
  { code: 'ms', name: 'Bahasa Melayu', voice: 'ms-MY-YasminNeural' },
  { code: 'fil', name: 'Filipino', voice: 'fil-PH-BlessicaNeural' },
  { code: 'bn', name: 'বাংলা', voice: 'bn-IN-TanishaaNeural' },
  { code: 'ta', name: 'தமிழ்', voice: 'ta-IN-PallaviNeural' },
  { code: 'te', name: 'తెలుగు', voice: 'te-IN-ShrutiNeural' },
  { code: 'sw', name: 'Kiswahili', voice: 'sw-KE-ZuriNeural' },
  { code: 'af', name: 'Afrikaans', voice: 'af-ZA-AdriNeural' },
  { code: 'ca', name: 'Català', voice: 'ca-ES-JoanaNeural' },
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
    payInCrypto: 'Pay deposit in crypto',
    whitelistBlurb: 'Connect a wallet, pick your token, and join the booking whitelist — your on-chain deposit locks the date and reveals payout details.',
    depositAmount: 'Deposit amount', paymentToken: 'Payment token',
    walletNotConnected: 'Wallet not connected', connectWallet: 'Connect Wallet',
    starting: 'Starting…', joinWhitelist: 'Join Booking Whitelist', confirming: 'Confirming…',
    sendTo: 'Send to', pasteTxHash: 'Paste your transaction hash', confirmDeposit: 'Confirm',
    escrowFunded: 'Escrow funded', dateLocked: 'Your deposit is confirmed and the booking date is locked.',
    bookingRegistered: 'Booking registered',
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
    payInCrypto: 'Pagar depósito en cripto',
    whitelistBlurb: 'Conecta una billetera, elige tu token y únete a la lista de reservas: tu depósito on-chain bloquea la fecha y revela los datos de pago.',
    depositAmount: 'Monto del depósito', paymentToken: 'Token de pago',
    walletNotConnected: 'Billetera no conectada', connectWallet: 'Conectar billetera',
    starting: 'Iniciando…', joinWhitelist: 'Unirse a la lista de reservas', confirming: 'Confirmando…',
    sendTo: 'Enviar a', pasteTxHash: 'Pega el hash de tu transacción', confirmDeposit: 'Confirmar',
    escrowFunded: 'Depósito en garantía financiado', dateLocked: 'Tu depósito está confirmado y la fecha de la reserva está bloqueada.',
    bookingRegistered: 'Reserva registrada',
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
    payInCrypto: 'Payer l’acompte en crypto',
    whitelistBlurb: 'Connectez un portefeuille, choisissez votre jeton et rejoignez la liste de réservation : votre dépôt on-chain verrouille la date et révèle les coordonnées de paiement.',
    depositAmount: 'Montant de l’acompte', paymentToken: 'Jeton de paiement',
    walletNotConnected: 'Portefeuille non connecté', connectWallet: 'Connecter le portefeuille',
    starting: 'Démarrage…', joinWhitelist: 'Rejoindre la liste de réservation', confirming: 'Confirmation…',
    sendTo: 'Envoyer à', pasteTxHash: 'Collez le hash de votre transaction', confirmDeposit: 'Confirmer',
    escrowFunded: 'Séquestre financé', dateLocked: 'Votre acompte est confirmé et la date de réservation est verrouillée.',
    bookingRegistered: 'Réservation enregistrée',
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
    payInCrypto: '暗号資産でデポジットを支払う',
    whitelistBlurb: 'ウォレットを接続し、トークンを選んで予約ホワイトリストに参加。オンチェーンの入金で日程が確定し、支払い情報が開示されます。',
    depositAmount: 'デポジット金額', paymentToken: '支払いトークン',
    walletNotConnected: 'ウォレット未接続', connectWallet: 'ウォレットを接続',
    starting: '開始中…', joinWhitelist: '予約ホワイトリストに参加', confirming: '確認中…',
    sendTo: '送金先', pasteTxHash: 'トランザクションハッシュを貼り付け', confirmDeposit: '確認',
    escrowFunded: 'エスクロー入金完了', dateLocked: '入金が確認され、予約日が確定しました。',
    bookingRegistered: '予約を登録しました',
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
    payInCrypto: '用加密货币支付定金',
    whitelistBlurb: '连接钱包，选择代币，加入预订白名单——链上定金将锁定日期并显示收款信息。',
    depositAmount: '定金金额', paymentToken: '支付代币',
    walletNotConnected: '钱包未连接', connectWallet: '连接钱包',
    starting: '正在开始…', joinWhitelist: '加入预订白名单', confirming: '确认中…',
    sendTo: '发送至', pasteTxHash: '粘贴你的交易哈希', confirmDeposit: '确认',
    escrowFunded: '托管已入金', dateLocked: '你的定金已确认，预订日期已锁定。',
    bookingRegistered: '预订已登记',
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
  tr: {
    greetingLead: 'Hoş geldiniz. {name} adlı sanatçının menajerine ulaştınız.',
    intro: 'Bugün size nasıl yardımcı olabilirim? Bir konser ayırtabilir, iş birliği önerebilir veya ticari bir talepte bulunabilirsiniz.',
    book: 'Rezervasyon', collab: 'İş birliği', business: 'İş', hire: 'Tut', play: 'Çal', stop: 'Durdur', language: 'Dil',
  },
  vi: {
    greetingLead: 'Chào mừng. Bạn đã liên hệ với quản lý của {name}.',
    intro: 'Hôm nay tôi có thể giúp gì cho bạn? Bạn có thể đặt lịch diễn, đề xuất hợp tác hoặc gửi yêu cầu kinh doanh.',
    book: 'Đặt lịch', collab: 'Hợp tác', business: 'Kinh doanh', hire: 'Thuê', play: 'Phát', stop: 'Dừng', language: 'Ngôn ngữ',
  },
  id: {
    greetingLead: 'Selamat datang. Anda terhubung dengan manajer {name}.',
    intro: 'Ada yang bisa saya bantu hari ini? Anda dapat memesan pertunjukan, mengajukan kolaborasi, atau mengirim permintaan bisnis.',
    book: 'Pesan', collab: 'Kolaborasi', business: 'Bisnis', hire: 'Rekrut', play: 'Putar', stop: 'Berhenti', language: 'Bahasa',
  },
  th: {
    greetingLead: 'ยินดีต้อนรับ คุณได้ติดต่อผู้จัดการของ {name}',
    intro: 'วันนี้ให้ช่วยอะไรดีคะ คุณสามารถจองการแสดง เสนอความร่วมมือ หรือสอบถามเรื่องธุรกิจได้',
    book: 'จอง', collab: 'ร่วมงาน', business: 'ธุรกิจ', hire: 'ว่าจ้าง', play: 'เล่น', stop: 'หยุด', language: 'ภาษา',
  },
  pl: {
    greetingLead: 'Witamy. Łączysz się z menedżerem {name}.',
    intro: 'W czym mogę dziś pomóc? Możesz zarezerwować występ, zaproponować współpracę lub złożyć zapytanie biznesowe.',
    book: 'Rezerwuj', collab: 'Współpraca', business: 'Biznes', hire: 'Zatrudnij', play: 'Odtwórz', stop: 'Zatrzymaj', language: 'Język',
  },
  nl: {
    greetingLead: 'Welkom. Je hebt de manager van {name} bereikt.',
    intro: 'Hoe kan ik je vandaag helpen? Je kunt een optreden boeken, een samenwerking voorstellen of een zakelijke aanvraag doen.',
    book: 'Boeken', collab: 'Samenwerken', business: 'Zakelijk', hire: 'Inhuren', play: 'Afspelen', stop: 'Stop', language: 'Taal',
  },
  uk: {
    greetingLead: "Вітаємо. Ви зв'язалися з менеджером {name}.",
    intro: 'Чим я можу допомогти? Ви можете замовити виступ, запропонувати співпрацю або надіслати діловий запит.',
    book: 'Замовити', collab: 'Співпраця', business: 'Бізнес', hire: 'Найняти', play: 'Відтворити', stop: 'Стоп', language: 'Мова',
  },
  el: {
    greetingLead: 'Καλώς ήρθατε. Επικοινωνήσατε με τον μάνατζερ του/της {name}.',
    intro: 'Πώς μπορώ να σας βοηθήσω σήμερα; Μπορείτε να κλείσετε εμφάνιση, να προτείνετε συνεργασία ή να κάνετε επαγγελματικό αίτημα.',
    book: 'Κράτηση', collab: 'Συνεργασία', business: 'Επιχείρηση', hire: 'Πρόσληψη', play: 'Αναπαραγωγή', stop: 'Διακοπή', language: 'Γλώσσα',
  },
  he: {
    greetingLead: 'ברוכים הבאים. הגעתם למנהל של {name}.',
    intro: 'כיצד אוכל לעזור לכם היום? תוכלו להזמין הופעה, להציע שיתוף פעולה או לשלוח פנייה עסקית.',
    book: 'הזמנה', collab: 'שיתוף פעולה', business: 'עסקים', hire: 'שכירה', play: 'נגן', stop: 'עצור', language: 'שפה',
  },
  fa: {
    greetingLead: 'خوش آمدید. شما با مدیر برنامه‌های {name} در ارتباط هستید.',
    intro: 'امروز چطور می‌توانم کمکتان کنم؟ می‌توانید اجرا رزرو کنید، همکاری پیشنهاد دهید یا درخواست تجاری ارسال کنید.',
    book: 'رزرو', collab: 'همکاری', business: 'تجاری', hire: 'استخدام', play: 'پخش', stop: 'توقف', language: 'زبان',
  },
  ur: {
    greetingLead: 'خوش آمدید۔ آپ {name} کے مینیجر سے رابطے میں ہیں۔',
    intro: 'آج میں آپ کی کیا مدد کر سکتا ہوں؟ آپ شو بک کر سکتے ہیں، تعاون کی تجویز دے سکتے ہیں، یا کاروباری استفسار کر سکتے ہیں۔',
    book: 'بکنگ', collab: 'تعاون', business: 'کاروبار', hire: 'ملازمت', play: 'چلائیں', stop: 'روکیں', language: 'زبان',
  },
  sv: {
    greetingLead: 'Välkommen. Du har nått {name}s manager.',
    intro: 'Hur kan jag hjälpa dig idag? Du kan boka en spelning, föreslå ett samarbete eller göra en affärsförfrågan.',
    book: 'Boka', collab: 'Samarbeta', business: 'Affärer', hire: 'Anlita', play: 'Spela', stop: 'Stoppa', language: 'Språk',
  },
  nb: {
    greetingLead: 'Velkommen. Du har nådd manageren til {name}.',
    intro: 'Hvordan kan jeg hjelpe deg i dag? Du kan booke en opptreden, foreslå et samarbeid eller sende en forretningsforespørsel.',
    book: 'Book', collab: 'Samarbeid', business: 'Forretning', hire: 'Ansett', play: 'Spill', stop: 'Stopp', language: 'Språk',
  },
  da: {
    greetingLead: 'Velkommen. Du har kontaktet {name}s manager.',
    intro: 'Hvordan kan jeg hjælpe dig i dag? Du kan booke et show, foreslå et samarbejde eller sende en forretningsforespørgsel.',
    book: 'Book', collab: 'Samarbejd', business: 'Forretning', hire: 'Hyr', play: 'Afspil', stop: 'Stop', language: 'Sprog',
  },
  fi: {
    greetingLead: 'Tervetuloa. Olet tavoittanut {name}n managerin.',
    intro: 'Miten voin auttaa sinua tänään? Voit varata keikan, ehdottaa yhteistyötä tai tehdä liiketoimintatiedustelun.',
    book: 'Varaa', collab: 'Yhteistyö', business: 'Liiketoiminta', hire: 'Palkkaa', play: 'Toista', stop: 'Pysäytä', language: 'Kieli',
  },
  cs: {
    greetingLead: 'Vítejte. Spojili jste se s manažerem {name}.',
    intro: 'Jak vám mohu dnes pomoci? Můžete si rezervovat vystoupení, navrhnout spolupráci nebo poslat obchodní poptávku.',
    book: 'Rezervovat', collab: 'Spolupráce', business: 'Byznys', hire: 'Najmout', play: 'Přehrát', stop: 'Zastavit', language: 'Jazyk',
  },
  ro: {
    greetingLead: 'Bun venit. Ați contactat managerul lui {name}.',
    intro: 'Cu ce vă pot ajuta astăzi? Puteți rezerva un spectacol, propune o colaborare sau trimite o solicitare de afaceri.',
    book: 'Rezervă', collab: 'Colaborare', business: 'Afaceri', hire: 'Angajează', play: 'Redă', stop: 'Oprește', language: 'Limbă',
  },
  hu: {
    greetingLead: 'Üdvözöljük. {name} menedzserét érte el.',
    intro: 'Miben segíthetek ma? Foglalhat fellépést, javasolhat együttműködést, vagy üzleti megkeresést küldhet.',
    book: 'Foglalás', collab: 'Együttműködés', business: 'Üzlet', hire: 'Felfogad', play: 'Lejátszás', stop: 'Leállítás', language: 'Nyelv',
  },
  bg: {
    greetingLead: 'Добре дошли. Свързахте се с мениджъра на {name}.',
    intro: 'Как мога да помогна днес? Можете да резервирате участие, да предложите сътрудничество или да изпратите бизнес запитване.',
    book: 'Резервирай', collab: 'Сътрудничество', business: 'Бизнес', hire: 'Наеми', play: 'Пусни', stop: 'Спри', language: 'Език',
  },
  sk: {
    greetingLead: 'Vitajte. Spojili ste sa s manažérom {name}.',
    intro: 'Ako vám môžem dnes pomôcť? Môžete si rezervovať vystúpenie, navrhnúť spoluprácu alebo poslať obchodný dopyt.',
    book: 'Rezervovať', collab: 'Spolupráca', business: 'Biznis', hire: 'Najať', play: 'Prehrať', stop: 'Zastaviť', language: 'Jazyk',
  },
  hr: {
    greetingLead: 'Dobrodošli. Povezali ste se s menadžerom izvođača {name}.',
    intro: 'Kako vam mogu pomoći danas? Možete rezervirati nastup, predložiti suradnju ili poslati poslovni upit.',
    book: 'Rezerviraj', collab: 'Suradnja', business: 'Posao', hire: 'Angažiraj', play: 'Reproduciraj', stop: 'Zaustavi', language: 'Jezik',
  },
  sr: {
    greetingLead: 'Добродошли. Повезали сте се са менаџером извођача {name}.',
    intro: 'Како могу да помогнем данас? Можете резервисати наступ, предложити сарадњу или послати пословни упит.',
    book: 'Резервиши', collab: 'Сарадња', business: 'Посао', hire: 'Ангажуј', play: 'Пусти', stop: 'Заустави', language: 'Језик',
  },
  ms: {
    greetingLead: 'Selamat datang. Anda telah menghubungi pengurus {name}.',
    intro: 'Bagaimana saya boleh membantu anda hari ini? Anda boleh menempah persembahan, mencadangkan kerjasama, atau membuat pertanyaan perniagaan.',
    book: 'Tempah', collab: 'Kerjasama', business: 'Perniagaan', hire: 'Upah', play: 'Main', stop: 'Henti', language: 'Bahasa',
  },
  fil: {
    greetingLead: 'Maligayang pagdating. Naabot mo ang manager ni {name}.',
    intro: 'Paano kita matutulungan ngayon? Maaari kang mag-book ng palabas, magmungkahi ng kolaborasyon, o magpadala ng business inquiry.',
    book: 'Mag-book', collab: 'Kolaborasyon', business: 'Negosyo', hire: 'Umupa', play: 'I-play', stop: 'Itigil', language: 'Wika',
  },
  bn: {
    greetingLead: 'স্বাগতম। আপনি {name}-এর ম্যানেজারের সাথে যুক্ত হয়েছেন।',
    intro: 'আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি? আপনি একটি শো বুক করতে পারেন, সহযোগিতার প্রস্তাব দিতে পারেন, বা ব্যবসায়িক জিজ্ঞাসা করতে পারেন।',
    book: 'বুক করুন', collab: 'সহযোগিতা', business: 'ব্যবসা', hire: 'নিয়োগ', play: 'চালান', stop: 'থামুন', language: 'ভাষা',
  },
  ta: {
    greetingLead: 'வரவேற்கிறோம். நீங்கள் {name} இன் மேலாளரைத் தொடர்பு கொண்டுள்ளீர்கள்.',
    intro: 'இன்று நான் எப்படி உதவ முடியும்? நீங்கள் ஒரு நிகழ்ச்சியை முன்பதிவு செய்யலாம், கூட்டுப்பணியை முன்மொழியலாம் அல்லது வணிக விசாரணை செய்யலாம்.',
    book: 'முன்பதிவு', collab: 'கூட்டுப்பணி', business: 'வணிகம்', hire: 'நியமி', play: 'இயக்கு', stop: 'நிறுத்து', language: 'மொழி',
  },
  te: {
    greetingLead: 'స్వాగతం. మీరు {name} మేనేజర్‌ను సంప్రదించారు.',
    intro: 'ఈ రోజు నేను మీకు ఎలా సహాయపడగలను? మీరు ప్రదర్శనను బుక్ చేయవచ్చు, సహకారాన్ని ప్రతిపాదించవచ్చు లేదా వ్యాపార విచారణ చేయవచ్చు.',
    book: 'బుక్ చేయి', collab: 'సహకారం', business: 'వ్యాపారం', hire: 'నియమించు', play: 'ప్లే', stop: 'ఆపు', language: 'భాష',
  },
  sw: {
    greetingLead: 'Karibu. Umewasiliana na meneja wa {name}.',
    intro: 'Naweza kukusaidiaje leo? Unaweza kuagiza onyesho, kupendekeza ushirikiano, au kutuma ombi la kibiashara.',
    book: 'Agiza', collab: 'Ushirikiano', business: 'Biashara', hire: 'Ajiri', play: 'Cheza', stop: 'Simamisha', language: 'Lugha',
  },
  af: {
    greetingLead: "Welkom. Jy het {name} se bestuurder bereik.",
    intro: "Hoe kan ek jou vandag help? Jy kan 'n vertoning bespreek, 'n samewerking voorstel, of 'n besigheidsnavraag doen.",
    book: 'Bespreek', collab: 'Saamwerk', business: 'Besigheid', hire: 'Huur', play: 'Speel', stop: 'Stop', language: 'Taal',
  },
  ca: {
    greetingLead: 'Benvingut. Has contactat amb el mànager de {name}.',
    intro: 'Com et puc ajudar avui? Pots reservar un concert, proposar una col·laboració o fer una consulta de negocis.',
    book: 'Reserva', collab: 'Col·laborar', business: 'Negocis', hire: 'Contractar', play: 'Reprodueix', stop: 'Atura', language: 'Idioma',
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
