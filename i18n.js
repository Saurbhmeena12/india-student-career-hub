/* ============================================================================
   i18n.js — English ⇄ Hindi
   ----------------------------------------------------------------------------
   How it works
   • Every text node's original English is remembered in a WeakMap, so switching
     back to English restores the exact source string (no fragile reverse map).
   • A MutationObserver re-runs the swap when JavaScript renders cards, the
     notification bar, search results or the AI panel. Without it the switch
     only reached the static markup and lists stayed English.
   • Official record titles (job names, organisations, scheme names) are printed
     in the language the government published them in. Only the surrounding
     interface is translated — that is intentional, not a gap.
   ============================================================================ */
(function () {
  'use strict';

  const HI = {
    /* ---------------- header & navigation ---------------- */
    'Home': 'मुख्य पृष्ठ',
    'Opportunities': 'अवसर',
    'Government Jobs': 'सरकारी नौकरियाँ',
    'Government jobs': 'सरकारी नौकरियाँ',
    'Scholarships': 'छात्रवृत्तियाँ',
    'Government Schemes': 'सरकारी योजनाएँ',
    'State-wise': 'राज्यवार',
    'Latest Updates': 'नवीनतम अपडेट',
    'Learn & Skill Up': 'सीखें और कौशल बढ़ाएँ',
    'Free Courses': 'निःशुल्क कोर्स',
    'Skill Development': 'कौशल विकास',
    'Training': 'प्रशिक्षण',
    'Internships': 'इंटर्नशिप',
    'Apprenticeships': 'अप्रेंटिसशिप',
    'Exams & Guidance': 'परीक्षा और मार्गदर्शन',
    'Entrance Exams': 'प्रवेश परीक्षाएँ',
    'Admissions': 'प्रवेश',
    'Career Guidance': 'करियर मार्गदर्शन',
    'More': 'और',
    'AI Search': 'एआई खोज',
    'Eligibility Finder': 'पात्रता खोज',
    'Deadline Calendar': 'अंतिम तिथि कैलेंडर',
    'Study Material': 'अध्ययन सामग्री',
    'Govt Portals': 'सरकारी पोर्टल',
    'About': 'हमारे बारे में',
    'Contact': 'संपर्क',
    'Admin': 'एडमिन',
    'Admin panel': 'एडमिन पैनल',
    'Sign in': 'साइन इन',
    'Sign In': 'साइन इन',
    'Sign in / Create account': 'साइन इन / खाता बनाएँ',
    'My Dashboard': 'मेरा डैशबोर्ड',
    'Language': 'भाषा',
    'Appearance': 'रूप',
    'Light / dark': 'लाइट / डार्क',
    'Skip to content': 'मुख्य सामग्री पर जाएँ',
    'Opportunities for every student': 'हर छात्र के लिए अवसर',
    'Logout': 'लॉग आउट',
    'Login': 'लॉगिन',
    'Register': 'पंजीकरण',
    'Dismiss this notice': 'यह सूचना बंद करें',
    'Search all opportunities': 'सभी अवसर खोजें',

    /* ---------------- menu descriptions ---------------- */
    'Central, state, PSU and defence vacancies': 'केंद्र, राज्य, पीएसयू और रक्षा क्षेत्र की रिक्तियाँ',
    'Pre-matric, post-matric, merit and category': 'प्री-मैट्रिक, पोस्ट-मैट्रिक, मेरिट और वर्ग आधारित',
    'Education, employment and welfare': 'शिक्षा, रोजगार और कल्याण',
    'All 28 states and 8 union territories': 'सभी 28 राज्य और 8 केंद्रशासित प्रदेश',
    'New notices and deadline changes': 'नई सूचनाएँ और अंतिम तिथि में बदलाव',
    'SWAYAM, NPTEL, NIELIT and Skill India': 'SWAYAM, NPTEL, NIELIT और स्किल इंडिया',
    'Sector-wise certified programmes': 'क्षेत्रवार प्रमाणित कार्यक्रम',
    'PMKVY, ITI, NSTI and state missions': 'PMKVY, ITI, NSTI और राज्य मिशन',
    'PM Internship, AICTE and ministries': 'पीएम इंटर्नशिप, AICTE और मंत्रालय',
    'NATS, NAPS, railway and PSU': 'NATS, NAPS, रेलवे और पीएसयू',
    'CUET, JEE, NEET, GATE, UGC NET': 'CUET, JEE, NEET, GATE, UGC NET',
    'University, polytechnic and ITI': 'विश्वविद्यालय, पॉलिटेक्निक और ITI',
    'Pathways by education stage': 'शिक्षा स्तर के अनुसार रास्ते',
    'Ask across every record': 'हर रिकॉर्ड में पूछें',
    'What can I apply for?': 'मैं किसके लिए आवेदन कर सकता/सकती हूँ?',
    'Every closing date in one view': 'सभी अंतिम तिथियाँ एक जगह',
    'Free official books and papers': 'निःशुल्क सरकारी पुस्तकें और प्रश्नपत्र',
    'Verified national and state websites': 'सत्यापित राष्ट्रीय और राज्य वेबसाइटें',
    'How this platform verifies information': 'यह मंच जानकारी कैसे सत्यापित करता है',
    'Send a correction or a question': 'सुधार या प्रश्न भेजें',
    'Free certified courses': 'निःशुल्क प्रमाणित कोर्स',
    'Official government portals': 'आधिकारिक सरकारी पोर्टल',

    /* ---------------- hero ---------------- */
    'One platform · All opportunities · One future': 'एक मंच · सभी अवसर · एक भविष्य',
    'One Platform · All Opportunities · One Future': 'एक मंच · सभी अवसर · एक भविष्य',
    'Every opportunity for an Indian student, in one verified place.':
      'भारत के हर छात्र के लिए हर अवसर — एक सत्यापित जगह पर।',
    'Government jobs, scholarships, welfare schemes, free certified courses, skill training, internships, apprenticeships and entrance exams — checked against the official portal and kept current, every single day.':
      'सरकारी नौकरियाँ, छात्रवृत्तियाँ, कल्याण योजनाएँ, निःशुल्क प्रमाणित कोर्स, कौशल प्रशिक्षण, इंटर्नशिप, अप्रेंटिसशिप और प्रवेश परीक्षाएँ — हर दिन आधिकारिक पोर्टल से जाँची गई और अद्यतन रखी गई।',
    'Browse government jobs': 'सरकारी नौकरियाँ देखें',
    'Find scholarships': 'छात्रवृत्तियाँ खोजें',
    'Check my eligibility': 'मेरी पात्रता जाँचें',
    'Source and last-verified date on every record': 'हर रिकॉर्ड पर स्रोत और अंतिम सत्यापन तिथि',
    'Direct official application links, never a middleman': 'सीधे आधिकारिक आवेदन लिंक, कोई बिचौलिया नहीं',
    'English and Hindi': 'अंग्रेज़ी और हिंदी',
    'Free, and always will be': 'निःशुल्क, और हमेशा रहेगा',
    'Welfare schemes': 'कल्याण योजनाएँ',
    'Free courses': 'निःशुल्क कोर्स',
    'Official portals': 'आधिकारिक पोर्टल',

    /* ---------------- homepage sections ---------------- */
    'Twelve ways into your next step': 'आपके अगले कदम के बारह रास्ते',
    'Pick the track that fits where you are right now — from 10th pass to PhD.':
      'आप जहाँ हैं वहीं से शुरू करें — 10वीं पास से पीएचडी तक।',
    'Explore': 'देखें',
    'Deadlines': 'अंतिम तिथियाँ',
    'Closing in the next 30 days': 'अगले 30 दिनों में बंद होने वाले',
    'Sorted by urgency. Dates come from the official notification — confirm before you apply.':
      'तात्कालिकता के क्रम में। तिथियाँ आधिकारिक सूचना से हैं — आवेदन से पहले पुष्टि करें।',
    'All updates': 'सभी अपडेट',
    'Eligibility': 'पात्रता',
    'What can I apply for with my qualification?': 'मेरी योग्यता से मैं किसके लिए आवेदन कर सकता/सकती हूँ?',
    'Choose your highest completed qualification. We will show every job, scholarship and course you are eligible for.':
      'अपनी सबसे उच्च पूर्ण योग्यता चुनें। हम वे सभी नौकरियाँ, छात्रवृत्तियाँ और कोर्स दिखाएँगे जिनके लिए आप पात्र हैं।',
    'Save your full profile once, match everything': 'एक बार पूरी प्रोफ़ाइल सहेजें, सब कुछ मिलाएँ',
    'Find my matches': 'मेरे लिए अवसर खोजें',
    'Welfare': 'कल्याण',
    'Government schemes, filtered the way you think': 'सरकारी योजनाएँ, आपकी सोच के अनुसार छाँटी हुई',
    'Browse by who the scheme is for, what it gives and where you live.':
      'देखें कि योजना किसके लिए है, क्या देती है और आप कहाँ रहते हैं।',
    'Education schemes': 'शिक्षा योजनाएँ',
    'Fee waivers, hostel support, coaching assistance and book grants.':
      'शुल्क माफ़ी, छात्रावास सहायता, कोचिंग सहायता और पुस्तक अनुदान।',
    'Employment schemes': 'रोजगार योजनाएँ',
    'Self-employment loans, skilling allowances and placement support.':
      'स्वरोजगार ऋण, कौशल भत्ते और प्लेसमेंट सहायता।',
    'Financial assistance': 'वित्तीय सहायता',
    'Direct benefit transfers, stipends and emergency student relief.':
      'डीबीटी, वजीफ़े और आपातकालीन छात्र राहत।',
    'Learn for free': 'निःशुल्क सीखें',
    'Certified courses with zero fee': 'शून्य शुल्क पर प्रमाणित कोर्स',
    'SWAYAM, NPTEL, NIELIT and Skill India programmes that issue a government-recognised certificate.':
      'SWAYAM, NPTEL, NIELIT और स्किल इंडिया के कार्यक्रम जो सरकार-मान्य प्रमाणपत्र देते हैं।',
    'All courses': 'सभी कोर्स',
    'Latest updates': 'नवीनतम अपडेट',
    'New notices and changes': 'नई सूचनाएँ और बदलाव',
    'Vacancy revisions, deadline extensions and newly released notifications.':
      'रिक्तियों में संशोधन, अंतिम तिथि विस्तार और नई जारी सूचनाएँ।',
    'Update log': 'अपडेट लॉग',
    'Where you live': 'आप कहाँ रहते हैं',
    'State-wise opportunities': 'राज्यवार अवसर',
    'State-wise Opportunities': 'राज्यवार अवसर',
    'Each state page lists its own PSC, police, teaching, health and scholarship portals.':
      'हर राज्य के अपने PSC, पुलिस, शिक्षण, स्वास्थ्य और छात्रवृत्ति पोर्टल।',
    'All states & UTs': 'सभी राज्य और केंद्रशासित प्रदेश',
    '28 states and 8 union territories in one directory.': '28 राज्य और 8 केंद्रशासित प्रदेश एक निर्देशिका में।',
    'Rajasthan': 'राजस्थान',
    'RPSC, RSSB, REET, police and state scholarships.': 'RPSC, RSSB, REET, पुलिस और राज्य छात्रवृत्तियाँ।',
    'Uttar Pradesh': 'उत्तर प्रदेश',
    'UPPSC, UPSSSC, UP Police and state schemes.': 'UPPSC, UPSSSC, यूपी पुलिस और राज्य योजनाएँ।',
    'Bihar': 'बिहार',
    'BPSC, BSSC, Bihar Police and student schemes.': 'BPSC, BSSC, बिहार पुलिस और छात्र योजनाएँ।',
    'AI assistant': 'एआई सहायक',
    'Ask in plain language, get a sourced answer.': 'सरल भाषा में पूछें, स्रोत के साथ उत्तर पाएँ।',
    'Ask': 'पूछें',
    'Scholarships for OBC students in Rajasthan': 'राजस्थान के OBC छात्रों के लिए छात्रवृत्तियाँ',
    'Government jobs after 12th in railways': 'रेलवे में 12वीं के बाद सरकारी नौकरियाँ',
    'Free courses that give a certificate': 'वे निःशुल्क कोर्स जिनसे प्रमाणपत्र मिलता है',
    'Alerts': 'अलर्ट',
    'One email a week. Only what you can still apply for.':
      'हफ़्ते में एक ईमेल। केवल वह जिसके लिए अभी आवेदन कर सकते हैं।',
    'New vacancies, scholarship windows opening, and anything closing in the next seven days. Unsubscribe in one click.':
      'नई रिक्तियाँ, खुलने वाली छात्रवृत्तियाँ और अगले सात दिनों में बंद होने वाली सूचनाएँ। एक क्लिक में सदस्यता छोड़ें।',
    'Get alerts': 'अलर्ट पाएँ',
    'This is an independent information platform, not a government website.':
      'यह एक स्वतंत्र सूचना मंच है, सरकारी वेबसाइट नहीं।',

    /* ---------------- footer ---------------- */
    'Quick Links': 'त्वरित लिंक',
    'Resources': 'संसाधन',
    'Support': 'सहायता',
    'Join': 'जुड़ें',
    'Learn': 'सीखें',
    'Platform': 'प्लेटफ़ॉर्म',
    'Privacy': 'गोपनीयता',
    'Terms': 'नियम',
    'About Us': 'हमारे बारे में',
    'Contact Us': 'संपर्क करें',
    'Runs entirely on free infrastructure.': 'पूरी तरह निःशुल्क इंफ़्रास्ट्रक्चर पर चलता है।',

    /* ---------------- page headings ---------------- */
    'Our Mission': 'हमारा उद्देश्य',
    'University & College Admissions': 'विश्वविद्यालय और महाविद्यालय प्रवेश',
    'Government Apprenticeships': 'सरकारी अप्रेंटिसशिप',
    'Every closing date, in one calendar.': 'हर अंतिम तिथि, एक कैलेंडर में।',
    'Your Career Roadmap': 'आपका करियर रोडमैप',
    'Get in Touch': 'संपर्क करें',
    'Free Online Courses & Certifications': 'निःशुल्क ऑनलाइन कोर्स और प्रमाणपत्र',
    'My Opportunities': 'मेरे अवसर',
    'Official Government Portal Directory': 'आधिकारिक सरकारी पोर्टल निर्देशिका',
    'Entrance Exams & Admissions': 'प्रवेश परीक्षाएँ और प्रवेश',
    'Tell us about yourself. See only what you can apply for.':
      'अपने बारे में बताएँ। केवल वही देखें जिसके लिए आप आवेदन कर सकते हैं।',
    'Government Internships': 'सरकारी इंटर्नशिप',
    'Latest Government Job Vacancies': 'नवीनतम सरकारी नौकरी रिक्तियाँ',
    'Welcome back': 'वापसी पर स्वागत है',
    'Latest Notifications & Updates': 'नवीनतम सूचनाएँ और अपडेट',
    'Privacy policy': 'गोपनीयता नीति',
    'Government Schemes & Services': 'सरकारी योजनाएँ और सेवाएँ',
    'Government Scholarships': 'सरकारी छात्रवृत्तियाँ',
    'Ask in plain language. Get an answer you can check.':
      'सरल भाषा में पूछें। ऐसा उत्तर पाएँ जिसे आप जाँच सकें।',
    'Skills India Courses': 'स्किल्स इंडिया कोर्स',
    'Opportunities by State': 'राज्य के अनुसार अवसर',
    'Free material, from the people who set the exams.':
      'निःशुल्क सामग्री, उन्हीं से जो परीक्षा बनाते हैं।',
    'Terms of use': 'उपयोग की शर्तें',
    'Skill Development Training': 'कौशल विकास प्रशिक्षण',
    'This page has moved or never existed.': 'यह पृष्ठ हट गया है या कभी था ही नहीं।',
    'Search Results': 'खोज परिणाम',
    'Search All Government Resources': 'सभी सरकारी संसाधन खोजें',

    /* ---------------- filters & labels ---------------- */
    'All States': 'सभी राज्य',
    'All Categories': 'सभी श्रेणियाँ',
    'All Sectors': 'सभी क्षेत्र',
    'All Levels': 'सभी स्तर',
    'All Types': 'सभी प्रकार',
    'Organisation': 'संस्था',
    'Qualification': 'योग्यता',
    'Last Date': 'अंतिम तिथि',
    'Vacancies': 'रिक्तियाँ',
    'Duration': 'अवधि',
    'Stipend': 'वजीफ़ा',
    'Level': 'स्तर',
    'Provider': 'प्रदाता',
    'Sector': 'क्षेत्र',
    'Amount': 'राशि',
    'Eligible': 'पात्र',
    'Department': 'विभाग',

    /* ---------------- actions ---------------- */
    'Search': 'खोजें',
    'Enroll': 'नामांकन करें',
    'Apply': 'आवेदन करें',
    'Apply now': 'अभी आवेदन करें',
    'Apply Online': 'ऑनलाइन आवेदन',
    'Read more': 'और पढ़ें',
    'Read More': 'और पढ़ें',
    'Subscribe': 'सदस्यता लें',
    'Visit Portal': 'पोर्टल पर जाएँ',
    'Visit': 'जाएँ',
    'Learn More': 'और जानें',
    'View Website': 'वेबसाइट देखें',
    'Contact Page': 'संपर्क पृष्ठ',
    'Clear': 'साफ़ करें',
    'Browse': 'देखें',
    'Save record': 'रिकॉर्ड सहेजें',
    'Add / update': 'जोड़ें / अपडेट करें',
    'Download JSON backup': 'JSON बैकअप डाउनलोड करें',
    'Import data': 'डेटा आयात करें',
    'Register connector': 'कनेक्टर पंजीकृत करें',
    'Featured': 'विशेष',
    'AUTO': 'स्वतः',

    /* ---------------- live / status ---------------- */
    'Live': 'लाइव',
    'Find my options': 'मेरे विकल्प खोजें',
    'Verified': 'सत्यापित',
    'Unverified': 'असत्यापित',
    'Broken': 'टूटा लिंक',
    'Unreachable': 'पहुँच से बाहर',


    /* ---------------- login & account ---------------- */
    'One profile.': 'एक प्रोफ़ाइल।',
    'Every opportunity you qualify for.': 'हर वह अवसर जिसके लिए आप पात्र हैं।',
    'Tell us your qualification, state and category once. We do the filtering, so you only see what you can actually apply for.':
      'अपनी योग्यता, राज्य और वर्ग एक बार बताएँ। छँटाई हम करेंगे, ताकि आपको केवल वही दिखे जिसके लिए आप वास्तव में आवेदन कर सकते हैं।',
    'Eligibility matching': 'पात्रता मिलान',
    'Jobs and scholarships filtered to your profile': 'आपकी प्रोफ़ाइल के अनुसार छाँटी गई नौकरियाँ और छात्रवृत्तियाँ',
    'Deadline alerts': 'अंतिम तिथि अलर्ट',
    'Never miss an application window again': 'आवेदन की तिथि फिर कभी न छूटे',
    'Application tracker': 'आवेदन ट्रैकर',
    'Follow every application from interested to selected': 'हर आवेदन को रुचि से चयन तक ट्रैक करें',
    'Always free': 'सदा निःशुल्क',
    'No fees, no ads, no data selling': 'कोई शुल्क नहीं, विज्ञापन नहीं, डेटा की बिक्री नहीं',
    'We never ask for Aadhaar numbers, OTPs or passwords to other portals.':
      'हम कभी आधार नंबर, ओटीपी या अन्य पोर्टल के पासवर्ड नहीं माँगते।',
    'Sign in to continue, or create a free account in under a minute.':
      'जारी रखने के लिए साइन इन करें, या एक मिनट में निःशुल्क खाता बनाएँ।',
    'Create account': 'खाता बनाएँ',
    'Email address': 'ईमेल पता',
    'Password': 'पासवर्ड',
    'New here?': 'यहाँ नए हैं?',
    'Create an account': 'खाता बनाएँ',
    'Full name': 'पूरा नाम',

    /* ---------------- category cards ---------------- */
    'Central Government Jobs': 'केंद्रीय सरकारी नौकरियाँ',
    'UPSC, SSC, Railway, Banking, India Post and central ministries.':
      'UPSC, SSC, रेलवे, बैंकिंग, इंडिया पोस्ट और केंद्रीय मंत्रालय।',
    'State Government Jobs': 'राज्य सरकारी नौकरियाँ',
    'State PSCs, police, teaching, health and subordinate services.':
      'राज्य PSC, पुलिस, शिक्षण, स्वास्थ्य और अधीनस्थ सेवाएँ।',
    'PSU Recruitment': 'पीएसयू भर्ती',
    'ONGC, IOCL, NTPC, BHEL, GAIL, SAIL and other public sector units.':
      'ONGC, IOCL, NTPC, BHEL, GAIL, SAIL और अन्य सार्वजनिक उपक्रम।',
    'Defence Jobs': 'रक्षा नौकरियाँ',
    'Army, Navy, Air Force, NDA, CAPF and paramilitary forces.':
      'सेना, नौसेना, वायुसेना, NDA, CAPF और अर्धसैनिक बल।',
    'Pre-matric, post-matric, merit, SC/ST/OBC and minority scholarships.':
      'प्री-मैट्रिक, पोस्ट-मैट्रिक, मेरिट, SC/ST/OBC और अल्पसंख्यक छात्रवृत्तियाँ।',
    'Education, employment, financial assistance and welfare schemes.':
      'शिक्षा, रोजगार, वित्तीय सहायता और कल्याण योजनाएँ।',
    'Free Online Courses': 'निःशुल्क ऑनलाइन कोर्स',
    'SWAYAM, NPTEL, NIELIT and government-certified free courses.':
      'SWAYAM, NPTEL, NIELIT और सरकार-प्रमाणित निःशुल्क कोर्स।',
    'PMKVY, Skill India and sector-wise vocational training.':
      'PMKVY, स्किल इंडिया और क्षेत्रवार व्यावसायिक प्रशिक्षण।',
    'PM Internship Scheme, AICTE and ministry internships.':
      'पीएम इंटर्नशिप योजना, AICTE और मंत्रालयों की इंटर्नशिप।',
    'NATS, NAPS, PSU and railway apprenticeship programmes.':
      'NATS, NAPS, पीएसयू और रेलवे के अप्रेंटिसशिप कार्यक्रम।',
    'CUET, JEE, NEET, GATE, UGC NET and state entrance exams.':
      'CUET, JEE, NEET, GATE, UGC NET और राज्य प्रवेश परीक्षाएँ।',
    'University Admissions': 'विश्वविद्यालय प्रवेश',
    'Polytechnic, ITI and government college admissions.':
      'पॉलिटेक्निक, ITI और सरकारी महाविद्यालय प्रवेश।',

    /* ---------------- qualification chips ---------------- */
    '5th / 8th Pass': '5वीं / 8वीं पास',
    '10th Pass': '10वीं पास',
    '12th Pass': '12वीं पास',
    'Diploma': 'डिप्लोमा',
    'Graduation': 'स्नातक',
    'BSc PCM': 'BSc (PCM)',
    'BSc Biology': 'BSc (जीव विज्ञान)',
    'BSc Agriculture': 'BSc (कृषि)',
    'MA / MSc / MCom': 'MA / MSc / MCom',
    'MBA / MCA': 'MBA / MCA',
    'PhD': 'पीएचडी',

    /* ---------------- card actions & computed labels ---------------- */
    'Apply on official portal': 'आधिकारिक पोर्टल पर आवेदन करें',
    'Enrol': 'नामांकन करें',
    'Free to learn': 'निःशुल्क सीखें',
    'Free': 'निःशुल्क',
    'No deadlines in the next 30 days. Check back soon.':
      'अगले 30 दिनों में कोई अंतिम तिथि नहीं। जल्द फिर देखें।',
    'Last day': 'आख़िरी दिन',
    'job': 'नौकरी',
    'scholarship': 'छात्रवृत्ति',
    'internship': 'इंटर्नशिप'
  };

  /* Computed strings ("9 days left", "checked 2h ago") can't live in a lookup
     table — these patterns translate them, and the English original is still
     restored from ORIG when the visitor switches back. */
  const RULES = [
    [/^(\d+) days? left$/, m => `${m[1]} दिन शेष`],
    [/^Last day$/, () => 'आख़िरी दिन'],
    [/^checked just now$/, () => 'अभी जाँचा गया'],
    [/^checked (\d+) min ago$/, m => `${m[1]} मिनट पहले जाँचा`],
    [/^checked (\d+)h ago$/, m => `${m[1]} घंटे पहले जाँचा`],
    [/^checked yesterday$/, () => 'कल जाँचा गया'],
    [/^checked (\d+) days ago$/, m => `${m[1]} दिन पहले जाँचा`]
  ];

  function hindiFor(text) {
    if (HI[text] !== undefined) return HI[text];
    // paragraphs hard-wrapped in the HTML arrive with newlines inside them
    const flat = text.replace(/\s+/g, ' ');
    if (flat !== text && HI[flat] !== undefined) return HI[flat];
    for (const [re, fn] of RULES) {
      const m = text.match(re);
      if (m) return fn(m);
    }
    return null;
  }

  /* Never translate these containers — brand mark, code, or anything opted out */
  const SKIP = '.brand, .logo, .brand-text, [data-no-i18n], script, style, code, pre, kbd, samp';

  const ORIG = new WeakMap();          // textNode -> original English string
  let currentLang = (localStorage.getItem('lang') === 'hi') ? 'hi' : 'en';

  function translateTextNode(node) {
    let en = ORIG.get(node);
    if (en === undefined) { en = node.nodeValue; ORIG.set(node, en); }
    if (!en || !/\S/.test(en)) return;

    const parent = node.parentElement;
    if (parent && parent.closest(SKIP)) return;

    const trimmed = en.trim();
    const lead = en.match(/^\s*/)[0];
    const trail = en.match(/\s*$/)[0];

    const next = (currentLang === 'hi')
      ? (hindiFor(trimmed) !== null ? lead + hindiFor(trimmed) + trail : en)
      : en;

    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function walk(root) {
    const host = root || document.body;
    if (!host) return;
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateTextNode);
  }

  function translatePlaceholders(lang) {
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(inp => {
      const key = inp.getAttribute('data-en-ph') || inp.placeholder;
      if (!key) return;
      if (!inp.hasAttribute('data-en-ph')) inp.setAttribute('data-en-ph', key);
      if (lang === 'hi') {
        const map = {
          'Search Government Jobs, Scholarships, Courses, Schemes, Exams...':
            'सरकारी नौकरी, छात्रवृत्ति, कोर्स, योजना, परीक्षा खोजें...',
          'Enter your email': 'अपना ईमेल दर्ज करें',
          'Try “SSC CGL”, “post matric scholarship”, “free cyber security course”':
            '“SSC CGL”, “पोस्ट मैट्रिक छात्रवृत्ति”, “निःशुल्क साइबर सुरक्षा कोर्स” आज़माएँ',
          'Type your question…': 'अपना प्रश्न लिखें…'
        };
        if (map[key]) inp.placeholder = map[key];
      } else {
        inp.placeholder = key;
      }
    });
    document.querySelectorAll('[title]').forEach(el => {
      const key = el.getAttribute('data-en-title') || el.getAttribute('title');
      if (!key) return;
      if (!el.hasAttribute('data-en-title')) el.setAttribute('data-en-title', key);
      if (lang === 'hi' && HI[key]) el.setAttribute('title', HI[key]);
      else if (lang === 'en') el.setAttribute('title', key);
    });
  }

  function applyLanguage(lang) {
    currentLang = (lang === 'hi') ? 'hi' : 'en';
    walk(document.body);
    translatePlaceholders(currentLang);

    document.documentElement.setAttribute('lang', currentLang);
    document.querySelectorAll('[data-lang-set]').forEach(b =>
      b.classList.toggle('is-active', b.getAttribute('data-lang-set') === currentLang));
    // legacy class-based toggles
    document.querySelectorAll('.lang-btn').forEach(b => {
      const label = b.textContent.trim();
      const isHindiBtn = label === 'हिन्दी' || label === 'HI';
      b.classList.toggle('active', currentLang === 'hi' ? isHindiBtn : !isHindiBtn);
    });

    localStorage.setItem('lang', currentLang);
  }

  window.applyLanguage = applyLanguage;
  window.setLang = applyLanguage;
  window.t = function (s) { const h = currentLang === 'hi' ? hindiFor(s) : null; return h !== null ? h : s; };

  /* Re-translate anything JavaScript adds later (cards, top bar, AI panel).
     childList only — changing a text node never re-triggers this. */
  let queued = false;
  const pending = new Set();
  const observer = new MutationObserver(muts => {
    for (const m of muts) {
      m.addedNodes.forEach(n => { if (n.nodeType === 1 || n.nodeType === 3) pending.add(n); });
    }
    if (queued || !pending.size) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      pending.forEach(n => {
        if (!n.isConnected) { pending.delete(n); return; }
        if (n.nodeType === 3) translateTextNode(n);
        else walk(n);
        pending.delete(n);
      });
      translatePlaceholders(currentLang);
    });
  });

  function boot() {
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    if (currentLang === 'hi') applyLanguage('hi');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
