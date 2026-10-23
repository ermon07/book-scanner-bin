/* Dewey Decimal knowledge base and classifier. */
(function () {
  "use strict";

  /*
   * Dewey Decimal Classification summaries (DDC 23 abridged).
   * Format: number | label. Every 3-digit division is listed, plus
   * frequently used classes for more precise shelf labels.
   */
  var DDC_RAW = [
    "000|Computer science, information & general works",
    "010|Bibliographies",
    "020|Library & information sciences",
    "030|Encyclopedias & books of facts",
    "040|[Unassigned]",
    "050|Magazines, journals & serials",
    "060|Associations, organizations & museums",
    "070|News media, journalism & publishing",
    "080|Quotations",
    "090|Manuscripts & rare books",

    "100|Philosophy & psychology",
    "110|Metaphysics",
    "120|Epistemology",
    "130|Parapsychology & occultism",
    "140|Philosophical schools of thought",
    "150|Psychology",
    "160|Logic",
    "170|Ethics",
    "180|Ancient, medieval & eastern philosophy",
    "190|Modern western philosophy",

    "200|Religion",
    "210|Philosophy & theory of religion",
    "220|The Bible",
    "230|Christianity",
    "240|Christian practice & observance",
    "250|Christian orders & local church",
    "260|Social & ecclesiastical theology",
    "270|History of Christianity",
    "280|Christian denominations",
    "290|Other religions",

    "300|Social sciences",
    "310|Statistics",
    "320|Political science",
    "330|Economics",
    "340|Law",
    "350|Public administration & military science",
    "360|Social problems & social services",
    "370|Education",
    "380|Commerce, communications & transportation",
    "390|Customs, etiquette & folklore",

    "400|Language",
    "410|Linguistics",
    "420|English & Old English languages",
    "430|German & related languages",
    "440|French & related languages",
    "450|Italian, Romanian & related languages",
    "460|Spanish & Portuguese languages",
    "470|Latin & Italic languages",
    "480|Classical & modern Greek languages",
    "490|Other languages",

    "500|Science",
    "510|Mathematics",
    "520|Astronomy",
    "530|Physics",
    "540|Chemistry",
    "550|Earth sciences & geology",
    "560|Fossils & prehistoric life",
    "570|Life sciences; biology",
    "580|Plants (Botany)",
    "590|Animals (Zoology)",

    "600|Technology",
    "610|Medicine & health",
    "620|Engineering",
    "630|Agriculture",
    "640|Home & family management",
    "650|Management & public relations",
    "660|Chemical engineering",
    "670|Manufacturing",
    "680|Manufacturing for specific uses",
    "690|Building & construction",

    "700|Arts & recreation",
    "710|Landscaping & area planning",
    "720|Architecture",
    "730|Sculpture, ceramics & metalwork",
    "740|Drawing & decorative arts",
    "750|Painting",
    "760|Graphic arts",
    "770|Photography",
    "780|Music",
    "790|Sports, games & entertainment",

    "800|Literature",
    "810|American literature",
    "820|English & Old English literatures",
    "830|German & related literatures",
    "840|French & related literatures",
    "850|Italian, Romanian & related literatures",
    "860|Spanish & Portuguese literatures",
    "870|Latin & Italic literatures",
    "880|Classical & modern Greek literatures",
    "890|Other literatures",

    "900|History & geography",
    "910|Geography & travel",
    "920|Biography & genealogy",
    "930|History of ancient world (to ca. 499)",
    "940|History of Europe",
    "950|History of Asia",
    "960|History of Africa",
    "970|History of North America",
    "980|History of South America",
    "990|History of other regions",

    /* Frequently used classes */
    "001|Knowledge",
    "001.4|Research methods",
    "001.9|Controversial knowledge",
    "002|The book",
    "004|Computer science",
    "005|Computer programming, programs & data",
    "005.1|Software engineering",
    "005.13|Programming languages",
    "005.4|Systems programming & operating systems",
    "005.74|Databases & data files",
    "005.8|Computer security",
    "006|Special computer methods",
    "006.3|Artificial intelligence",
    "006.6|Computer graphics",
    "006.7|Multimedia systems",
    "025|Library operations",
    "028|Reading & use of other information media",
    "070.4|Journalism",
    "070.5|Publishing",
    "133|Parapsychology & occultism",
    "133.3|Divination",
    "133.4|Demonology & witchcraft",
    "133.5|Astrology",
    "152|Perception",
    "153|Mental processes & intelligence",
    "155|Differential & developmental psychology",
    "158|Applied psychology",
    "294|Religions of Indic origin",
    "296|Judaism",
    "297|Islam",
    "299|Religions not provided for elsewhere",
    "302|Social interaction",
    "303|Social processes",
    "305|Social groups",
    "306|Culture & institutions",
    "323|Civil & political rights",
    "332|Financial economics",
    "338|Production",
    "342|Constitutional & administrative law",
    "345|Criminal law",
    "346|Private law",
    "347|Civil procedure & courts",
    "349|Law of specific jurisdictions",
    "355|Military science",
    "358|Air & space forces",
    "359|Sea forces",
    "361|Social problems & social welfare",
    "362|Social welfare problems & services",
    "363|Other social problems & services",
    "364|Criminology",
    "371|Schools & their activities",
    "372|Elementary education",
    "373|Secondary education",
    "374|Adult education",
    "378|Higher education",
    "381|Commerce",
    "382|International commerce",
    "383|Postal communications",
    "384|Communications",
    "385|Railroad transportation",
    "387|Water, air & space transportation",
    "388|Transportation",
    "389|Metrology & standardization",
    "391|Costume & personal appearance",
    "392|Customs of life cycle & domestic life",
    "393|Death customs",
    "394|General customs",
    "395|Etiquette",
    "398|Folklore",
    "401|Philosophy & theory of language",
    "411|Writing systems",
    "412|Etymology",
    "413|Dictionaries",
    "414|Phonology",
    "415|Grammar",
    "417|Dialectology & historical linguistics",
    "418|Standard usage & applied linguistics",
    "419|Sign languages",
    "423|English dictionaries",
    "425|English grammar",
    "428|Standard English usage",
    "511|General principles of mathematics",
    "512|Algebra",
    "513|Arithmetic",
    "514|Topology",
    "515|Analysis",
    "516|Geometry",
    "518|Numerical analysis",
    "519|Probability & applied mathematics",
    "521|Celestial mechanics",
    "522|Astronomy techniques, equipment & materials",
    "523|Specific celestial bodies & phenomena",
    "523.1|The universe; cosmology",
    "523.2|Solar system",
    "523.3|The Moon",
    "523.4|Planets",
    "523.7|The Sun",
    "523.8|Stars",
    "525|Earth",
    "526|Mathematical geography",
    "529|Chronology",
    "530.11|Relativity",
    "530.12|Quantum theory",
    "531|Classical mechanics",
    "532|Fluid mechanics",
    "533|Gas mechanics",
    "534|Sound & related vibrations",
    "535|Light & related radiation",
    "536|Heat",
    "537|Electricity & electronics",
    "538|Magnetism",
    "539|Modern physics",
    "541|Physical chemistry",
    "542|Chemistry techniques, equipment & materials",
    "543|Analytical chemistry",
    "546|Inorganic chemistry",
    "547|Organic chemistry",
    "548|Crystallography",
    "549|Mineralogy",
    "551|Geology, hydrology & meteorology",
    "552|Petrology",
    "553|Economic geology",
    "567|Fossil invertebrates",
    "568|Fossil vertebrates",
    "569|Fossil mammals",
    "571|Physiology",
    "572|Biochemistry",
    "576|Genetics & evolution",
    "577|Ecology",
    "578|Natural history of organisms",
    "579|Microorganisms",
    "581|Specific topics in natural history of plants",
    "582|Specific plants",
    "583|Dicotyledons",
    "584|Monocotyledons",
    "585|Gymnosperms",
    "586|Seedless plants",
    "591|Specific topics in natural history of animals",
    "592|Invertebrates",
    "593|Marine invertebrates",
    "594|Mollusks & molluscoids",
    "595|Arthropods",
    "596|Chordates",
    "597|Cold-blooded vertebrates",
    "598|Birds",
    "599|Mammals",
    "611|Human anatomy",
    "612|Human physiology",
    "613|Personal health & safety",
    "614|Public health",
    "615|Pharmacology & therapeutics",
    "616|Diseases",
    "617|Surgery & related medical specialties",
    "618|Gynecology, obstetrics & pediatrics",
    "619|Veterinary medicine",
    "621|Applied physics",
    "622|Mining & related operations",
    "623|Military & nautical engineering",
    "624|Civil engineering",
    "625|Railroads",
    "627|Hydraulic engineering",
    "628|Sanitary & municipal engineering",
    "629|Other branches of engineering",
    "631|Agriculture techniques, equipment & materials",
    "632|Plant injuries, diseases & pests",
    "633|Field & plantation crops",
    "634|Orchards, fruits & forestry",
    "635|Garden crops (Horticulture)",
    "636|Animal husbandry",
    "637|Dairy processing",
    "638|Insect culture",
    "639|Hunting, fishing & conservation",
    "641|Food & drink",
    "641.5|Cooking",
    "642|Meals & table service",
    "643|Housing & household equipment",
    "644|Utilities",
    "645|Furnishings",
    "646|Sewing, clothing & personal living",
    "647|Public household management",
    "648|Housekeeping",
    "649|Child rearing & home care of the sick",
    "651|Office services",
    "652|Writing & printing",
    "653|Shorthand",
    "657|Accounting",
    "658|General management",
    "659|Advertising & public relations",
    "661|Industrial chemicals",
    "662|Explosives, fuels & related products",
    "663|Beverage technology",
    "664|Food technology",
    "665|Industrial oils, fats, waxes & gases",
    "666|Ceramic & allied technologies",
    "667|Cleaning, color & coating technologies",
    "668|Other technologies",
    "669|Metallurgy",
    "671|Metalworking & metal products",
    "672|Iron, steel & other ferrous metals",
    "673|Nonferrous metals",
    "674|Lumber, wood products & cork",
    "675|Leather & fur processing",
    "676|Paper & paper products",
    "677|Textiles",
    "678|Elastomers & elastomer products",
    "679|Other products of specific materials",
    "681|Precision instruments & other devices",
    "682|Small forge work",
    "683|Hardware & household appliances",
    "684|Home & business furnishings",
    "685|Leather, fur & related clothing",
    "686|Printing & related activities",
    "687|Clothing & accessories",
    "691|Building materials",
    "692|Auxiliary construction",
    "693|Construction in specific materials",
    "694|Wood construction",
    "695|Roofing",
    "696|Plumbing",
    "697|Heating, ventilation & air conditioning",
    "698|Finishing",
    "711|Area planning",
    "712|Landscape architecture",
    "713|Landscape architecture of trafficways",
    "714|Water features",
    "715|Woody plants in landscape",
    "716|Herbaceous plants in landscape",
    "717|Landscape structures",
    "718|Landscape design of cemeteries",
    "719|Natural landscapes",
    "721|Architectural structure",
    "722|Architecture to ca. 300",
    "723|Architecture ca. 300\u20131399",
    "724|Architecture from ca. 1400",
    "725|Public structures",
    "726|Buildings for religious & related purposes",
    "727|Buildings for educational & research purposes",
    "728|Residential & related buildings",
    "729|Design & decoration of structures",
    "731|Processes, forms & subjects of sculpture",
    "732|Sculpture to ca. 500",
    "733|Greek, Etruscan & Roman sculpture",
    "734|Sculpture ca. 500\u20131399",
    "735|Sculpture from ca. 1400",
    "736|Carving",
    "737|Numismatics & sigillography",
    "738|Ceramic arts",
    "739|Art metalwork",
    "741|Drawing & drawings",
    "741.5|Comics & graphic novels",
    "742|Perspective",
    "743|Drawing by subject",
    "745|Decorative arts",
    "746|Textile arts",
    "747|Interior decoration",
    "748|Glass",
    "749|Furniture & accessories",
    "751|Painting techniques & procedures",
    "752|Color",
    "754|Genre paintings",
    "757|Human figures in painting",
    "758|Other subjects in painting",
    "759|Painting by place",
    "761|Relief printing",
    "763|Lithography",
    "764|Chromolithography",
    "765|Metal engraving",
    "766|Mezzotinting",
    "767|Etching",
    "769|Prints",
    "771|Photography techniques & equipment",
    "772|Metallic salt processes",
    "773|Pigment processes",
    "774|Holography",
    "775|Digital photography",
    "776|Computer art",
    "777|Cinematography",
    "778|Photography by subject",
    "779|Photographs",
    "781|General principles of music",
    "782|Vocal music",
    "783|Music for single voices",
    "784|Instruments & instrumental ensembles",
    "785|Ensembles with one instrument per part",
    "786|Keyboard & other instruments",
    "787|Stringed instruments",
    "788|Wind instruments",
    "791|Public performances",
    "792|Stage presentations",
    "793|Indoor games & amusements",
    "794|Indoor games of skill",
    "795|Games of chance",
    "796|Athletic & outdoor sports & games",
    "797|Water sports & recreation",
    "798|Equestrian sports & animal racing",
    "799|Fishing, hunting & shooting",
    "808|Rhetoric & collections of literature",
    "808.3|Rhetoric of fiction",
    "808.81|Poetry collections",
    "808.82|Drama collections",
    "808.83|Fiction collections",
    "808.84|Essays collections",
    "808.85|Speeches collections",
    "808.86|Letters collections",
    "808.87|Humor collections",
    "808.88|Miscellaneous collections",
    "811|American poetry",
    "812|American drama",
    "813|American fiction",
    "813.0872|American mystery & detective fiction",
    "813.0876|American science fiction",
    "813.08738|American horror fiction",
    "814|American essays",
    "815|American speeches",
    "816|American letters",
    "817|American humor",
    "818|American miscellaneous writings",
    "821|English poetry",
    "822|English drama",
    "823|English fiction",
    "823.0872|English mystery & detective fiction",
    "823.0876|English science fiction",
    "823.08738|English horror fiction",
    "824|English essays",
    "825|English speeches",
    "826|English letters",
    "827|English humor",
    "828|English miscellaneous writings",
    "829|Old English literature",
    "831|German poetry",
    "832|German drama",
    "833|German fiction",
    "839|Other Germanic literatures",
    "841|French poetry",
    "842|French drama",
    "843|French fiction",
    "849|Occitan & Catalan literatures",
    "851|Italian poetry",
    "852|Italian drama",
    "853|Italian fiction",
    "861|Spanish poetry",
    "862|Spanish drama",
    "863|Spanish fiction",
    "869|Portuguese & Galician literatures",
    "871|Latin poetry",
    "872|Latin drama",
    "873|Latin fiction",
    "881|Greek poetry",
    "882|Greek drama",
    "883|Greek fiction",
    "891|Other literatures",
    "892|Afro-Asiatic literatures",
    "893|Non-Semitic Afro-Asiatic literatures",
    "894|Altaic, Uralic, Hyperborean & Dravidian literatures",
    "895|East & Southeast Asian literatures",
    "896|African literatures",
    "897|North American native literatures",
    "898|South American native literatures",
    "899|Other literatures",
    "901|Philosophy & theory of history",
    "902|Miscellany of history",
    "904|Collected accounts of events",
    "907|Education, research & related topics in history",
    "909|World history",
    "911|Historical geography",
    "912|Atlases & maps",
    "913|Geography of & travel in ancient world",
    "914|Geography of & travel in Europe",
    "915|Geography of & travel in Asia",
    "916|Geography of & travel in Africa",
    "917|Geography of & travel in North America",
    "918|Geography of & travel in South America",
    "919|Geography of & travel in other areas",
    "929|Genealogy, names & insignia",
    "931|China to 420",
    "932|Egypt to 640",
    "933|Palestine to 70",
    "934|India to 647",
    "935|Mesopotamia & Iranian Plateau to 637",
    "936|Europe north & west of Italy to ca. 499",
    "937|Italy & adjacent territories to 476",
    "938|Greece to 323",
    "939|Other parts of ancient world",
    "940.53|World War II, 1939\u20131945",
    "941|British Isles",
    "942|England & Wales",
    "943|Germany & neighboring central European countries",
    "944|France & Monaco",
    "945|Italy, San Marino, Vatican City, Malta",
    "946|Spain, Andorra, Gibraltar, Portugal",
    "947|Russia & neighboring east European countries",
    "948|Scandinavia",
    "949|Other parts of Europe",
    "951|China & adjacent areas",
    "952|Japan",
    "953|Arabian Peninsula & adjacent areas",
    "954|India & neighboring south Asian countries",
    "955|Iran",
    "956|Middle East (Near East)",
    "957|Siberia (Asiatic Russia)",
    "958|Central Asia",
    "959|Southeast Asia",
    "961|Tunisia & Libya",
    "962|Egypt, Sudan & South Sudan",
    "963|Ethiopia & Eritrea",
    "964|Morocco, Western Sahara, Canary Islands",
    "965|Algeria",
    "966|West Africa & offshore islands",
    "967|Central Africa & offshore islands",
    "968|Southern Africa",
    "969|South Indian Ocean islands",
    "971|Canada",
    "972|Mexico, Central America, West Indies",
    "973|United States",
    "974|Northeastern United States",
    "975|Southeastern United States",
    "976|South central United States",
    "977|North central United States",
    "978|Western United States",
    "979|Great Basin & Pacific Slope region",
    "981|Brazil",
    "982|Argentina",
    "983|Chile",
    "984|Bolivia",
    "985|Peru",
    "986|Colombia & Ecuador",
    "987|Venezuela",
    "988|Guiana",
    "989|Paraguay & Uruguay",
    "993|New Zealand",
    "994|Australia",
    "995|Melanesia, New Guinea",
    "996|Polynesia & other Pacific islands",
    "997|Atlantic Ocean islands",
    "998|Arctic islands & Antarctica",
    "999|Extraterrestrial worlds"
  ];

  var DDC = {};
  DDC_RAW.forEach(function (line) {
    var idx = line.indexOf("|");
    if (idx > 0) DDC[line.slice(0, idx)] = line.slice(idx + 1);
  });

  /* Library of Congress class -> approximate Dewey class. */
  var LCC_MAP = [
    [/^PZ/, "808.83", "juvenile belles-lettres"],
    [/^PR/, "820", "English literature"],
    [/^PS/, "810", "American literature"],
    [/^PQ/, "840", "Romance literatures"],
    [/^PT/, "830", "German literature"],
    [/^PL/, "895", "Asian literatures"],
    [/^PN/, "800", "literature (general)"],
    [/^PA/, "880", "classical literature"],
    [/^PC/, "450", "Romance languages"],
    [/^QA/, "510", "mathematics"],
    [/^QB/, "520", "astronomy"],
    [/^QC/, "530", "physics"],
    [/^QD/, "540", "chemistry"],
    [/^QE/, "550", "geology"],
    [/^QH/, "570", "biology"],
    [/^QK/, "580", "botany"],
    [/^QL/, "590", "zoology"],
    [/^QM/, "611", "human anatomy"],
    [/^QP/, "612", "human physiology"],
    [/^QR/, "579", "microbiology"],
    [/^Q/, "500", "science"],
    [/^R/, "610", "medicine"],
    [/^S/, "630", "agriculture"],
    [/^TA/, "624", "civil engineering"],
    [/^TK/, "621", "electrical engineering"],
    [/^TP/, "660", "chemical engineering"],
    [/^TR/, "770", "photography"],
    [/^TT/, "745", "crafts"],
    [/^TX/, "640", "home economics"],
    [/^T/, "600", "technology"],
    [/^NA/, "720", "architecture"],
    [/^NC/, "741", "drawing"],
    [/^ND/, "750", "painting"],
    [/^NK/, "745", "decorative arts"],
    [/^ML/, "780", "music"],
    [/^MT/, "780", "music instruction"],
    [/^M/, "780", "music"],
    [/^HB/, "330", "economics"],
    [/^HD/, "338", "production"],
    [/^HF/, "380", "commerce"],
    [/^HG/, "332", "finance"],
    [/^H/, "300", "social sciences"],
    [/^J/, "320", "political science"],
    [/^K/, "340", "law"],
    [/^L/, "370", "education"],
    [/^BM/, "296", "Judaism"],
    [/^BP/, "297", "Islam"],
    [/^BL/, "200", "religion"],
    [/^BT/, "230", "Christianity"],
    [/^B/, "100", "philosophy"],
    [/^D/, "900", "history"],
    [/^E/, "973", "United States history"],
    [/^F/, "973", "American history"],
    [/^AE/, "030", "encyclopedias"],
    [/^AG/, "030", "general reference"],
    [/^AM/, "060", "museums"],
    [/^AP/, "050", "periodicals"],
    [/^AY/, "030", "almanacs"],
    [/^G/, "910", "geography & travel"],
    [/^Z/, "000", "bibliography"]
  ];

  /* Keywords -> Dewey class. Weight controls confidence in the guess. */
  var INFERENCE_RULES = [
    { num: "030", w: 5, re: /\b(encyclopedias?|encyclopaedias?|almanacs?|reference works?|books of facts)\b/ },
    { num: "413", w: 4, re: /\b(dictionaries?|thesauri|thesaurus|glossaries)\b/ },
    { num: "912", w: 4, re: /\b(atlases?|book of maps)\b/ },
    { num: "641.5", w: 6, re: /\b(cookbooks?|cooking|recipes?|baking|pastry|cuisine|gastronomy)\b/ },
    { num: "613", w: 3, re: /\b(nutrition|diets?|fitness|exercise|wellness|self-care|sleep|healthy living)\b/ },
    { num: "610", w: 4, re: /\b(medicine|medical|diseases?|diagnosis|anatomy|physiology|patients?|cancer|surgery|doctors?|nursing)\b/ },
    { num: "150", w: 5, re: /\b(psychology|psychology|behaviou?r|cognitive|emotions?|trauma|therapy|psychoanalysis|mental health)\b/ },
    { num: "158", w: 5, re: /\b(self-help|personal growth|habits|productivity|mindfulness|confidence|happiness)\b/ },
    { num: "100", w: 4, re: /\b(philosophy|philosophers?|ethics|metaphysics|existential|stoicism|epistemology|logic)\b/ },
    { num: "200", w: 4, re: /\b(religions?|theology|bible|christian(ity)?|islam|judaism|buddhism|hinduism|spiritual(ity)?|faith)\b/ },
    { num: "320", w: 4, re: /\b(politics|political|government|democracy|elections?|ideology|geopolitics)\b/ },
    { num: "330", w: 4, re: /\b(economics|economy|macroeconomics|microeconomics|inflation|capitalism|globalization)\b/ },
    { num: "332", w: 4, re: /\b(investing|investors?|stocks?|personal finance|retirement|wealth|money management)\b/ },
    { num: "340", w: 4, re: /\b(law|legal|constitution(al)?|courts?|justice|jurisprudence)\b/ },
    { num: "355", w: 3, re: /\b(military|army|battle(s)?|soldiers?|warfare|armed forces)\b/ },
    { num: "940.53", w: 6, re: /\b(world war (ii|2)|wwii|ww2|holocaust|nazi)\b/ },
    { num: "364", w: 5, re: /\b(true crime|serial killers?|criminology|forensic science|organized crime)\b/ },
    { num: "370", w: 3, re: /\b(education|teaching|teachers?|classroom|pedagogy|learning|students?)\b/ },
    { num: "808.81", w: 5, re: /\b(poetry|poems?|poets?|verse)\b/ },
    { num: "808.82", w: 4, re: /\b(drama|plays|playwrights?|theatre|theater)\b/ },
    { num: "920", w: 6, re: /\b(biography|biographies|autobiography|memoir|memoirs)\b/ },
    { num: "900", w: 2, re: /\b(history|historical|century|empires?|civilizations?|ancient|medieval)\b/ },
    { num: "910", w: 4, re: /\b(travel|travelogue|journeys?|guidebooks?|backpacking|exploration)\b/ },
    { num: "070", w: 3, re: /\b(journalism|news media|reporters?|broadcasting|publishing)\b/ },
    { num: "025", w: 5, re: /\b(librar(y|ies|ianship)|cataloging|cataloguing)\b/ },
    { num: "004", w: 4, re: /\b(computers?|computer science|internet|digital|information technology)\b/ },
    { num: "005.1", w: 5, re: /\b(programming|software|coding|developers?|algorithms?|agile|clean code)\b/ },
    { num: "005.74", w: 5, re: /\b(databases?|sql|data modeling|data structures)\b/ },
    { num: "005.8", w: 4, re: /\b(cybersecurity|computer security|encryption|hacking)\b/ },
    { num: "006.3", w: 6, re: /\b(artificial intelligence|machine learning|deep learning|neural networks?|data science)\b/ },
    { num: "006.7", w: 5, re: /\b(web design|web development|html|css|javascript|multimedia|user experience)\b/ },
    { num: "621", w: 3, re: /\b(engineering|mechanics|thermodynamics|electronics|electrical)\b/ },
    { num: "624", w: 4, re: /\b(civil engineering|bridges?|construction|infrastructure)\b/ },
    { num: "630", w: 4, re: /\b(agriculture|farming|farmers?|crops|livestock|sustainable farming)\b/ },
    { num: "635", w: 4, re: /\b(garden(ing)?|horticulture|vegetable growing|landscaping)\b/ },
    { num: "650", w: 4, re: /\b(business|management|leadership|entrepreneurs?|startups?|marketing|strategy)\b/ },
    { num: "657", w: 5, re: /\b(accounting|bookkeeping|financial statements)\b/ },
    { num: "720", w: 4, re: /\b(architecture|architects?|buildings?|urban planning|interior design)\b/ },
    { num: "741.5", w: 6, re: /\b(graphic novels?|comics?|manga|comic books?)\b/ },
    { num: "780", w: 4, re: /\b(music|musicians?|composers?|songs?|music theory|bands?)\b/ },
    { num: "770", w: 4, re: /\b(photography|photographers?|photographs?|photojournalism|cameras?)\b/ },
    { num: "791", w: 4, re: /\b(films?|cinema|movies?|screenplays?|directors?|television)\b/ },
    { num: "796", w: 4, re: /\b(sports?|football|basketball|baseball|soccer|tennis|olympics?|athletes?)\b/ },
    { num: "745", w: 4, re: /\b(crafts?|knitting|woodworking|sewing|quilting|crochet|handicraft)\b/ },
    { num: "570", w: 3, re: /\b(biology|life sciences?|cells?|organisms?)\b/ },
    { num: "576", w: 4, re: /\b(evolution|natural selection|genetics|dna|heredity)\b/ },
    { num: "577", w: 4, re: /\b(ecology|environment(al)?|climate change|conservation|biodiversity|sustainability)\b/ },
    { num: "520", w: 4, re: /\b(astronomy|astrophysics|galaxies|planets?|solar system|telescopes?)\b/ },
    { num: "523.1", w: 5, re: /\b(cosmology|big bang|the universe|dark matter|black holes?)\b/ },
    { num: "530.12", w: 6, re: /\b(quantum)\b/ },
    { num: "530.11", w: 5, re: /\b(relativity)\b/ },
    { num: "510", w: 4, re: /\b(mathematics|math|algebra|geometry|calculus|statistics|number theory)\b/ },
    { num: "540", w: 4, re: /\b(chemistry|chemicals?|molecules?|atoms?)\b/ },
    { num: "550", w: 3, re: /\b(geology|earthquakes?|volcanoes?|minerals?|earth sciences?)\b/ },
    { num: "560", w: 5, re: /\b(fossils?|dinosaurs?|paleontology|prehistoric life)\b/ },
    { num: "590", w: 3, re: /\b(animals?|zoology|mammals?|birds?|insects?)\b/ },
    { num: "580", w: 3, re: /\b(plants?|botany|flowers?|trees?)\b/ },
    { num: "600", w: 2, re: /\b(technology|technologies|engineering|innovation)\b/ },
    { num: "306", w: 3, re: /\b(culture|cultural|anthropology|society|social life|civilization)\b/ },
    { num: "800", w: 2, re: /\b(fiction|novels?|literature|literary)\b/ }
  ];

  function normaliseNumber(value) {
    var s = String(value == null ? "" : value).trim();
    var m = s.match(/\d{1,3}(?:\.\d{1,4})?/);
    if (!m) return "";
    var num = m[0];
    if (num.indexOf(".") > -1) {
      num = num.replace(/0+$/, "").replace(/\.$/, "");
    }
    var intPart = num.split(".")[0];
    if (intPart.length < 3) intPart = ("000" + intPart).slice(-3);
    if (parseInt(intPart, 10) > 999) return "";
    return intPart + (num.indexOf(".") > -1 ? "." + num.split(".")[1] : "");
  }

  function ancestors(num) {
    var out = [];
    var bits = num.split(".");
    var intPart = bits[0];
    if (bits.length > 1) {
      var dec = bits[1];
      for (var i = dec.length; i >= 1; i--) out.push(intPart + "." + dec.slice(0, i));
    }
    out.push(intPart);
    if (intPart.length === 3) {
      if (intPart.slice(1) !== "00") {
        out.push(intPart.slice(0, 2) + "0");
        out.push(intPart.charAt(0) + "00");
      }
    } else {
      var padded = ("000" + intPart).slice(-3);
      out.push(padded);
      if (padded.slice(1) !== "00") {
        out.push(padded.slice(0, 2) + "0");
        out.push(padded.charAt(0) + "00");
      }
    }
    var seen = {};
    return out.filter(function (n) {
      if (seen[n]) return false;
      seen[n] = true;
      return true;
    });
  }

  function describe(num) {
    var normal = normaliseNumber(num);
    if (!normal) return null;
    var chain = ancestors(normal);
    var labels = [];
    for (var i = 0; i < chain.length; i++) {
      if (DDC[chain[i]]) {
        labels.push({ number: chain[i], label: DDC[chain[i]] });
      }
    }
    if (!labels.length) return null;
    var mainNumber = ("000" + normal.split(".")[0]).slice(-3).charAt(0) + "00";
    var mainLabel = DDC[mainNumber] || "";
    var path = labels.slice().reverse();
    if (mainLabel && !path.some(function (item) { return item.number === mainNumber; })) {
      path.unshift({ number: mainNumber, label: mainLabel });
    }
    return {
      number: normal,
      label: labels[0].label,
      mainClass: { number: mainNumber, label: mainLabel },
      path: path
    };
  }

  /* Pick the most repeated class from a catalogue's DDC list. */
  function fromCatalog(rawList) {
    var parsed = [];
    var fictionMarker = false;
    var easyMarker = false;

    (rawList || []).forEach(function (raw) {
      var str = String(raw == null ? "" : raw).trim();
      if (!str) return;
      if (/\[\s*fic\s*\]|^fic$|^f$/i.test(str)) fictionMarker = true;
      if (/\[\s*e\s*\]|^e$|^easy$|\bjuvenile easy\b/i.test(str)) easyMarker = true;
      var m = str.match(/(\d{3}(?:\.\d{1,4})?)/);
      if (!m) return;
      var num = normaliseNumber(m[1]);
      if (!num) return;
      parsed.push(num);
    });

    if (!parsed.length) {
      return { fictionMarker: fictionMarker || easyMarker, easyMarker: easyMarker, catalogNumbers: [] };
    }

    var counts = {};
    var order = [];
    parsed.forEach(function (num) {
      var key = num.split(".")[0];
      if (counts[key] == null) {
        counts[key] = 0;
        order.push(key);
      }
      counts[key] += 1;
    });

    var best = null;
    order.forEach(function (key) {
      if (best === null || counts[key] > counts[best]) best = key;
    });

    var candidates = parsed.filter(function (num) {
      return num.split(".")[0] === best;
    }).sort(function (a, b) {
      return a.length - b.length;
    });

    var chosen = candidates[0];
    var info = describe(chosen) || describe(best);
    var unique = [];
    parsed.forEach(function (n) {
      if (unique.indexOf(n) === -1) unique.push(n);
    });

    return {
      number: info.number,
      label: info.label,
      path: info.path,
      mainClass: info.mainClass,
      catalogNumbers: unique.slice(0, 8),
      fictionMarker: fictionMarker,
      easyMarker: easyMarker
    };
  }

  function fromLcc(lccList) {
    var list = lccList || [];
    for (var i = 0; i < LCC_MAP.length; i++) {
      for (var j = 0; j < list.length; j++) {
        var cls = String(list[j] || "").trim().toUpperCase();
        if (LCC_MAP[i][0].test(cls)) {
          var info = describe(LCC_MAP[i][1]);
          if (info) {
            return {
              number: info.number,
              label: info.label,
              path: info.path,
              mainClass: info.mainClass,
              lcc: cls,
              lccDescription: LCC_MAP[i][2]
            };
          }
        }
      }
    }
    return null;
  }

  function fromText(input) {
    var subjects = (input.subjects || []).join(" \u00b7 ").toLowerCase();
    var text = [input.title || "", input.subtitle || "", input.description || ""]
      .join(" ")
      .toLowerCase();
    if (!subjects && !text) return null;

    var scores = {};
    var terms = {};
    INFERENCE_RULES.forEach(function (rule) {
      var subjectHit = subjects.match(rule.re);
      var textHit = text.match(rule.re);
      var score = 0;
      if (subjectHit) score += rule.w * 3;
      if (textHit) score += rule.w;
      if (score > 0) {
        scores[rule.num] = (scores[rule.num] || 0) + score;
        if (!terms[rule.num]) terms[rule.num] = [];
        if (subjectHit) terms[rule.num].push(subjectHit[0]);
        if (textHit && textHit[0] !== (subjectHit && subjectHit[0])) terms[rule.num].push(textHit[0]);
      }
    });

    var bestNum = null;
    Object.keys(scores).forEach(function (num) {
      if (bestNum === null || scores[num] > scores[bestNum]) bestNum = num;
    });
    if (!bestNum || scores[bestNum] < 3) return null;

    var info = describe(bestNum);
    if (!info) return null;
    var basisTerms = [];
    (terms[bestNum] || []).forEach(function (term) {
      var clean = String(term).trim();
      if (clean && basisTerms.indexOf(clean) === -1) basisTerms.push(clean);
    });

    return {
      number: info.number,
      label: info.label,
      path: info.path,
      mainClass: info.mainClass,
      score: scores[bestNum],
      terms: basisTerms.slice(0, 4)
    };
  }

  function fictionFallback(input) {
    var hay = ((input.subjects || []).join(" ") + " " + (input.title || "")).toLowerCase();
    var looksFiction = input.fictionMarker || /\b(fiction|novel|novels|short stories|literature)\b/.test(hay);
    if (!looksFiction) return null;

    var num = "800";
    if (/\b(english|british|irish)\b/.test(hay)) num = "823";
    else if (/\b(american|united states)\b/.test(hay)) num = "813";
    else if (/\b(short stories|short fiction)\b/.test(hay)) num = "808.83";

    var info = describe(num);
    return {
      number: info.number,
      label: info.label,
      path: info.path,
      mainClass: info.mainClass,
      terms: ["record marked as fiction"]
    };
  }

  /*
   * Build the Dewey recommendation for a book.
   * Returns null when no reasonable equivalent can be found.
   */
  function classify(input) {
    var catalog = fromCatalog(input.ddc);
    if (catalog.number) {
      return {
        number: catalog.number,
        label: catalog.label,
        path: catalog.path,
        mainClass: catalog.mainClass,
        source: "catalog",
        sourceLabel: "Catalog record",
        basis: "Taken from the Dewey numbers attached to this ISBN in Open Library.",
        catalogNumbers: catalog.catalogNumbers,
        markers: {
          fiction: !!catalog.fictionMarker,
          easy: !!catalog.easyMarker
        }
      };
    }

    var lcc = fromLcc(input.lcc);
    if (lcc) {
      return {
        number: lcc.number,
        label: lcc.label,
        path: lcc.path,
        mainClass: lcc.mainClass,
        source: "lcc",
        sourceLabel: "Derived from LC classification",
        basis: "Mapped from Library of Congress class " + lcc.lcc + " (" + lcc.lccDescription + ").",
        catalogNumbers: catalog.catalogNumbers,
        markers: {
          fiction: !!catalog.fictionMarker,
          easy: !!catalog.easyMarker
        }
      };
    }

    /* A record explicitly marked as fiction should not be shelved by a
       subject keyword ("war", "history") before its literature class. */
    var fictionFallbackResult = null;
    if (catalog.fictionMarker) {
      fictionFallbackResult = fictionFallback({
        subjects: input.subjects,
        title: input.title,
        fictionMarker: true
      });
    }
    if (fictionFallbackResult) {
      return {
        number: fictionFallbackResult.number,
        label: fictionFallbackResult.label,
        path: fictionFallbackResult.path,
        mainClass: fictionFallbackResult.mainClass,
        source: "subjects",
        sourceLabel: "Estimated from record",
        basis: "This ISBN is marked as fiction, but no Dewey number was supplied.",
        confidence: "low",
        catalogNumbers: catalog.catalogNumbers,
        markers: {
          fiction: true,
          easy: !!catalog.easyMarker
        }
      };
    }

    var inferred = fromText({
      subjects: input.subjects,
      title: input.title,
      subtitle: input.subtitle,
      description: input.description
    });
    if (inferred) {
      return {
        number: inferred.number,
        label: inferred.label,
        path: inferred.path,
        mainClass: inferred.mainClass,
        source: "subjects",
        sourceLabel: "Estimated from subjects",
        basis: inferred.terms.length
          ? "Best match from this record's subjects and summary: " + inferred.terms.join(", ") + "."
          : "Estimated from this record's subjects and summary.",
        confidence: inferred.score >= 15 ? "medium" : "low",
        catalogNumbers: catalog.catalogNumbers,
        markers: {
          fiction: !!catalog.fictionMarker,
          easy: !!catalog.easyMarker
        }
      };
    }

    var fallback = fictionFallback({
      subjects: input.subjects,
      title: input.title,
      fictionMarker: catalog.fictionMarker
    });
    if (fallback) {
      return {
        number: fallback.number,
        label: fallback.label,
        path: fallback.path,
        mainClass: fallback.mainClass,
        source: "subjects",
        sourceLabel: "Estimated from record",
        basis: "This ISBN is marked as fiction, but no Dewey number was supplied.",
        confidence: "low",
        catalogNumbers: catalog.catalogNumbers,
        markers: {
          fiction: true,
          easy: !!catalog.easyMarker
        }
      };
    }

    return null;
  }

  window.StacksDdc = {
    labels: DDC,
    describe: describe,
    classify: classify,
    normaliseNumber: normaliseNumber
  };
})();
