/* Stacks — UI controller. */
(function () {
  "use strict";

  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  var $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };

  var state = {
    tab: "camera",
    cameraOn: false,
    cameraStarting: false,
    photoBusy: false,
    loading: false,
    book: null,
    searchResults: [],
    retry: null,
    clearArmed: false,
    lastCode: "",
    lastCodeAt: 0,
    lastParsed: null,
    lookupSeq: 0,
    installPrompt: null,
    installMode: "",
    installShown: false
  };

  var els = {};

  var INSTALL_KEY = "stacks.install.v1";
  var INSTALL_COOLDOWN = 14 * 24 * 60 * 60 * 1000;

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch];
    });
  }

  function initials(title) {
    return String(title || "?")
      .split(/\s+/)
      .filter(function (word) { return /[a-z0-9]/i.test(word); })
      .slice(0, 2)
      .map(function (word) { return word.charAt(0).toUpperCase(); })
      .join("");
  }

  function surname(authors) {
    var name = (authors && authors[0]) || "";
    if (!name) return "";
    var parts = name.replace(/,.*$/, "").trim().split(/\s+/);
    return parts[parts.length - 1] || "";
  }

  function toast(message) {
    if (!els.toastRegion) return;
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    els.toastRegion.appendChild(el);
    setTimeout(function () { el.classList.add("is-out"); }, 2600);
    setTimeout(function () { el.remove(); }, 3100);
  }

  /* ---------- Install (PWA) ---------- */

  function readInstallState() {
    try {
      return JSON.parse(localStorage.getItem(INSTALL_KEY) || "{}") || {};
    } catch (error) {
      return {};
    }
  }

  function writeInstallState(patch) {
    var next = Object.assign(readInstallState(), patch);
    try {
      localStorage.setItem(INSTALL_KEY, JSON.stringify(next));
    } catch (error) {
      /* storage may be unavailable in private modes */
    }
    return next;
  }

  function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true;
  }

  function isMobileView() {
    return (window.matchMedia && window.matchMedia("(max-width: 820px)").matches) ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  }

  function isIosDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isInstalled() {
    return isStandalone() || !!readInstallState().installed;
  }

  function installModeFor() {
    if (state.installPrompt && typeof state.installPrompt.prompt === "function") return "prompt";
    if (isIosDevice()) return "ios";
    return "manual";
  }

  function updateInstallLink() {
    if (!els.installOpen) return;
    els.installOpen.hidden = !(isMobileView() && !isInstalled() && window.isSecureContext);
  }

  function showInstallSheet(mode) {
    if (!els.installSheet) return;
    state.installMode = mode;
    state.installShown = true;

    if (mode === "ios") {
      els.installCopy.textContent = "Add Stacks to your home screen for a full-screen scanner and one-tap access.";
      els.installSteps.innerHTML = "Tap <b>Share</b> (the square with an arrow), then choose <b>Add to Home Screen</b>.";
      els.installSteps.hidden = false;
      els.installAccept.textContent = "Got it";
    } else if (mode === "manual") {
      els.installCopy.textContent = "Install Stacks from your browser menu for a full-screen, one-tap scanner.";
      els.installSteps.innerHTML = "Open your browser menu and choose <b>Install app</b> or <b>Add to Home Screen</b>.";
      els.installSteps.hidden = false;
      els.installAccept.textContent = "Got it";
    } else {
      els.installCopy.textContent = "Keep the scanner one tap from your home screen \u2014 the app shell even opens offline.";
      els.installSteps.hidden = true;
      els.installAccept.textContent = "Install app";
    }

    els.installBackdrop.hidden = false;
    els.installSheet.hidden = false;
    document.body.classList.add("install-open");
    setTimeout(function () { els.installAccept.focus(); }, 60);
  }

  function hideInstallSheet() {
    if (!els.installSheet) return;
    els.installSheet.hidden = true;
    if (els.installBackdrop) els.installBackdrop.hidden = true;
    document.body.classList.remove("install-open");
    state.installShown = false;
  }

  function dismissInstall() {
    writeInstallState({ dismissedAt: Date.now() });
    hideInstallSheet();
  }

  async function acceptInstall() {
    if (state.installMode === "prompt" && state.installPrompt &&
        typeof state.installPrompt.prompt === "function") {
      var promptEvent = state.installPrompt;
      els.installAccept.disabled = true;
      try {
        promptEvent.prompt();
        var choice = await promptEvent.userChoice;
        state.installPrompt = null;
        if (choice && choice.outcome === "accepted") {
          writeInstallState({ installed: true, dismissedAt: 0 });
          hideInstallSheet();
          updateInstallLink();
          toast("Stacks installed \u2014 find it on your home screen");
        } else {
          dismissInstall();
        }
      } catch (error) {
        showInstallSheet("manual");
      } finally {
        els.installAccept.disabled = false;
      }
      return;
    }

    if (state.installMode === "ios" || state.installMode === "manual") {
      dismissInstall();
      return;
    }

    showInstallSheet("manual");
  }

  function maybeShowInstall(force) {
    if (!els.installSheet) return;
    if (!window.isSecureContext) return;
    if (isStandalone() || !isMobileView() || isInstalled()) return;

    var saved = readInstallState();
    if (!force && saved.dismissedAt && Date.now() - saved.dismissedAt < INSTALL_COOLDOWN) return;
    if (!force && (state.cameraOn || state.photoBusy || state.loading || state.installShown)) return;
    if (state.installShown) return;

    showInstallSheet(installModeFor());
  }

  function setupInstall() {
    els.installAccept.addEventListener("click", acceptInstall);
    els.installDismiss.addEventListener("click", dismissInstall);
    els.installClose.addEventListener("click", dismissInstall);
    els.installBackdrop.addEventListener("click", dismissInstall);
    els.installOpen.addEventListener("click", function () { maybeShowInstall(true); });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && state.installShown) dismissInstall();
    });

    updateInstallLink();
    setTimeout(function () { maybeShowInstall(false); }, isIosDevice() ? 2600 : 5200);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    var register = function () {
      navigator.serviceWorker.register("./sw.js").catch(function (error) {
        console.warn("Service worker registration failed", error);
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);
  }

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    state.installPrompt = event;
    updateInstallLink();

    /* If the instruction sheet is already open, upgrade it to a real prompt. */
    if (state.installShown) {
      showInstallSheet("prompt");
      return;
    }

    setTimeout(function () { maybeShowInstall(false); }, 1400);
  });

  window.addEventListener("appinstalled", function () {
    state.installPrompt = null;
    writeInstallState({ installed: true, dismissedAt: 0 });
    hideInstallSheet();
    updateInstallLink();
    toast("Stacks installed \u2014 find it on your home screen");
  });

  /* ---------- Tabs ---------- */

  function selectTab(name, focus) {
    if (["camera", "photo", "manual"].indexOf(name) === -1) return;
    state.tab = name;
    $$("[data-tab]").forEach(function (button) {
      var active = button.getAttribute("data-tab") === name;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus();
    });
    ["camera", "photo", "manual"].forEach(function (pane) {
      var el = document.getElementById("pane-" + pane);
      if (!el) return;
      var active = pane === name;
      el.classList.toggle("is-active", active);
      el.hidden = !active;
    });
    if (name !== "camera") stopCamera();
  }

  function bindTabs() {
    var tabs = $$("[data-tab]");
    tabs.forEach(function (button) {
      button.addEventListener("click", function () {
        selectTab(button.getAttribute("data-tab"));
      });
      button.addEventListener("keydown", function (event) {
        var index = tabs.indexOf(button);
        var next = null;
        if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
        if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
        if (event.key === "Home") next = tabs[0];
        if (event.key === "End") next = tabs[tabs.length - 1];
        if (next) {
          event.preventDefault();
          selectTab(next.getAttribute("data-tab"), true);
        }
      });
    });
  }

  /* ---------- Camera ---------- */

  function cameraErrorMessage(error) {
    var text = String((error && error.name) || "") + " " + String((error && error.message) || error || "");
    if (/NotAllowed|Permission|denied/i.test(text)) {
      return "Camera permission was denied. Allow it in your browser's address bar, then try again — or use Photo/ISBN.";
    }
    if (/NotFound|no camera|Requested device not found|DevicesNotFound/i.test(text)) {
      return "No camera was found. Use the Photo tab to scan a picture of the barcode, or type the ISBN.";
    }
    if (/NotReadable|in use|TrackStart/i.test(text)) {
      return "The camera is busy in another app. Close it and try again, or use Photo/ISBN.";
    }
    return "The camera couldn't start. Use the Photo tab or enter the ISBN instead.";
  }

  async function startCamera() {
    hideInstallSheet();
    if (state.cameraStarting || state.cameraOn) return;
    if (!els.cameraPreview) return;

    if (!StacksScanner.isSecureContext()) {
      els.cameraHint.textContent = "Live camera needs localhost or HTTPS. Open the app through the local server, or use Photo/ISBN.";
      els.cameraHint.classList.add("is-error");
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      els.cameraHint.textContent = "This browser doesn't expose a camera. Use Photo or ISBN instead.";
      els.cameraHint.classList.add("is-error");
      return;
    }

    state.cameraStarting = true;
    els.cameraStart.disabled = true;
    els.cameraStart.textContent = "Starting\u2026";
    els.cameraHint.classList.remove("is-error");
    els.cameraHint.textContent = "Allow camera access if your browser asks.";

    try {
      await StacksScanner.start("camera-preview", handleBarcode);
      state.cameraOn = true;
      els.cameraPlaceholder.hidden = true;
      els.cameraStart.hidden = true;
      els.cameraStop.hidden = false;
      els.cameraHint.textContent = "Hold the barcode inside the frame, about 15 cm away.";
    } catch (error) {
      els.cameraHint.textContent = cameraErrorMessage(error);
      els.cameraHint.classList.add("is-error");
      els.cameraPlaceholder.hidden = false;
    } finally {
      state.cameraStarting = false;
      els.cameraStart.disabled = false;
      els.cameraStart.textContent = "Start camera";
    }
  }

  async function stopCamera() {
    await StacksScanner.stop();
    state.cameraOn = false;
    if (!els.cameraStop) return;
    els.cameraStop.hidden = true;
    els.cameraStart.hidden = false;
    els.cameraPlaceholder.hidden = false;
    els.cameraHint.classList.remove("is-error");
  }

  function handleBarcode(code) {
    var now = Date.now();
    if (code === state.lastCode && now - state.lastCodeAt < 2500) return;
    var parsed = StacksIsbn.parse(code);
    if (!parsed.valid) {
      els.cameraHint.textContent = "That barcode isn't a book ISBN. Look for the 978/979 barcode on the back cover.";
      els.cameraHint.classList.add("is-error");
      return;
    }
    state.lastCode = code;
    state.lastCodeAt = now;
    StacksScanner.feedback();
    els.cameraHint.classList.remove("is-error");
    els.cameraHint.textContent = "ISBN " + parsed.isbn13 + " captured.";
    els.isbnInput.value = parsed.isbn13;
    stopCamera();
    runLookup(parsed);
  }

  /* ---------- Photo ---------- */

  async function handlePhoto(file) {
    hideInstallSheet();
    if (!file || state.photoBusy) return;
    if (!/^image\//.test(file.type)) {
      els.photoHint.textContent = "Please choose an image file (JPG, PNG or WebP).";
      els.photoHint.classList.add("is-error");
      return;
    }

    state.photoBusy = true;
    els.dropzone.classList.add("is-busy");
    els.filePreview.hidden = false;
    els.photoHint.classList.remove("is-error");
    els.photoHint.textContent = "Reading the barcode\u2026";

    try {
      var decoded = await StacksScanner.scanFile(file, "file-preview");
      var parsed = StacksIsbn.parse(decoded);
      if (!parsed.valid) {
        els.photoHint.textContent = "Found the barcode \"" + decoded + "\", but it isn't a book ISBN.";
        els.photoHint.classList.add("is-error");
        return;
      }
      StacksScanner.feedback();
      els.isbnInput.value = parsed.isbn13;
      els.photoHint.textContent = "Barcode read: " + parsed.isbn13;
      runLookup(parsed);
    } catch (error) {
      els.photoHint.textContent = "No barcode detected. Fill the frame with the barcode, avoid glare, and try again.";
      els.photoHint.classList.add("is-error");
    } finally {
      state.photoBusy = false;
      els.dropzone.classList.remove("is-busy");
    }
  }

  /* ---------- Lookup ---------- */

  function renderLoading(label) {
    state.loading = true;
    els.result.setAttribute("aria-busy", "true");
    els.result.innerHTML = [
      "<div class=\"loading-state\">",
      "  <div class=\"skeleton skeleton-cover\"></div>",
      "  <div class=\"skeleton-body\">",
      "    <div class=\"skeleton skeleton-line short\"></div>",
      "    <div class=\"skeleton skeleton-line title\"></div>",
      "    <div class=\"skeleton skeleton-line\"></div>",
      "    <div class=\"skeleton skeleton-line medium\"></div>",
      "    <div class=\"skeleton skeleton-block\"></div>",
      "  </div>",
      "  <p class=\"loading-label\"><span class=\"spinner\"></span>" + esc(label || "Consulting the catalogue\u2026") + "</p>",
      "</div>"
    ].join("");
  }

  function describeLookupError(error) {
    if (error && error.code === "timeout") {
      return "Open Library took too long to answer. Check your connection and try again.";
    }
    if (error && error.code === "rate_limit") {
      return "Open Library is rate-limiting requests right now. Wait a minute, then try again.";
    }
    if (error && error.code === "http") {
      return "The catalogue returned an error" + (error.status ? " (status " + error.status + ")" : "") + ". Please try again.";
    }
    return "The catalogue couldn't be reached. Check your internet connection and try again.";
  }

  async function runLookup(parsed) {
    hideInstallSheet();
    if (!parsed || !parsed.valid) return;
    var token = ++state.lookupSeq;
    state.lastParsed = parsed;
    els.isbnInput.value = parsed.isbn13;
    els.isbnError.textContent = "";
    els.isbnError.hidden = true;
    renderLoading("Consulting the catalogue\u2026");

    try {
      var book = await StacksApi.lookupIsbn(parsed.isbn13, parsed.isbn10);
      if (token !== state.lookupSeq) return;
      var isNew = StacksShelf.add(book);
      state.book = book;
      state.loading = false;
      els.result.removeAttribute("aria-busy");
      renderBook(book);
      refreshShelfUI();
      if (isNew) toast("Saved to your shelf");
    } catch (error) {
      if (token !== state.lookupSeq) return;
      state.loading = false;
      els.result.removeAttribute("aria-busy");
      if (error && error.code === "not_found") {
        renderNotFound(parsed);
      } else {
        renderError(error, function () { runLookup(parsed); });
      }
    }
  }

  async function useSearchResult(index) {
    var result = state.searchResults[index];
    if (!result) return;
    renderLoading("Building a record from that edition\u2026");
    try {
      var book = await StacksApi.resolveSearchResult(result);
      StacksShelf.add(book);
      state.book = book;
      renderBook(book);
      refreshShelfUI();
      toast("Saved to your shelf");
    } catch (error) {
      renderError(error, function () { useSearchResult(index); });
    }
  }

  async function performTitleSearch(form) {
    var input = form.querySelector("input");
    var query = input && input.value ? input.value.trim() : "";
    var output = els.result.querySelector("#title-results");
    if (!output) return;
    if (!query) {
      output.innerHTML = "<p class=\"field-error\">Type a title or author to search.</p>";
      return;
    }
    output.innerHTML = "<p class=\"search-loading\"><span class=\"spinner\"></span>Searching Open Library\u2026</p>";
    try {
      var results = await StacksApi.searchBooks(query);
      state.searchResults = results;
      if (!results.length) {
        output.innerHTML = "<p class=\"search-empty\">No matches for \u201c" + esc(query) + "\u201d. Try fewer words, another edition, or check the ISBN.</p>";
        return;
      }
      output.innerHTML = "<p class=\"search-count\">" + results.length + " possible " + (results.length === 1 ? "match" : "matches") + "</p>" +
        "<ul class=\"search-results\">" + results.map(function (item, index) {
          var cover = item.coverSmall
            ? "<img src=\"" + esc(item.coverSmall) + "\" alt=\"\" loading=\"lazy\" onerror=\"this.remove()\">"
            : "<span class=\"result-blank\">" + esc(initials(item.title)) + "</span>";
          return "<li class=\"search-result\">" +
            "<div class=\"result-cover\">" + cover + "</div>" +
            "<div class=\"result-text\">" +
            "<h3>" + esc(item.title) + "</h3>" +
            (item.subtitle ? "<p class=\"result-subtitle\">" + esc(item.subtitle) + "</p>" : "") +
            "<p class=\"result-meta\">" + (item.authors.length ? esc(item.authors.join(", ")) : "Unknown author") +
            (item.year ? " \u00b7 " + esc(item.year) : "") + "</p>" +
            "</div>" +
            "<button type=\"button\" class=\"btn btn-small\" data-action=\"use-result\" data-index=\"" + index + "\">Use this</button>" +
            "</li>";
        }).join("") + "</ul>";
    } catch (error) {
      output.innerHTML = "<p class=\"field-error\">" + esc(describeLookupError(error)) + "</p>";
    }
  }

  /* ---------- Result rendering ---------- */

  function ddcBlock(ddc, book) {
    if (!ddc) {
      return "<section class=\"ddc-card is-empty\">" +
        "<div class=\"ddc-head\"><span class=\"ddc-kicker\">Dewey Decimal equivalent</span><span class=\"source-badge\">Not available</span></div>" +
        "<p class=\"ddc-empty-text\">No Dewey number could be found or estimated from this record. The genre and subjects below may still help you shelve it.</p>" +
        "</section>";
    }

    var tone = ddc.source === "catalog" ? "is-catalog" : (ddc.source === "lcc" ? "is-derived" : "is-estimated");
    var path = (ddc.path || []).map(function (node) {
      return "<span class=\"crumb\"><b>" + esc(node.number) + "</b> " + esc(node.label) + "</span>";
    }).join("<span class=\"crumb-sep\" aria-hidden=\"true\">\u203a</span>");

    var authorStem = surname(book.authors);
    var spine = ddc.number + (authorStem ? " " + esc(authorStem.slice(0, 3).toUpperCase()) : "");
    var extraNumbers = (ddc.catalogNumbers || []).filter(function (num) {
      return num !== ddc.number;
    }).slice(0, 5);

    return "<section class=\"ddc-card " + tone + "\">" +
      "<div class=\"ddc-head\">" +
      "<span class=\"ddc-kicker\">Dewey Decimal equivalent</span>" +
      "<span class=\"source-badge\">" + esc(ddc.sourceLabel) + "</span>" +
      "</div>" +
      "<div class=\"ddc-core\">" +
      "<div class=\"ddc-number\">" + esc(ddc.number) + "</div>" +
      "<div class=\"ddc-copy\">" +
      "<h3>" + esc(ddc.label) + "</h3>" +
      "<p class=\"ddc-main\">Main class " + esc(ddc.mainClass.number) + " \u00b7 " + esc(ddc.mainClass.label) + "</p>" +
      "</div>" +
      "<div class=\"spine-label\" title=\"A simple DDC + author stem, not a formal cutter number\">" +
      "<span>Spine label</span><b>" + spine + "</b></div>" +
      "</div>" +
      "<div class=\"ddc-path\" aria-label=\"Dewey hierarchy\">" + path + "</div>" +
      "<p class=\"ddc-basis\">" + esc(ddc.basis) + "</p>" +
      (extraNumbers.length ? "<p class=\"ddc-others\">Also catalogued as: <span class=\"mono\">" + extraNumbers.map(esc).join("</span>, <span class=\"mono\">") + "</span></p>" : "") +
      (ddc.source !== "catalog" ? "<p class=\"ddc-caveat\">Estimated, not an official catalogue number \u2014 verify before shelving.</p>" : "") +
      "</section>";
  }

  function detailRows(book) {
    var rows = [
      ["Publisher", esc(book.publisher)],
      ["Published", esc(book.publishDate)],
      ["Pages", book.pages ? esc(book.pages) + " pp." : ""],
      ["Language", esc(book.language)],
      ["ISBN-13", book.isbn13 ? "<span class=\"mono\">" + esc(book.isbn13) + "</span>" : ""],
      ["ISBN-10", book.isbn10 ? "<span class=\"mono\">" + esc(book.isbn10) + "</span>" : ""],
      ["First published", book.firstPublishYear ? esc(book.firstPublishYear) : ""],
      ["LC classification", book.lcc && book.lcc.length ? "<span class=\"mono\">" + esc(book.lcc.join(", ")) + "</span>" : ""],
      ["Series", esc(book.series)],
      ["Edition", esc(book.editionName)],
      ["Format", esc(book.physicalFormat)],
      ["Place", esc(book.publishPlace)],
      ["People", esc((book.people || []).join("; "))],
      ["Places", esc((book.places || []).join("; "))],
      ["Periods", esc((book.times || []).join("; "))]
    ];
    return rows.filter(function (row) { return row[1]; }).map(function (row) {
      return "<div class=\"detail\"><dt>" + row[0] + "</dt><dd>" + row[1] + "</dd></div>";
    }).join("");
  }

  function renderBook(book) {
    var saved = StacksShelf.has(book);
    var cover = book.cover
      ? "<img class=\"cover-img\" src=\"" + esc(book.cover) + "\" alt=\"Cover of " + esc(book.title) + "\" loading=\"lazy\">"
      : "";
    var genres = (book.genres || []).slice(0, 4);
    var genreChips = genres.map(function (genre, index) {
      return "<span class=\"genre-chip" + (index === 0 ? " is-primary" : "") + "\">" + esc(genre.label) + "</span>";
    }).join("");
    var subjects = book.subjects || [];
    var subjectChips = subjects.map(function (subject) {
      return "<span class=\"subject-chip\">" + esc(subject) + "</span>";
    }).join("");
    var hasLongDescription = (book.description || "").length > 420;
    var isbnLine = book.isbn13 ? "ISBN " + book.isbn13 : "Catalogue record";
    var audience = book.audience ? book.audience.label : "";
    var kind = book.kind || "";
    var title = book.title;

    els.result.innerHTML = "<article class=\"book-view\">" +
      "<header class=\"book-head\">" +
      "<div class=\"cover-frame" + (book.cover ? "" : " is-missing") + "\">" +
      cover +
      "<div class=\"cover-blank\" aria-hidden=\"true\"><span>" + esc(initials(book.title)) + "</span><em>No cover</em></div>" +
      "</div>" +
      "<div class=\"book-ident\">" +
      "<div class=\"kicker-row\">" +
      "<span class=\"isbn-kicker\">" + esc(isbnLine) + "</span>" +
      (kind ? "<span class=\"mini-badge\">" + esc(kind) + "</span>" : "") +
      (audience ? "<span class=\"mini-badge audience\">" + esc(audience) + "</span>" : "") +
      "</div>" +
      "<h2 class=\"book-title\">" + esc(book.title) + "</h2>" +
      (book.subtitle ? "<p class=\"book-subtitle\">" + esc(book.subtitle) + "</p>" : "") +
      "<p class=\"book-authors\">" + (book.authors.length ? "by " + esc(book.authors.join(", ")) : "Author unknown") + "</p>" +
      "<div class=\"book-actions\">" +
      "<button type=\"button\" class=\"btn btn-save" + (saved ? " is-saved" : "") + "\" data-action=\"toggle-save\">" +
      (saved ? "\u2713 In your shelf" : "Save to shelf") + "</button>" +
      "<button type=\"button\" class=\"btn btn-quiet\" data-action=\"copy-json\">Copy JSON</button>" +
      (book.openLibraryUrl ? "<a class=\"btn btn-quiet\" href=\"" + esc(book.openLibraryUrl) + "\" target=\"_blank\" rel=\"noopener\">Open Library \u2197</a>" : "") +
      "</div>" +
      "</div>" +
      "</header>" +
      ddcBlock(book.ddc, book) +
      "<div class=\"genre-row\"><div class=\"genre-list\">" + genreChips + "</div>" +
      (audience ? "<span class=\"audience-note\">Audience \u00b7 " + esc(audience) + "</span>" : "") + "</div>" +
      "<dl class=\"detail-grid\">" + detailRows(book) + "</dl>" +
      (book.description ?
        "<section class=\"description-block\">" +
        "<h3>About this book</h3>" +
        "<p class=\"prose" + (hasLongDescription ? " is-clamped\" data-clamped=\"true" : "\" data-clamped=\"false") + "\">" + esc(book.description) + "</p>" +
        (hasLongDescription ? "<button type=\"button\" class=\"link-btn\" data-action=\"toggle-description\">Read more</button>" : "") +
        "</section>" : "") +
      (subjects.length ?
        "<section class=\"subjects-block\">" +
        "<h3>Subjects <span class=\"count-note\">" + subjects.length + "</span></h3>" +
        "<div class=\"subject-list\" data-expanded=\"false\">" + subjectChips + "</div>" +
        (subjects.length > 12 ? "<button type=\"button\" class=\"link-btn\" data-action=\"toggle-subjects\">Show all subjects</button>" : "") +
        "</section>" : "") +
      "<footer class=\"record-foot\">" +
      "<span>Metadata from Open Library. Dewey and genre values are a shelving aid, not an authoritative cataloguing record.</span>" +
      "<button type=\"button\" class=\"link-btn\" data-action=\"scan-another\">Scan another \u2192</button>" +
      "</footer>" +
      "</article>";

    var img = els.result.querySelector(".cover-img");
    if (img) {
      img.addEventListener("error", function () {
        var frame = img.closest(".cover-frame");
        if (frame) frame.classList.add("is-missing");
        img.remove();
      });
    }

    els.result.classList.remove("is-empty");
    document.title = title + " \u2014 Stacks";
    if (window.matchMedia("(max-width: 960px)").matches) {
      setTimeout(function () {
        els.result.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }

  function renderEmpty() {
    els.result.classList.add("is-empty");
    els.result.innerHTML = "<div class=\"empty-state\">" +
      "<div class=\"empty-mark\" aria-hidden=\"true\"><span>823</span><em>Dewey</em></div>" +
      "<p class=\"eyebrow\">The reading room</p>" +
      "<h2>A book, catalogued.</h2>" +
      "<p class=\"empty-lede\">Scan the ISBN barcode on the back cover or type the number. Stacks returns the catalogue record, a Dewey Decimal equivalent, genre and audience \u2014 plus a shelf-ready summary.</p>" +
      "<ul class=\"empty-points\">" +
      "<li><b>Dewey &amp; genre</b><span>Pulled from the catalogue, or estimated when the record is thin.</span></li>" +
      "<li><b>The full record</b><span>Cover, publisher, year, pages, language, subjects and links.</span></li>" +
      "<li><b>Your shelf</b><span>Saved in this browser and exportable as CSV.</span></li>" +
      "</ul>" +
      "</div>";
    document.title = "Stacks \u2014 Book Scanner & Dewey Desk";
  }

  function renderNotFound(parsed) {
    els.result.innerHTML = "<div class=\"state-card\">" +
      "<p class=\"eyebrow\">ISBN " + esc(parsed.isbn13) + "</p>" +
      "<h2>No catalogue record for that ISBN.</h2>" +
      "<p>Open Library has no entry for this barcode. Search by title or author and I'll build the record from another edition.</p>" +
      "<form id=\"title-search-form\" class=\"search-form\" novalidate>" +
      "<label class=\"field-label\" for=\"title-search-input\">Title or author</label>" +
      "<div class=\"input-row\">" +
      "<input id=\"title-search-input\" name=\"q\" type=\"search\" placeholder=\"e.g. The Left Hand of Darkness\" autocomplete=\"off\">" +
      "<button class=\"btn btn-primary\" type=\"submit\">Search</button>" +
      "</div>" +
      "</form>" +
      "<div id=\"title-results\"></div>" +
      "<div class=\"state-actions\"><button type=\"button\" class=\"link-btn\" data-action=\"scan-another\">Scan another book</button></div>" +
      "</div>";
  }

  function renderError(error, retry) {
    state.retry = retry || null;
    els.result.innerHTML = "<div class=\"state-card\">" +
      "<p class=\"eyebrow\">Connection trouble</p>" +
      "<h2>The catalogue didn't answer.</h2>" +
      "<p>" + esc(describeLookupError(error)) + "</p>" +
      "<div class=\"state-actions\">" +
      (retry ? "<button type=\"button\" class=\"btn btn-primary\" data-action=\"retry\">Try again</button>" : "") +
      "<button type=\"button\" class=\"btn btn-quiet\" data-action=\"scan-another\">Scan another book</button>" +
      "</div>" +
      "<p class=\"state-note\">You can also enter the ISBN under the ISBN tab \u2014 nothing is lost.</p>" +
      "</div>";
  }

  /* ---------- Lookup helpers ---------- */

  function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy") ? resolve() : reject(new Error("Copy failed"));
      } catch (error) {
        reject(error);
      } finally {
        area.remove();
      }
    });
  }

  function download(filename, contents, type) {
    var blob = new Blob([contents], { type: type });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- Shelf ---------- */

  function refreshShelfUI() {
    var entries = StacksShelf.entries();
    els.shelfCount.textContent = String(entries.length);
    els.shelfCount.classList.toggle("is-zero", entries.length === 0);
    els.shelfExport.disabled = entries.length === 0;
    els.shelfClear.disabled = entries.length === 0;
    renderShelf(entries);
  }

  function renderShelf(entries) {
    entries = entries || StacksShelf.entries();
    if (!entries.length) {
      els.shelfList.innerHTML = "<li class=\"shelf-empty\">Nothing on the shelf yet. Scan a book and it will be filed here.</li>";
      return;
    }
    els.shelfList.innerHTML = entries.map(function (entry, index) {
      var book = entry.book;
      var cover = book.coverSmall
        ? "<img src=\"" + esc(book.coverSmall) + "\" alt=\"\" loading=\"lazy\" onerror=\"this.remove()\">"
        : "<span class=\"shelf-initials\">" + esc(initials(book.title)) + "</span>";
      var ddc = book.ddc ? book.ddc.number : "\u2014";
      return "<li class=\"shelf-item\">" +
        "<button type=\"button\" class=\"shelf-open\" data-shelf-index=\"" + index + "\">" +
        "<span class=\"shelf-cover\">" + cover + "</span>" +
        "<span class=\"shelf-text\"><b>" + esc(book.title) + "</b>" +
        "<span>" + (book.authors && book.authors.length ? esc(book.authors[0]) : "Unknown author") + "</span>" +
        "</span>" +
        "<span class=\"shelf-ddc\">" + esc(ddc) + "</span>" +
        "</button>" +
        "<button type=\"button\" class=\"shelf-remove\" data-shelf-remove=\"" + index + "\" aria-label=\"Remove " + esc(book.title) + " from shelf\">\u00d7</button>" +
        "</li>";
    }).join("");
  }

  function resetToEmpty() {
    state.book = null;
    state.lastParsed = null;
    state.retry = null;
    els.isbnError.textContent = "";
    els.isbnError.hidden = true;
    renderEmpty();
    selectTab("manual");
    els.isbnInput.focus();
    els.isbnInput.select();
    if (window.matchMedia("(max-width: 960px)").matches) {
      els.scanPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /* ---------- Wiring ---------- */

  function bindCamera() {
    els.cameraStart.addEventListener("click", startCamera);
    els.cameraStop.addEventListener("click", function () {
      stopCamera();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && state.cameraOn) stopCamera();
    });
  }

  function bindPhoto() {
    els.photoInput.addEventListener("change", function () {
      var file = this.files && this.files[0];
      this.value = "";
      if (file) handlePhoto(file);
    });

    ["dragenter", "dragover"].forEach(function (name) {
      els.dropzone.addEventListener(name, function (event) {
        event.preventDefault();
        els.dropzone.classList.add("is-over");
      });
    });
    ["dragleave", "dragend", "drop"].forEach(function (name) {
      els.dropzone.addEventListener(name, function (event) {
        event.preventDefault();
        els.dropzone.classList.remove("is-over");
      });
    });
    els.dropzone.addEventListener("drop", function (event) {
      var files = event.dataTransfer && event.dataTransfer.files;
      if (files && files[0]) handlePhoto(files[0]);
    });
  }

  function bindManual() {
    els.isbnForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var parsed = StacksIsbn.parse(els.isbnInput.value);
      if (!parsed.valid) {
        els.isbnError.textContent = parsed.reason;
        els.isbnError.hidden = false;
        els.isbnInput.classList.add("is-invalid");
        els.isbnInput.focus();
        return;
      }
      els.isbnInput.classList.remove("is-invalid");
      els.isbnError.hidden = true;
      runLookup(parsed);
    });

    els.isbnInput.addEventListener("input", function () {
      els.isbnInput.classList.remove("is-invalid");
      els.isbnError.hidden = true;
    });

    $$("[data-isbn]").forEach(function (button) {
      button.addEventListener("click", function () {
        var parsed = StacksIsbn.parse(button.getAttribute("data-isbn"));
        selectTab("manual");
        els.isbnInput.value = button.getAttribute("data-isbn");
        if (parsed.valid) runLookup(parsed);
      });
    });
  }

  function bindResultActions() {
    els.result.addEventListener("click", function (event) {
      var actionEl = event.target.closest("[data-action]");
      if (!actionEl) return;
      var action = actionEl.getAttribute("data-action");

      if (action === "toggle-save") {
        if (!state.book) return;
        if (StacksShelf.has(state.book)) {
          StacksShelf.remove(state.book);
          toast("Removed from your shelf");
        } else {
          StacksShelf.add(state.book);
          toast("Saved to your shelf");
        }
        refreshShelfUI();
        renderBook(state.book);
      }

      if (action === "copy-json") {
        if (!state.book) return;
        copyText(JSON.stringify(state.book, null, 2))
          .then(function () { toast("Record copied as JSON"); })
          .catch(function () { toast("Couldn't access the clipboard"); });
      }

      if (action === "retry") {
        var retry = state.retry;
        if (retry) retry();
      }

      if (action === "scan-another") {
        resetToEmpty();
      }

      if (action === "use-result") {
        useSearchResult(Number(actionEl.getAttribute("data-index")));
      }

      if (action === "toggle-description") {
        var prose = els.result.querySelector(".description-block .prose");
        if (!prose) return;
        var clamped = prose.classList.toggle("is-clamped");
        prose.setAttribute("data-clamped", clamped ? "true" : "false");
        actionEl.textContent = clamped ? "Read more" : "Show less";
      }

      if (action === "toggle-subjects") {
        var group = els.result.querySelector(".subject-list");
        if (!group) return;
        var expanded = group.getAttribute("data-expanded") === "true";
        group.setAttribute("data-expanded", expanded ? "false" : "true");
        group.classList.toggle("is-expanded", !expanded);
        actionEl.textContent = expanded ? "Show all subjects" : "Show fewer";
      }
    });

    els.result.addEventListener("submit", function (event) {
      if (event.target && event.target.id === "title-search-form") {
        event.preventDefault();
        performTitleSearch(event.target);
      }
    });
  }

  function bindShelf() {
    els.shelfToggle.addEventListener("click", function () {
      var willOpen = els.shelfPanel.hidden;
      els.shelfPanel.hidden = !willOpen;
      els.shelfToggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
      if (willOpen) {
        refreshShelfUI();
        els.shelfPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });

    els.shelfList.addEventListener("click", function (event) {
      var removeButton = event.target.closest("[data-shelf-remove]");
      if (removeButton) {
        event.preventDefault();
        var removeIndex = Number(removeButton.getAttribute("data-shelf-remove"));
        var entries = StacksShelf.entries();
        var entry = entries[removeIndex];
        if (entry) {
          StacksShelf.remove(entry.book);
          if (state.book && StacksShelf.keyOf(state.book) === StacksShelf.keyOf(entry.book)) {
            state.book = entry.book;
            renderBook(entry.book);
          }
          refreshShelfUI();
          toast("Removed from your shelf");
        }
        return;
      }

      var openButton = event.target.closest("[data-shelf-index]");
      if (!openButton) return;
      var index = Number(openButton.getAttribute("data-shelf-index"));
      var item = StacksShelf.entries()[index];
      if (!item) return;
      state.book = item.book;
      renderBook(item.book);
      els.result.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    els.shelfExport.addEventListener("click", function () {
      var entries = StacksShelf.entries();
      if (!entries.length) return;
      var date = new Date().toISOString().slice(0, 10);
      download("stacks-shelf-" + date + ".csv", StacksShelf.toCsv(entries), "text/csv;charset=utf-8");
      toast("Shelf exported as CSV");
    });

    els.shelfClear.addEventListener("click", function () {
      if (!state.clearArmed) {
        state.clearArmed = true;
        els.shelfClear.textContent = "Click again to clear";
        setTimeout(function () {
          state.clearArmed = false;
          els.shelfClear.textContent = "Clear shelf";
        }, 3200);
        return;
      }
      state.clearArmed = false;
      els.shelfClear.textContent = "Clear shelf";
      StacksShelf.clear();
      refreshShelfUI();
      toast("Shelf cleared");
    });
  }

  function handleDeepLink() {
    var params = new URLSearchParams(window.location.search);
    var isbn = params.get("isbn");
    if (!isbn) return;
    selectTab("manual");
    els.isbnInput.value = isbn;
    var parsed = StacksIsbn.parse(isbn);
    if (parsed.valid) {
      runLookup(parsed);
    } else {
      els.isbnError.textContent = parsed.reason;
      els.isbnError.hidden = false;
      els.isbnInput.classList.add("is-invalid");
    }
  }

  function init() {
    els = {
      result: $("#result-panel"),
      scanPanel: $(".scan-panel"),
      isbnForm: $("#isbn-form"),
      isbnInput: $("#isbn-input"),
      isbnError: $("#isbn-error"),
      cameraPreview: $("#camera-preview"),
      cameraPlaceholder: $("#camera-placeholder"),
      cameraStart: $("#camera-start"),
      cameraStop: $("#camera-stop"),
      cameraHint: $("#camera-hint"),
      dropzone: $("#dropzone"),
      photoInput: $("#photo-input"),
      photoHint: $("#photo-hint"),
      filePreview: $("#file-preview"),
      shelfPanel: $("#shelf"),
      shelfToggle: $("#shelf-toggle"),
      shelfCount: $("#shelf-count"),
      shelfList: $("#shelf-list"),
      shelfExport: $("#shelf-export"),
      shelfClear: $("#shelf-clear"),
      toastRegion: $("#toast-region"),
      installSheet: $("#install-sheet"),
      installBackdrop: $("#install-backdrop"),
      installAccept: $("#install-accept"),
      installDismiss: $("#install-dismiss"),
      installClose: $("#install-close"),
      installOpen: $("#install-open"),
      installCopy: $("#install-copy"),
      installSteps: $("#install-steps")
    };

    if (!els.cameraHint) return;

    if (!StacksScanner.isSecureContext()) {
      els.cameraHint.textContent = "Live camera needs localhost or HTTPS. Use Photo or ISBN here, or open the app through its local server.";
      els.cameraHint.classList.add("is-error");
    }

    bindTabs();
    bindCamera();
    bindPhoto();
    bindManual();
    bindResultActions();
    bindShelf();
    setupInstall();
    registerServiceWorker();

    renderEmpty();
    refreshShelfUI();
    handleDeepLink();

    window.addEventListener("resize", updateInstallLink);
    window.addEventListener("offline", function () {
      toast("You're offline — catalogue lookups will fail until you reconnect.");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
