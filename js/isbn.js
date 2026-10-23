/* ISBN parsing and normalisation — no dependencies. */
(function () {
  "use strict";

  function strip(raw) {
    return String(raw == null ? "" : raw)
      .replace(/[\s\u2010-\u2015-]/g, "")
      .toUpperCase();
  }

  function isIsbn10(s) {
    if (!/^\d{9}[\dX]$/.test(s)) return false;
    var sum = 0;
    for (var i = 0; i < 10; i++) {
      var c = s.charAt(i) === "X" ? 10 : Number(s.charAt(i));
      sum += c * (10 - i);
    }
    return sum % 11 === 0;
  }

  function isIsbn13(s) {
    if (!/^\d{13}$/.test(s)) return false;
    if (!/^97[89]/.test(s)) return false;
    var sum = 0;
    for (var i = 0; i < 12; i++) {
      sum += Number(s.charAt(i)) * (i % 2 ? 3 : 1);
    }
    return (10 - (sum % 10)) % 10 === Number(s.charAt(12));
  }

  function to13(s) {
    if (s.length === 13) return s;
    var core = "978" + s.slice(0, 9);
    var sum = 0;
    for (var i = 0; i < 12; i++) {
      sum += Number(core.charAt(i)) * (i % 2 ? 3 : 1);
    }
    return core + ((10 - (sum % 10)) % 10);
  }

  function to10(s) {
    if (s.length === 10) return s;
    if (s.indexOf("978") !== 0) return "";
    var core = s.slice(3, 12);
    var sum = 0;
    for (var i = 0; i < 9; i++) {
      sum += Number(core.charAt(i)) * (10 - i);
    }
    var rem = (11 - (sum % 11)) % 11;
    return core + (rem === 10 ? "X" : String(rem));
  }

  function parse(raw) {
    var s = strip(raw);
    if (!s) {
      return { valid: false, reason: "Enter an ISBN to look up a book." };
    }
    var digitsOnly = s.replace(/[^0-9X]/g, "");
    if (digitsOnly !== s) {
      return { valid: false, reason: "An ISBN contains only digits (and possibly X as the last character)." };
    }
    if (/^\d{13}$/.test(s)) {
      if (!/^97[89]/.test(s)) {
        return { valid: false, reason: "That's a 13-digit barcode, but book ISBNs start with 978 or 979." };
      }
      if (!isIsbn13(s)) {
        return { valid: false, reason: "That ISBN-13 checksum doesn't add up. Check the digits and try again." };
      }
      return { valid: true, isbn13: s, isbn10: to10(s) };
    }
    if (/^\d{12}$/.test(s)) {
      return { valid: false, reason: "That looks like a UPC, not a book ISBN. Look for a 978/979 barcode." };
    }
    if (/^\d{9}[\dX]$/.test(s)) {
      if (!isIsbn10(s)) {
        return { valid: false, reason: "That ISBN-10 checksum doesn't add up. Check the digits and try again." };
      }
      return { valid: true, isbn13: to13(s), isbn10: s };
    }
    return { valid: false, reason: "ISBNs have 10 or 13 characters. Scan the barcode or type the number printed above it." };
  }

  function format13(s) {
    if (!s) return "";
    return s;
  }

  window.StacksIsbn = { parse: parse, format13: format13, to13: to13, to10: to10 };
})();
