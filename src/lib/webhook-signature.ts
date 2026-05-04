/**
 * HMAC-SHA256 webhook signature generation and verification.
 * Used to sign and verify callbacks from the DSAR portal and other external integrations.
 */

const WEBHOOK_SECRET_KEY = "adequafacil-webhook-hmac-v1";

async function getHmacKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(WEBHOOK_SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Generate an HMAC-SHA256 signature for a payload.
 */
export async function signPayload(payload: string): Promise<string> {
  const key = await getHmacKey();
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify an HMAC-SHA256 signature against a payload.
 */
export async function verifySignature(payload: string, signature: string): Promise<boolean> {
  const expectedSig = await signPayload(payload);
  // Constant-time comparison
  if (expectedSig.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expectedSig.length; i++) {
    result |= expectedSig.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generate a signed request body with timestamp to prevent replay attacks.
 */
export function createSignedRequest(body: Record<string, unknown>): {
  payload: string;
  headers: { "x-webhook-signature": string; "x-webhook-timestamp": string };
} {
  const timestamp = Date.now().toString();
  const payload = JSON.stringify({ ...body, _timestamp: timestamp });
  return {
    payload,
    headers: {
      "x-webhook-signature": "", // Will be filled async
      "x-webhook-timestamp": timestamp,
    },
  };
}

/**
 * Verify a webhook request including replay attack prevention (5 min window).
 */
export async function verifyWebhookRequest(
  payload: string,
  signature: string,
  timestamp: string
): Promise<{ valid: boolean; error?: string }> {
  // Check timestamp freshness (5 min window)
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    return { valid: false, error: "Request expired or invalid timestamp" };
  }

  const isValid = await verifySignature(payload, signature);
  if (!isValid) {
    return { valid: false, error: "Invalid signature" };
  }

  return { valid: true };
}
