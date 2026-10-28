import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken, createOAuthState, verifyOAuthState } from "@/lib/crypto";
import { isAllowedCollegeEmail, getAllowedEmailDomains } from "@/lib/env";

describe("AES-256-GCM Token Encryption", () => {
  const testKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  it("should encrypt and decrypt a token successfully", () => {
    const rawToken = "ya29.a0AfH6SMD_mock_sample_google_refresh_token_string";
    const encrypted = encryptToken(rawToken, testKey);

    expect(encrypted.ciphertext).not.toBe(rawToken);
    expect(encrypted.iv).toHaveLength(24); // 12 bytes = 24 hex characters
    expect(encrypted.tag).toHaveLength(32); // 16 bytes = 32 hex characters

    const decrypted = decryptToken(encrypted, testKey);
    expect(decrypted).toBe(rawToken);
  });

  it("should produce different ciphertexts for the same plaintext due to random IV", () => {
    const rawToken = "same_secret_token";
    const enc1 = encryptToken(rawToken, testKey);
    const enc2 = encryptToken(rawToken, testKey);

    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
    expect(decryptToken(enc1, testKey)).toBe(rawToken);
    expect(decryptToken(enc2, testKey)).toBe(rawToken);
  });

  it("should throw an error if the authentication tag is tampered with", () => {
    const rawToken = "sensitive_refresh_token";
    const encrypted = encryptToken(rawToken, testKey);

    // Tamper with authentication tag
    const corruptedTag = "00000000000000000000000000000000";
    expect(() => {
      decryptToken({ ...encrypted, tag: corruptedTag }, testKey);
    }).toThrow();
  });

  it("should throw an error if the ciphertext is modified", () => {
    const rawToken = "sensitive_refresh_token";
    const encrypted = encryptToken(rawToken, testKey);

    // Tamper with first character of ciphertext
    const corruptedCiphertext = (encrypted.ciphertext[0] === "a" ? "b" : "a") + encrypted.ciphertext.slice(1);
    expect(() => {
      decryptToken({ ...encrypted, ciphertext: corruptedCiphertext }, testKey);
    }).toThrow();
  });

  it("should throw an error if decrypted with a different key", () => {
    const rawToken = "sensitive_refresh_token";
    const encrypted = encryptToken(rawToken, testKey);
    const wrongKey = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

    expect(() => {
      decryptToken(encrypted, wrongKey);
    }).toThrow();
  });

  it("should throw an error if encryption key is not a 64-char hex string", () => {
    expect(() => {
      encryptToken("test", "short-key");
    }).toThrow(/TOKEN_ENCRYPTION_KEY must be a 64-character/);
  });
});

describe("College Domain Verification", () => {
  it("should validate university domain correctly", () => {
    expect(isAllowedCollegeEmail("student.21bce9999@vitapstudent.ac.in")).toBe(true);
    expect(isAllowedCollegeEmail("STUDENT.TEST@VITAPSTUDENT.AC.IN")).toBe(true);
  });

  it("should reject non-university or personal domains", () => {
    expect(isAllowedCollegeEmail("student@gmail.com")).toBe(false);
    expect(isAllowedCollegeEmail("attacker@yahoo.com")).toBe(false);
    expect(isAllowedCollegeEmail("student@otheruniversity.edu")).toBe(false);
    expect(isAllowedCollegeEmail("student@vitap.ac.in")).toBe(false); // only vitapstudent.ac.in by default
    expect(isAllowedCollegeEmail("invalid-email-string")).toBe(false);
    expect(isAllowedCollegeEmail("")).toBe(false);
  });

  it("should extract allowed domains list", () => {
    const domains = getAllowedEmailDomains();
    expect(domains).toContain("vitapstudent.ac.in");
  });
});

describe("HMAC OAuth State Protection (Phase 7 Workstream B)", () => {
  const testKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  it("should generate a valid signed OAuth state token", () => {
    const payload = {
      nonce: "1234567890abcdef1234567890abcdef",
      userEmail: "aditya.23bcb7086@vitapstudent.ac.in",
      userId: "user_test_123",
      timestamp: Date.now(),
    };

    const token = createOAuthState(payload, testKey);
    expect(token).toContain(".");

    const verified = verifyOAuthState(token, 10 * 60 * 1000, testKey);
    expect(verified.valid).toBe(true);
    expect(verified.payload?.nonce).toBe(payload.nonce);
    expect(verified.payload?.userEmail).toBe(payload.userEmail);
    expect(verified.payload?.userId).toBe(payload.userId);
  });

  it("should reject tampered state signature", () => {
    const payload = {
      nonce: "1234567890abcdef1234567890abcdef",
      userEmail: "aditya.23bcb7086@vitapstudent.ac.in",
      userId: "user_test_123",
      timestamp: Date.now(),
    };

    const token = createOAuthState(payload, testKey);
    const [encodedData] = token.split(".");
    const tamperedToken = `${encodedData}.forgedSignature1234567890`;

    const verified = verifyOAuthState(tamperedToken, 10 * 60 * 1000, testKey);
    expect(verified.valid).toBe(false);
    expect(verified.error).toContain("Invalid state signature");
  });

  it("should reject expired OAuth state tokens", () => {
    const expiredPayload = {
      nonce: "expired_nonce_123",
      userEmail: "student@vitapstudent.ac.in",
      userId: "user_expired_456",
      timestamp: Date.now() - 20 * 60 * 1000, // 20 minutes ago
    };

    const token = createOAuthState(expiredPayload, testKey);
    const verified = verifyOAuthState(token, 10 * 60 * 1000, testKey); // 10 min window
    expect(verified.valid).toBe(false);
    expect(verified.error).toContain("expired");
  });
});

