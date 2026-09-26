import { describe, expect, it } from "vitest";
import { scoreEvalOutput } from "./eval-scoring";

describe("scoreEvalOutput", () => {
  it("passes when all deterministic criteria match", () => {
    const result = scoreEvalOutput("You have 12 bookings this week.", {
      contains_all: ["bookings", "12"],
      must_not_contain: ["I don't know"],
    });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it("fails on contains_any misses", () => {
    const result = scoreEvalOutput("Sorry, I cannot help with that.", {
      contains_any: ["bookings", "revenue"],
    });
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
    expect(result.feedback).toContain("none of contains_any matched");
  });

  it("scores mixed criteria proportionally (contains_all is all-or-nothing)", () => {
    const result = scoreEvalOutput("Bookings: 3", {
      contains_any: ["bookings"],
      contains_all: ["revenue", "staff"],
    });
    expect(result.score).toBeCloseTo(1 / 2);
    expect(result.passed).toBe(false);
    // contains_all counts as a single check: all members required.
    const all = scoreEvalOutput("Bookings: 3", { contains_all: ["bookings", "revenue"] });
    expect(all.score).toBe(0);
  });

  it("supports exact, regex and max_length criteria", () => {
    expect(scoreEvalOutput("42", { exact: "42" }).passed).toBe(true);
    expect(scoreEvalOutput("Bookings: 42", { regex: "bookings:\\s*\\d+" }).passed).toBe(true);
    expect(scoreEvalOutput("x".repeat(50), { max_length: 20 }).passed).toBe(false);
  });

  it("fails closed when no valid criteria are supplied", () => {
    const result = scoreEvalOutput("anything", {});
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });

  it("handles invalid regex criteria without crashing", () => {
    const result = scoreEvalOutput("hello", { regex: "([" });
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain("invalid regex criterion");
  });

  it("blocks content that must not appear (hallucination guard)", () => {
    const result = scoreEvalOutput("Your booking is confirmed!", {
      must_not_contain: ["booking is confirmed"],
    });
    expect(result.passed).toBe(false);
    expect(result.feedback).toContain("must_not_contain failed");
  });
});
