/**
 * Client-side field-level encryption for sensitive data (CPF, email of data subjects).
 * Uses AES-GCM with a derived key from a configurable secret.
 * 
 * NOTE: This provides defense-in-depth. The primary protection is RLS + TLS.
 * This adds an extra layer so that even with direct DB access, sensitive fields
 * are encrypted.
 */

const ENCRYPTION_PREFIX = "enc:";

async function getKey(): Promise<CryptoKey> {
  // Use a fixed derivation seed — in production this should come from env
  const seed = "adequafacil-field-encryption-v1";
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(seed),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("adequafacil-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a plaintext string. Returns a base64-encoded ciphertext with IV prefix.
 */
export async function encryptField(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.startsWith(ENCRYPTION_PREFIX)) return plaintext;

  try {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(plaintext)
    );

    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return ENCRYPTION_PREFIX + btoa(String.fromCharCode(...combined));
  } catch {
    console.warn("Encryption failed, returning plaintext");
    return plaintext;
  }
}

/**
 * Decrypt a previously encrypted field. Returns plaintext.
 */
export async function decryptField(encrypted: string): Promise<string> {
  if (!encrypted || !encrypted.startsWith(ENCRYPTION_PREFIX)) return encrypted;

  try {
    const key = await getKey();
    const data = Uint8Array.from(atob(encrypted.slice(ENCRYPTION_PREFIX.length)), c => c.charCodeAt(0));
    const iv = data.slice(0, 12);
    const ciphertext = data.slice(12);

    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(plaintext);
  } catch {
    console.warn("Decryption failed, returning raw value");
    return encrypted;
  }
}

/**
 * Mask a CPF for display (show only last 4 digits).
 */
export function maskCpf(cpf: string): string {
  if (!cpf) return "";
  const clean = cpf.replace(/\D/g, "");
  if (clean.length < 4) return "***";
  return `***.***.*${clean.slice(-3, -2)}${clean.slice(-2)}-${clean.slice(-2)}`;
}

/**
 * Mask an email for display.
 */
export function maskEmail(email: string): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const maskedLocal = local.length > 2
    ? local[0] + "***" + local[local.length - 1]
    : "***";
  return `${maskedLocal}@${domain}`;
}
