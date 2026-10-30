"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  parsePlainTextEmail, 
  sanitizeHtml, 
  ContentBlock, 
  InlineToken 
} from "@/lib/email-sanitizer";
import { 
  ExternalLink, 
  Code2, 
  FileText, 
  Sparkles, 
  AlertCircle,
  Eye,
  ShieldAlert,
  Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailBodyRendererProps {
  bodyPlain?: string | null;
  bodyHtml?: string | null;
  snippet?: string | null;
}

export type DisplayMode = "original" | "clean" | "plain";

export function EmailBodyRenderer({
  bodyPlain,
  bodyHtml,
  snippet,
}: EmailBodyRendererProps) {
  const hasHtml = Boolean(bodyHtml && bodyHtml.trim().length > 0);
  
  // 1. Initial mode selection & localStorage persistence
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sigmamail_display_mode") as DisplayMode;
      if (saved && ["original", "clean", "plain"].includes(saved)) {
        if (!hasHtml && saved !== "plain") return "clean";
        return saved;
      }
    }
    return hasHtml ? "original" : "clean";
  });

  const [blockRemoteImages, setBlockRemoteImages] = useState<boolean>(true);
  const [hasBlockedImages, setHasBlockedImages] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync preference to localStorage
  const handleModeChange = (mode: DisplayMode) => {
    setDisplayMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("sigmamail_display_mode", mode);
    }
  };

  // Check if HTML contains remote images
  useEffect(() => {
    if (bodyHtml && /<img[^>]+src=["']https?:\/\//i.test(bodyHtml)) {
      setHasBlockedImages(true);
    } else {
      setHasBlockedImages(false);
    }
  }, [bodyHtml]);

  // Sanitize HTML for Original View (Preserves HTML template styles and layout inside iframe)
  const originalSanitizedHtml = React.useMemo(() => {
    if (bodyHtml && bodyHtml.trim().length > 0) {
      return sanitizeHtml(bodyHtml, {
        preserveStyles: true,
        blockRemoteImages: blockRemoteImages,
      });
    }

    // Fallback: If email has plain text, wrap it into a clean, authentic HTML template
    const rawContent = bodyPlain || snippet || "No email content available.";
    const escaped = rawContent
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br/>");

    return `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;"><p>${escaped}</p></div>`;
  }, [bodyHtml, bodyPlain, snippet, blockRemoteImages]);

  // Sanitize HTML for Clean View (Typography-enhanced, scoped styles)
  const cleanSanitizedHtml = React.useMemo(() => {
    if (!bodyHtml) return "";
    return sanitizeHtml(bodyHtml, {
      preserveStyles: false,
      blockRemoteImages: blockRemoteImages,
    });
  }, [bodyHtml, blockRemoteImages]);

  // Prepare structured plain text blocks
  const structuredBlocks = React.useMemo(() => {
    const rawContent = bodyPlain || snippet || "No email content available.";
    return parsePlainTextEmail(rawContent);
  }, [bodyPlain, snippet]);

  // Auto-resize sandboxed iframe
  useEffect(() => {
    if (displayMode === "original" && iframeRef.current) {
      const iframe = iframeRef.current;
      const updateHeight = () => {
        try {
          if (iframe.contentWindow?.document?.body) {
            const height = iframe.contentWindow.document.documentElement.scrollHeight || iframe.contentWindow.document.body.scrollHeight;
            iframe.style.height = `${Math.max(height + 40, 300)}px`;
          }
        } catch {
          // Cross-origin restriction fallback
          iframe.style.height = "700px";
        }
      };

      iframe.addEventListener("load", updateHeight);
      const timer = setTimeout(updateHeight, 500);
      return () => {
        iframe.removeEventListener("load", updateHeight);
        clearTimeout(timer);
      };
    }
  }, [displayMode, originalSanitizedHtml]);

  return (
    <div className="flex flex-col">
      {/* Three Email Display Modes Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3 bg-muted/20 border-b border-border gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground">Reading View</span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">•</span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            {displayMode === "original"
              ? "Full HTML Template"
              : displayMode === "clean"
              ? "Typography Optimized"
              : "Plain Text"}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Display Mode Tabs */}
          <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => handleModeChange("original")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                displayMode === "original"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Original View</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange("clean")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                displayMode === "clean"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Clean View</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange("plain")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                displayMode === "plain"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Plain Text</span>
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Banner: Remote Images Blocked */}
      {hasBlockedImages && blockRemoteImages && displayMode !== "plain" && (
        <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Remote images blocked to protect your privacy and prevent sender tracking.</span>
          </div>
          <button
            type="button"
            onClick={() => setBlockRemoteImages(false)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 font-semibold transition-colors shrink-0"
          >
            <ImageIcon className="h-3 w-3" />
            <span>Load Images</span>
          </button>
        </div>
      )}

      {/* Main Email Reading Body */}
      <div className="p-6 md:p-8 max-w-4xl mx-auto w-full text-foreground">
        {displayMode === "original" ? (
          /* Sandboxed Secure Iframe for Original HTML rendering */
          <div className="w-full rounded-xl overflow-hidden border border-border bg-white shadow-2xs">
            <iframe
              ref={iframeRef}
              title="Original Email View"
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                      body {
                        margin: 0;
                        padding: 24px;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        color: #1e293b;
                        background: #ffffff;
                        line-height: 1.6;
                        word-wrap: break-word;
                      }
                      img {
                        max-width: 100% !important;
                        height: auto !important;
                      }
                      table {
                        max-width: 100% !important;
                        border-collapse: collapse;
                      }
                      a {
                        color: #2563eb;
                        text-decoration: underline;
                      }
                    </style>
                  </head>
                  <body>
                    ${originalSanitizedHtml}
                  </body>
                </html>
              `}
              className="w-full min-h-[500px] border-0"
            />
          </div>
        ) : displayMode === "clean" && hasHtml ? (
          /* Clean View: Scoped Tailwind Typography with Dark Theme Harmony */
          <div
            className={cn(
              "email-html-body prose prose-slate dark:prose-invert max-w-none break-words overflow-x-auto text-sm leading-relaxed",
              "[&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:border [&_table]:border-border",
              "[&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-3 [&_th]:text-left [&_th]:font-semibold [&_th]:text-xs",
              "[&_td]:border [&_td]:border-border [&_td]:p-3 [&_td]:text-xs [&_td]:align-top",
              "[&_tr:nth-child(even)]:bg-muted/20",
              "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:font-medium hover:[&_a]:text-primary/80",
              "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:my-4 [&_img]:shadow-2xs",
              "[&_p]:my-3 [&_p]:leading-relaxed",
              "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-3 [&_li]:my-1",
              "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-3 [&_li]:my-1",
              "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-foreground",
              "[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-foreground",
              "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-foreground",
              "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-3 [&_blockquote]:text-muted-foreground"
            )}
            dangerouslySetInnerHTML={{ __html: cleanSanitizedHtml }}
          />
        ) : (
          /* Plain Text View: Structured, Semantic, Zero Unparsed Markdown */
          <StructuredPlainTextView blocks={structuredBlocks} />
        )}
      </div>
    </div>
  );
}

/**
 * Structured Plain Text Blocks View
 */
function StructuredPlainTextView({ blocks }: { blocks: ContentBlock[] }) {
  if (blocks.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm italic py-4">
        <AlertCircle className="h-4 w-4" />
        <span>No text content to display.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm text-foreground leading-relaxed">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={idx} className="leading-relaxed text-foreground">
                <RenderInlineTokens tokens={block.content} />
              </p>
            );

          case "heading":
            const HeadingTag = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
            const headingClasses =
              block.level === 1
                ? "text-lg font-bold text-foreground mt-6 mb-2 tracking-tight"
                : block.level === 2
                ? "text-base font-bold text-foreground mt-5 mb-2"
                : "text-sm font-semibold text-foreground mt-4 mb-1";
            return (
              <HeadingTag key={idx} className={headingClasses}>
                <RenderInlineTokens tokens={block.content} />
              </HeadingTag>
            );

          case "unordered-list":
            return (
              <ul key={idx} className="list-disc pl-5 space-y-1.5 my-2.5 text-foreground">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="leading-relaxed">
                    <RenderInlineTokens tokens={item} />
                  </li>
                ))}
              </ul>
            );

          case "ordered-list":
            return (
              <ol key={idx} className="list-decimal pl-5 space-y-1.5 my-2.5 text-foreground">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="leading-relaxed">
                    <RenderInlineTokens tokens={item.content} />
                  </li>
                ))}
              </ol>
            );

          case "key-value":
            return (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2.5 py-1.5 px-3 rounded-lg bg-muted/30 border border-border/50 text-xs my-1"
              >
                <span className="font-semibold text-foreground shrink-0 w-36 uppercase tracking-wider text-[11px] text-muted-foreground">
                  {block.key}
                </span>
                <div className="font-medium text-foreground">
                  <RenderInlineTokens tokens={block.value} />
                </div>
              </div>
            );

          case "table":
            return (
              <div key={idx} className="overflow-x-auto my-4 rounded-xl border border-border shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  {block.headers.length > 0 && (
                    <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        {block.headers.map((header, hIdx) => (
                          <th key={hIdx} className="p-3 border-r border-border last:border-r-0">
                            <RenderInlineTokens tokens={header} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody className="divide-y divide-border">
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={cn(
                          "transition-colors",
                          rIdx % 2 === 1 ? "bg-muted/20" : "bg-card"
                        )}
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="p-3 border-r border-border last:border-r-0 align-top leading-relaxed text-foreground"
                          >
                            <RenderInlineTokens tokens={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case "signature":
            return (
              <div
                key={idx}
                className="mt-6 pt-4 border-t border-border/60 text-xs text-muted-foreground space-y-1 italic"
              >
                {block.content.map((sigLine, sIdx) => (
                  <p key={sIdx} className="not-italic leading-snug font-sans">
                    {sigLine}
                  </p>
                ))}
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

/**
 * Helper to render tokens with bold, italic, code, and safe interactive links.
 */
function RenderInlineTokens({ tokens }: { tokens: InlineToken[] }) {
  return (
    <>
      {tokens.map((token, idx) => {
        switch (token.type) {
          case "bold":
            return (
              <strong key={idx} className="font-semibold text-foreground">
                {token.text}
              </strong>
            );

          case "italic":
            return (
              <em key={idx} className="italic text-foreground">
                {token.text}
              </em>
            );

          case "code":
            return (
              <code
                key={idx}
                className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px] text-primary border border-border"
              >
                {token.text}
              </code>
            );

          case "link":
            return (
              <a
                key={idx}
                href={token.url}
                target="_blank"
                rel="noopener noreferrer"
                title={token.url}
                className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary/80 underline underline-offset-2 break-all group transition-colors"
              >
                <span>{token.text}</span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
              </a>
            );

          case "text":
          default:
            return <React.Fragment key={idx}>{token.text}</React.Fragment>;
        }
      })}
    </>
  );
}
