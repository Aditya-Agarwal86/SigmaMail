/**
 * Email Content Sanitizer & Structured Text Parser
 * 
 * Securely sanitizes incoming HTML and intelligently structures plain-text university communications:
 * - Sanitizes HTML, stripping scripts, object, iframe, embed, and dangerous event handlers.
 * - Detects plain text with markdown or plain emails, converting paragraphs, headings, bullet lists,
 *   numbered lists, and tables into responsive, clean typography.
 * - Detects URLs, creates safe clickable links with clean anchor display, truncating tracking queries.
 * - Strips raw unparsed markdown symbols (e.g. `**`, `*`, `##`, etc.) when formatting plain text.
 * - Normalizes excessive consecutive blank lines.
 */

export interface ParsedEmailContent {
  isHtml: boolean;
  sanitizedHtml?: string;
  structuredBlocks: ContentBlock[];
}

export type ContentBlock =
  | { type: "paragraph"; content: InlineToken[] }
  | { type: "heading"; level: number; content: InlineToken[] }
  | { type: "unordered-list"; items: InlineToken[][] }
  | { type: "ordered-list"; items: { number: string; content: InlineToken[] }[] }
  | { type: "table"; headers: InlineToken[][]; rows: InlineToken[][][] }
  | { type: "key-value"; key: string; value: InlineToken[] }
  | { type: "signature"; content: string[] };

export interface InlineToken {
  type: "text" | "bold" | "italic" | "link" | "code";
  text: string;
  url?: string;
}

/**
 * Truncates and cleans long, ugly tracking URLs for user-friendly display
 * while preserving the full original destination href.
 */
export function formatDisplayUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const domain = parsed.hostname.replace(/^www\./, "");
    const pathname = parsed.pathname === "/" ? "" : parsed.pathname;

    // Google Forms
    if (domain.includes("forms.gle") || domain.includes("docs.google.com/forms")) {
      return "Google Form Registration";
    }
    // Google Meet / Zoom / Teams
    if (domain.includes("meet.google.com")) return "Google Meet Link";
    if (domain.includes("zoom.us")) return "Zoom Meeting Link";
    if (domain.includes("teams.microsoft.com")) return "MS Teams Link";
    // V-TOP
    if (domain.includes("vtop") || domain.includes("vitap.ac.in")) {
      return `VTOP (${parsed.pathname.slice(0, 20) || "Portal"})`;
    }

    // Default clean URL: domain + truncated path
    const cleanDisplay = domain + (pathname.length > 25 ? pathname.slice(0, 22) + "..." : pathname);
    return cleanDisplay;
  } catch {
    return rawUrl.length > 40 ? rawUrl.slice(0, 37) + "..." : rawUrl;
  }
}

/**
 * Parses inline string into rich tokens (Bold, Italic, Links, Code, Text).
 */
export function parseInlineFormatting(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  if (!text) return tokens;

  // Regex to match URLs (http/https), bold (**word** or *word*), inline code (`code`), or text
  const tokenRegex = /(https?:\/\/[^\s<>"'()]+)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        text: text.slice(lastIndex, match.index),
      });
    }

    if (match[1]) {
      // URL Link
      const rawUrl = match[1];
      tokens.push({
        type: "link",
        text: formatDisplayUrl(rawUrl),
        url: rawUrl,
      });
    } else if (match[2]) {
      // **Bold**
      tokens.push({
        type: "bold",
        text: match[3],
      });
    } else if (match[4]) {
      // *Italic*
      tokens.push({
        type: "italic",
        text: match[5],
      });
    } else if (match[6]) {
      // `Code`
      tokens.push({
        type: "code",
        text: match[7],
      });
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      text: text.slice(lastIndex),
    });
  }

  return tokens.length > 0 ? tokens : [{ type: "text", text }];
}

/**
 * Parses a plain-text email body into structured semantic blocks
 * (paragraphs, lists, headings, key-value fields, tables, signatures).
 */
