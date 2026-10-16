const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = 9874;
const HOST = "0.0.0.0";
const ROOT = __dirname;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || HOST}`);
  let pathname = "/";

  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    send(response, 400, "Adres okunamadı");
    return;
  }

  if (pathname === "/") pathname = "/index.html";

  const relative = pathname.replace(/^[/\\]+/, "");
  const filePath = path.resolve(ROOT, relative);
  const rootWithSep = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;

  if (filePath !== ROOT && !filePath.startsWith(rootWithSep)) {
    send(response, 403, "Bu dosyaya erişilemez");
    return;
  }

  const baseName = path.basename(filePath).toLowerCase();
  if (baseName === "server.js" || baseName.startsWith(".")) {
    send(response, 404, "Sayfa bulunamadı");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  if (!TYPES[extension]) {
    send(response, 404, "Sayfa bulunamadı");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(response, error.code === "ENOENT" ? 404 : 500, "Sayfa bulunamadı");
      return;
    }

    response.writeHead(200, { "Content-Type": TYPES[extension] });
    response.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Uygulama tüm ağ arabirimlerinde dinliyor: port ${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} kullanımda. Başka bir süreç kapatılmalı.`);
  } else {
    console.error(error.message);
  }
  process.exit(1);
});

function send(response, status, message) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}
