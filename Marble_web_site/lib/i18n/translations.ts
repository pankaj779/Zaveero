export type Locale = "en" | "hi";

export const LOCALES: { code: Locale; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिंदी" },
];

export type TranslationKeys = {
  nav: Record<keyof typeof en.nav, string>;
  hero: Record<keyof typeof en.hero, string>;
  about: {
    subtitle: string;
    title: string;
    description: string;
    founder: string;
    p1: string;
    p2: string;
    stats: Record<keyof typeof en.about.stats, string>;
  };
  services: Record<keyof typeof en.services, string>;
  portfolio: Record<keyof typeof en.portfolio, string>;
  why: Record<keyof typeof en.why, string>;
  pricing: Record<keyof typeof en.pricing, string>;
  testimonials: Record<keyof typeof en.testimonials, string>;
  contact: Record<keyof typeof en.contact, string>;
  footer: Record<keyof typeof en.footer, string>;
  categories: Record<keyof typeof en.categories, string>;
  getQuote: Record<keyof typeof en.getQuote, string>;
  trackQuote: Record<keyof typeof en.trackQuote, string>;
};

export const en = {
  nav: {
    home: "Home",
    about: "About",
    services: "Services",
    projects: "Projects",
    pricing: "Pricing",
    testimonials: "Testimonials",
    contact: "Contact",
    getQuote: "Get Quote",
    trackQuote: "Track Quote",
    login: "Login",
    sendQuotation: "Send Quotation",
    admin: "Admin",
  },
  hero: {
    tagline: "Premium Marble, Granite & Tile Installation",
    title1: "Crafting Timeless",
    title2: "Spaces in Stone",
    description:
      "Sanjana Stone Arts specializes in premium marble, granite, and tile installation for discerning architects, builders, and homeowners who demand flawless craftsmanship.",
    viewProjects: "View Projects",
    contactUs: "Contact Us",
    scroll: "Scroll",
  },
  about: {
    subtitle: "About Us",
    title: "Masters of Stone & Tile Craftsmanship",
    description:
      "Led by Devisingh Prajapathi, Sanjana Stone Arts has built a reputation for exceptional workmanship in marble, granite, and tile installation across residential and commercial projects.",
    founder: "Founder & Master Contractor",
    p1: "With over 30 years of experience in the stone and tile industry, Devisingh Prajapathi founded Sanjana Stone Arts with a singular vision: to deliver world-class marble, granite, and tile installation that meets the exacting standards of architects, engineers, and premium clients.",
    p2: "Every project is executed with meticulous attention to detail — from material selection and precision cutting to final polishing and quality inspection. Our commitment to timely delivery and professional execution has made us a trusted partner for luxury homes, hotels, commercial spaces, and high-end interiors.",
    stats: {
      experience: "Years Experience",
      projects: "Projects Completed",
      clients: "Happy Clients",
      satisfaction: "Client Satisfaction",
    },
  },
  services: {
    subtitle: "Our Services",
    title: "Comprehensive Stone & Tile Solutions",
    description:
      "From luxury marble flooring to precision tile fixing, we deliver end-to-end contracting services for residential and commercial projects.",
  },
  portfolio: {
    subtitle: "Our Portfolio",
    title: "Featured Projects",
    description:
      "Explore our portfolio of marble, granite, and tile installations across luxury residential and commercial spaces.",
    empty: "No projects found in this category.",
    client: "Client",
    videos: "Project Videos",
    ownerNote: "Website owner? Add photos & videos from",
    ownerLink: "Admin → Projects",
  },
  why: {
    subtitle: "Why Choose Us",
    title: "The Sanjana Stone Arts Difference",
    description:
      "We combine skilled craftsmanship with professional project management to deliver results that exceed expectations.",
  },
  pricing: {
    subtitle: "Rate Card",
    title: "Professional Pricing",
    description:
      "Transparent rate cards for marble, granite, and tile works — available with or without material supply.",
    withMaterial: "With Material",
    withoutMaterial: "Without Material",
    itemName: "Item Name",
    unit: "Unit",
    rate: "Rate",
    disclaimer:
      "* Rates are indicative and may vary based on material grade, project scope, and site conditions.",
    ownerNote: "Website owner? Add or edit rates from",
    ownerLink: "Admin → Pricing",
    marble: "Marble Works",
    granite: "Granite Works",
    tile: "Tile Works",
    empty: "No rates available for this category.",
    quoteNote: "These are our rates — add similar items in your quote request.",
    quoteLink: "Get a detailed quote",
  },
  testimonials: {
    subtitle: "Testimonials",
    title: "What Our Clients Say",
    description:
      "Trusted by architects, builders, engineers, and homeowners for premium stone and tile craftsmanship.",
    leaveReview: "Share Your Experience",
    leaveReviewHint:
      "Worked with us? Leave a rating and review — no login needed. We approve reviews before they appear on the site.",
    yourRating: "Your rating",
    yourName: "Your name",
    yourRole: "Your role (optional)",
    yourReview: "Your review",
    namePlaceholder: "Your full name",
    rolePlaceholder: "Homeowner, Builder, Architect...",
    reviewPlaceholder: "Tell others about the quality of our work...",
    submitReview: "Submit Review",
    submitting: "Submitting...",
    submitSuccess:
      "Thank you! Your review was submitted and will appear after we approve it.",
  },
  contact: {
    subtitle: "Contact Us",
    title: "Let's Build Something Exceptional",
    description:
      "Reach out for project consultations, quotations, or site visits. We respond to all inquiries promptly.",
    owner: "Owner",
    email: "Email",
    phone: "Phone",
    address: "Address",
    yourName: "Your Name",
    emailAddress: "Email Address",
    phoneNumber: "Phone Number",
    serviceInterest: "Service Interest",
    message: "Message",
    send: "Send Message",
    sending: "Sending...",
    success:
      "Thank you! Your message has been received. We will contact you shortly.",
    placeholderName: "John Doe",
    placeholderEmail: "you@example.com",
    placeholderPhone: "+91 XXXXX XXXXX",
    placeholderMessage: "Tell us about your project...",
    quotationCta: "Need a detailed quote?",
    quotationLink: "Fill the quote form above",
  },
  getQuote: {
    subtitle: "Get a Quote",
    title: "Request Your Quotation",
    description:
      "No account needed. Tell us about your project and we'll send you a reference number to track anytime.",
    step1Label: "Step 1 — Your details",
    step2Label: "Step 2 — Your project",
    step3Label: "Step 3 — Items & rates",
    step1Error: "Please enter your name, phone, and location.",
    step2Error: "Please enter project title, work description, and select at least one service.",
    serviceTypeError: "Please select at least one service type (Marble, Granite, Tiles, or Other).",
    itemsError: "Add at least one line item.",
    name: "Your Name",
    phone: "Phone Number",
    emailOptional: "Email (optional)",
    location: "Project Location",
    namePlaceholder: "Your full name",
    phonePlaceholder: "+91 XXXXX XXXXX",
    emailPlaceholder: "you@example.com",
    locationPlaceholder: "City or site address",
    projectTitle: "Project Title",
    serviceType: "What work do you need?",
    serviceTypeHint: "Select all that apply — most homes need more than one.",
    workDescription: "Work Description",
    projectPlaceholder: "Marble flooring for 1200 SFT villa",
    descriptionPlaceholder: "Describe the work you need — rooms, materials, timeline...",
    quickAdd: "Quick add from rate card",
    itemName: "Item Name",
    unit: "Unit",
    quantity: "Qty",
    rate: "Rate (₹)",
    addItem: "Add Item",
    estimatedTotal: "Estimated Total",
    back: "Back",
    next: "Next",
    submit: "Submit Quote",
    submitting: "Submitting...",
    successTitle: "Quote Submitted",
    saveReference: "Save this number. Use Track Quote anytime with your phone.",
    emailSent: "A copy has been sent to {email}",
    trackThis: "Track this quote",
    callUs: "Call us",
    whatsappUs: "WhatsApp us",
  },
  trackQuote: {
    title: "Track Your Quote",
    description: "Enter your reference number and phone number to view your submission.",
    referenceCode: "Reference Number",
    phone: "Phone Number",
    search: "Find Quote",
    searching: "Searching...",
    submitted: "Submitted",
  },
  footer: {
    quickLinks: "Quick Links",
    ourServices: "Our Services",
    contact: "Contact",
    rights: "All rights reserved.",
    ownedBy: "Owned by",
  },
  categories: {
    all: "All",
    marble: "Marble",
    granite: "Granite",
    tiles: "Tiles",
    commercial: "Commercial",
    residential: "Residential",
  },
} as const;

