import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { encryptToken, decryptToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { syncUserGmail } from "@/lib/gmail-sync";
import { SyncStatus } from "@prisma/client";

// Mock googleapis
vi.mock("googleapis", () => {
  const mockGetProfile = vi.fn();
  const mockListMessages = vi.fn();
  const mockGetMessage = vi.fn();
  const mockListHistory = vi.fn();
  const mockRevokeToken = vi.fn();
  const mockRefreshAccessToken = vi.fn();

  return {
    google: {
      auth: {
        OAuth2: vi.fn().mockImplementation(() => ({
          setCredentials: vi.fn(),
          generateAuthUrl: vi.fn().mockReturnValue("https://accounts.google.com/o/oauth2/v2/auth?mock=true"),
          getToken: vi.fn().mockResolvedValue({
            tokens: {
              access_token: "mock_new_access_token",
              refresh_token: "mock_new_refresh_token",
              expiry_date: Date.now() + 3600 * 1000,
            },
          }),
          revokeToken: mockRevokeToken,
          refreshAccessToken: mockRefreshAccessToken,
        })),
      },
      gmail: vi.fn().mockReturnValue({
        users: {
          getProfile: mockGetProfile,
          messages: {
            list: mockListMessages,
            get: mockGetMessage,
          },
          history: {
            list: mockListHistory,
          },
        },
      }),
      oauth2: vi.fn().mockReturnValue({
        userinfo: {
          get: vi.fn().mockResolvedValue({
            data: { email: "test.student@vitapstudent.ac.in" },
          }),
        },
      }),
    },
  };
});

describe("Gmail Authorization & Credential Isolation", () => {
  const testUserId1 = "usr_phase4_test_01";
  const testUserId2 = "usr_phase4_test_02";
  const studentEmail1 = "test.student1@vitapstudent.ac.in";
  const studentEmail2 = "test.student2@vitapstudent.ac.in";

  beforeEach(async () => {
    await prisma.email.deleteMany({
      where: { userId: { in: [testUserId1, testUserId2] } },
    });
    await prisma.gmailCredential.deleteMany({
      where: { userId: { in: [testUserId1, testUserId2] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testUserId1, testUserId2] } },
    });

    // Create 2 test users
    await prisma.user.create({
      data: {
        id: testUserId1,
        email: studentEmail1,
        name: "Student One",
        googleSubjectId: "google_sub_p4_01",
      },
    });

    await prisma.user.create({
      data: {
        id: testUserId2,
        email: studentEmail2,
        name: "Student Two",
        googleSubjectId: "google_sub_p4_02",
      },
    });
  });

  afterAll(async () => {
    await prisma.email.deleteMany({
      where: { userId: { in: [testUserId1, testUserId2] } },
    });
    await prisma.gmailCredential.deleteMany({
      where: { userId: { in: [testUserId1, testUserId2] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testUserId1, testUserId2] } },
    });
    await prisma.$disconnect();
  });

  it("stores refresh and access tokens encrypted via AES-256-GCM without plaintext leaks", async () => {
    const rawRefreshToken = "ya29.mock_super_secret_refresh_token_12345";
    const rawAccessToken = "ya29.mock_access_token_67890";

    const encRefresh = encryptToken(rawRefreshToken);
    const encAccess = encryptToken(rawAccessToken);

    const credential = await prisma.gmailCredential.create({
      data: {
        userId: testUserId1,
        gmailAddress: studentEmail1,
        encryptedRefreshToken: encRefresh.ciphertext,
        encryptedAccessToken: encAccess.ciphertext,
        tokenIv: encRefresh.iv,
        tokenTag: encRefresh.tag,
        accessTokenIv: encAccess.iv,
        accessTokenTag: encAccess.tag,
        scope: "https://www.googleapis.com/auth/gmail.readonly",
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });

    expect(credential.encryptedRefreshToken).not.toContain("ya29.");
    expect(credential.encryptedAccessToken).not.toContain("ya29.");

    // Decrypt and verify refresh token
    const decryptedRefresh = decryptToken({
      ciphertext: credential.encryptedRefreshToken,
      iv: credential.tokenIv,
      tag: credential.tokenTag,
    });
    expect(decryptedRefresh).toBe(rawRefreshToken);

    // Decrypt and verify access token with its dedicated IV/Tag
    const decryptedAccess = decryptToken({
      ciphertext: credential.encryptedAccessToken,
      iv: credential.accessTokenIv!,
      tag: credential.accessTokenTag!,
    });
    expect(decryptedAccess).toBe(rawAccessToken);
  });

  it("enforces credential isolation: User 2 cannot access or sync User 1's Gmail", async () => {
    const enc = encryptToken("secret_token_user_1");
    await prisma.gmailCredential.create({
      data: {
        userId: testUserId1,
        gmailAddress: studentEmail1,
        encryptedRefreshToken: enc.ciphertext,
        encryptedAccessToken: enc.ciphertext,
        tokenIv: enc.iv,
        tokenTag: enc.tag,
        scope: "https://www.googleapis.com/auth/gmail.readonly",
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });

    // Query User 2 credentials
    const user2Cred = await prisma.gmailCredential.findUnique({
      where: { userId: testUserId2 },
    });
    expect(user2Cred).toBeNull();

    // Calling sync for User 2 should fail with no connection configured
    const syncRes = await syncUserGmail(testUserId2);
    expect(syncRes.success).toBe(false);
    expect(syncRes.error).toContain("No Gmail connection configured");
  });

  it("prevents concurrent sync operations using the database lock", async () => {
    const enc = encryptToken("secret_token_user_1");
    await prisma.gmailCredential.create({
      data: {
        userId: testUserId1,
        gmailAddress: studentEmail1,
        encryptedRefreshToken: enc.ciphertext,
        encryptedAccessToken: enc.ciphertext,
        tokenIv: enc.iv,
        tokenTag: enc.tag,
        scope: "https://www.googleapis.com/auth/gmail.readonly",
        expiresAt: new Date(Date.now() + 3600 * 1000),
        syncStatus: SyncStatus.SYNCING, // Mailbox is actively locked
        updatedAt: new Date(), // Fresh
      },
    });

    const res = await syncUserGmail(testUserId1);
    expect(res.success).toBe(false);
    expect(res.error).toContain("already in progress");
  });
});
