# SigmaMail

> **Your campus inbox, under control.**

SigmaMail organizes your college emails into clear categories, highlights important announcements, tracks deadlines, and groups placement opportunities in one workspace. Engineered for university students (`vitapstudent.ac.in`), SigmaMail prioritizes campus communications and extracts academic and placement deadlines—all while safeguarding student privacy with authenticated token encryption and zero-knowledge data practices.

---

## Highlights

- **Configurable College Domain Verification:** Strict server-side validation against `vitapstudent.ac.in` (configurable via `ALLOWED_EMAIL_DOMAINS`). No arbitrary personal email logins permitted.
- **Decoupled Mailbox Authorization:** Google Sign-In only authenticates identity (`openid`, `email`, `profile`). Mailbox access requires a distinct, explicit user opt-in with minimal required scopes (`gmail.readonly`).
- **Zero Client-Side Token Exposure:** All Google OAuth refresh and access tokens are encrypted at rest using **AES-256-GCM** with unique IVs and auth tags, and are never sent to the browser.
- **Two-Tier Intelligent Categorization:**
  - *Tier 1:* High-speed deterministic rules engine tuned for university senders and subjects (Dean Academics, CDC Placements, Exams, Hostel Wardens).
  - *Tier 2:* Provider-independent AI classification for ambiguous emails with confidence scoring.
- **Automated Deadline Extraction:** Automatically detects assignment deadlines, exam timetables, fee cut-offs, and placement test dates into an integrated calendar dashboard.
- **Privacy & Self-Service Data Governance:** Instant one-click "Disconnect & Purge" permanently deletes all stored emails, deadlines, and OAuth credentials.
- **Vendor-Agnostic AI Pipeline:** Swappable interface supporting Google Gemini, OpenAI, or local deterministic stubs for zero-cost offline development.

---

## Architectural & Security Documentation

Detailed technical planning documents have been produced for this project:

