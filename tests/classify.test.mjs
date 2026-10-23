import test from "node:test";
import assert from "node:assert/strict";
import { loadApp } from "./harness.mjs";

const app = loadApp();
const classify = (input) => app.StacksDdc.classify(input);

test("validates, normalises and converts ISBNs", () => {
  const isbn = app.StacksIsbn;
  const parsed = isbn.parse("978-0-14-143951-8");
  assert.equal(parsed.valid, true);
  assert.equal(parsed.isbn13, "9780141439518");
  assert.equal(parsed.isbn10, "0141439513");

  const ten = isbn.parse("0 14 143951 3");
  assert.equal(ten.valid, true);
  assert.equal(ten.isbn13, "9780141439518");

  assert.equal(isbn.parse("9780141439519").valid, false);
  assert.equal(isbn.parse("0141439514").valid, false);
  assert.equal(isbn.parse("012345678905").valid, false);
  assert.match(isbn.parse("012345678905").reason, /UPC/);
  assert.equal(isbn.parse("").valid, false);
});

test("describes Dewey numbers with hierarchy", () => {
  const info = app.StacksDdc.describe("823.914");
  assert.equal(info.number, "823.914");
  assert.equal(info.label, "English fiction");
  assert.equal(info.mainClass.number, "800");
  assert.equal(info.path.map((node) => node.number).join(","), "800,820,823");

  const programming = app.StacksDdc.describe("005.1");
  assert.equal(programming.label, "Software engineering");
  assert.equal(programming.path.map((node) => node.number).join(","), "000,005,005.1");
});

test("every Dewey division has a label", () => {
  for (let i = 0; i < 1000; i += 10) {
    const key = String(i).padStart(3, "0");
    assert.ok(app.StacksDdc.labels[key], "missing division " + key);
  }
});

test("prefers the most repeated Dewey class from catalogues", () => {
  const pride = classify({ ddc: ["823.7", "820.6", "823.703", "[Fic]", "823", "891.423", "828.7", "017"] });
  assert.equal(pride.source, "catalog");
  assert.equal(pride.number, "823");
  assert.equal(pride.label, "English fiction");
  assert.ok(pride.catalogNumbers.length > 1);

  const gatsby = classify({ ddc: ["813.6", "813.54", "813", "810"] });
  assert.equal(gatsby.number, "813");
});

test("maps Library of Congress classes when Dewey is absent", () => {
  const juvenile = classify({ ddc: [], lcc: ["PZ7.R79835"] });
  assert.equal(juvenile.source, "lcc");
  assert.equal(juvenile.number, "808.83");

  const physics = classify({ ddc: [], lcc: ["QC174.12"] });
  assert.equal(physics.source, "lcc");
  assert.equal(physics.number, "530");
});

test("estimates a Dewey class from subjects and summary", () => {
  const cooking = classify({
    ddc: [],
    subjects: ["Cooking", "Recipes", "Baking"],
    title: "Salt Fat Acid Heat"
  });
  assert.equal(cooking.source, "subjects");
  assert.equal(cooking.number, "641.5");

  const programming = classify({
    ddc: [],
    subjects: [],
    title: "Clean Code",
    description: "A handbook of agile software craftsmanship for developers."
  });
  assert.equal(programming.number, "005.1");

  const reference = classify({
    ddc: [],
    subjects: ["Encyclopedias and dictionaries"],
    title: "Britannica concise encyclopedia."
  });
  assert.equal(reference.source, "subjects");
  assert.equal(reference.number, "030");
  assert.equal(reference.label, "Encyclopedias & books of facts");

  const referenceGenres = app.StacksGenre.inferGenres({
    ddc: { number: "030", markers: {} },
    subjects: ["Encyclopedias and dictionaries"],
    title: "Britannica concise encyclopedia.",
    description: ""
  });
  assert.equal(referenceGenres[0].label, "Reference");

  const unknown = classify({ ddc: [], subjects: ["Unclassified"], title: "Zzyzx" });
  assert.equal(unknown, null);
});

test("shelves fiction markers in literature, not by subject", () => {
  const english = classify({ ddc: ["[Fic]"], subjects: ["English fiction", "World War, 1939-1945"] });
  assert.equal(english.source, "subjects");
  assert.equal(english.number, "823");

  const american = classify({ ddc: ["[Fic]"], subjects: ["American fiction"] });
  assert.equal(american.number, "813");
});

test("infers genre and audience for common books", () => {
  const harry = {
    ddc: { number: "823.914", markers: { fiction: true } },
    subjects: ["Fantasy fiction", "Magic", "Wizards", "Juvenile fiction", "Hogwarts School of Witchcraft and Wizardry (Imaginary organization)"],
    title: "Harry Potter and the Philosopher's Stone",
    description: ""
  };
  const harryGenres = app.StacksGenre.inferGenres(harry);
  assert.equal(harryGenres[0].label, "Fantasy");
  assert.equal(app.StacksGenre.inferAudience(harry).label, "Children's");
  assert.equal(app.StacksGenre.inferKind(harry), "Fiction");

  const cleanCode = {
    ddc: { number: "005.1", markers: {} },
    subjects: ["Agile software development", "Computer software", "Coding theory"],
    title: "Clean Code",
    description: ""
  };
  const codeGenres = app.StacksGenre.inferGenres(cleanCode);
  assert.equal(codeGenres[0].label, "Computing & Technology");
  assert.equal(app.StacksGenre.inferAudience(cleanCode).label, "General / Adult");

  const sapiens = {
    ddc: { number: "909", markers: {} },
    subjects: ["World history", "Human beings", "Civilization", "Science", "Evolution", "Technology and civilization"],
    title: "Sapiens",
    description: ""
  };
  const sapiensGenres = app.StacksGenre.inferGenres(sapiens);
  assert.equal(sapiensGenres[0].label, "History");
});

test("shelf stores, removes and exports CSV records", () => {
  const shelf = app.StacksShelf;
  const book = {
    isbn13: "9780141439518",
    title: "Pride and Prejudice",
    authors: ["Jane Austen"],
    publisher: "Penguin",
    publishDate: "2003",
    pages: 435,
    language: "English",
    ddc: { number: "823", label: "English fiction", sourceLabel: "Catalog record" },
    genres: [{ label: "Romance" }],
    audience: { label: "General / Adult" }
  };
  assert.equal(shelf.has(book), false);
  shelf.add(book);
  assert.equal(shelf.has(book), true);
  assert.equal(shelf.entries().length, 1);
  const csv = shelf.toCsv(shelf.entries());
  assert.match(csv, /Pride and Prejudice/);
  assert.match(csv, /"823"/);
  shelf.remove(book);
  assert.equal(shelf.entries().length, 0);
});
