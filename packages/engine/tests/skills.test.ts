import { describe, it, expect } from "vitest";
import {
  getSkillFilesForCategory,
  CATEGORY_SKILLS,
  SKILL_DEFINITIONS,
} from "../src/skills/index";
import { QUERY_CATEGORIES } from "../src/types";

describe("CATEGORY_SKILLS", () => {
  it("every QueryCategory has at least one skill mapped", () => {
    for (const category of QUERY_CATEGORIES) {
      const skills = CATEGORY_SKILLS[category];
      expect(skills, `${category} should have skills`).toBeDefined();
      expect(skills.length, `${category} should have at least one skill`).toBeGreaterThanOrEqual(1);
    }
  });

  it("all mapped skill names exist in SKILL_DEFINITIONS", () => {
    for (const skills of Object.values(CATEGORY_SKILLS)) {
      for (const skillName of skills) {
        expect(SKILL_DEFINITIONS, `${skillName} should exist`).toHaveProperty(skillName);
      }
    }
  });
});

describe("SKILL_DEFINITIONS", () => {
  it("every skill has non-empty content", () => {
    for (const [name, skill] of Object.entries(SKILL_DEFINITIONS)) {
      expect(skill.content.length, `${name} content should not be empty`).toBeGreaterThan(0);
    }
  });

  it("every skill has a description", () => {
    for (const [name, skill] of Object.entries(SKILL_DEFINITIONS)) {
      expect(skill.description.length, `${name} description should not be empty`).toBeGreaterThan(0);
    }
  });

  it("content starts with markdown header", () => {
    for (const [name, skill] of Object.entries(SKILL_DEFINITIONS)) {
      expect(skill.content.trimStart(), `${name} should start with # header`).toMatch(/^# /);
    }
  });
});

describe("getSkillFilesForCategory", () => {
  it("code_lookup → returns find-usages skill", () => {
    const files = getSkillFilesForCategory("code_lookup");
    expect(files.some((f) => f.path.includes("find-usages"))).toBe(true);
  });

  it("troubleshoot → returns troubleshoot skill", () => {
    const files = getSkillFilesForCategory("troubleshoot");
    expect(files.some((f) => f.path.includes("troubleshoot"))).toBe(true);
  });

  it("architecture → returns explain-code skill", () => {
    const files = getSkillFilesForCategory("architecture");
    expect(files.some((f) => f.path.includes("explain-code"))).toBe(true);
  });

  it("general_product → returns product-usage skill", () => {
    const files = getSkillFilesForCategory("general_product");
    expect(files.some((f) => f.path.includes("product-usage"))).toBe(true);
  });

  it("returned files have correct path format", () => {
    const files = getSkillFilesForCategory("code_lookup");
    for (const file of files) {
      expect(file.path).toMatch(/^\.talk\/skills\/[\w-]+\.md$/);
    }
  });

  it("content is Buffer", () => {
    const files = getSkillFilesForCategory("architecture");
    for (const file of files) {
      expect(Buffer.isBuffer(file.content)).toBe(true);
    }
  });

  it("each category produces at least one file", () => {
    for (const category of QUERY_CATEGORIES) {
      const files = getSkillFilesForCategory(category);
      expect(files.length, `${category} should produce files`).toBeGreaterThanOrEqual(1);
    }
  });
});
