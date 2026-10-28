import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, _resetRateLimitStore } from "@/lib/rate-limiter";
import { encryptToken, decryptToken } from "@/lib/crypto";

describe("Phase 9: Production Security & Reliability Audit Verification", () => {
  beforeEach(() => {
    _resetRateLimitStore();
  });

  describe("API Abuse Prevention & Sliding Window Rate Limiter", () => {
    it("allows requests under the configured threshold", () => {
      const id = "test_user_rate_1";
      const opts = { limit: 3, windowMs: 1000 };

      const r1 = checkRateLimit(id, opts);
      const r2 = checkRateLimit(id, opts);
      const r3 = checkRateLimit(id, opts);

      expect(r1.success).toBe(true);
      expect(r1.remaining).toBe(2);
      expect(r2.success).toBe(true);
      expect(r2.remaining).toBe(1);
      expect(r3.success).toBe(true);
      expect(r3.remaining).toBe(0);
    });

    it("strictly blocks requests exceeding the configured limit", () => {
      const id = "test_user_rate_2";
      const opts = { limit: 2, windowMs: 1000 };

      checkRateLimit(id, opts);
      checkRateLimit(id, opts);
      const blocked = checkRateLimit(id, opts);

      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.resetMs).toBeGreaterThan(0);
    });

    it("isolates rate limits per user identifier", () => {
      const opts = { limit: 1, windowMs: 1000 };

      const u1 = checkRateLimit("user_A:sync", opts);
      const u2 = checkRateLimit("user_B:sync", opts);
      const u1Blocked = checkRateLimit("user_A:sync", opts);

      expect(u1.success).toBe(true);
      expect(u2.success).toBe(true);
      expect(u1Blocked.success).toBe(false);
    });
  });

  describe("Cryptographic Token Tag Integrity & AES-256-GCM Verification", () => {
    const testKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    it("rejects token decryption if authentication tag is corrupted or forged", () => {
      const encrypted = encryptToken("ya29.sample_oauth_token", testKey);
      
      // Tamper with the authentication tag
      const corruptedPayload = {
        ...encrypted,
        tag: "00000000000000000000000000000000",
      };

      expect(() => decryptToken(corruptedPayload, testKey)).toThrow();
    });

    it("rejects token decryption if ciphertext has been modified", () => {
      const encrypted = encryptToken("ya29.sample_oauth_token", testKey);
      
      // Modify ciphertext byte
      const tamperedCiphertext = "ff" + encrypted.ciphertext.slice(2);
      const corruptedPayload = {
        ...encrypted,
        ciphertext: tamperedCiphertext,
      };

      expect(() => decryptToken(corruptedPayload, testKey)).toThrow();
    });

    it("fails cleanly if an invalid key length is supplied", () => {
      expect(() => encryptToken("secret", "short_key")).toThrow(
        "TOKEN_ENCRYPTION_KEY must be a 64-character (32-byte) hex string."
      );
    });
  });
});
