/* Shelf persistence (localStorage) and CSV export. */
(function () {
  "use strict";

  var KEY = "stacks.shelf.v1";
  var LIMIT = 50;

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (error) {
      return [];
    }
  }

  function write(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch (error) {
      return false;
    }
  }

  function keyOf(book) {
    if (!book) return "";
    return book.isbn13 || book.openLibraryUrl || ("title:" + (book.title || "") + "|" + (book.authors || []).join(","));
  }

  function entries() {
    return read().filter(function (entry) {
      return entry && entry.book && entry.book.title;
    });
  }

  function has(book) {
    var key = keyOf(book);
    if (!key) return false;
    return read().some(function (entry) {
      return entry && keyOf(entry.book) === key;
    });
  }

  function add(book) {
    if (!book || !book.title) return false;
    var key = keyOf(book);
    var list = read().filter(function (entry) {
      return entry && entry.book && keyOf(entry.book) !== key;
    });
    list.unshift({ savedAt: Date.now(), book: book });
    write(list.slice(0, LIMIT));
    return true;
  }

  function remove(book) {
    var key = keyOf(book);
    var list = read().filter(function (entry) {
      return entry && entry.book && keyOf(entry.book) !== key;
    });
    write(list);
  }

  function clear() {
    try {
      localStorage.removeItem(KEY);
    } catch (error) {
      /* ignore */
    }
  }

  function csvCell(value) {
    var str = value == null ? "" : String(value);
    return "\"" + str.replace(/"/g, "\"\"") + "\"";
  }

  function toCsv(list) {
    var rows = [[
      "Title", "Subtitle", "Authors", "ISBN-13", "ISBN-10", "Dewey", "Dewey label",
      "Dewey source", "Genres", "Audience", "Publisher", "Published", "Pages",
      "Language", "Saved"
    ]];
    (list || entries()).forEach(function (entry) {
      var book = entry.book || {};
      var ddc = book.ddc || {};
      rows.push([
        book.title || "",
        book.subtitle || "",
        (book.authors || []).join("; "),
        book.isbn13 || "",
        book.isbn10 || "",
        ddc.number || "",
        ddc.label || "",
        ddc.sourceLabel || "",
        (book.genres || []).map(function (genre) { return genre.label; }).join("; "),
        book.audience ? book.audience.label : "",
        book.publisher || "",
        book.publishDate || "",
        book.pages || "",
        book.language || "",
        entry.savedAt ? new Date(entry.savedAt).toISOString().slice(0, 10) : ""
      ]);
    });
    return "\ufeff" + rows.map(function (row) {
      return row.map(csvCell).join(",");
    }).join("\r\n");
  }

  window.StacksShelf = {
    entries: entries,
    add: add,
    remove: remove,
    has: has,
    clear: clear,
    keyOf: keyOf,
    toCsv: toCsv
  };
})();
