import test from "node:test";
import assert from "node:assert/strict";
import { loadApp } from "./harness.mjs";

const app = loadApp({ withApi: true });
const lookup = (isbn13, isbn10) => app.StacksApi.lookupIsbn(isbn13, isbn10);

test("Pride and Prejudice: full record with catalogued Dewey", { timeout: 45000 }, async () => {
  const book = await lookup("9780141439518", "0141439513");
  assert.equal(book.isbn13, "9780141439518");
  assert.match(book.title, /Pride and Prejudice/i);
  assert.ok(book.authors.some((author) => /Austen/.test(author)));
  assert.ok(book.ddc, "expected a Dewey recommendation");
  assert.equal(book.ddc.source, "catalog");
  assert.ok(book.ddc.number.startsWith("823"), "unexpected Dewey " + book.ddc.number);
  assert.equal(book.ddc.label, "English fiction");
  assert.ok(book.genres.length > 0);
  assert.ok(book.genres.some((genre) => /Romance|Literature/.test(genre.label)));
  assert.ok(book.subjects.length > 0);
  assert.match(book.cover, /^https:\/\/covers\.openlibrary\.org/);
  assert.ok(book.pages > 0);
  assert.ok(book.openLibraryUrl.startsWith("https://openlibrary.org"));
  assert.equal(book.language, "English");
});

test("Clean Code: computing genre and precise Dewey", { timeout: 45000 }, async () => {
  const book = await lookup("9780132350884");
  assert.match(book.title, /Clean Code/i);
  assert.ok(book.ddc);
  assert.equal(book.ddc.number, "005.1");
  assert.equal(book.ddc.label, "Software engineering");
  assert.match(book.genres[0].label, /Computing/);
  assert.equal(book.kind, "Nonfiction");
});

test("Harry Potter: juvenile audience and fantasy genre", { timeout: 45000 }, async () => {
  const book = await lookup("9780439708180");
  assert.match(book.title, /Harry Potter/i);
  assert.equal(book.audience.label, "Children's");
  assert.ok(book.genres.some((genre) => /Fantasy/.test(genre.label)));
  assert.ok(book.ddc.number.startsWith("823"));
});

test("A Brief History of Time: science classification", { timeout: 45000 }, async () => {
  const book = await lookup("9780553380163");
  assert.match(book.title, /Brief History of Time/i);
  assert.ok(book.ddc);
  assert.equal(book.ddc.number, "523.1");
  assert.ok(book.genres.some((genre) => /Science/.test(genre.label)));
  assert.ok(book.description.length > 100);
});

test("caches repeat lookups in local storage", { timeout: 45000 }, async () => {
  const first = await lookup("9780141439518", "0141439513");
  const second = await lookup("9780141439518", "0141439513");
  assert.equal(second.title, first.title);
  assert.deepEqual(second.ddc.number, first.ddc.number);
});

test("title search returns usable work results", { timeout: 45000 }, async () => {
  const results = await app.StacksApi.searchBooks("the left hand of darkness");
  assert.ok(Array.isArray(results));
  assert.ok(results.length > 0);
  assert.match(results[0].title, /Left Hand of Darkness/i);
  assert.ok(results[0].key.startsWith("/works/"));

  const book = await app.StacksApi.resolveSearchResult(results[0]);
  assert.match(book.title, /Left Hand of Darkness/i);
  assert.ok(book.authors.length > 0);
  assert.ok(book.ddc, "expected a Dewey recommendation from the work record");
  assert.ok(book.genres.length > 0);
  assert.match(book.openLibraryUrl, /^https:\/\/openlibrary\.org\/(works|books)\//);
});