export const hi: TranslationKeys = {
  nav: {
    home: "होम",
    about: "हमारे बारे में",
    services: "सेवाएं",
    projects: "प्रोजेक्ट",
    pricing: "दर सूची",
    testimonials: "प्रशंसापत्र",
    contact: "संपर्क",
    getQuote: "कोटेशन लें",
    trackQuote: "कोटेशन ट्रैक करें",
    login: "लॉगिन",
    sendQuotation: "कोटेशन भेजें",
    admin: "एडमिन",
  },
  hero: {
    tagline: "प्रीमियम मार्बल, ग्रेनाइट और टाइल इंस्टॉलेशन",
    title1: "पत्थर में",
    title2: "कालातीत स्थान",
    description:
      "संजना स्टोन आर्ट्स प्रीमियम मार्बल, ग्रेनाइट और टाइल इंस्टॉलेशन में विशेषज्ञ है — वास्तुकारों, बिल्डरों और ग्राहकों के लिए जो बेहतरीन कारीगरी चाहते हैं।",
    viewProjects: "प्रोजेक्ट देखें",
    contactUs: "संपर्क करें",
    scroll: "नीचे देखें",
  },
  about: {
    subtitle: "हमारे बारे में",
    title: "पत्थर और टाइल कारीगरी के विशेषज्ञ",
    description:
      "देवीसिंह प्रजापति के नेतृत्व में, संजना स्टोन आर्ट्स ने आवासीय और व्यावसायिक परियोजनाओं में मार्बल, ग्रेनाइट और टाइल इंस्टॉलेशन में उत्कृष्टता की पहचान बनाई है।",
    founder: "संस्थापक और मास्टर कॉन्ट्रैक्टर",
    p1: "30 से अधिक वर्षों के अनुभव के साथ, देवीसिंह प्रजापति ने संजना स्टोन आर्ट्स की स्थापना एक लक्ष्य के साथ की: विश्व स्तरीय मार्बल, ग्रेनाइट और टाइल इंस्टॉलेशन प्रदान करना।",
    p2: "हर परियोजना सावधानीपूर्वक विवरण पर ध्यान देकर पूरी की जाती है — सामग्री चयन, सटीक काटने से लेकर अंतिम पॉलिशिंग और गुणवत्ता जांच तक।",
    stats: {
      experience: "वर्षों का अनुभव",
      projects: "पूर्ण परियोजनाएं",
      clients: "खुश ग्राहक",
      satisfaction: "ग्राहक संतुष्टि",
    },
  },
  services: {
    subtitle: "हमारी सेवाएं",
    title: "संपूर्ण पत्थर और टाइल समाधान",
    description:
      "लक्जरी मार्बल फर्श से लेकर सटीक टाइल फिक्सिंग तक, हम आवासीय और व्यावसायिक परियोजनाओं के लिए पूर्ण सेवाएं प्रदान करते हैं।",
  },
  portfolio: {
    subtitle: "हमारा पोर्टफोलियो",
    title: "विशेष परियोजनाएं",
    description:
      "लक्जरी आवासीय और व्यावसायिक स्थानों में हमारे मार्बल, ग्रेनाइट और टाइल इंस्टॉलेशन देखें।",
    empty: "इस श्रेणी में कोई परियोजना नहीं मिली।",
    client: "ग्राहक",
    videos: "परियोजना वीडियो",
    ownerNote: "वेबसाइट मालिक? फोटो और वीडियो जोड़ें",
    ownerLink: "एडमिन → प्रोजेक्ट",
  },
  why: {
    subtitle: "हमें क्यों चुनें",
    title: "संजना स्टोन आर्ट्स की विशेषता",
    description:
      "हम कुशल कारीगरी और पेशेवर परियोजना प्रबंधन को मिलाकर अपेक्षाओं से अधिक परिणाम देते हैं।",
  },
  pricing: {
    subtitle: "दर सूची",
    title: "पेशेवर मूल्य निर्धारण",
    description:
      "मार्बल, ग्रेनाइट और टाइल कार्यों के लिए पारदर्शी दर सूची — सामग्री सहित और बिना सामग्री।",
    withMaterial: "सामग्री सहित",
    withoutMaterial: "बिना सामग्री",
    itemName: "वस्तु का नाम",
    unit: "इकाई",
    rate: "दर",
    disclaimer:
      "* दरें संकेतात्मक हैं और सामग्री ग्रेड, परियोजना के दायरे और साइट की स्थिति के अनुसार बदल सकती हैं।",
    ownerNote: "वेबसाइट मालिक? दरें जोड़ें या संपादित करें",
    ownerLink: "एडमिन → दर सूची",
    marble: "मार्बल कार्य",
    granite: "ग्रेनाइट कार्य",
    tile: "टाइल कार्य",
    empty: "इस श्रेणी के लिए कोई दर उपलब्ध नहीं।",
    quoteNote: "ये हमारी दरें हैं — अपने कोटेशन में समान वस्तुएं जोड़ें।",
    quoteLink: "विस्तृत कोटेशन लें",
  },
  testimonials: {
    subtitle: "प्रशंसापत्र",
    title: "हमारे ग्राहक क्या कहते हैं",
    description:
      "वास्तुकारों, बिल्डरों, इंजीनियरों और गृहस्वामियों द्वारा विश्वसनीय प्रीमियम पत्थर और टाइल कारीगरी।",
    leaveReview: "अपना अनुभव साझा करें",
    leaveReviewHint:
      "हमारे साथ काम किया? रेटिंग और समीक्षा दें — लॉगिन की जरूरत नहीं। हम स्वीकृति के बाद साइट पर दिखाते हैं।",
    yourRating: "आपकी रेटिंग",
    yourName: "आपका नाम",
    yourRole: "आपकी भूमिका (वैकल्पिक)",
    yourReview: "आपकी समीक्षा",
    namePlaceholder: "आपका पूरा नाम",
    rolePlaceholder: "गृहस्वामी, बिल्डर, वास्तुकार...",
    reviewPlaceholder: "हमारे काम की गुणवत्ता के बारे में बताएं...",
    submitReview: "समीक्षा जमा करें",
    submitting: "जमा हो रहा है...",
    submitSuccess:
      "धन्यवाद! आपकी समीक्षा जमा हो गई। स्वीकृति के बाद साइट पर दिखेगी।",
  },
  contact: {
    subtitle: "संपर्क करें",
    title: "कुछ असाधारण बनाएं",
    description:
      "परियोजना परामर्श, कोटेशन या साइट विज़िट के लिए संपर्क करें। हम सभी पूछताछ का शीघ्र जवाब देते हैं।",
    owner: "मालिक",
    email: "ईमेल",
    phone: "फोन",
    address: "पता",
    yourName: "आपका नाम",
    emailAddress: "ईमेल पता",
    phoneNumber: "फोन नंबर",
    serviceInterest: "सेवा रुचि",
    message: "संदेश",
    send: "संदेश भेजें",
    sending: "भेजा जा रहा है...",
    success: "धन्यवाद! आपका संदेश प्राप्त हो गया है। हम शीघ्र संपर्क करेंगे।",
    placeholderName: "आपका नाम",
    placeholderEmail: "you@example.com",
    placeholderPhone: "+91 XXXXX XXXXX",
    placeholderMessage: "अपनी परियोजना के बारे में बताएं...",
    quotationCta: "विस्तृत कोटेशन चाहिए?",
    quotationLink: "ऊपर कोटेशन फॉर्म भरें",
  },
  getQuote: {
    subtitle: "कोटेशन लें",
    title: "अपना कोटेशन अनुरोध करें",
    description:
      "कोई खाता नहीं चाहिए। अपनी परियोजना बताएं और हम आपको ट्रैक करने के लिए एक संदर्भ संख्या देंगे।",
    step1Label: "चरण 1 — आपका विवरण",
    step2Label: "चरण 2 — आपकी परियोजना",
    step3Label: "चरण 3 — वस्तुएं और दरें",
    step1Error: "कृपया नाम, फोन और स्थान दर्ज करें।",
    step2Error: "कृपया परियोजना शीर्षक, कार्य विवरण दर्ज करें और कम से कम एक सेवा चुनें।",
    serviceTypeError: "कृपया कम से कम एक सेवा प्रकार चुनें (मार्बल, ग्रेनाइट, टाइल, या अन्य)।",
    itemsError: "कम से कम एक लाइन आइटम जोड़ें।",
    name: "आपका नाम",
    phone: "फोन नंबर",
    emailOptional: "ईमेल (वैकल्पिक)",
    location: "परियोजना स्थान",
    namePlaceholder: "आपका पूरा नाम",
    phonePlaceholder: "+91 XXXXX XXXXX",
    emailPlaceholder: "you@example.com",
    locationPlaceholder: "शहर या साइट पता",
    projectTitle: "परियोजना शीर्षक",
    serviceType: "आपको कौन सा काम चाहिए?",
    serviceTypeHint: "सभी लागू विकल्प चुनें — अधिकांश घरों में एक से अधिक काम होते हैं।",
    workDescription: "कार्य विवरण",
    projectPlaceholder: "1200 SFT विला के लिए मार्बल फर्श",
    descriptionPlaceholder: "आवश्यक कार्य का वर्णन करें — कमरे, सामग्री, समयसीमा...",
    quickAdd: "दर सूची से जल्दी जोड़ें",
    itemName: "वस्तु का नाम",
    unit: "इकाई",
    quantity: "मात्रा",
    rate: "दर (₹)",
    addItem: "वस्तु जोड़ें",
    estimatedTotal: "अनुमानित कुल",
    back: "पीछे",
    next: "आगे",
    submit: "कोटेशन जमा करें",
    submitting: "जमा हो रहा है...",
    successTitle: "कोटेशन जमा हो गया",
    saveReference: "इस नंबर को सहेजें। फोन से कभी भी ट्रैक करें।",
    emailSent: "एक प्रति {email} पर भेजी गई है",
    trackThis: "इस कोटेशन को ट्रैक करें",
    callUs: "हमें कॉल करें",
    whatsappUs: "WhatsApp करें",
  },
  trackQuote: {
    title: "अपना कोटेशन ट्रैक करें",
    description: "अपना संदर्भ नंबर और फोन नंबर दर्ज करें।",
    referenceCode: "संदर्भ नंबर",
    phone: "फोन नंबर",
    search: "कोटेशन खोजें",
    searching: "खोज रहे हैं...",
    submitted: "जमा किया गया",
  },
  footer: {
    quickLinks: "त्वरित लिंक",
    ourServices: "हमारी सेवाएं",
    contact: "संपर्क",
    rights: "सर्वाधिकार सुरक्षित।",
    ownedBy: "स्वामी",
  },
  categories: {
    all: "सभी",
    marble: "मार्बल",
    granite: "ग्रेनाइट",
    tiles: "टाइल",
    commercial: "व्यावसायिक",
    residential: "आवासीय",
  },
};

export function getTranslations(locale: Locale): TranslationKeys {
  return locale === "hi" ? hi : en;
}
