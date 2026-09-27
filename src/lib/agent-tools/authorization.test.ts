import { describe, expect, it } from "vitest";
import {
  DECISION_DENIED_MESSAGE,
  EXECUTION_DENIED_MESSAGE,
  canDecideActionRequests,
  canExecuteActionRequests,
  roleRank,
} from "./authorization";

describe("roleRank mirrors SQL role_rank()", () => {
  it("ranks the documented role hierarchy", () => {
    expect(roleRank("owner")).toBe(4);
    expect(roleRank("admin")).toBe(3);
    expect(roleRank("manager")).toBe(2);
    expect(roleRank("staff")).toBe(1);
    expect(roleRank("")).toBe(0);
    expect(roleRank(null)).toBe(0);
    expect(roleRank(undefined)).toBe(0);
    expect(roleRank("superuser")).toBe(0);
    expect(roleRank("OWNER")).toBe(0); // case-sensitive, like the CHECK constraint values
  });
});

describe("action-request decision policy (owner/admin/manager only)", () => {
  it("allows owner, admin, manager to approve/reject", () => {
    expect(canDecideActionRequests("owner")).toBe(true);
    expect(canDecideActionRequests("admin")).toBe(true);
    expect(canDecideActionRequests("manager")).toBe(true);
  });

  it("denies ordinary members and unknown roles", () => {
    expect(canDecideActionRequests("staff")).toBe(false);
    expect(canDecideActionRequests("member")).toBe(false);
    expect(canDecideActionRequests("")).toBe(false);
    expect(canDecideActionRequests(null)).toBe(false);
    expect(canDecideActionRequests(undefined)).toBe(false);
    expect(canDecideActionRequests("owner; drop table")).toBe(false);
  });

  it("applies the same gate to executing approved actions", () => {
    expect(canExecuteActionRequests("owner")).toBe(true);
    expect(canExecuteActionRequests("manager")).toBe(true);
    expect(canExecuteActionRequests("staff")).toBe(false);
  });

  it("denied messages do not leak internals", () => {
    expect(DECISION_DENIED_MESSAGE).not.toMatch(/sql|uuid|token|key/i);
    expect(EXECUTION_DENIED_MESSAGE).not.toMatch(/sql|uuid|token|key/i);
  });
});
