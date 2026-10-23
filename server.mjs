import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import { exec } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const requestedPort = Number.parseInt(process.env.PORT || "", 10);
const port = requestedPort > 1023 && requestedPort < 65536 ? requestedPort : 4173;
const host = process.env.HOST || "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

function send(res, status, message) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  res.end(message);
}

const server = createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "Method not allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch (error) {
    send(res, 400, "Bad request");
    return;
  }

  if (pathname === "/") pathname = "/index.html";
  if (pathname.split("/").some((part) => part.startsWith("."))) {
    send(res, 404, "Not found");
    return;
  }

  const filePath = path.resolve(root, "." + pathname);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    send(res, 403, "Forbidden");
    return;
  }

  let info;
  try {
    info = await fs.stat(filePath);
  } catch (error) {
    send(res, 404, "Not found");
    return;
  }
  if (!info.isFile()) {
    send(res, 404, "Not found");
    return;
  }

  const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": info.size,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  createReadStream(filePath).pipe(res);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error("\n  Port " + port + " is already in use.");
    console.error("  Another copy of Stacks may already be running: http://" + host + ":" + port + "/");
    console.error("  Or start on another port:  PORT=5000 npm start\n");
    process.exit(1);
  }
  throw error;
});

server.listen(port, host, () => {
  const url = "http://" + host + ":" + port + "/";
  console.log("\n  Stacks — book scanner & Dewey desk");
  console.log("  Local:  " + url);
  console.log("  Camera scanning works on localhost. Press Ctrl+C to stop.\n");

  if (process.argv.includes("--open")) {
    const command = process.platform === "win32"
      ? 'start "" "' + url + '"'
      : process.platform === "darwin"
        ? 'open "' + url + '"'
        : 'xdg-open "' + url + '"';
    exec(command, () => {});
  }
});
