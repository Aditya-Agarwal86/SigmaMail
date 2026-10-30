import { describe, it, expect } from "vitest";
import { 
  sanitizeHtml, 
  parsePlainTextEmail, 
  formatDisplayUrl, 
  parseInlineFormatting,
  extractEmailAttachments
} from "@/lib/email-sanitizer";

describe("Email Sanitizer & Renderer Tests", () => {
  describe("sanitizeHtml", () => {
    it("strips executable scripts and on* event handlers", () => {
      const maliciousHtml = `
        <div>
          <h1>Important Announcement</h1>
          <script>alert('pwned')</script>
          <img src="x" onerror="alert(1)" />
          <a href="javascript:alert('steal_cookie')">Click Here</a>
          <iframe src="https://evil.com"></iframe>
          <p>Normal text remains safe.</p>
        </div>
      `;

      const cleaned = sanitizeHtml(maliciousHtml);

      expect(cleaned).not.toContain("<script>");
      expect(cleaned).not.toContain("alert('pwned')");
      expect(cleaned).not.toContain("onerror=");
      expect(cleaned).not.toContain("javascript:");
      expect(cleaned).not.toContain("<iframe");
      expect(cleaned).toContain("Normal text remains safe.");
      expect(cleaned).toContain("Important Announcement");
    });

    it("enforces target='_blank' and rel='noopener noreferrer' on anchor tags", () => {
      const htmlWithLinks = `<p>Visit <a href="https://vitap.ac.in">VIT-AP</a> for details.</p>`;
      const cleaned = sanitizeHtml(htmlWithLinks);

      expect(cleaned).toContain('target="_blank"');
      expect(cleaned).toContain('rel="noopener noreferrer"');
    });
  });

  describe("formatDisplayUrl", () => {
    it("converts registration links into friendly labels", () => {
      const gForm = "https://forms.gle/XYZ123ABC?usp=sf_link";
      expect(formatDisplayUrl(gForm)).toBe("Google Form Registration");

      const gMeet = "https://meet.google.com/abc-defg-hij";
      expect(formatDisplayUrl(gMeet)).toBe("Google Meet Link");

      const zoom = "https://zoom.us/j/123456789";
      expect(formatDisplayUrl(zoom)).toBe("Zoom Meeting Link");

      const vtop = "https://vtop.vitap.ac.in/vtop/initialProcess";
      expect(formatDisplayUrl(vtop)).toContain("VTOP");
    });

    it("truncates generic long URLs gracefully", () => {
      const longUrl = "https://example.com/very/long/nested/path/to/a/resource/that/is/huge?tracking_id=12345";
      const display = formatDisplayUrl(longUrl);
      expect(display).toContain("example.com");
      expect(display.length).toBeLessThan(longUrl.length);
    });
  });

  describe("parsePlainTextEmail", () => {
    it("collapses excessive consecutive empty lines into a clean structure", () => {
      const spacedText = "Line 1\n\n\n\n\n\nLine 2\n\n\n\nLine 3";
      const blocks = parsePlainTextEmail(spacedText);

      expect(blocks.length).toBe(3);
      expect(blocks[0].type).toBe("paragraph");
      expect(blocks[1].type).toBe("paragraph");
      expect(blocks[2].type).toBe("paragraph");
    });

    it("parses headings and bullet lists correctly without markdown markers", () => {
      const rawBody = `
# Mid-Term Exam Instructions
Please follow the rules below:
- Bring your physical student ID card
- No electronic devices allowed
- Arrive 15 minutes before scheduled time
      `.trim();

      const blocks = parsePlainTextEmail(rawBody);

      expect(blocks[0].type).toBe("heading");
      if (blocks[0].type === "heading") {
        expect(blocks[0].level).toBe(1);
        expect(blocks[0].content[0].text).toBe("Mid-Term Exam Instructions");
      }

      expect(blocks[1].type).toBe("paragraph");

      expect(blocks[2].type).toBe("unordered-list");
      if (blocks[2].type === "unordered-list") {
        expect(blocks[2].items.length).toBe(3);
        expect(blocks[2].items[0][0].text).toContain("Bring your physical student ID card");
      }
    });

    it("parses tables into structured header and row arrays", () => {
      const rawTable = `
| Course Code | Slot | Hall |
| --- | --- | --- |
| CSE2001 | A1+TA1 | CB-101 |
| ECE1002 | B1+TB1 | CB-204 |
      `.trim();

      const blocks = parsePlainTextEmail(rawTable);
      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe("table");

      if (blocks[0].type === "table") {
        expect(blocks[0].headers.length).toBe(3);
        expect(blocks[0].rows.length).toBe(2);
        expect(blocks[0].rows[0][0][0].text).toBe("CSE2001");
      }
    });

    it("parses key-value pairs cleanly", () => {
      const rawKv = `
Company: Microsoft India
CTC Offered: 45 LPA
Eligible Branches: CSE, ECE
      `.trim();

      const blocks = parsePlainTextEmail(rawKv);
      expect(blocks.length).toBe(3);
      expect(blocks[0].type).toBe("key-value");
      if (blocks[0].type === "key-value") {
        expect(blocks[0].key).toBe("Company");
        expect(blocks[0].value[0].text).toBe("Microsoft India");
      }
    });

    it("parses signature blocks separately from email paragraphs", () => {
      const rawText = `
Dear Students,

Please find the details attached for the placement interview.

Thanks & Regards,
Career Development Centre
VIT-AP University
      `.trim();

      const blocks = parsePlainTextEmail(rawText);
      const signatureBlock = blocks.find((b) => b.type === "signature");
      expect(signatureBlock).toBeDefined();
      if (signatureBlock && signatureBlock.type === "signature") {
        expect(signatureBlock.content).toContain("Career Development Centre");
      }
    });
  });

  describe("Remote Image Protection & Template Support", () => {
    it("blocks remote image URLs when blockRemoteImages is true", () => {
      const htmlWithRemoteImage = `<div><img src="https://tracker.analytics.com/pixel.png" alt="logo" /></div>`;
      const sanitized = sanitizeHtml(htmlWithRemoteImage, { blockRemoteImages: true });

      expect(sanitized).toContain("data-blocked-src=\"https://tracker.analytics.com/pixel.png\"");
      expect(sanitized).toContain('src="data:image/svg+xml');
      expect(sanitized).not.toContain('<img src="https://tracker.analytics.com');
    });

    it("allows remote images when blockRemoteImages is false", () => {
      const htmlWithRemoteImage = `<div><img src="https://vitap.ac.in/logo.png" alt="logo" /></div>`;
      const sanitized = sanitizeHtml(htmlWithRemoteImage, { blockRemoteImages: false });

      expect(sanitized).toContain('src="https://vitap.ac.in/logo.png"');
    });

    it("preserves <style> tags when preserveStyles is true for Original View", () => {
      const styledHtml = `<style>.button { background: red; }</style><div class="button">Click</div>`;
      const preserved = sanitizeHtml(styledHtml, { preserveStyles: true });
      expect(preserved).toContain("<style>.button { background: red; }</style>");

      const clean = sanitizeHtml(styledHtml, { preserveStyles: false });
      expect(clean).not.toContain("<style>");
    });
  });

  describe("extractEmailAttachments", () => {
    it("detects documents, spreadsheets, presentations, and images mentioned in email", () => {
      const text = `
        Please review the attached timetable:
        1. exam_schedule_2026.pdf (1.2 MB)
        2. hall_allocations.xlsx (450 KB)
        3. orientation_deck.pptx
        4. event_poster.png
      `;

      const attachments = extractEmailAttachments(text);
      expect(attachments.length).toBe(4);
      expect(attachments[0].name).toBe("exam_schedule_2026.pdf");
      expect(attachments[0].size).toBe("1.2 MB");
      expect(attachments[1].name).toBe("hall_allocations.xlsx");
      expect(attachments[2].name).toBe("orientation_deck.pptx");
      expect(attachments[3].name).toBe("event_poster.png");
    });
  });
});
