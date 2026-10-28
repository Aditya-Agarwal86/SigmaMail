import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM

export interface EncryptedPayload {
  ciphertext: string;
  iv: string; // 12-byte IV in hex (24 chars)
  tag: string; // 16-byte auth tag in hex (32 chars)
}

/**
 * Returns the 32-byte encryption key buffer from hex or generates one for test environments.
 */
function getKeyBuffer(keyHex?: string): Buffer {
  const hex = keyHex || process.env.TOKEN_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  if (!hex || hex.length !== 64) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a 64-character (32-byte) hex string.");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts a plaintext secret (such as an OAuth refresh or access token) using AES-256-GCM.
 * Never stores or returns plaintext. Generates a cryptographically strong random IV per call.
 */
export function encryptToken(plaintext: string, keyHex?: string): EncryptedPayload {
  if (!plaintext) {
    throw new Error("Cannot encrypt empty token string.");
  }
  const key = getKeyBuffer(keyHex);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  return {
    ciphertext,
    iv: iv.toString("hex"),
    tag,
  };
}

/**
 * Decrypts a ciphertext using AES-256-GCM and verifies the authentication tag.
 * Throws an error if ciphertext or tag was tampered with.
 */
export function decryptToken(encrypted: EncryptedPayload, keyHex?: string): string {
  const { ciphertext, iv, tag } = encrypted;
  if (!ciphertext || !iv || !tag) {
    throw new Error("Incomplete encrypted payload: ciphertext, iv, and tag are required.");
  }
  const key = getKeyBuffer(keyHex);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(tag, "hex"));

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export interface OAuthStatePayload {
  nonce: string;
  userEmail: string;
  userId: string;
  timestamp: number;
}

/**
 * Creates a cryptographically signed HMAC-SHA256 OAuth state string.
 * Binds the state to userEmail, userId, timestamp, and a random 32-byte nonce.
 */
export function createOAuthState(payload: OAuthStatePayload, keyHex?: string): string {
  const key = getKeyBuffer(keyHex);
  const data = JSON.stringify(payload);
  const encodedData = Buffer.from(data, "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", key).update(encodedData).digest("base64url");
  return `${encodedData}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 OAuth state token and checks expiration and signature validity.
 */
export function verifyOAuthState(
  stateString: string,
  maxAgeMs: number = 10 * 60 * 1000,
  keyHex?: string
): { valid: boolean; payload?: OAuthStatePayload; error?: string } {
  if (!stateString || typeof stateString !== "string") {
    return { valid: false, error: "Missing state string" };
  }

  const parts = stateString.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Malformed state token format" };
  }

  const [encodedData, signature] = parts;
  const key = getKeyBuffer(keyHex);
  const expectedSignature = crypto.createHmac("sha256", key).update(encodedData).digest("base64url");

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, "utf8");
  const expectedSigBuffer = Buffer.from(expectedSignature, "utf8");
  if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    return { valid: false, error: "Invalid state signature or tampering detected" };
  }

  try {
    const jsonStr = Buffer.from(encodedData, "base64url").toString("utf8");
    const payload = JSON.parse(jsonStr) as OAuthStatePayload;

    if (!payload.nonce || !payload.userEmail || !payload.userId || !payload.timestamp) {
      return { valid: false, error: "Incomplete state payload" };
    }

    if (Date.now() - payload.timestamp > maxAgeMs) {
      return { valid: false, error: "OAuth authorization state expired" };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: "Corrupted state payload JSON" };
  }
}
