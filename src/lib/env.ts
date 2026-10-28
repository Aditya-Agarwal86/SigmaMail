import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3001"),
  AUTH_URL: z.string().url().optional(),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required").optional().default(
    process.env.NODE_ENV === "test"
      ? "postgresql://mock_user:mock_pass@localhost:5432/mock_db"
      : (process.env.DATABASE_URL || "postgresql://campusinbox_user:campusinbox_password@localhost:5433/campusinbox_db")
  ),
  ALLOWED_EMAIL_DOMAINS: z.string().min(1).default("vitapstudent.ac.in"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters long").optional().default("default-dev-secret-minimum-32-chars-long-campusinbox"),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  GMAIL_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_SECRET: z.string().optional(),
  GMAIL_REDIRECT_URI: z.string().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().refine(
    (key) => !key || (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)),
    "TOKEN_ENCRYPTION_KEY must be a 64-character (32-byte) hex string when provided"
  ).optional().default("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
  AI_PROVIDER: z.enum(["gemini", "openai", "disabled"]).default("disabled"),
  AI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration.");
  }

  // Production security safeguard: In runtime production, prevent serving traffic with placeholder credentials
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build";
  if (result.data.NODE_ENV === "production" && !isBuildPhase && process.env.STRICT_PROD_SECRETS === "true") {
    if (result.data.AUTH_SECRET === "default-dev-secret-minimum-32-chars-long-campusinbox") {
      throw new Error("SECURITY ERROR: AUTH_SECRET must be explicitly set to a unique secure random secret in production.");
    }
  }

  return result.data;
}

export const env = validateEnv();

/**
 * Helper to get the list of allowed domain suffixes
 */
export function getAllowedEmailDomains(): string[] {
  return env.ALLOWED_EMAIL_DOMAINS.split(",").map((d) => d.trim().toLowerCase());
}

export interface CollegeEmailVerificationResult {
  isValid: boolean;
  normalizedEmail?: string;
  domain?: string;
  reason?: string;
}

/**
 * Server-side check if an email matches the exact allowed college domain.
 * Strictly verifies email structure, disallows subdomains, lookalike prefixes/suffixes,
 * multiple @ symbols, or whitespace.
 */
export function verifyCollegeEmail(
  email: string | null | undefined,
  isEmailVerified: boolean = true
): CollegeEmailVerificationResult {
  if (!email || typeof email !== "string") {
    return { isValid: false, reason: "Missing or invalid email format" };
  }

  if (!isEmailVerified) {
    return { isValid: false, reason: "Google account email is not verified" };
  }

  const trimmed = email.trim();
  const parts = trimmed.split("@");

  // Must have exactly one @ symbol with non-empty local part and domain
  if (parts.length !== 2) {
    return { isValid: false, reason: "Malformed email address: invalid @ separator count" };
  }

  const [localPart, domainPart] = parts;
  if (!localPart || !domainPart) {
    return { isValid: false, reason: "Malformed email: missing local part or domain part" };
  }

  // Check for invalid characters or whitespace
  if (/\s/.test(trimmed)) {
    return { isValid: false, reason: "Email contains whitespace" };
  }

  const normalizedDomain = domainPart.toLowerCase();
  const normalizedLocal = localPart.toLowerCase();
  const allowedDomains = getAllowedEmailDomains();

  // Strict exact comparison against configured allowlist (no unsafe .endsWith())
  const isDomainAllowed = allowedDomains.includes(normalizedDomain);

  if (!isDomainAllowed) {
    return {
      isValid: false,
      domain: normalizedDomain,
      reason: `Domain '${normalizedDomain}' is not an authorized college domain.`,
    };
  }

  return {
    isValid: true,
    normalizedEmail: `${normalizedLocal}@${normalizedDomain}`,
    domain: normalizedDomain,
  };
}

/**
 * Backward compatible boolean check for college email domain
 */
export function isAllowedCollegeEmail(email: string, isEmailVerified: boolean = true): boolean {
  return verifyCollegeEmail(email, isEmailVerified).isValid;
}

