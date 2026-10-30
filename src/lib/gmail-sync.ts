import { prisma } from "@/lib/prisma";
import { getAuthenticatedGmailClient } from "@/lib/gmail-client";
import { SyncStatus, EmailCategory } from "@prisma/client";
import { processEmailIntelligence } from "@/lib/intelligence";

export interface SyncProgressResult {
  success: boolean;
  messagesProcessed: number;
  newHistoryId?: string | null;
  error?: string;
  isInitialSync?: boolean;
  hasMore?: boolean;
  nextPageToken?: string | null;
  totalSyncedCount?: number;
  totalEstimatedCount?: number | null;
  failedMessageIds?: string[];
}

/**
 * Extracts header value case-insensitively from a Gmail message payload.
 */
function getHeader(headers: Array<{ name?: string | null; value?: string | null }> | undefined, name: string): string {
  if (!headers) return "";
  const found = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return found?.value || "";
}

/**
 * Parses clean email address from a RFC 2822 sender string (e.g. "Dean <dean@vitap.ac.in>" -> "dean@vitap.ac.in").
 */
function extractEmailAddress(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  if (match && match[1]) {
    return match[1].trim().toLowerCase();
  }
  return fromHeader.trim().toLowerCase();
}

/**
 * Decodes Gmail base64url encoded string into utf-8.
 */
function decodeBase64Url(data?: string | null): string {
  if (!data) return "";
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

/**
 * Extracts plain-text snippet/body from Gmail payload parts while minimizing stored data.
 */
function extractBodyContent(payload: any): { plain: string; html?: string } {
  if (!payload) return { plain: "" };

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return { plain: decodeBase64Url(payload.body.data) };
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    let plainText = "";
    let htmlText = "";

    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        plainText += decodeBase64Url(part.body.data) + "\n";
      } else if (part.mimeType === "text/html" && part.body?.data) {
        htmlText += decodeBase64Url(part.body.data) + "\n";
      } else if (part.parts) {
        const nested = extractBodyContent(part);
        if (nested.plain) plainText += nested.plain + "\n";
        if (nested.html) htmlText += nested.html + "\n";
      }
    }

    return {
      plain: plainText.trim(),
      html: htmlText ? htmlText.trim() : undefined,
    };
  }

  return { plain: "" };
}

/**
 * Synchronizes Gmail messages for a user with lock coordination, rate limits, and delta tracking.
 * Strictly read-only: never modifies labels, archives, trashes, or composes emails.
 * Supports:
 * - standard incremental sync (via Gmail History API)
 * - paginated batch historical import (via fullSyncBatch option)
 */
