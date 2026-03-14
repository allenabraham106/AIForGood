const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const workspaceRoot = __dirname;
loadEnvironmentFile(path.join(workspaceRoot, ".env"));
loadEnvironmentFile(path.join(workspaceRoot, ".env.local"));

const port = Number.parseInt(process.env.PORT || "3000", 10);

function loadEnvironmentFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");

  raw.split(/\r?\n/).forEach(function (line) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

function getAzureSettings() {
  return {
    key: process.env.AZURE_SPEECH_KEY || "",
    region: process.env.AZURE_SPEECH_REGION || "",
    language: process.env.AZURE_SPEECH_LANGUAGE || "en-US",
    enableProsody: /^true$/i.test(process.env.AZURE_SPEECH_ENABLE_PROSODY || "")
  };
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);

  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(body);
}

function sendText(response, statusCode, body, contentType) {
  response.writeHead(statusCode, {
    "Content-Type": contentType || "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(body);
}

function redirect(response, location) {
  response.writeHead(302, {
    Location: location,
    "Cache-Control": "no-store"
  });
  response.end();
}

function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

function resolveStaticPath(requestPath) {
  const sanitizedPath = decodeURIComponent(requestPath.split("?")[0]);
  const rawPath = sanitizedPath === "/" ? "/demo/" : sanitizedPath;
  let absolutePath = path.join(workspaceRoot, rawPath);

  if (rawPath.endsWith("/")) {
    absolutePath = path.join(absolutePath, "index.html");
  }

  if (!absolutePath.startsWith(workspaceRoot)) {
    return null;
  }

  return absolutePath;
}

async function issueAzureToken() {
  const settings = getAzureSettings();

  if (!settings.key || !settings.region) {
    return {
      ok: false,
      statusCode: 503,
      payload: {
        error: "Azure Speech is not configured yet. Add AZURE_SPEECH_KEY and AZURE_SPEECH_REGION to .env.local."
      }
    };
  }

  const tokenUrl = "https://" + settings.region + ".api.cognitive.microsoft.com/sts/v1.0/issueToken";

  try {
    const azureResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Ocp-Apim-Subscription-Key": settings.key
      }
    });

    if (!azureResponse.ok) {
      const errorText = await azureResponse.text();
      return {
        ok: false,
        statusCode: azureResponse.status,
        payload: {
          error: "Azure Speech rejected the token request.",
          details: errorText
        }
      };
    }

    const token = await azureResponse.text();

    return {
      ok: true,
      statusCode: 200,
      payload: {
        token: token,
        region: settings.region,
        language: settings.language,
        enableProsody: settings.enableProsody
      }
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: 502,
      payload: {
        error: "Could not reach Azure Speech.",
        details: error.message
      }
    };
  }
}

const server = http.createServer(async function (request, response) {
  if (!request.url) {
    sendText(response, 400, "Missing request URL.");
    return;
  }

  const requestUrl = new URL(request.url, "http://127.0.0.1:" + port);

  if (requestUrl.pathname === "/") {
    redirect(response, "/demo/");
    return;
  }

  if (requestUrl.pathname === "/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (requestUrl.pathname === "/api/azure-speech-config") {
    const settings = getAzureSettings();

    sendJson(response, 200, {
      enabled: Boolean(settings.key && settings.region),
      region: settings.region || null,
      language: settings.language,
      enableProsody: settings.enableProsody
    });
    return;
  }

  if (requestUrl.pathname === "/api/azure-speech-token") {
    const tokenResult = await issueAzureToken();
    sendJson(response, tokenResult.statusCode, tokenResult.payload);
    return;
  }

  const filePath = resolveStaticPath(requestUrl.pathname);

  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(response, 404, "Not found.");
    return;
  }

  response.writeHead(200, {
    "Content-Type": getMimeType(filePath),
    "Cache-Control": "no-store"
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, function () {
  const settings = getAzureSettings();
  const mode = settings.key && settings.region ? "Azure pronunciation ready" : "browser fallback only";

  console.log("CareVoice demo server running at http://127.0.0.1:" + port + "/demo/");
  console.log("Speech practice mode: " + mode);
});