- [PROJECT_PLAN.md](file:///c:/Users/Aditya%20Agarwal/OneDrive/Desktop/CampusInbox/PROJECT_PLAN.md) — Comprehensive requirements, classification taxonomy, sync strategy, testing matrix, and phased milestones.
- [ARCHITECTURE.md](file:///c:/Users/Aditya%20Agarwal/OneDrive/Desktop/CampusInbox/ARCHITECTURE.md) — System architecture, Next.js App Router hierarchy, Prisma relational schema, and AI service interfaces.
- [SECURITY.md](file:///c:/Users/Aditya%20Agarwal/OneDrive/Desktop/CampusInbox/SECURITY.md) — OAuth flow details, AES-256-GCM token encryption, Google Cloud OAuth scope breakdown (`gmail.readonly` vs `gmail.modify`), and verification criteria.
- [THREAT_MODEL.md](file:///c:/Users/Aditya%20Agarwal/OneDrive/Desktop/CampusInbox/THREAT_MODEL.md) — Formal STRIDE threat analysis covering spoofing, token tampering, prompt injection, and mitigations.
- [PRIVACY.md](file:///c:/Users/Aditya%20Agarwal/OneDrive/Desktop/CampusInbox/PRIVACY.md) — Data retention policies, AI zero-data-retention terms, and user privacy rights.
- [.env.example](file:///c:/Users/Aditya%20Agarwal/OneDrive/Desktop/CampusInbox/.env.example) — Complete configuration template with variable descriptions.

---

## Tech Stack

- **Framework:** Next.js (App Router, Server Actions, React Server Components)
- **Language:** TypeScript (Strict mode enabled)
- **Styling & UI:** Tailwind CSS, shadcn/ui, Lucide Icons
- **Database & ORM:** PostgreSQL, Prisma ORM
- **Authentication:** Auth.js v5 (NextAuth.js) with Google Provider
- **Google Integrations:** Google APIs Client Library (`googleapis`, `google-auth-library`)
- **Validation:** Zod schemas for all API payloads and AI outputs
- **Testing:** Vitest (Unit/Integration) & Playwright (End-to-End)
- **AI Service:** Provider-independent interface (`AIServiceInterface`) with Gemini 1.5 Flash adapter

---

## Getting Started (Local Development)

### Prerequisites
- Node.js 20+ LTS
- PostgreSQL 15+ (local instance or hosted service like Supabase/Neon)
- Google Cloud Console Project with OAuth 2.0 Credentials enabled

### Setup Steps
1. **Clone and Navigate:**
   ```bash
   cd CampusInbox
   ```

2. **Start Local PostgreSQL Database:**
   A dedicated `docker-compose.yml` is provided running PostgreSQL 16 on port `5433`:
   ```bash
   docker compose up -d
   ```
   *(For hosted production environments, any PostgreSQL instance such as Supabase or Neon with connection pooling can be configured via `DATABASE_URL`)*.

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   Generate a 32-byte hex key for AES-256-GCM token encryption:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Update `.env` with your `DATABASE_URL`, `AUTH_SECRET`, and `TOKEN_ENCRYPTION_KEY`.

4. **Install Dependencies:**
   ```bash
   npm install
   ```

5. **Initialize Database & Seed Synthetic Data:**
   ```bash
   npm run prisma:validate
   npm run prisma:generate
   npm run db:migrate
   npm run db:seed
   ```

6. **Run Verification & Quality Commands:**
   ```bash
   npm run lint       # Next.js ESLint
   npm run typecheck  # TypeScript strict compiler check
   npm run test       # Vitest unit test suite (crypto & domain check)
   npm run test:e2e   # Playwright end-to-end tests
   npm run build      # Next.js production build
   ```

7. **Run Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application with synthetic college email feeds.

---

## Google Cloud Console Configuration (OAuth 2.0 Identity)

To configure Google Sign-In for SigmaMail:

1. **Create or Open a Google Cloud Project:**
   Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. **Configure OAuth Consent Screen:**
   - User Type: **External** (or **Internal** if authorized under university Google Workspace).
   - App Name: `SigmaMail`
   - User Support Email: Your university or developer support email.
   - Developer Contact Information: Valid email address.
   - Authorized Domains: Add your production domain or `localhost`.
   - **Scopes Requested for Identity (Phase 3):** `openid`, `email`, `profile` *(Do NOT add Gmail scopes here)*.
3. **Create OAuth 2.0 Credentials:**
   - Application Type: **Web application**.
   - Name: `SigmaMail Web Client`.
   - **Authorized JavaScript origins:**
     - `http://localhost:3000` (for local development)
     - `https://your-production-domain.com` (for production)
   - **Authorized redirect URIs:**
     - `http://localhost:3000/api/auth/callback/google` (Auth.js v5 Google callback)
     - `https://your-production-domain.com/api/auth/callback/google`
4. **Populate Environment Variables:**
   Add the Client ID and Client Secret generated by Google to `.env`:
   ```bash
   AUTH_GOOGLE_ID="your-client-id.apps.googleusercontent.com"
   AUTH_GOOGLE_SECRET="your-client-secret"
   ```

---

## Gmail Scopes & Boundary Policy

SigmaMail strictly separates user authentication from mailbox data:
- **Phase 3 (Active):** Uses only standard OpenID Connect identity claims (`openid`, `email`, `profile`).
- **Phase 4 (Active):** Separate, explicit opt-in for `https://www.googleapis.com/auth/gmail.readonly`.
- **Policy:** SigmaMail NEVER requests `gmail.send`, `gmail.compose`, or full `mail.google.com` scopes.

### Separate Gmail Authorization Architecture (Phase 4)
1. **Explicit Connect Action:** Initiated via `/api/auth/gmail/connect`. Creates a single-use CSRF state token stored in a secure HTTP-only cookie.
2. **Account Match Verification:** When Google returns the authorized Gmail address, SigmaMail cryptographically verifies that the authorized Gmail address strictly matches the signed-in university student's email address (`vitapstudent.ac.in`). Mismatches are rejected.
3. **AES-256-GCM Token Encryption:** Refresh and access tokens are encrypted at rest with unique 12-byte IVs and 16-byte authentication tags. Tokens are never exposed to browser components or logs.
4. **Read-Only Sync Engine:** `/api/sync` executes delta synchronization using the Gmail History API with database lock coordination and minimum cooldown guards.

---

## Testing Policy

- **No Real Email Data:** All tests run exclusively against synthetic mock datasets and mocked OAuth callbacks.
- **Unit & Integration:** Run `npm run test` (Vitest: 18/18 tests passing across crypto, domain, identity mapping, and Gmail sync).
- **End-to-End:** Run `npm run test:e2e` (Playwright: 7/7 tests passing across app shell, login, access denied, and settings).

---

## License

This project is intended for educational and institutional productivity enhancement.
