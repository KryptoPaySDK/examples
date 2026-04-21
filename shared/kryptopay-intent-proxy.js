import { Buffer } from "node:buffer";

const CREATE_INTENT_PATH = "/api/create-intent";
const RESOLVE_INTENT_PATH = "/v1/payment_intents/resolve";
const DEFAULT_API_BASE_URL = "https://api.kryptopay.xyz";

export function kryptopayIntentProxyPlugin({ env }) {
  return {
    name: "kryptopay-intent-proxy",
    configureServer(server) {
      installCreateIntentRoute(server.middlewares, env);
    },
    configurePreviewServer(server) {
      installCreateIntentRoute(server.middlewares, env);
    },
  };
}

function installCreateIntentRoute(middlewares, env) {
  middlewares.use(CREATE_INTENT_PATH, async (req, res) => {
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== "POST") {
      writeJson(res, 405, {
        error: "method_not_allowed",
        message: "Use POST /api/create-intent.",
      });
      return;
    }

    const apiBaseUrl = resolveApiBaseUrl(env);
    const apiKey = resolveApiKey(env);

    if (!apiKey) {
      writeJson(res, 500, {
        error: "server_not_configured",
        message:
          "Missing KRYPTOPAY_API_KEY. VITE_KRYPTOPAY_API_KEY is supported as a compatibility fallback.",
      });
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      writeJson(res, 400, {
        error: "invalid_json",
        message: "Request body must be valid JSON.",
      });
      return;
    }

    const amountUnits = Number(body?.amountUnits);
    if (!Number.isInteger(amountUnits) || amountUnits <= 0) {
      writeJson(res, 400, {
        error: "invalid_amount_units",
        message: "amountUnits must be a positive integer.",
      });
      return;
    }

    const orderId =
      typeof body?.orderId === "string" && body.orderId.trim()
        ? body.orderId.trim()
        : `demo_${Date.now()}`;

    const metadata = isPlainObject(body?.metadata) ? body.metadata : {};
    const chain = body?.chain === "polygon" ? "polygon" : "base";

    let upstream;
    try {
      upstream = await fetch(`${apiBaseUrl}/v1/payment_intents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount_units: amountUnits,
          chain,
          lane: "sdk",
          metadata: {
            ...metadata,
            order_id: orderId,
          },
        }),
      });
    } catch (error) {
      writeJson(res, 502, {
        error: "upstream_network_error",
        message:
          error instanceof Error
            ? error.message
            : "Network error while calling KryptoPay.",
      });
      return;
    }

    const payload = await readUpstreamPayload(upstream);
    if (!upstream.ok) {
      writeJson(
        res,
        upstream.status,
        payload ?? {
          error: "create_intent_failed",
          message: "KryptoPay returned an error while creating the intent.",
        },
      );
      return;
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      typeof payload.client_secret !== "string" ||
      !payload.client_secret
    ) {
      writeJson(res, 502, {
        error: "invalid_upstream_response",
        message: "KryptoPay response did not include client_secret.",
      });
      return;
    }

    writeJson(res, 200, {
      clientSecret: payload.client_secret,
    });
  });

  middlewares.use(RESOLVE_INTENT_PATH, async (req, res) => {
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== "POST") {
      writeJson(res, 405, {
        error: "method_not_allowed",
        message: "Use POST /v1/payment_intents/resolve.",
      });
      return;
    }

    const apiBaseUrl = resolveApiBaseUrl(env);

    let rawBody;
    try {
      rawBody = await readRawBody(req);
    } catch {
      writeJson(res, 400, {
        error: "invalid_json",
        message: "Request body must be valid JSON.",
      });
      return;
    }

    let upstream;
    try {
      upstream = await fetch(`${apiBaseUrl}${RESOLVE_INTENT_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: rawBody || "{}",
      });
    } catch (error) {
      writeJson(res, 502, {
        error: "upstream_network_error",
        message:
          error instanceof Error
            ? error.message
            : "Network error while resolving the payment intent.",
      });
      return;
    }

    await forwardJsonResponse(res, upstream);
  });
}

function resolveApiBaseUrl(env) {
  const value =
    env.KRYPTOPAY_API_BASE_URL ||
    env.VITE_KRYPTOPAY_API_BASE_URL ||
    DEFAULT_API_BASE_URL;

  return value.trim().replace(/\/+$/, "");
}

function resolveApiKey(env) {
  return env.KRYPTOPAY_API_KEY?.trim() || env.VITE_KRYPTOPAY_API_KEY?.trim();
}

async function readJsonBody(req) {
  const raw = await readRawBody(req);
  return raw ? JSON.parse(raw) : {};
}

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function readUpstreamPayload(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function writeJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function forwardJsonResponse(res, upstream) {
  const payload = await readUpstreamPayload(upstream);

  res.statusCode = upstream.status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (payload === null) {
    res.end();
    return;
  }

  res.end(JSON.stringify(payload));
}
