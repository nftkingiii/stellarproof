const http = require("http");
const fs = require("fs");
const path = require("path");

const appDir = path.join(__dirname, "app");
const port = Number(process.env.PORT || 3000);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function resolveRequestPath(urlPath) {
  const normalized = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = normalized === "/" || normalized === "." ? "index.html" : normalized.replace(/^[/\\]/, "");
  const resolved = path.join(appDir, filePath);

  if (!resolved.startsWith(appDir)) {
    return path.join(appDir, "index.html");
  }

  return resolved;
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const filePath = resolveRequestPath(reqUrl.pathname);

  fs.readFile(filePath, (error, body) => {
    if (error) {
      fs.readFile(path.join(appDir, "index.html"), (fallbackError, fallbackBody) => {
        if (fallbackError) {
          res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
          res.end("StellarProof failed to load.");
          return;
        }

        res.writeHead(200, { "content-type": contentTypes[".html"] });
        res.end(fallbackBody);
      });
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { "content-type": contentTypes[ext] || "application/octet-stream" });
    res.end(body);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`StellarProof listening on port ${port}`);
});

