/* Open Library lookups, normalisation and classification wiring. */
(function () {
  "use strict";

  var OL = "https://openlibrary.org";
  var FIELDS = [
    "key", "title", "subtitle", "author_name", "first_publish_year", "publish_year",
    "publisher", "publish_place", "language", "number_of_pages_median", "subject",
    "subject_people", "subject_places", "subject_times", "ddc", "cover_i",
    "edition_count", "first_sentence"
  ].join(",");

  var SEARCH_FIELDS = [
    "key", "title", "subtitle", "author_name", "first_publish_year", "publisher",
    "language", "number_of_pages_median", "subject", "ddc", "cover_i", "edition_count"
  ].join(",");

  var CACHE_PREFIX = "stacks.book.";
  var CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

  var LANGUAGES = {
    eng: "English", fre: "French", fra: "French", ger: "German", deu: "German",
    spa: "Spanish", ita: "Italian", por: "Portuguese", rus: "Russian", chi: "Chinese",
    zho: "Chinese", jpn: "Japanese", kor: "Korean", ara: "Arabic", heb: "Hebrew",
    hin: "Hindi", urd: "Urdu", ben: "Bengali", vie: "Vietnamese", tha: "Thai",
    ind: "Indonesian", may: "Malay", rum: "Romanian", ron: "Romanian", hun: "Hungarian",
    dut: "Dutch", nld: "Dutch", pol: "Polish", swe: "Swedish", nor: "Norwegian",
    dan: "Danish", fin: "Finnish", cze: "Czech", ces: "Czech", gre: "Greek",
    ell: "Greek", tur: "Turkish", ukr: "Ukrainian", bul: "Bulgarian", hrv: "Croatian",
    srp: "Serbian", slo: "Slovak", slk: "Slovak", slv: "Slovenian", lit: "Lithuanian",
    lav: "Latvian", est: "Estonian", ice: "Icelandic", isl: "Icelandic",
    glg: "Galician", cat: "Catalan", epo: "Esperanto", lat: "Latin", san: "Sanskrit",
    per: "Persian", fas: "Persian", tam: "Tamil", tel: "Telugu", mal: "Malayalam",
    kan: "Kannada", mar: "Marathi", guj: "Gujarati", pan: "Punjabi", sin: "Sinhala",
    bur: "Burmese", mya: "Burmese", khm: "Khmer", lao: "Lao", tib: "Tibetan",
    amh: "Amharic", swa: "Swahili", zul: "Zulu", afr: "Afrikaans", yid: "Yiddish",
    wel: "Welsh", cym: "Welsh", gle: "Irish", gla: "Scottish Gaelic", baq: "Basque",
    eus: "Basque", alb: "Albanian", sqi: "Albanian", mkd: "Macedonian",
    bos: "Bosnian", geo: "Georgian", kat: "Georgian", arm: "Armenian", hye: "Armenian",
    aze: "Azerbaijani", kaz: "Kazakh", uzb: "Uzbek", fil: "Filipino", tgl: "Tagalog"
  };

  var SUBJECT_NOISE = [
    /^nyt:/i,
    /new york times/i,
    /best ?sellers?/i,
    /large type/i,
    /book club/i,
    /protected daisy/i,
    /accessible book/i,
    /in library/i,
    /overdrive/i,
    /reading level/i,
    /^translations? into /i
  ];

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  async function requestJson(url) {
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = null;
    if (controller) {
      timer = setTimeout(function () { controller.abort(); }, 15000);
    }
    try {
      var response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller ? controller.signal : undefined
      });
      if (response.status === 404) return null;
      if (!response.ok) {
        var httpError = new Error("Open Library responded with status " + response.status + ".");
        httpError.code = response.status === 429 ? "rate_limit" : "http";
        httpError.status = response.status;
        throw httpError;
      }
      return await response.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function getJson(url) {
    try {
      return await requestJson(url);
    } catch (error) {
      if (error.name === "AbortError") {
        var timeoutError = new Error("The catalogue request timed out.");
        timeoutError.code = "timeout";
        throw timeoutError;
      }
      if (error.code === "http" || error.code === "rate_limit") throw error;
      await sleep(600);
      return requestJson(url);
    }
  }

  function text(value) {
    if (value == null) return "";
    return String(value).replace(/\s+/g, " ").trim();
  }

  function first(list) {
    if (!Array.isArray(list)) return "";
    for (var i = 0; i < list.length; i++) {
      var value = text(list[i]);
      if (value) return value;
    }
    return "";
  }

  function cleanDescription(value) {
    if (!value) return "";
    var raw = typeof value === "string" ? value : value.value || "";
    return text(String(raw)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">"))
      .replace(/\s*\n\s*/g, "\n")
      .replace(/\n{3,}/g, "\n\n");
  }

  function yearOf(value) {
    var match = String(value || "").match(/\b(1[5-9]\d\d|20\d\d|2100)\b/);
    return match ? match[1] : "";
  }

  function languageName(code) {
    if (!code) return "";
    var key = String(code).toLowerCase();
    return LANGUAGES[key] || key.toUpperCase();
  }

  function languageFromEdition(edition) {
    var langs = edition && edition.languages;
    if (!Array.isArray(langs) || !langs.length) return { code: "", name: "" };
    var key = langs[0] && langs[0].key ? langs[0].key : "";
    var code = key.split("/").pop() || "";
    return { code: code, name: languageName(code) };
  }

  function cleanSubjects(list) {
    var out = [];
    var seen = {};
    (list || []).forEach(function (item) {
      var value = text(item && item.name ? item.name : item);
      value = value.replace(/[.;,\s]+$/, "");
      if (!value || value.length < 2 || value.length > 72) return;
      if (SUBJECT_NOISE.some(function (re) { return re.test(value); })) return;
      var key = value.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(value);
    });
    return out.slice(0, 18);
  }

  function cleanStringList(list, limit) {
    var out = [];
    var seen = {};
    (list || []).forEach(function (item) {
      var value = text(item);
      if (!value) return;
      var key = value.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(value);
    });
    return out.slice(0, limit || 6);
  }

  function coverUrls(edition, doc, isbn13) {
    var id = 0;
    var covers = edition && edition.covers;
    if (Array.isArray(covers)) {
      for (var i = 0; i < covers.length; i++) {
        if (covers[i] > 0) { id = covers[i]; break; }
      }
    }
    if (!id && doc && doc.cover_i > 0) id = doc.cover_i;
    if (id) {
      return {
        large: "https://covers.openlibrary.org/b/id/" + id + "-L.jpg",
        small: "https://covers.openlibrary.org/b/id/" + id + "-M.jpg"
      };
    }
    if (isbn13) {
      /* The ISBN cover is a guess; keep it for the big cover only so shelf
         thumbnails do not fire requests for covers that may not exist. */
      return {
        large: "https://covers.openlibrary.org/b/isbn/" + isbn13 + "-L.jpg?default=false",
        small: ""
      };
    }
    return { large: "", small: "" };
  }

  function buildBook(options) {
    var doc = options.doc || {};
    var edition = options.edition || {};
    var work = options.work || {};

    var isbn13 = options.isbn13 || first(edition.isbn_13) || "";
    var isbn10 = options.isbn10 || first(edition.isbn_10) || "";
    if (!isbn10 && isbn13) isbn10 = StacksIsbn.to10(isbn13);
    if (!isbn13 && isbn10) isbn13 = StacksIsbn.to13(isbn10);

    var title = text(edition.title) || text(doc.title);
    if (!title) {
      var missing = new Error("No catalogue record found for this ISBN.");
      missing.code = "not_found";
      throw missing;
    }
    var subtitle = text(edition.subtitle) || text(doc.subtitle);

    var authors = cleanStringList(doc.author_name, 4);
    if (!authors.length && edition.by_statement) {
      authors = [text(edition.by_statement)];
    }
    if (!authors.length && Array.isArray(work.authors)) {
      work.authors.forEach(function (entry) {
        if (entry && entry.author && entry.author.name) authors.push(text(entry.author.name));
      });
    }

    var subjects = cleanSubjects(
      [].concat(edition.subjects || [], doc.subject || [], work.subjects || [])
    );

    var description = cleanDescription(edition.description) ||
      cleanDescription(work.description) ||
      cleanDescription(doc.description);

    var publishDate = text(edition.publish_date) || (doc.first_publish_year ? String(doc.first_publish_year) : "");
    var publishPlace = first(edition.publish_places) || first(doc.publish_place);
    var pages = edition.number_of_pages || doc.number_of_pages_median || 0;
    var language = languageFromEdition(edition);
    if (!language.code && Array.isArray(doc.language) && doc.language.length === 1) {
      language = { code: doc.language[0], name: languageName(doc.language[0]) };
    }

    var covers = coverUrls(edition, doc, isbn13);
    var lcc = [].concat(edition.lc_classifications || []);
    var ddcCandidates = [].concat(edition.dewey_decimal_class || [], doc.ddc || []);

    var ddcResult = StacksDdc.classify({
      ddc: ddcCandidates,
      lcc: lcc,
      subjects: subjects,
      title: title,
      subtitle: subtitle,
      description: description
    });

    var book = {
      isbn13: isbn13,
      isbn10: isbn10,
      title: title,
      subtitle: subtitle,
      authors: authors,
      publisher: first(edition.publishers) || first(doc.publisher),
      publishPlace: publishPlace,
      publishDate: publishDate,
      publishYear: yearOf(publishDate),
      firstPublishYear: doc.first_publish_year || 0,
      pages: pages,
      language: language.name,
      languageCode: language.code,
      cover: covers.large,
      coverSmall: covers.small,
      description: description,
      subjects: subjects,
      people: cleanStringList(doc.subject_people, 6),
      places: cleanStringList(doc.subject_places, 6),
      times: cleanStringList(doc.subject_times, 6),
      lcc: lcc,
      ddc: ddcResult,
      editionName: text(edition.edition_name),
      physicalFormat: text(edition.physical_format),
      series: first(edition.series),
      editionCount: doc.edition_count || 0,
      openLibraryUrl: edition.key ? OL + edition.key : (doc.key ? OL + doc.key : ""),
      source: "Open Library"
    };

    book.genres = StacksGenre.inferGenres(book);
    book.primaryGenre = book.genres.length ? book.genres[0] : null;
    book.kind = StacksGenre.inferKind(book);
    book.audience = StacksGenre.inferAudience(book);

    return book;
  }

  function cacheGet(isbn13) {
    try {
      var raw = localStorage.getItem(CACHE_PREFIX + isbn13);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (!entry || !entry.savedAt || Date.now() - entry.savedAt > CACHE_TTL) return null;
      return entry.book;
    } catch (error) {
      return null;
    }
  }

  function cacheSet(isbn13, book) {
    try {
      localStorage.setItem(CACHE_PREFIX + isbn13, JSON.stringify({ savedAt: Date.now(), book: book }));
    } catch (error) {
      /* storage full or unavailable — lookups still work */
    }
  }

  function notFound(isbn) {
    var error = new Error("No catalogue record found for ISBN " + isbn + ".");
    error.code = "not_found";
    error.isbn = isbn;
    return error;
  }

  async function lookupIsbn(isbn13, isbn10) {
    if (!isbn13) throw notFound(isbn10 || "");

    var cached = cacheGet(isbn13);
    if (cached) return cached;

    var searchUrl = OL + "/search.json?isbn=" + encodeURIComponent(isbn13) +
      "&fields=" + FIELDS + "&limit=3";
    var settled = await Promise.allSettled([
      getJson(searchUrl),
      getJson(OL + "/isbn/" + encodeURIComponent(isbn13) + ".json")
    ]);

    var search = settled[0].status === "fulfilled" ? settled[0].value : null;
    var edition = settled[1].status === "fulfilled" ? settled[1].value : null;

    if (!edition && isbn10) {
      try {
        edition = await getJson(OL + "/isbn/" + encodeURIComponent(isbn10) + ".json");
      } catch (error) {
        edition = null;
      }
    }

    var docs = search && Array.isArray(search.docs) ? search.docs : [];
    var doc = null;
    for (var i = 0; i < docs.length; i++) {
      if (text(docs[i].title)) { doc = docs[i]; break; }
    }

    if (!doc && !edition) {
      var searchError = settled[0].status === "rejected" ? settled[0].reason : null;
      if (searchError && searchError.code && searchError.code !== "http") throw searchError;
      throw notFound(isbn13);
    }

    var work = null;
    var needWork = !edition || !edition.description || !(doc && doc.subject);
    if (doc && doc.key && needWork) {
      try {
        work = await getJson(OL + doc.key + ".json");
      } catch (error) {
        work = null;
      }
    }

    var book;
    try {
      book = buildBook({
        isbn13: isbn13,
        isbn10: isbn10,
        doc: doc,
        edition: edition,
        work: work
      });
    } catch (error) {
      if (error.code === "not_found") throw notFound(isbn13);
      throw error;
    }

    /* Use the exact scanned ISBN even if the edition record lists variants. */
    book.isbn13 = isbn13;
    if (!book.isbn10) book.isbn10 = isbn10 || StacksIsbn.to10(isbn13);

    cacheSet(isbn13, book);
    return book;
  }

  function mapSearchDoc(doc) {
    var covers = coverUrls(null, doc, "");
    return {
      key: doc.key || "",
      title: text(doc.title),
      subtitle: text(doc.subtitle),
      authors: cleanStringList(doc.author_name, 2),
      year: doc.first_publish_year || "",
      coverSmall: covers.small || (doc.cover_i ? "https://covers.openlibrary.org/b/id/" + doc.cover_i + "-M.jpg" : ""),
      ddc: (doc.ddc || [])[0] || "",
      editionCount: doc.edition_count || 0,
      doc: doc
    };
  }

  async function searchBooks(query) {
    var url = OL + "/search.json?q=" + encodeURIComponent(query) +
      "&limit=6&fields=" + SEARCH_FIELDS;
    var data = await getJson(url);
    if (!data || !Array.isArray(data.docs)) return [];
    return data.docs
      .filter(function (doc) { return text(doc.title); })
      .map(mapSearchDoc);
  }

  async function resolveSearchResult(result) {
    if (!result) throw notFound("");

    if (result.key) {
      try {
        var editions = await getJson(OL + result.key + "/editions.json?limit=25");
        var entries = editions && Array.isArray(editions.entries) ? editions.entries : [];
        var triedIsbn = false;
        for (var i = 0; i < entries.length; i++) {
          var candidates = []
            .concat(entries[i].isbn_13 || [])
            .concat(entries[i].isbn_10 || []);
          for (var j = 0; j < candidates.length; j++) {
            var parsed = StacksIsbn.parse(candidates[j]);
            if (parsed.valid && !triedIsbn) {
              triedIsbn = true;
              try {
                return await lookupIsbn(parsed.isbn13, parsed.isbn10);
              } catch (error) {
                /* ISBN missing from the index — try the work record instead */
                if (error.code !== "not_found") throw error;
              }
            }
          }
        }
      } catch (error) {
        /* fall through to a record built from the work itself */
      }
    }

    var work = null;
    if (result.key) {
      try { work = await getJson(OL + result.key + ".json"); } catch (error) { work = null; }
    }

    return buildBook({
      isbn13: "",
      isbn10: "",
      doc: result.doc || { title: result.title, subtitle: result.subtitle },
      edition: null,
      work: work
    });
  }

  window.StacksApi = {
    lookupIsbn: lookupIsbn,
    searchBooks: searchBooks,
    resolveSearchResult: resolveSearchResult,
    languageName: languageName,
    cleanDescription: cleanDescription
  };
})();