export function parsePlainTextEmail(rawText: string): ContentBlock[] {
  if (!rawText) return [];

  // 1. Normalize line endings and collapse excessive blank lines (> 2 into 1)
  const normalized = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const lines = normalized.split("\n");
  const blocks: ContentBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // A. Detect Markdown Table
    if (line.includes("|") && lines[i + 1] && /^\s*\|?[-:| ]+\|?\s*$/.test(lines[i + 1])) {
      const headerLine = line;
      const delimiterLine = lines[i + 1];
      const headers = headerLine
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell, idx, arr) => (idx !== 0 && idx !== arr.length - 1) || cell.length > 0)
        .map((cell) => parseInlineFormatting(cell));

      const rows: InlineToken[][][] = [];
      i += 2; // skip header and delimiter

      while (i < lines.length && lines[i].includes("|") && lines[i].trim().length > 0) {
        const rowCells = lines[i]
          .split("|")
          .map((cell) => cell.trim())
          .filter((cell, idx, arr) => (idx !== 0 && idx !== arr.length - 1) || cell.length > 0)
          .map((cell) => parseInlineFormatting(cell));
        rows.push(rowCells);
        i++;
      }

      blocks.push({ type: "table", headers, rows });
      continue;
    }

    // B. Detect Headings (Markdown # or UPPERCASE short titles with colon)
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        content: parseInlineFormatting(headingMatch[2]),
      });
      i++;
      continue;
    }

    // C. Detect Numbered / Ordered List (e.g. "1. ", "1) ")
    const orderedMatch = line.match(/^(\d+)[\.\)]\s+(.*)$/);
    if (orderedMatch) {
      const items: { number: string; content: InlineToken[] }[] = [];
      while (i < lines.length) {
        const itemMatch = lines[i].trim().match(/^(\d+)[\.\)]\s+(.*)$/);
        if (!itemMatch) break;
        items.push({
          number: itemMatch[1],
          content: parseInlineFormatting(itemMatch[2]),
        });
        i++;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    // D. Detect Unordered List (e.g. "- ", "* ", "• ")
    const unorderedMatch = line.match(/^[-*•]\s+(.*)$/);
    if (unorderedMatch) {
      const items: InlineToken[][] = [];
      while (i < lines.length) {
        const itemMatch = lines[i].trim().match(/^[-*•]\s+(.*)$/);
        if (!itemMatch) break;
        items.push(parseInlineFormatting(itemMatch[1]));
        i++;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    // E. Detect Key-Value Information lines (e.g. "Company: Microsoft", "Date: Nov 15, 2026")
    const kvMatch = line.match(/^([A-Za-z0-9\s/_-]{2,30}):\s+(.*)$/);
    if (kvMatch && !line.toLowerCase().startsWith("http") && !line.toLowerCase().startsWith("note:")) {
      blocks.push({
        type: "key-value",
        key: kvMatch[1].trim(),
        value: parseInlineFormatting(kvMatch[2].trim()),
      });
      i++;
      continue;
    }

    // F. Detect Signatures / Sign-offs (e.g. "Regards,", "Warm regards,", "Controller of Examinations", "Thanks & Regards")
    const isSignatureLead = /^(thanks\s+(&|and)\s+regards|regards|warm\s+regards|best\s+regards|sincerely|controller\s+of\s+examinations|career\s+development\s+centre)/i.test(line);
    if (isSignatureLead) {
      const sigLines: string[] = [];
      while (i < lines.length && lines[i].trim()) {
        sigLines.push(lines[i].trim());
        i++;
      }
      blocks.push({ type: "signature", content: sigLines });
      continue;
    }

    // G. Regular Paragraph: gather consecutive non-empty lines until blank line or special block
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().match(/^[-*•]\s+/) &&
      !lines[i].trim().match(/^\d+[\.\)]\s+/) &&
      !lines[i].trim().match(/^(#{1,3})\s+/) &&
      !lines[i].includes("|")
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }

    if (paraLines.length > 0) {
      const mergedText = paraLines.join(" ");
      blocks.push({
        type: "paragraph",
        content: parseInlineFormatting(mergedText),
      });
    }
  }

  return blocks;
}

/**
 * Server-safe, zero-dependency HTML sanitizer.
 * Strips script tags, on* handlers, iframe, object, embed, forms, and style blocks.
 */
export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml) return "";

  let sanitized = rawHtml
    // 1. Remove dangerous executable containers and tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "")
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    // 2. Remove inline event handlers (onload, onclick, onerror, etc.)
    .replace(/\s*on\w+\s*=\s*(["'])[\s\S]*?\1/gi, "")
    .replace(/\s*on\w+\s*=\s*[^\s>]+/gi, "")
    // 3. Remove javascript: and data: in href/src attributes
    .replace(/href\s*=\s*("[^"]*javascript:[^"]*"|'[^']*javascript:[^']*')/gi, 'href="#"')
    .replace(/src\s*=\s*("[^"]*javascript:[^"]*"|'[^']*javascript:[^']*')/gi, 'src=""')
    .replace(/href\s*=\s*("[^"]*data:[^"]*"|'[^']*data:[^']*')/gi, 'href="#"')
    .replace(/javascript\s*:/gi, "blocked:");

  // 4. Force all links to open in a new tab with noopener noreferrer
  sanitized = sanitized.replace(/<a\s+(href="[^"]*")/gi, '<a target="_blank" rel="noopener noreferrer" $1');

  return sanitized.trim();
}