export async function syncUserGmail(
  userId: string,
  options: { fullSyncBatch?: boolean; maxBatchSize?: number } = {}
): Promise<SyncProgressResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { gmailCredential: true },
  });

  if (!user || !user.gmailCredential) {
    return { success: false, messagesProcessed: 0, error: "No Gmail connection configured." };
  }

  const credential = user.gmailCredential;

  // 1. Atomic Database-Backed Concurrency Lock
  // Attempt to acquire lock atomically: only if syncStatus != SYNCING or lock is stale (> 5 minutes)
  const staleThresholdDate = new Date(Date.now() - 5 * 60 * 1000);
  const lockAcquired = await prisma.gmailCredential.updateMany({
    where: {
      userId,
      OR: [
        { syncStatus: { not: SyncStatus.SYNCING } },
        { updatedAt: { lt: staleThresholdDate } },
      ],
    },
    data: {
      syncStatus: SyncStatus.SYNCING,
      syncError: null,
      isSyncingAll: options.fullSyncBatch ? true : credential.isSyncingAll,
    },
  });

  if (lockAcquired.count === 0) {
    return {
      success: false,
      messagesProcessed: 0,
      error: "A synchronization is already in progress for this mailbox.",
    };
  }

  // 2. Cooldown Guard: Minimum 3 seconds cooldown between manual batch calls (relaxed for fullSyncBatch)
  if (!options.fullSyncBatch && credential.lastSyncAt && Date.now() - credential.lastSyncAt.getTime() < 3 * 1000) {
    // Release lock
    await prisma.gmailCredential.update({
      where: { userId },
      data: { syncStatus: SyncStatus.IDLE },
    });
    return {
      success: false,
      messagesProcessed: 0,
      error: "Sync cooldown active. Please wait a few seconds between sync requests.",
    };
  }

  try {
    const { gmail } = await getAuthenticatedGmailClient(userId);

    // Verify profile & email matching with retry helper
    const fetchWithRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
      let attempt = 0;
      while (true) {
        try {
          return await fn();
        } catch (apiErr: any) {
          attempt++;
          const status = apiErr.status || apiErr.code;
          const retryAfterHeader = apiErr.response?.headers?.["retry-after"];
          const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 0;

          // Check if rate limited (429 or 403 quota) or transient 5xx
          const isRateLimit = status === 429 || (status === 403 && apiErr.message?.toLowerCase().includes("quota"));
          const isTransient = status >= 500 && status < 600;

          if ((isRateLimit || isTransient) && attempt <= maxRetries) {
            const jitterMs = Math.floor(Math.random() * 500);
            const delayMs = retryAfterSec > 0
              ? retryAfterSec * 1000 + jitterMs
              : Math.pow(2, attempt) * 1000 + jitterMs;
            console.warn(`[Gmail API] Rate limit/transient error (${status}). Retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }
          throw apiErr;
        }
      }
    };

    const profileRes = await fetchWithRetry(() => gmail.users.getProfile({ userId: "me" }));
    const remoteEmail = profileRes.data.emailAddress?.toLowerCase().trim();

    if (!remoteEmail || remoteEmail !== credential.gmailAddress.toLowerCase().trim()) {
      await prisma.gmailCredential.update({
        where: { userId },
        data: {
          syncStatus: SyncStatus.FAILED,
          syncError: `Account mismatch: Authorized mailbox (${remoteEmail}) does not match student account (${credential.gmailAddress}).`,
          isSyncingAll: false,
        },
      });
      return {
        success: false,
        messagesProcessed: 0,
        error: "Account mismatch: Connected Gmail email does not match registered student email.",
      };
    }

    const currentHistoryId = profileRes.data.historyId;
    const estimatedTotalMessages = profileRes.data.messagesTotal || null;
    let messagesProcessed = 0;
    const isInitialSync = !credential.lastHistoryId;

    // Check if user requested a full historical sync batch OR this is initial sync
    if (options.fullSyncBatch || isInitialSync) {
      const batchLimit = Math.min(options.maxBatchSize || 25, 50); // Bounded batch to avoid quota peaks
      const pageToken = options.fullSyncBatch ? (credential.syncNextPageToken || undefined) : undefined;

      let listRes: any;
      try {
        listRes = await fetchWithRetry(() =>
          gmail.users.messages.list({
            userId: "me",
            maxResults: batchLimit,
            pageToken,
          })
        );
      } catch (listErr: any) {
        // If cursor expired/invalid, reset pageToken to allow fresh restart
        if (listErr.code === 400 || listErr.message?.includes("Invalid pageToken")) {
          console.warn("[Gmail API] Invalid/expired pageToken. Resetting cursor.");
          await prisma.gmailCredential.update({
            where: { userId },
            data: {
              syncNextPageToken: null,
              syncStatus: SyncStatus.IDLE,
              syncError: "Previous sync cursor expired. Resuming from beginning.",
            },
          });
          return {
            success: false,
            messagesProcessed: 0,
            error: "EXPIRED_CURSOR: Reset cursor successfully. Please sync again.",
          };
        }
        throw listErr;
      }

      const messageSummaries = listRes.data.messages || [];
      const nextPageToken = listRes.data.nextPageToken || null;
      const transientFailures: Array<{ id: string; error: string }> = [];
      const permanentFailures: Array<{ id: string; error: string }> = [];

      for (const item of messageSummaries) {
        if (!item.id) continue;

        try {
          const msg = await fetchWithRetry(() =>
            gmail.users.messages.get({
              userId: "me",
              id: item.id!,
              format: "full",
            })
          );

          const msgData = msg.data;
          const headers = msgData.payload?.headers;
          const subject = getHeader(headers, "Subject") || "(No Subject)";
          const from = getHeader(headers, "From") || "Unknown Sender";
          const to = getHeader(headers, "To") || credential.gmailAddress;
          const dateStr = getHeader(headers, "Date");
          const receivedAt = dateStr ? new Date(dateStr) : new Date(Number(msgData.internalDate || Date.now()));
          const snippet = msgData.snippet || "";
          const bodies = extractBodyContent(msgData.payload);

          const labelIds = msgData.labelIds || [];
          const isRead = !labelIds.includes("UNREAD");
          const isStarred = labelIds.includes("STARRED");
          const isImportant = labelIds.includes("IMPORTANT");

          // Save email idempotently scoped to this user
          const savedEmail = await prisma.email.upsert({
            where: {
              userId_gmailMessageId: {
                userId,
                gmailMessageId: item.id,
              },
            },
            update: {
              subject,
              snippet,
              isRead,
              isStarred,
              isImportant,
            },
            create: {
              userId,
              gmailMessageId: item.id,
              gmailThreadId: msgData.threadId || item.id,
              sender: from,
              senderAddress: extractEmailAddress(from),
              recipient: to,
              subject,
              snippet,
              bodyPlain: bodies.plain.slice(0, 10000), // Bounded text retention
              receivedAt,
              isRead,
              isStarred,
              isImportant,
              category: EmailCategory.OTHER,
            },
          });

          // Run Phase 6 & Phase 7 deterministic intelligence and opportunity grouping
          try {
            await processEmailIntelligence(savedEmail.id);
          } catch (intelligenceErr) {
            console.warn(`Intelligence processing failed for email ${savedEmail.id}:`, intelligenceErr);
          }

          messagesProcessed++;

          // Gentle 100ms pacing between individual messages to respect Google API query rate limits
          await new Promise((res) => setTimeout(res, 100));
        } catch (msgErr: any) {
          const is404 = msgErr?.status === 404 || msgErr?.code === 404 || msgErr?.message?.includes("Not Found");
          if (is404) {
            console.warn(`[Gmail Sync] Message ${item.id} permanently unavailable on Gmail (404 Not Found). Skipping.`);
            permanentFailures.push({ id: item.id, error: msgErr?.message || "Not Found" });
          } else {
            console.error(`[Gmail Sync] Transient failure fetching detail for message ${item.id}:`, msgErr?.message || msgErr);
            transientFailures.push({ id: item.id, error: msgErr?.message || "Transient fetch failure" });
          }
        }
      }

      // If any transient detail fetch failure occurred, DO NOT advance the page cursor!
      if (transientFailures.length > 0) {
        const errorMsg = `TRANSIENT_DETAIL_FAILURE: ${transientFailures.length} message(s) failed detail fetch (e.g. ${transientFailures[0].id}). Page cursor preserved.`;
        await prisma.gmailCredential.update({
          where: { userId },
          data: {
            syncStatus: SyncStatus.IDLE,
            syncError: errorMsg,
            isSyncingAll: false,
          },
        });
        return {
          success: false,
          messagesProcessed,
          error: errorMsg,
          failedMessageIds: transientFailures.map((f) => f.id),
        };
      }

      // Update total count stored in DB
      const totalInDb = await prisma.email.count({ where: { userId } });

      const hasMore = Boolean(nextPageToken);
      const isSyncingAll = hasMore && Boolean(options.fullSyncBatch);

      await prisma.gmailCredential.update({
        where: { userId },
        data: {
          lastHistoryId: credential.lastHistoryId || currentHistoryId,
          lastSyncAt: new Date(),
          syncStatus: SyncStatus.IDLE,
          syncError: null,
          syncNextPageToken: nextPageToken,
          isSyncingAll,
          totalSyncedCount: totalInDb,
          totalEstimatedCount: estimatedTotalMessages,
        },
      });

      return {
        success: true,
        messagesProcessed,
        newHistoryId: currentHistoryId,
        isInitialSync,
        hasMore,
        nextPageToken,
        totalSyncedCount: totalInDb,
        totalEstimatedCount: estimatedTotalMessages,
      };
    } else {
      // --- INCREMENTAL SYNC: Use Gmail History API starting from lastHistoryId ---
      try {
        let historyPageToken: string | undefined = undefined;
        const processedMessageIds = new Set<string>();

        do {
          const historyRes: any = await fetchWithRetry(() =>
            gmail.users.history.list({
              userId: "me",
              startHistoryId: credential.lastHistoryId!,
              historyTypes: ["messageAdded", "labelAdded", "labelRemoved"],
              pageToken: historyPageToken,
              maxResults: 100,
            })
          );

          const historyRecords = historyRes.data.history || [];

          for (const record of historyRecords) {
            // Process newly added messages
            if (record.messagesAdded) {
              for (const item of record.messagesAdded) {
                if (!item.message?.id || processedMessageIds.has(item.message.id)) continue;
                processedMessageIds.add(item.message.id);

                try {
                  const msg = await fetchWithRetry(() =>
                    gmail.users.messages.get({
                      userId: "me",
                      id: item.message.id,
                      format: "full",
                    })
                  );
                  const msgData = msg.data;
                  const headers = msgData.payload?.headers;
                  const subject = getHeader(headers, "Subject") || "(No Subject)";
                  const from = getHeader(headers, "From") || "Unknown Sender";
                  const to = getHeader(headers, "To") || credential.gmailAddress;
                  const dateStr = getHeader(headers, "Date");
                  const receivedAt = dateStr ? new Date(dateStr) : new Date(Number(msgData.internalDate || Date.now()));
                  const snippet = msgData.snippet || "";
                  const bodies = extractBodyContent(msgData.payload);
                  const labelIds = msgData.labelIds || [];

                  const savedEmail = await prisma.email.upsert({
                    where: {
                      userId_gmailMessageId: {
                        userId,
                        gmailMessageId: item.message.id,
                      },
                    },
                    update: {
                      subject,
                      snippet,
                      isRead: !labelIds.includes("UNREAD"),
                      isStarred: labelIds.includes("STARRED"),
                      isImportant: labelIds.includes("IMPORTANT"),
                    },
                    create: {
                      userId,
                      gmailMessageId: item.message.id,
                      gmailThreadId: msgData.threadId || item.message.id,
                      sender: from,
                      senderAddress: extractEmailAddress(from),
                      recipient: to,
                      subject,
                      snippet,
                      bodyPlain: bodies.plain.slice(0, 10000),
                      receivedAt,
                      isRead: !labelIds.includes("UNREAD"),
                      isStarred: labelIds.includes("STARRED"),
                      isImportant: labelIds.includes("IMPORTANT"),
                      category: EmailCategory.OTHER,
                    },
                  });

                  try {
                    await processEmailIntelligence(savedEmail.id);
                  } catch (intelligenceErr) {
                    console.warn(`Intelligence processing failed for incremental email ${savedEmail.id}:`, intelligenceErr);
                  }

                  messagesProcessed++;
                } catch (msgErr: any) {
                  console.warn(`[Gmail Sync] Failed fetching incremental message ${item.message.id}:`, msgErr?.message || msgErr);
                }
              }
            }
          }

          historyPageToken = historyRes.data.nextPageToken || undefined;
        } while (historyPageToken);

        // Safety fallback: Also check the most recent messages from Gmail to bridge any gap
        // (e.g. if lastHistoryId jumped forward, or history records were already compacted by Gmail)
        const recentListRes: any = await fetchWithRetry(() =>
          gmail.users.messages.list({
            userId: "me",
            maxResults: 50,
          })
        );
        const recentMessages = recentListRes.data.messages || [];
        for (const item of recentMessages) {
          if (!item.id || processedMessageIds.has(item.id)) continue;

          // Check if already in DB
          const exists = await prisma.email.findUnique({
            where: {
              userId_gmailMessageId: {
                userId,
                gmailMessageId: item.id,
              },
            },
            select: { id: true },
          });

          if (!exists) {
            processedMessageIds.add(item.id);
            try {
              const msg = await fetchWithRetry(() =>
                gmail.users.messages.get({
                  userId: "me",
                  id: item.id,
                  format: "full",
                })
              );
              const msgData = msg.data;
              const headers = msgData.payload?.headers;
              const subject = getHeader(headers, "Subject") || "(No Subject)";
              const from = getHeader(headers, "From") || "Unknown Sender";
              const to = getHeader(headers, "To") || credential.gmailAddress;
              const dateStr = getHeader(headers, "Date");
              const receivedAt = dateStr ? new Date(dateStr) : new Date(Number(msgData.internalDate || Date.now()));
              const snippet = msgData.snippet || "";
              const bodies = extractBodyContent(msgData.payload);
              const labelIds = msgData.labelIds || [];

              const savedEmail = await prisma.email.upsert({
                where: {
                  userId_gmailMessageId: {
                    userId,
                    gmailMessageId: item.id,
                  },
                },
                update: {
                  subject,
                  snippet,
                  isRead: !labelIds.includes("UNREAD"),
                  isStarred: labelIds.includes("STARRED"),
                  isImportant: labelIds.includes("IMPORTANT"),
                },
                create: {
                  userId,
                  gmailMessageId: item.id,
                  gmailThreadId: msgData.threadId || item.id,
                  sender: from,
                  senderAddress: extractEmailAddress(from),
                  recipient: to,
                  subject,
                  snippet,
                  bodyPlain: bodies.plain.slice(0, 10000),
                  receivedAt,
                  isRead: !labelIds.includes("UNREAD"),
                  isStarred: labelIds.includes("STARRED"),
                  isImportant: labelIds.includes("IMPORTANT"),
                  category: EmailCategory.OTHER,
                },
              });

              try {
                await processEmailIntelligence(savedEmail.id);
              } catch (intelligenceErr) {
                console.warn(`Intelligence processing failed for recent email ${savedEmail.id}:`, intelligenceErr);
              }

              messagesProcessed++;
            } catch (msgErr: any) {
              console.warn(`[Gmail Sync] Failed fetching recent message ${item.id}:`, msgErr?.message || msgErr);
            }
          }
        }
      } catch (historyErr: any) {
        // If historyId is too old (HTTP 404), Gmail requires resetting historyId and performing a bounded sync
        if (historyErr.code === 404 || historyErr.message?.includes("historyId")) {
          console.warn("History cursor expired. Initiating safe resync recovery.");
          await prisma.gmailCredential.update({
            where: { userId },
            data: {
              lastHistoryId: null,
              syncStatus: SyncStatus.IDLE,
              syncError: "Gmail history expired. Full delta resync scheduled.",
              isSyncingAll: false,
            },
          });
          return {
            success: false,
            messagesProcessed: 0,
            error: "GMAIL_HISTORY_EXPIRED: Full resync scheduled.",
          };
        }
        throw historyErr;
      }

      const totalInDb = await prisma.email.count({ where: { userId } });

      // Persist new history watermark and mark IDLE
      await prisma.gmailCredential.update({
        where: { userId },
        data: {
          lastHistoryId: currentHistoryId || credential.lastHistoryId,
          lastSyncAt: new Date(),
          syncStatus: SyncStatus.IDLE,
          syncError: null,
          totalSyncedCount: totalInDb,
          totalEstimatedCount: estimatedTotalMessages,
        },
      });

      return {
        success: true,
        messagesProcessed,
        newHistoryId: currentHistoryId,
        isInitialSync: false,
        totalSyncedCount: totalInDb,
        totalEstimatedCount: estimatedTotalMessages,
      };
    }
  } catch (err: any) {
    console.error("Gmail synchronization failed:", err);
    await prisma.gmailCredential.update({
      where: { userId },
      data: {
        syncStatus: SyncStatus.FAILED,
        syncError: err.message || "Synchronization failed",
        isSyncingAll: false,
      },
    });

    return {
      success: false,
      messagesProcessed: 0,
      error: err.message || "Synchronization failed",
    };
  }
}

export interface BackfillMessageOutcome {
  id: string;
  status: "ALREADY_STORED" | "INSERTED" | "UPDATED" | "FAILED";
  subject?: string;
  error?: string;
}

export interface BackfillResult {
  totalRequested: number;
  alreadyStoredCount: number;
  insertedCount: number;
  updatedCount: number;
  failedCount: number;
  outcomes: BackfillMessageOutcome[];
}

/**
 * Targeted message backfill by specific Gmail message IDs.
 * Strictly does NOT modify or advance pagination cursors, completed SyncJobs, or OAuth scopes.
 * Reuses existing parsing, sanitization, classification, intelligence, and idempotent persistence logic.
 */
export async function backfillMessagesByIds(
  userId: string,
  messageIds: string[]
): Promise<BackfillResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { gmailCredential: true },
  });

  if (!user || !user.gmailCredential) {
    throw new Error("No Gmail connection configured for this user.");
  }

  const credential = user.gmailCredential;
  const { gmail } = await getAuthenticatedGmailClient(userId);

  // Check existing records in DB
  const existingEmails = await prisma.email.findMany({
    where: {
      userId,
      gmailMessageId: { in: messageIds },
    },
    select: { id: true, gmailMessageId: true, subject: true },
  });
  const existingMap = new Map(existingEmails.map((e) => [e.gmailMessageId, e]));

  const outcomes: BackfillMessageOutcome[] = [];
  let alreadyStoredCount = 0;
  let insertedCount = 0;
  let updatedCount = 0;
  let failedCount = 0;

  for (const messageId of messageIds) {
    if (existingMap.has(messageId)) {
      alreadyStoredCount++;
      outcomes.push({
        id: messageId,
        status: "ALREADY_STORED",
        subject: existingMap.get(messageId)?.subject,
      });
      continue;
    }

    try {
      // 1. Fetch message detail with bounded retries and exponential backoff
      let msg: any;
      let lastErr: any;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          msg = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "full",
          });
          break;
        } catch (apiErr: any) {
          lastErr = apiErr;
          const status = apiErr?.status || apiErr?.code;
          const isTransient = status === 429 || status === 403 || (status >= 500 && status < 600);
          if (isTransient && attempt < 3) {
            const delayMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
            console.warn(`[Backfill] Transient error (${status}) fetching ${messageId}. Retrying in ${delayMs}ms...`);
            await new Promise((res) => setTimeout(res, delayMs));
            continue;
          }
          throw apiErr;
        }
      }

      if (!msg) {
        throw lastErr || new Error("Failed to retrieve message payload");
      }

      const msgData = msg.data;
      const headers = msgData.payload?.headers;
      const subject = getHeader(headers, "Subject") || "(No Subject)";
      const from = getHeader(headers, "From") || "Unknown Sender";
      const to = getHeader(headers, "To") || credential.gmailAddress;
      const dateStr = getHeader(headers, "Date");
      const receivedAt = dateStr ? new Date(dateStr) : new Date(Number(msgData.internalDate || Date.now()));
      const snippet = msgData.snippet || "";
      const bodies = extractBodyContent(msgData.payload);

      const labelIds = msgData.labelIds || [];
      const isRead = !labelIds.includes("UNREAD");
      const isStarred = labelIds.includes("STARRED");
      const isImportant = labelIds.includes("IMPORTANT");

      // 2. Idempotent upsert scoped strictly to this user and message ID
      const savedEmail = await prisma.email.upsert({
        where: {
          userId_gmailMessageId: {
            userId,
            gmailMessageId: messageId,
          },
        },
        update: {
          subject,
          snippet,
          isRead,
          isStarred,
          isImportant,
        },
        create: {
          userId,
          gmailMessageId: messageId,
          gmailThreadId: msgData.threadId || messageId,
          sender: from,
          senderAddress: extractEmailAddress(from),
          recipient: to,
          subject,
          snippet,
          bodyPlain: bodies.plain.slice(0, 10000), // Bounded text retention
          receivedAt,
          isRead,
          isStarred,
          isImportant,
          category: EmailCategory.OTHER,
        },
      });

      // 3. Deterministic intelligence extraction
      try {
        await processEmailIntelligence(savedEmail.id);
      } catch (intelligenceErr) {
        console.warn(`Intelligence processing failed for backfilled email ${savedEmail.id}:`, intelligenceErr);
      }

      insertedCount++;
      outcomes.push({
        id: messageId,
        status: "INSERTED",
        subject,
      });

      // API pacing
      await new Promise((res) => setTimeout(res, 100));
    } catch (err: any) {
      failedCount++;
      outcomes.push({
        id: messageId,
        status: "FAILED",
        error: err?.message?.slice(0, 300) || "Unknown error",
      });
      console.error(`[Backfill] Failed to fetch/persist message ${messageId}:`, err?.message || err);
    }
  }

  // Update total count stored in DB without altering pagination cursors or syncNextPageToken
  const totalInDb = await prisma.email.count({ where: { userId } });
  await prisma.gmailCredential.update({
    where: { userId },
    data: {
      totalSyncedCount: totalInDb,
      lastSyncAt: new Date(),
    },
  });

  return {
    totalRequested: messageIds.length,
    alreadyStoredCount,
    insertedCount,
    updatedCount,
    failedCount,
    outcomes,
  };
}
