# SigmaMail Regression & Data Integrity Test Report

## 1. Executive Summary
This report validates the end-to-end data integrity, test suite execution, and regression benchmarks across the **Inbox**, **Important**, and **Deadlines** sections of SigmaMail following the refactoring and design system unification.

---

## 2. Test Suite Execution Results

**Execution Command**: `npm test` (`npx vitest run`)  
**Status**: **13 / 13 Test Suites Passed (100% PASS)**  
**Total Tests**: **105 Passed (0 Failed)**

### Test Suite Breakdown:
1. `tests/unit/deadline_accuracy.test.ts` (7 tests) — **PASS**
   - Validates date extraction without day offsets.
   - Validates FAT hall ticket dates.
   - Validates placement registration dates.
   - Validates hackathon registration dates.
   - Validates hostel biometric registration dates.
   - Validates DD/MM/YYYY formatting.
   - **NEW**: Validates exact time parsing from `"Oct 2, 2026 at 1:02 PM"` to `13:02 IST` (`07:32 UTC`), guaranteeing day digits are not mistakenly matched as the hour.
2. `tests/unit/filter_navigation.test.ts` (10 tests) — **PASS**
   - Validates filter button alignment, spacing, non-clipping, and responsive wrapping.
3. `tests/unit/email_renderer.test.ts` (13 tests) — **PASS**
   - Validates HTML sanitization, clean rendering, image blocking, and plain-text tokenization.
4. `tests/unit/ical_export.test.ts` (5 tests) — **PASS**
   - Validates timezone formatting (Asia/Kolkata), VEVENT parameters, and exclusion of candidate/dismissed deadlines.
5. `tests/unit/crypto_and_domain.test.ts` (12 tests) — **PASS**
   - Validates AES-256 token encryption, OAuth state signing, and VIT-AP domain restriction.
6. `tests/unit/phase5_intelligence.test.ts` (20 tests) — **PASS**
   - Validates multi-category classification, sender authority scoring, and confidence tiers.
7. `tests/unit/auth_and_identity.test.ts` (8 tests) — **PASS**
   - Validates identity mapping and multi-tenant data isolation.
8. `tests/unit/durable_sync_jobs.test.ts` (6 tests) — **PASS**
   - Validates durable cursor progression and sync state persistence.
9. `tests/unit/gmail_sync.test.ts` (3 tests) — **PASS**
   - Validates Gmail MIME parsing and HTML extraction.
10. `tests/unit/phase11_17_dashboard.test.ts` (4 tests) — **PASS**
    - Validates placement statistics aggregation and category counting.
11. `tests/unit/phase9_security_audit.test.ts` (6 tests) — **PASS**
    - Validates strict user data isolation and ownership enforcement.
12. `tests/unit/placement_opportunities.test.ts` (7 tests) — **PASS**
    - Validates placement opportunity stage transitions and filtering.
13. `tests/unit/sync_regression_backfill.test.ts` (4 tests) — **PASS**
    - Validates robust handling of transient and 404 Gmail sync errors.

---

## 3. Database & Count Discrepancy Audit Findings

### Mailbox vs. Database Audit:
- **Total Synced Emails**: `6,698` unique records stored in PostgreSQL.
- **Estimated Gmail Mailbox Count**: `6,697` messages (discrepancy of 1 is due to a live email arriving in Gmail during synchronization).
- **Total Stored Deadlines**: `7,296` total records.
- **Why do deadlines (7,296) exceed emails (6,698)?**
  - Emails frequently announce multiple deadlines or events (e.g. academic calendar circulars, exam timetables, multi-day meal changes).
  - A single email announcing three submission dates creates three distinct deadline records with unique dates.
- **Breakdown of 7,296 Deadlines**:
  - `Historical Archive`: `6,032` (candidates or dismissed deadlines due > 30 days in the past).
  - `Pending Candidates`: `1,263` (candidates due within the last 30 days or in the future).
  - `Completed`: `1`.
  - Formula: $6,032 + 1,263 + 1 = 7,296$. The numbers are mathematically sound and verifiable.

---

## 4. TypeScript Compilation & Clean Build Verification
- `npx tsc --noEmit` — 0 errors.
- Dev server active and responsive on `http://localhost:3000`.
