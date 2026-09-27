import { describe, expect, it } from "vitest";
import {
  AGENT_TOOLS,
  AGENT_TOOL_NAMES,
  getAgentTool,
  isAgentToolName,
  listAgentTools,
} from "./registry";

describe("tool registry integrity", () => {
  it("declares every registered tool exactly once with schema and description", () => {
    for (const name of AGENT_TOOL_NAMES) {
      const tool = getAgentTool(name);
      expect(tool, `missing tool ${name}`).toBeDefined();
      expect(tool!.name).toBe(name);
      expect(tool!.description.length).toBeGreaterThan(20);
      expect(tool!.inputSchema).toBeDefined();
    }
    expect(AGENT_TOOLS.length).toBe(AGENT_TOOL_NAMES.length);
  });

  it("classifies write actions as requiring confirmation and reads as not", () => {
    for (const tool of AGENT_TOOLS) {
      if (tool.kind === "action") {
        expect(tool.requiresConfirmation, tool.name).toBe(true);
      } else {
        expect(tool.requiresConfirmation, tool.name).toBe(false);
      }
    }
  });

  it("never exposes write tools or customer data to the public channel", () => {
    const publicTools = listAgentTools({ channel: "public" });
    const names = publicTools.map((t) => t.name);
    expect(names).not.toContain("create_booking");
    expect(names).not.toContain("cancel_booking");
    expect(names).not.toContain("reschedule_booking");
    expect(names).not.toContain("search_customers");
    expect(names).not.toContain("get_booking");
    for (const tool of publicTools) {
      expect(tool.publicChannelAllowed, tool.name).toBe(true);
    }
  });

  it("exposes all tools to the authenticated dashboard channel", () => {
    expect(listAgentTools({ channel: "dashboard" }).length).toBe(AGENT_TOOLS.length);
  });

  it("rejects unknown tool names", () => {
    expect(isAgentToolName("drop_database")).toBe(false);
    expect(isAgentToolName("get_services")).toBe(true);
    expect(getAgentTool("exec_shell")).toBeUndefined();
  });
});

describe("tool input schemas", () => {
  it("rejects empty input for tools with required fields", () => {
    const slots = getAgentTool("get_available_slots")!;
    expect(slots.inputSchema.safeParse({}).success).toBe(false);
    expect(
      slots.inputSchema.safeParse({
        service_id: "not-a-uuid",
        staff_id: "11111111-1111-1111-1111-111111111111",
        date: "2026-09-27",
      }).success,
    ).toBe(false);
  });

  it("accepts valid slot queries and rejects malformed dates", () => {
    const slots = getAgentTool("get_available_slots")!;
    const valid = {
      service_id: "11111111-1111-1111-1111-111111111111",
      staff_id: "22222222-2222-2222-2222-222222222222",
      date: "2026-09-27",
    };
    expect(slots.inputSchema.safeParse(valid).success).toBe(true);
    expect(slots.inputSchema.safeParse({ ...valid, date: "27/09/2026" }).success).toBe(false);
  });

  it("rejects unknown/extra arguments (no schema smuggling)", () => {
    const create = getAgentTool("create_booking")!;
    const valid = {
      service_id: "11111111-1111-1111-1111-111111111111",
      staff_id: "22222222-2222-2222-2222-222222222222",
      start_time: "2026-09-27T14:00:00.000Z",
      customer_name: "Test Customer",
    };
    expect(create.inputSchema.safeParse(valid).success).toBe(true);
    expect(
      create.inputSchema.safeParse({ ...valid, business_id: "33333333-3333-3333-3333-333333333333" })
        .success,
    ).toBe(false);
    expect(create.inputSchema.safeParse({ ...valid, role: "owner" }).success).toBe(false);
  });

  it("validates email/phone fields for create_booking", () => {
    const create = getAgentTool("create_booking")!;
    const base = {
      service_id: "11111111-1111-1111-1111-111111111111",
      staff_id: "22222222-2222-2222-2222-222222222222",
      start_time: "2026-09-27T14:00:00.000Z",
      customer_name: "Test Customer",
    };
    expect(create.inputSchema.safeParse({ ...base, customer_email: "not-an-email" }).success).toBe(false);
    expect(create.inputSchema.safeParse({ ...base, customer_email: "a@b.co" }).success).toBe(true);
  });

  it("bounds long strings", () => {
    const cancel = getAgentTool("cancel_booking")!;
    expect(
      cancel.inputSchema.safeParse({
        booking_id: "11111111-1111-1111-1111-111111111111",
        reason: "x".repeat(501),
      }).success,
    ).toBe(false);
  });
});

describe("summaries", () => {
  it("produces human-readable summaries without crashing on missing fields", () => {
    for (const tool of AGENT_TOOLS) {
      expect(() => tool.summarizeInput({})).not.toThrow();
      expect(tool.summarizeInput({}).length).toBeGreaterThan(0);
    }
  });
});
