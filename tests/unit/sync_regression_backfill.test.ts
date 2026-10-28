import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getOAuth2Client } from "@/lib/gmail-client";
import { backfillMessagesByIds, syncUserGmail } from "@/lib/gmail-sync";
import { SyncStatus } from "@prisma/client";

// Mock external dependencies
vi.mock("@/lib/intelligence", () => ({
  processEmailIntelligence: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/gmail-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gmail-client")>();
  return {
    ...actual,
    getAuthenticatedGmailClient: vi.fn(),
  };
});

import { getAuthenticatedGmailClient } from "@/lib/gmail-client";

describe("Phase 11.13: Gmail Sync & Backfill Regression Suite", () => {
  const testUserId = "test_user_regression_11_13";

  beforeEach(async () => {
    vi.clearAllMocks();
    await prisma.email.deleteMany({ where: { userId: testUserId } });
    await prisma.gmailCredential.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });

    // Setup base test user & credential
    await prisma.user.create({
      data: {
        id: testUserId,
        email: "student.test@vitapstudent.ac.in",
        name: "Test Student",
      },
    });

    await prisma.gmailCredential.create({
      data: {
        userId: testUserId,
        gmailAddress: "student.test@vitapstudent.ac.in",
        encryptedAccessToken: "mock_acc_token",
        encryptedRefreshToken: "mock_ref_token",
        tokenIv: "mock_iv",
        tokenTag: "mock_tag",
        scope: "https://www.googleapis.com/auth/gmail.readonly",
        expiresAt: new Date(Date.now() + 3600 * 1000),
        syncStatus: SyncStatus.IDLE,
        syncNextPageToken: "cursor_page_alpha",
      },
    });
  });

  it("proves getOAuth2Client correctly loads configured client ID and never leaves _clientId undefined", () => {
    const client = getOAuth2Client();
    expect(client).toBeDefined();
    // In google-auth-library, _clientId is populated from the configured environment
    expect(client._clientId).toBeDefined();
    expect(typeof client._clientId).toBe("string");
    expect((client._clientId as string).length).toBeGreaterThan(0);
  });

  it("prevents silent cursor advancement when an individual message detail fetch encounters a transient failure", async () => {
    const mockGmail = {
      users: {
        getProfile: vi.fn().mockResolvedValue({
          data: {
            emailAddress: "student.test@vitapstudent.ac.in",
            historyId: "hist_100",
            messagesTotal: 100,
          },
        }),
        messages: {
          list: vi.fn().mockResolvedValue({
            data: {
              messages: [{ id: "msg_success_1" }, { id: "msg_transient_fail" }],
              nextPageToken: "cursor_page_beta",
            },
          }),
          get: vi.fn().mockImplementation(async ({ id }) => {
            if (id === "msg_transient_fail") {
              const err: any = new Error("invalid_request: Transient OAuth token refresh failed");
              err.status = 400;
              throw err;
            }
            return {
              data: {
                id,
                threadId: "th_1",
                snippet: "Valid snippet",
                payload: {
                  headers: [
                    { name: "Subject", value: "Test Subject" },
                    { name: "From", value: "Dean <dean@vitap.ac.in>" },
                  ],
                },
              },
            };
          }),
        },
      },
    };

    (getAuthenticatedGmailClient as any).mockResolvedValue({
      gmail: mockGmail,
      credential: { gmailAddress: "student.test@vitapstudent.ac.in" },
      oauth2Client: {},
    });

    const syncResult = await syncUserGmail(testUserId, { fullSyncBatch: true });

    // Must report failure
    expect(syncResult.success).toBe(false);
    expect(syncResult.error).toContain("TRANSIENT_DETAIL_FAILURE");
    expect(syncResult.failedMessageIds).toEqual(["msg_transient_fail"]);

    // Checkpoint verification: syncNextPageToken MUST NOT be advanced to cursor_page_beta!
    const credInDb = await prisma.gmailCredential.findUnique({ where: { userId: testUserId } });
    expect(credInDb?.syncNextPageToken).toBe("cursor_page_alpha");
  });

  it("allows safe progress when message failure is a permanent 404 (Not Found)", async () => {
    const mockGmail = {
      users: {
        getProfile: vi.fn().mockResolvedValue({
          data: {
            emailAddress: "student.test@vitapstudent.ac.in",
            historyId: "hist_100",
            messagesTotal: 100,
          },
        }),
        messages: {
          list: vi.fn().mockResolvedValue({
            data: {
              messages: [{ id: "msg_success_1" }, { id: "msg_deleted_on_gmail" }],
              nextPageToken: "cursor_page_beta",
            },
          }),
          get: vi.fn().mockImplementation(async ({ id }) => {
            if (id === "msg_deleted_on_gmail") {
              const err: any = new Error("Not Found");
              err.status = 404;
              throw err;
            }
            return {
              data: {
                id,
                threadId: "th_1",
                snippet: "Valid snippet",
                payload: {
                  headers: [
                    { name: "Subject", value: "Test Subject" },
                    { name: "From", value: "Dean <dean@vitap.ac.in>" },
                  ],
                },
              },
            };
          }),
        },
      },
    };

    (getAuthenticatedGmailClient as any).mockResolvedValue({
      gmail: mockGmail,
      credential: { gmailAddress: "student.test@vitapstudent.ac.in" },
      oauth2Client: {},
    });

    const syncResult = await syncUserGmail(testUserId, { fullSyncBatch: true });

    // Permanent 404 does not stall the sync cursor
    expect(syncResult.success).toBe(true);
    expect(syncResult.nextPageToken).toBe("cursor_page_beta");

    const credInDb = await prisma.gmailCredential.findUnique({ where: { userId: testUserId } });
    expect(credInDb?.syncNextPageToken).toBe("cursor_page_beta");
  });

  it("executes idempotent backfill without modifying pagination cursors or creating duplicate rows", async () => {
    const mockGmail = {
      users: {
        messages: {
          get: vi.fn().mockImplementation(async ({ id }) => ({
            data: {
              id,
              threadId: `th_${id}`,
              snippet: `Snippet for ${id}`,
              payload: {
                headers: [
                  { name: "Subject", value: `Subject ${id}` },
                  { name: "From", value: "Placement CDC <cdc@vitap.ac.in>" },
                  { name: "Date", value: new Date().toUTCString() },
                ],
              },
            },
          })),
        },
      },
    };

    (getAuthenticatedGmailClient as any).mockResolvedValue({
      gmail: mockGmail,
      credential: { gmailAddress: "student.test@vitapstudent.ac.in" },
      oauth2Client: {},
    });

    const targetIds = ["msg_backfill_1", "msg_backfill_2"];

    // First backfill pass
    const run1 = await backfillMessagesByIds(testUserId, targetIds);
    expect(run1.totalRequested).toBe(2);
    expect(run1.insertedCount).toBe(2);
    expect(run1.alreadyStoredCount).toBe(0);
    expect(run1.failedCount).toBe(0);

    const countAfterRun1 = await prisma.email.count({ where: { userId: testUserId } });
    expect(countAfterRun1).toBe(2);

    // Pagination cursor MUST remain completely untouched
    const cred1 = await prisma.gmailCredential.findUnique({ where: { userId: testUserId } });
    expect(cred1?.syncNextPageToken).toBe("cursor_page_alpha");

    // Second backfill pass (idempotency verification)
    const run2 = await backfillMessagesByIds(testUserId, targetIds);
    expect(run2.totalRequested).toBe(2);
    expect(run2.alreadyStoredCount).toBe(2);
    expect(run2.insertedCount).toBe(0);

    const countAfterRun2 = await prisma.email.count({ where: { userId: testUserId } });
    expect(countAfterRun2).toBe(2); // No duplicates created
  });
});
