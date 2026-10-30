import { describe, it, expect } from "vitest";
import { 
  sanitizeHtml, 
  parsePlainTextEmail, 
  formatDisplayUrl, 
  parseInlineFormatting 
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

  describe("parseInlineFormatting", () => {
    it("strips raw ** markers while setting bold type", () => {
      const tokens = parseInlineFormatting("This is **critical** information.");
      expect(tokens.length).toBe(3);
      expect(tokens[1].type).toBe("bold");
      expect(tokens[1].text).toBe("critical");
      expect(tokens[1].text).not.toContain("**");
    });

    it("converts URLs into clickable link tokens with friendly text", () => {
      const tokens = parseInlineFormatting("Register here: https://forms.gle/sample123");
      const linkToken = tokens.find((t) => t.type === "link");
      expect(linkToken).toBeDefined();
      expect(linkToken?.url).toBe("https://forms.gle/sample123");
      expect(linkToken?.text).toBe("Google Form Registration");
    });
  });
});
