import { describe, it, expect } from "vitest";
import {
  extractCompanyOpportunity,
  extractBatchCycle,
  detectOpportunityStage,
} from "@/lib/placement-matcher";
import { OpportunityStage } from "@prisma/client";

describe("Workstream C: CDC Placement Opportunity Grouping Engine", () => {
  it("extracts known company names from subject lines", () => {
    const res = extractCompanyOpportunity(
      "Tata Power online test is scheduled on 28th October 2026 - Own location"
    );
    expect(res).not.toBeNull();
    expect(res?.companyName).toBe("Tata Power");
    expect(res?.normalizedKey).toBe("tatapower");
    expect(res?.stage).toBe(OpportunityStage.ASSESSMENT_SCHEDULED);
  });

  it("extracts batch cycle when mentioned in text", () => {
    const res = extractCompanyOpportunity(
      "Congratulations!! Leadsquared Super Dream Internship Selection List 2027 Batch !!"
    );
    expect(res).not.toBeNull();
    expect(res?.companyName).toBe("Leadsquared");
    expect(res?.batchCycle).toBe("2027");
    expect(res?.stage).toBe(OpportunityStage.OFFER_CONGRATULATIONS);
  });

  it("extracts pre-placement talk stage from Re: forwarded message", () => {
    const res = extractCompanyOpportunity(
      "Re: Report immediately : Kanini Pre-placement talk and online test is scheduled on 28th October 2026"
    );
    expect(res).not.toBeNull();
    expect(res?.companyName).toBe("Kanini");
    expect(res?.stage).toBe(OpportunityStage.PRE_PLACEMENT_TALK);
  });

  it("extracts interview schedule stage", () => {
    const res = extractCompanyOpportunity(
      "Citi next round of selection process is scheduled on 30.10.2026 - Virtual Interview"
    );
    expect(res).not.toBeNull();
    expect(res?.companyName).toBe("Citi");
    expect(res?.stage).toBe(OpportunityStage.INTERVIEW_SCHEDULED);
  });

  it("extracts registration stage from drive announcement", () => {
    const res = extractCompanyOpportunity(
      "Zanskar Tech Pvt Ltd Dream Internship Offer - 2027 Batch Registration"
    );
    expect(res).not.toBeNull();
    expect(res?.companyName).toBe("Zanskar Tech");
    expect(res?.stage).toBe(OpportunityStage.REGISTRATION_OPEN);
    expect(res?.batchCycle).toBe("2027");
  });

  it("does not match non-company administrative announcements", () => {
    const res = extractCompanyOpportunity(
      "Fwd: Webinar Invitation: Mastering Standardized Tests & Application Timelines (GRE, GMAT, IELTS)"
    );
    expect(res).toBeNull();
  });

  it("keeps separate recruitment drives from different companies distinct", () => {
    const tata = extractCompanyOpportunity("Tata Power online test is scheduled on 28th October");
    const nykaa = extractCompanyOpportunity("Nykaa next round of selection process is scheduled");

    expect(tata?.normalizedKey).not.toBe(nykaa?.normalizedKey);
    expect(tata?.companyName).toBe("Tata Power");
    expect(nykaa?.companyName).toBe("Nykaa");
  });
});
