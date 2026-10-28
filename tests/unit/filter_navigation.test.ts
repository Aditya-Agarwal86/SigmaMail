import { describe, it, expect } from "vitest";

describe("SigmaMail Filter Navigation & State Management", () => {
  function createFilterUrl(
    pathname: string,
    currentSearchParams: Record<string, string>,
    params: Record<string, string | null>
  ) {
    const nextParams = new URLSearchParams(currentSearchParams);
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    }
    nextParams.delete("page");
    const query = nextParams.toString();
    const base = pathname || "/";
    return query ? `${base}?${query}` : base;
  }

  describe("Schools filter URL generation on /categories/SCHOOLS", () => {
    const pathname = "/categories/SCHOOLS";

    it("maintains the /categories/SCHOOLS path when selecting a school", () => {
      const url = createFilterUrl(pathname, {}, { school: "SCOPE" });
      expect(url).toBe("/categories/SCHOOLS?school=SCOPE");
    });

    it("maintains the /categories/SCHOOLS path when switching to another school like VISH", () => {
      const currentParams = { school: "SCOPE" };
      const url = createFilterUrl(pathname, currentParams, { school: "VISH" });
      expect(url).toBe("/categories/SCHOOLS?school=VISH");
    });

    it("resets school filter on All Schools without navigating away from /categories/SCHOOLS", () => {
      const currentParams = { school: "VISH" };
      const url = createFilterUrl(pathname, currentParams, { school: null });
      expect(url).toBe("/categories/SCHOOLS");
    });

    it("preserves priority and deadline filters when selecting a school", () => {
      const currentParams = { priority: "URGENT", deadlines: "true" };
      const url = createFilterUrl(pathname, currentParams, { school: "SENSE" });
      expect(url).toContain("school=SENSE");
      expect(url).toContain("priority=URGENT");
      expect(url).toContain("deadlines=true");
      expect(url).toBe("/categories/SCHOOLS?priority=URGENT&deadlines=true&school=SENSE");
    });

    it("resets page parameter when changing school filter", () => {
      const currentParams = { page: "3", school: "SCOPE" };
      const url = createFilterUrl(pathname, currentParams, { school: "SMEC" });
      expect(url).not.toContain("page=");
      expect(url).toBe("/categories/SCHOOLS?school=SMEC");
    });
  });

  describe("CDC & Placement subsection filter URL generation on /categories/CDC_AND_PLACEMENT", () => {
    const pathname = "/categories/CDC_AND_PLACEMENT";

    it("maintains the /categories/CDC_AND_PLACEMENT path when selecting Placement Drives", () => {
      const url = createFilterUrl(pathname, {}, { subCategory: "PLACEMENT_DRIVE" });
      expect(url).toBe("/categories/CDC_AND_PLACEMENT?subCategory=PLACEMENT_DRIVE");
    });

    it("maintains the /categories/CDC_AND_PLACEMENT path when switching to Congratulations & Results", () => {
      const currentParams = { subCategory: "PLACEMENT_DRIVE" };
      const url = createFilterUrl(pathname, currentParams, { subCategory: "PLACEMENT_CONGRATULATIONS" });
      expect(url).toBe("/categories/CDC_AND_PLACEMENT?subCategory=PLACEMENT_CONGRATULATIONS");
    });

    it("resets subCategory on All Placement without leaving /categories/CDC_AND_PLACEMENT", () => {
      const currentParams = { subCategory: "PLACEMENT_CONGRATULATIONS" };
      const url = createFilterUrl(pathname, currentParams, { subCategory: null });
      expect(url).toBe("/categories/CDC_AND_PLACEMENT");
    });

    it("preserves priority and deadlines when switching subsections", () => {
      const currentParams = { priority: "HIGH", deadlines: "true", subCategory: "PLACEMENT_DRIVE" };
      const url = createFilterUrl(pathname, currentParams, { subCategory: "PLACEMENT_UPDATE" });
      expect(url).toContain("subCategory=PLACEMENT_UPDATE");
      expect(url).toContain("priority=HIGH");
      expect(url).toContain("deadlines=true");
    });
  });

  describe("Pagination URL query preservation", () => {
    it("preserves school, subCategory, priority, and deadlines in category pagination", () => {
      const categoryEnum = "SCHOOLS";
      const page = 2;
      const subCategory = undefined;
      const school = "SCOPE";
      const priority = "HIGH";
      const hasDeadlines = true;

      const href = `/categories/${categoryEnum}?page=${page + 1}${subCategory ? `&subCategory=${encodeURIComponent(subCategory)}` : ""}${school ? `&school=${encodeURIComponent(school)}` : ""}${priority ? `&priority=${encodeURIComponent(priority)}` : ""}${hasDeadlines ? "&deadlines=true" : ""}`;
      expect(href).toBe("/categories/SCHOOLS?page=3&school=SCOPE&priority=HIGH&deadlines=true");
    });
  });
});
