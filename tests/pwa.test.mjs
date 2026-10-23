import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file));

const manifest = JSON.parse(read("manifest.webmanifest").toString("utf8"));

test("manifest describes an installable standalone app", () => {
  assert.equal(manifest.short_name, "Stacks");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.background_color, "#f3eee3");
  assert.equal(manifest.theme_color, "#f3eee3");
  assert.ok(manifest.name.length > 10);
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3);
});

test("manifest icons exist as valid PNGs at the declared sizes", () => {
  const sizes = new Set();
  const purposes = new Set();
  for (const icon of manifest.icons) {
    const file = path.join(root, icon.src);
    assert.ok(fs.existsSync(file), "missing icon " + icon.src);
    const png = fs.readFileSync(file);
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    const [width, height] = icon.sizes.split("x").map(Number);
    assert.equal(png.readUInt32BE(16), width, icon.src + " width");
    assert.equal(png.readUInt32BE(20), height, icon.src + " height");
    sizes.add(icon.sizes);
    purposes.add(icon.purpose || "any");
  }
  assert.ok(sizes.has("192x192"));
  assert.ok(sizes.has("512x512"));
  assert.ok(purposes.has("maskable"));
});

test("apple touch icon exists at 180x180", () => {
  const png = read("icons/apple-touch-icon.png");
  assert.equal(png.readUInt32BE(16), 180);
  assert.equal(png.readUInt32BE(20), 180);
});

test("service worker caches every app-shell asset", () => {
  const sw = read("sw.js").toString("utf8");
  const assets = [
    "./index.html",
    "./styles.css",
    "./manifest.webmanifest",
    "./js/app.js",
    "./js/api.js",
    "./js/ddc.js",
    "./js/genre.js",
    "./js/isbn.js",
    "./js/scanner.js",
    "./js/storage.js",
    "./vendor/html5-qrcode.min.js",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-maskable-512.png",
    "./icons/apple-touch-icon.png"
  ];
  for (const asset of assets) {
    assert.ok(sw.includes(asset), "service worker missing " + asset);
    assert.ok(fs.existsSync(path.join(root, asset)), "missing file " + asset);
  }
  assert.match(sw, /addEventListener\("fetch"/);
  assert.match(sw, /addEventListener\("install"/);
});

test("page exposes the manifest, iOS meta and install sheet", () => {
  const html = read("index.html").toString("utf8");
  assert.match(html, /rel="manifest"/);
  assert.match(html, /apple-touch-icon/);
  assert.match(html, /name="apple-mobile-web-app-capable"/);
  assert.match(html, /id="install-sheet"/);
  assert.match(html, /id="install-open"/);
  assert.match(html, /viewport-fit=cover/);

  const app = read("js/app.js").toString("utf8");
  assert.match(app, /beforeinstallprompt/);
  assert.match(app, /appinstalled/);
  assert.match(app, /serviceWorker\.register\("\.\/sw\.js"\)/);
  assert.match(app, /Add to Home Screen/);
});
