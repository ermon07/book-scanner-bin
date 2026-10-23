/* Genre and audience inference from Dewey numbers, subjects and summary. */
(function () {
  "use strict";

  var RULES = [
    {
      id: "computing",
      label: "Computing & Technology",
      ddc: ["004", "005", "006", "005.1", "005.13", "005.4", "005.74", "005.8", "006.3", "006.6", "006.7"],
      ddcWeight: 7,
      weight: 3,
      re: /\b(computers?|computing|programming|software|coding|developers?|algorithms?|databases?|cybersecurity|artificial intelligence|machine learning|web development|internet)\b/
    },
    {
      id: "science",
      label: "Science",
      mainClasses: ["5"],
      ddcWeight: 3,
      weight: 2,
      re: /\b(science|scientific|physics|chemistry|biology|astronomy|cosmology|evolution|genetics|mathematics|neuroscience|quantum)\b/
    },
    {
      id: "nature",
      label: "Nature & Environment",
      ddc: ["570", "577", "578", "580", "590", "598", "599", "635"],
      ddcWeight: 5,
      weight: 3,
      re: /\b(nature|ecology|environment|climate change|conservation|wildlife|biodiversity|sustainability|animals|birds|plants|gardening)\b/
    },
    {
      id: "popular-science",
      label: "Popular Science",
      ddcWeight: 0,
      weight: 3,
      re: /\b(popular science|science writers?|science and civilization|how science works|physics for everyone|the science of)\b/
    },
    {
      id: "history",
      label: "History",
      mainClasses: ["9"],
      ddcWeight: 2,
      weight: 2,
      re: /\b(history|world history|civilization|empires?|ancient|medieval|20th century|world war)\b/
    },
    {
      id: "biography",
      label: "Biography & Memoir",
      ddc: ["920", "921", "929"],
      ddcWeight: 8,
      weight: 5,
      re: /\b(biography|biographies|autobiography|memoirs?|life of|personal narrative)\b/
    },
    {
      id: "literature",
      label: "Literature & Fiction",
      mainClasses: ["8"],
      ddcWeight: 2,
      weight: 1,
      re: /\b(fiction|novels?|literature|stories)\b/
    },
    {
      id: "classics",
      label: "Literary Fiction & Classics",
      ddcWeight: 0,
      weight: 4,
      re: /\b(literary fiction|classics?|classic literature|english fiction|american fiction)\b/
    },
    {
      id: "historical-fiction",
      label: "Historical Fiction",
      ddcWeight: 0,
      weight: 4,
      re: /\b(historical fiction|historical novels?|historical romance|regency|victorian era|historical)\b/
    },
    {
      id: "romance",
      label: "Romance",
      ddcWeight: 0,
      weight: 4,
      re: /\b(romance|romantic|love stories|regency|relationships? fiction)\b/
    },
    {
      id: "mystery",
      label: "Mystery & Detective",
      ddc: ["813.0872", "823.0872", "364"],
      ddcWeight: 5,
      weight: 4,
      re: /\b(mystery|mysteries|detective|detectives|murder|whodunit|crime fiction|private investigator|police procedural)\b/
    },
    {
      id: "thriller",
      label: "Thriller & Suspense",
      ddcWeight: 0,
      weight: 4,
      re: /\b(thrillers?|suspense|spy fiction|espionage|conspiracy|psychological thriller)\b/
    },
    {
      id: "science-fiction",
      label: "Science Fiction",
      ddc: ["813.0876", "823.0876"],
      ddcWeight: 5,
      weight: 4,
      re: /\b(science fiction|sci-fi|space opera|dystopi(as|an)|time travel|aliens?|extraterrestrial|cyberpunk|post-apocalyptic)\b/
    },
    {
      id: "fantasy",
      label: "Fantasy",
      ddc: ["813.08766", "823.08766"],
      ddcWeight: 5,
      weight: 4,
      re: /\b(fantasy|magic|magical|dragons?|wizards?|witches?|imaginary places|sword and sorcery|mythical)\b/
    },
    {
      id: "horror",
      label: "Horror",
      ddc: ["813.08738", "823.08738"],
      ddcWeight: 5,
      weight: 4,
      re: /\b(horror|ghost stories|haunted|vampires?|zombies?|supernatural fiction|occult fiction)\b/
    },
    {
      id: "adventure",
      label: "Adventure",
      ddcWeight: 0,
      weight: 3,
      re: /\b(adventure|survival stories|sea stories|quest|expedition)\b/
    },
    {
      id: "poetry",
      label: "Poetry",
      ddc: ["808.81", "811", "821", "831", "841", "851", "861", "871", "881"],
      ddcWeight: 6,
      weight: 4,
      re: /\b(poetry|poems?|poets?|verse|sonnets?)\b/
    },
    {
      id: "drama",
      label: "Drama & Plays",
      ddc: ["808.82", "812", "822", "832", "842", "852", "862", "872", "882"],
      ddcWeight: 5,
      weight: 4,
      re: /\b(plays|playwrights?|theatre|theater|tragedies|tragedy|dramatic works)\b/
    },
    {
      id: "essays",
      label: "Essays",
      ddc: ["814", "824", "808.84"],
      ddcWeight: 5,
      weight: 3,
      re: /\b(essays|essayists?|collections of essays)\b/
    },
    {
      id: "humor",
      label: "Humor",
      ddc: ["817", "827", "808.87"],
      ddcWeight: 4,
      weight: 4,
      re: /\b(humor|humour|comedy|satire|funny|jokes?)\b/
    },
    {
      id: "business",
      label: "Business & Economics",
      ddc: ["330", "332", "338", "650", "651", "657", "658", "659"],
      ddcWeight: 6,
      weight: 4,
      re: /\b(business|management|leadership|entrepreneurs?|startups?|marketing|economics|finance|investing|accounting|productivity)\b/
    },
    {
      id: "self-help",
      label: "Self-Help & Personal Growth",
      ddc: ["158", "613"],
      ddcWeight: 3,
      weight: 4,
      re: /\b(self-help|self-improvement|personal growth|habits|mindfulness|motivation|wellness|life skills)\b/
    },
    {
      id: "philosophy",
      label: "Philosophy",
      ddc: ["100", "110", "120", "140", "160", "170", "180", "190"],
      ddcWeight: 5,
      weight: 4,
      re: /\b(philosophy|philosophers?|ethics|metaphysics|existential(ism)?|stoicism|epistemology|logic)\b/
    },
    {
      id: "psychology",
      label: "Psychology",
      ddc: ["150", "152", "153", "155", "158"],
      ddcWeight: 5,
      weight: 4,
      re: /\b(psychology|psychological|behaviou?r|cognitive|emotions?|trauma|therapy|psychoanalysis|mental health)\b/
    },
    {
      id: "religion",
      label: "Religion & Spirituality",
      mainClasses: ["2"],
      ddcWeight: 4,
      weight: 4,
      re: /\b(religions?|theology|bible|christian(ity)?|islam|judaism|buddhism|hinduism|spiritual(ity)?|meditation|faith)\b/
    },
    {
      id: "health",
      label: "Health & Wellness",
      ddc: ["610", "613", "615", "616", "618"],
      ddcWeight: 5,
      weight: 3,
      re: /\b(health|medicine|medical|diseases?|nutrition|diet|fitness|sleep|wellbeing)\b/
    },
    {
      id: "cooking",
      label: "Cooking & Food",
      ddc: ["641", "641.5", "642", "663", "664"],
      ddcWeight: 8,
      weight: 5,
      re: /\b(cookbooks?|cooking|recipes?|baking|cuisine|gastronomy|food writing)\b/
    },
    {
      id: "travel",
      label: "Travel",
      ddc: ["910", "911", "912", "913", "914", "915", "916", "917", "918", "919"],
      ddcWeight: 7,
      weight: 4,
      re: /\b(travel|travelogues?|journeys?|guidebooks?|backpacking|exploration|road trip)\b/
    },
    {
      id: "art",
      label: "Art & Design",
      ddc: ["700", "710", "720", "730", "740", "741", "742", "743", "745", "746", "747", "748", "749", "750", "751", "752", "754", "757", "758", "759"],
      ddcWeight: 3,
      weight: 3,
      re: /\b(art|artists?|paintings?|sculpture|design|drawing|illustration|architecture|interior design)\b/
    },
    {
      id: "photography",
      label: "Photography",
      ddc: ["770", "771", "772", "773", "774", "775", "776", "777", "778", "779"],
      ddcWeight: 7,
      weight: 5,
      re: /\b(photography|photographers?|photographs?|photojournalism|cameras?)\b/
    },
    {
      id: "music",
      label: "Music",
      ddc: ["780", "781", "782", "783", "784", "785", "786", "787", "788"],
      ddcWeight: 7,
      weight: 5,
      re: /\b(music|musicians?|composers?|songs?|music theory|bands?|guitars?)\b/
    },
    {
      id: "film",
      label: "Film, TV & Stage",
      ddc: ["791", "792"],
      ddcWeight: 6,
      weight: 4,
      re: /\b(films?|cinema|movies?|screenplays?|directors?|television|theatre|theater)\b/
    },
    {
      id: "sports",
      label: "Sports & Recreation",
      ddc: ["796", "797", "798", "799"],
      ddcWeight: 6,
      weight: 4,
      re: /\b(sports?|football|basketball|baseball|soccer|tennis|olympics?|athletes?|coaching)\b/
    },
    {
      id: "gardening",
      label: "Gardening",
      ddc: ["635"],
      ddcWeight: 8,
      weight: 4,
      re: /\b(gardening|gardeners?|horticulture|vegetable garden|landscaping)\b/
    },
    {
      id: "crafts",
      label: "Crafts & Hobbies",
      ddc: ["745", "746", "747", "748", "749"],
      ddcWeight: 4,
      weight: 4,
      re: /\b(crafts?|knitting|woodworking|sewing|quilting|crochet|handicraft|diy)\b/
    },
    {
      id: "education",
      label: "Education & Teaching",
      ddc: ["370", "371", "372", "373", "374", "375", "376", "377", "378", "379"],
      ddcWeight: 5,
      weight: 3,
      re: /\b(education|teaching|teachers?|classroom|pedagogy|curriculum|students?)\b/
    },
    {
      id: "politics",
      label: "Politics & Government",
      ddc: ["320", "321", "322", "323", "324", "325", "326", "327", "328", "329"],
      ddcWeight: 6,
      weight: 4,
      re: /\b(politics|political|government|democracy|elections?|ideology|geopolitics|civil rights)\b/
    },
    {
      id: "law",
      label: "Law & Justice",
      ddc: ["340", "341", "342", "345", "346", "347", "349"],
      ddcWeight: 6,
      weight: 4,
      re: /\b(law|legal|constitution(al)?|courts?|justice|jurisprudence|rights)\b/
    },
    {
      id: "true-crime",
      label: "True Crime",
      ddc: ["364"],
      ddcWeight: 7,
      weight: 5,
      re: /\b(true crime|serial killers?|criminology|forensic science|organized crime|cold cases?)\b/
    },
    {
      id: "society",
      label: "Society & Culture",
      ddc: ["300", "302", "303", "305", "306"],
      ddcWeight: 3,
      weight: 3,
      re: /\b(society|sociology|anthropology|culture|cultural studies|social issues|gender|race|inequality|civilization)\b/
    },
    {
      id: "war",
      label: "War & Military",
      ddc: ["355", "356", "357", "358", "359", "940.53"],
      ddcWeight: 6,
      weight: 3,
      re: /\b(war|wars|military|army|battles?|soldiers?|warfare|holocaust|world war)\b/
    },
    {
      id: "reference",
      label: "Reference",
      ddc: ["030", "050", "060", "080", "090", "413", "423"],
      ddcWeight: 4,
      weight: 3,
      re: /\b(reference|encyclopedias?|encyclopaedias?|dictionaries|handbooks?|almanacs?|reference works?|quotations)\b/
    },
    {
      id: "graphic-novels",
      label: "Graphic Novels & Comics",
      ddc: ["741.5"],
      ddcWeight: 9,
      weight: 6,
      re: /\b(graphic novels?|comics?|comic books?|manga|sequential art)\b/
    },
    {
      id: "language",
      label: "Language & Linguistics",
      mainClasses: ["4"],
      ddcWeight: 4,
      weight: 3,
      re: /\b(language|linguistics|grammar|vocabulary|etymology|writing system)\b/
    }
  ];

  function ddcMatches(number, prefixes) {
    if (!number || !prefixes) return false;
    for (var i = 0; i < prefixes.length; i++) {
      var p = prefixes[i];
      if (number === p) return true;
      if (number.indexOf(p + ".") === 0) return true;
    }
    return false;
  }

  function mainClassMatches(number, classes) {
    if (!number || !classes) return false;
    var main = number.charAt(0);
    for (var i = 0; i < classes.length; i++) {
      if (classes[i].charAt(0) === main) return true;
    }
    return false;
  }

  function inferGenres(book) {
    var ddc = book.ddc && book.ddc.number ? book.ddc.number : "";
    var subjects = (book.subjects || []).join(" \u00b7 ").toLowerCase();
    var text = [book.title || "", book.subtitle || "", (book.description || "").slice(0, 700)]
      .join(" ")
      .toLowerCase();

    var scored = [];

    RULES.forEach(function (rule, index) {
      var score = 0;
      var subjectHit = rule.re.test(subjects);
      if (subjectHit) score += rule.weight * 2;
      if (rule.re.test(text)) score += rule.weight;
      if (ddcMatches(ddc, rule.ddc)) score += rule.ddcWeight;
      if (mainClassMatches(ddc, rule.mainClasses)) score += rule.ddcWeight;
      if (score > 0) {
        scored.push({ id: rule.id, label: rule.label, score: score, order: index });
      }
    });

    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.order - b.order;
    });

    var seen = {};
    var genres = [];
    scored.forEach(function (item) {
      if (seen[item.label]) return;
      seen[item.label] = true;
      genres.push(item);
    });

    var kind = inferKind(book);

    /* Subject lists are noisy: a novel can carry "History" or "Science"
       simply because of its setting. For fiction, keep the fiction shelves. */
    if (kind === "Fiction") {
      var notFiction = {
        history: 1, war: 1, politics: 1, law: 1, business: 1, science: 1,
        computing: 1, health: 1, cooking: 1, travel: 1, "true-crime": 1,
        society: 1, philosophy: 1, psychology: 1, religion: 1,
        education: 1, gardening: 1, photography: 1, music: 1, sports: 1,
        art: 1, crafts: 1, language: 1, nature: 1, "self-help": 1
      };
      genres = genres.filter(function (genre) { return !notFiction[genre.id]; });
    } else if (kind === "Nonfiction") {
      var fictionOnly = {
        literature: 1, classics: 1, "historical-fiction": 1, romance: 1,
        "science-fiction": 1, fantasy: 1, horror: 1, mystery: 1,
        thriller: 1, adventure: 1
      };
      genres = genres.filter(function (genre) { return !fictionOnly[genre.id]; });
    }

    if (!genres.length) {
      genres.push({
        id: kind === "Fiction" ? "fiction" : "nonfiction",
        label: kind === "Fiction" ? "General Fiction" : "General Nonfiction",
        score: 0
      });
    }

    return genres.slice(0, 4);
  }

  function inferKind(book) {
    var ddc = book.ddc && book.ddc.number ? book.ddc.number : "";
    var hay = [
      (book.subjects || []).join(" "),
      book.title || "",
      (book.description || "").slice(0, 400)
    ].join(" ").toLowerCase();

    if (book.ddc && book.ddc.markers && book.ddc.markers.fiction) return "Fiction";
    if (/\[fic\]|\bfic\b/.test(hay)) return "Fiction";
    if (ddc && /^8\d\d/.test(ddc) && !/^80[0-9]/.test(ddc)) return "Literature";
    if (/\b(fiction|novels?|short stories)\b/.test(hay) && !/\b(nonfiction|non-fiction)\b/.test(hay)) {
      return "Fiction";
    }
    if (ddc) return "Nonfiction";
    return "";
  }

  function inferAudience(book) {
    var hay = [
      (book.subjects || []).join(" "),
      book.title || "",
      (book.description || "").slice(0, 300)
    ].join(" ").toLowerCase();

    if (/\b(young adult|ya fiction|teen readers?|teenagers?|high school students?)\b/.test(hay)) {
      return { label: "Young Adult", id: "ya" };
    }
    if (/\b(juvenile|children'?s?|picture books?|primary school|elementary school|ages? \d|young readers?|board books?)\b/.test(hay)) {
      return { label: "Children's", id: "children" };
    }
    return { label: "General / Adult", id: "adult" };
  }

  window.StacksGenre = {
    inferGenres: inferGenres,
    inferKind: inferKind,
    inferAudience: inferAudience
  };
})();
