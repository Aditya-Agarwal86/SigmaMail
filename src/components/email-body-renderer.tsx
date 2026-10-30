"use client";

import React, { useState } from "react";
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
  Eye, 
  AlertCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailBodyRendererProps {
  bodyPlain?: string | null;
  bodyHtml?: string | null;
  snippet?: string | null;
}

export function EmailBodyRenderer({
  bodyPlain,
  bodyHtml,
  snippet,
}: EmailBodyRendererProps) {
  const hasHtml = Boolean(bodyHtml && bodyHtml.trim().length > 0);
  const [viewMode, setViewMode] = useState<"formatted" | "plain">(
    hasHtml ? "formatted" : "plain"
  );

  // Prepare sanitized HTML
  const sanitizedHtml = React.useMemo(() => {
    if (!bodyHtml) return "";
    return sanitizeHtml(bodyHtml);
  }, [bodyHtml]);

  // Prepare structured plain text blocks
  const structuredBlocks = React.useMemo(() => {
    const rawContent = bodyPlain || snippet || "No email content available.";
    return parsePlainTextEmail(rawContent);
  }, [bodyPlain, snippet]);

  return (
    <div className="flex flex-col">
      {/* View Switcher if both HTML and Plain are present */}
      {hasHtml && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-muted/20 border-b border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span>Email Format</span>
          </span>
          <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("formatted")}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                viewMode === "formatted"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="h-3 w-3" />
              <span>Rich View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("plain")}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                viewMode === "plain"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Code2 className="h-3 w-3" />
              <span>Clean Text View</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Email Reading Container */}
      <div className="p-6 md:p-8 max-w-4xl mx-auto w-full text-foreground">
        {viewMode === "formatted" && sanitizedHtml ? (
          <div
            className={cn(
              "email-html-body prose prose-slate dark:prose-invert max-w-none break-words overflow-x-auto text-sm leading-relaxed",
              "[&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:border [&_table]:border-border",
              "[&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-xs",
              "[&_td]:border [&_td]:border-border [&_td]:p-2.5 [&_td]:text-xs [&_td]:align-top",
              "[&_tr:nth-child(even)]:bg-muted/20",
              "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:font-medium hover:[&_a]:text-primary/80",
              "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-3",
              "[&_p]:my-2.5 [&_p]:leading-relaxed",
              "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2.5 [&_li]:my-1",
              "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2.5 [&_li]:my-1",
              "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-foreground",
              "[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-foreground",
              "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-foreground",
              "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-3 [&_blockquote]:text-muted-foreground"
            )}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : (
          <StructuredPlainTextView blocks={structuredBlocks} />
        )}
      </div>
    </div>
  );
}

/**
 * Renders parsed blocks with clean semantic styling, typography, and link labels.
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
