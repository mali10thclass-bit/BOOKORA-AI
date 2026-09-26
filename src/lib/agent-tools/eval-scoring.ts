/**
 * BOOKORA AI — deterministic evaluation scoring.
 *
 * Pure function shared by the agent evaluation server fn and unit tests.
 * Criteria are deterministic string/regex checks — no external evaluation
 * service or model judge required.
 */

import { z } from "zod";

export const EvalCriteria = z
  .object({
    contains_any: z.array(z.string()).optional(),
    contains_all: z.array(z.string()).optional(),
    exact: z.string().optional(),
    regex: z.string().optional(),
    max_length: z.number().int().positive().optional(),
    must_not_contain: z.array(z.string()).optional(),
  })
  .passthrough();

export type EvalCriteriaShape = z.infer<typeof EvalCriteria>;

export interface EvalScore {
  checks: number;
  passedChecks: number;
  score: number;
  passed: boolean;
  feedback: string;
}

export function scoreEvalOutput(output: string, criteria: unknown): EvalScore {
  let checks = 0;
  let passedChecks = 0;
  const feedback: string[] = [];
  const parsed = EvalCriteria.safeParse(criteria);

  if (parsed.success) {
    const c = parsed.data;
    if (c.exact !== undefined) {
      checks++;
      if (output.trim() === c.exact.trim()) passedChecks++;
      else feedback.push("exact mismatch");
    }
    if (c.contains_any?.length) {
      checks++;
      if (c.contains_any.some((x) => output.toLowerCase().includes(x.toLowerCase()))) passedChecks++;
      else feedback.push("none of contains_any matched");
    }
    if (c.contains_all?.length) {
      checks++;
      const ok = c.contains_all.every((x) => output.toLowerCase().includes(x.toLowerCase()));
      if (ok) passedChecks++;
      else feedback.push("contains_all failed");
    }
    if (c.regex) {
      checks++;
      try {
        if (new RegExp(c.regex, "i").test(output)) passedChecks++;
        else feedback.push("regex failed");
      } catch {
        feedback.push("invalid regex criterion");
      }
    }
    if (c.max_length !== undefined) {
      checks++;
      if (output.length <= c.max_length) passedChecks++;
      else feedback.push("max_length failed");
    }
    if (c.must_not_contain?.length) {
      checks++;
      if (!c.must_not_contain.some((x) => output.toLowerCase().includes(x.toLowerCase()))) passedChecks++;
      else feedback.push("must_not_contain failed");
    }
  } else {
    feedback.push("No valid deterministic criteria supplied");
  }

  const score = checks ? passedChecks / checks : 0;
  return {
    checks,
    passedChecks,
    score,
    passed: checks > 0 && score === 1,
    feedback: feedback.join("; ") || "passed",
  };
}
