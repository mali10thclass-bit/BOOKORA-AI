/**
 * Deterministic executor tests with a scripted Supabase mock.
 * No network, no database — verifies authorization and confirmation logic.
 */
import { describe, expect, it } from "vitest";
import {
  runAgentToolCore,
  type AgentSupabase,
  type AgentToolContext,
} from "./executor-core.server";

type MockResponse = { data?: unknown; error?: unknown };

interface MockCall {
  kind: "rpc" | "from";
  target: string;
  payload?: unknown;
}

function makeMockSupabase(options: {
  responses?: Record<string, MockResponse | ((payload: unknown) => MockResponse)>;
  calls?: MockCall[];
}) {
  const calls = options.calls ?? [];
  const responses = options.responses ?? {};

  const resolve = (key: string, payload: unknown): MockResponse => {
    const entry = responses[key];
    if (typeof entry === "function") return entry(payload);
    return entry ?? { data: null, error: null };
  };

  interface MockBuilder {
    select(cols: string): MockBuilder;
    insert(rows: unknown): MockBuilder;
    update(rows: unknown): MockBuilder;
    eq(): MockBuilder;
    or(): MockBuilder;
    gte(): MockBuilder;
    lte(): MockBuilder;
    order(): MockBuilder;
    limit(n: number): MockBuilder;
    maybeSingle(): Promise<MockResponse>;
    single(): Promise<MockResponse>;
    then<T>(
      onFulfilled: (value: MockResponse) => T | PromiseLike<T>,
      onRejected?: (reason: unknown) => T | PromiseLike<T>,
    ): Promise<T>;
  }

  const builder = (table: string, chain: string[], payload?: unknown): MockBuilder => {
    const self: MockBuilder = {
      select: () => builder(table, [...chain, "select"], payload),
      insert: (rows: unknown) => builder(table, [...chain, "insert"], rows),
      update: (rows: unknown) => builder(table, [...chain, "update"], rows),
      eq: () => builder(table, [...chain, "eq"], payload),
      or: () => builder(table, [...chain, "or"], payload),
      gte: () => builder(table, [...chain, "gte"], payload),
      lte: () => builder(table, [...chain, "lte"], payload),
      order: () => builder(table, [...chain, "order"], payload),
      limit: () => builder(table, [...chain, "limit"], payload),
      maybeSingle: async () => {
        calls.push({ kind: "from", target: table, payload });
        return resolve(table, payload);
      },
      single: async () => {
        calls.push({ kind: "from", target: table, payload });
        return resolve(table, payload);
      },
      then: <T>(
        onFulfilled: (value: MockResponse) => T | PromiseLike<T>,
        onRejected?: (reason: unknown) => T | PromiseLike<T>,
      ): Promise<T> => {
        calls.push({ kind: "from", target: table, payload });
        return Promise.resolve(resolve(table, payload)).then(onFulfilled, onRejected);
      },
    };
    return self;
  };

  const client = {
    from: (table: string) => builder(table, []),
    rpc: async (name: string, args: unknown) => {
      calls.push({ kind: "rpc", target: name, payload: args });
      return resolve(name, args);
    },
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
  };

  return { client: client as unknown as AgentSupabase, calls };
}

const baseCtx: AgentToolContext = {
  businessId: "biz-1",
  userId: "user-1",
  role: "owner",
  plan: "pro",
  agentId: null,
  conversationId: null,
  business: {
    id: "biz-1",
    name: "Test Salon",
    slug: "test-salon",
    timezone: "UTC",
    currency: "USD",
    cancellation_notice_hours: 24,
    booking_buffer_minutes: 10,
    email: null,
    phone: null,
    address: null,
    description: null,
    website: null,
  },
};

describe("runAgentToolCore — validation and authorization", () => {
  it("denies unknown tools", async () => {
    const { client } = makeMockSupabase({});
    const result = await runAgentToolCore({
      toolName: "drop_all_tables",
      input: {},
      ctx: baseCtx,
      supabase: client,
    });
    expect(result.status).toBe("denied");
  });

  it("rejects invalid tool arguments before any execution", async () => {
    const calls: MockCall[] = [];
    const { client } = makeMockSupabase({ calls });
    const result = await runAgentToolCore({
      toolName: "get_available_slots",
      input: { service_id: "bad", staff_id: "bad", date: "tomorrow" },
      ctx: baseCtx,
      supabase: client,
    });
    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.error).toContain("Invalid arguments");
    expect(calls.length).toBe(0);
  });

  it("denies write actions on plans without AI operations", async () => {
    const calls: MockCall[] = [];
    const { client } = makeMockSupabase({ calls });
    const result = await runAgentToolCore({
      toolName: "create_booking",
      input: {
        service_id: "11111111-1111-1111-1111-111111111111",
        staff_id: "22222222-2222-2222-2222-222222222222",
        start_time: "2026-09-27T14:00:00.000Z",
        customer_name: "Test",
      },
      ctx: { ...baseCtx, plan: "free" },
      supabase: client,
    });
    expect(result.status).toBe("denied");
    expect(calls.some((c) => c.target === "create_public_booking")).toBe(false);
  });
});

describe("runAgentToolCore — read tools", () => {
  it("returns business info from the server-resolved context (no client business_id)", async () => {
    const { client } = makeMockSupabase({});
    const result = await runAgentToolCore({
      toolName: "get_business_info",
      input: {},
      ctx: baseCtx,
      supabase: client,
    });
    expect(result.status).toBe("completed");
    if (result.status === "completed") {
      const output = result.output as Record<string, unknown>;
      expect(output["name"]).toBe("Test Salon");
      expect(output["cancellation_notice_hours"]).toBe(24);
    }
  });

  it("computes availability only via the backend slot RPC", async () => {
    const calls: MockCall[] = [];
    const { client } = makeMockSupabase({
      calls,
      responses: {
        get_available_slots: { data: ["09:00", "09:30"] },
      },
    });
    const result = await runAgentToolCore({
      toolName: "get_available_slots",
      input: {
        service_id: "11111111-1111-1111-1111-111111111111",
        staff_id: "22222222-2222-2222-2222-222222222222",
        date: "2026-09-27",
      },
      ctx: baseCtx,
      supabase: client,
    });
    expect(result.status).toBe("completed");
    const rpc = calls.find((c) => c.target === "get_available_slots");
    expect(rpc).toBeDefined();
    // Tenant scoping comes from the server-resolved slug, never from input.
    expect((rpc!.payload as Record<string, unknown>)["p_business_slug"]).toBe("test-salon");
    if (result.status === "completed") {
      const output = result.output as { slots: string[]; note: string };
      expect(output.slots).toEqual(["09:00", "09:30"]);
      expect(output.note).toContain("Never invent");
    }
  });

  it("does not leak a booking from another business", async () => {
    const { client } = makeMockSupabase({
      responses: {
        bookings: { data: null, error: null },
      },
    });
    const result = await runAgentToolCore({
      toolName: "get_booking",
      input: { booking_id: "44444444-4444-4444-4444-444444444444" },
      ctx: baseCtx,
      supabase: client,
    });
    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.error).toContain("not found in this business");
  });
});

describe("runAgentToolCore — write confirmation flow", () => {
  const bookingInput = {
    service_id: "11111111-1111-1111-1111-111111111111",
    staff_id: "22222222-2222-2222-2222-222222222222",
    start_time: "2026-09-27T14:00:00.000Z",
    customer_name: "Test Customer",
  };

  it("propose mode returns confirmation_required and never mutates bookings", async () => {
    const calls: MockCall[] = [];
    const { client } = makeMockSupabase({
      calls,
      responses: {
        create_ai_action_request: { data: "99999999-9999-9999-9999-999999999999" },
      },
    });
    const result = await runAgentToolCore({
      toolName: "create_booking",
      input: bookingInput,
      mode: "auto",
      ctx: baseCtx,
      supabase: client,
    });
    expect(result.status).toBe("confirmation_required");
    if (result.status === "confirmation_required") {
      expect(result.proposalId).toBe("99999999-9999-9999-9999-999999999999");
    }
    expect(calls.some((c) => c.target === "create_public_booking")).toBe(false);
  });

  it("commit mode executes the stored proposal after approval", async () => {
    const calls: MockCall[] = [];
    const { client } = makeMockSupabase({
      calls,
      responses: {
        ai_action_requests: {
          data: {
            id: "99999999-9999-9999-9999-999999999999",
            business_id: "biz-1",
            actor_user_id: "user-1",
            action_type: "create_booking",
            proposal: bookingInput,
            status: "pending",
          },
        },
        set_ai_action_request_decision: { data: true },
        services: {
          data: { id: bookingInput.service_id, name: "Haircut", duration_minutes: 30, price: 20 },
        },
        create_public_booking: {
          data: {
            success: true,
            booking_id: "55555555-5555-5555-5555-555555555555",
            service_name: "Haircut",
            staff_name: "Ana",
            status: "pending",
          },
        },
      },
    });
    const result = await runAgentToolCore({
      toolName: "create_booking",
      input: {},
      mode: "commit",
      proposalId: "99999999-9999-9999-9999-999999999999",
      ctx: baseCtx,
      supabase: client,
    });
    expect(result.status).toBe("completed");
    expect(calls.some((c) => c.target === "create_public_booking")).toBe(true);
    expect(calls.some((c) => c.target === "set_ai_action_request_decision")).toBe(true);
  });

  it("denies committing a proposal from another business (cross-tenant)", async () => {
    const calls: MockCall[] = [];
    const { client } = makeMockSupabase({
      calls,
      responses: {
        ai_action_requests: {
          data: {
            id: "99999999-9999-9999-9999-999999999999",
            business_id: "OTHER-BIZ",
            actor_user_id: "user-2",
            action_type: "create_booking",
            proposal: bookingInput,
            status: "pending",
          },
        },
      },
    });
    const result = await runAgentToolCore({
      toolName: "create_booking",
      input: {},
      mode: "commit",
      proposalId: "99999999-9999-9999-9999-999999999999",
      ctx: baseCtx,
      supabase: client,
    });
    expect(result.status).toBe("denied");
    expect(calls.some((c) => c.target === "create_public_booking")).toBe(false);
    expect(calls.some((c) => c.target === "set_ai_action_request_decision")).toBe(false);
  });

  it("refuses to commit an already-used proposal", async () => {
    const { client } = makeMockSupabase({
      responses: {
        ai_action_requests: {
          data: {
            id: "99999999-9999-9999-9999-999999999999",
            business_id: "biz-1",
            actor_user_id: "user-1",
            action_type: "create_booking",
            proposal: bookingInput,
            status: "executed",
          },
        },
      },
    });
    const result = await runAgentToolCore({
      toolName: "create_booking",
      input: {},
      mode: "commit",
      proposalId: "99999999-9999-9999-9999-999999999999",
      ctx: baseCtx,
      supabase: client,
    });
    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.error).toContain("already");
  });

  it("propagates backend booking rejections instead of fabricating success", async () => {
    const { client } = makeMockSupabase({
      responses: {
        ai_action_requests: {
          data: {
            id: "99999999-9999-9999-9999-999999999999",
            business_id: "biz-1",
            actor_user_id: "user-1",
            action_type: "create_booking",
            proposal: bookingInput,
            status: "pending",
          },
        },
        set_ai_action_request_decision: { data: true },
        services: {
          data: { id: bookingInput.service_id, name: "Haircut", duration_minutes: 30, price: 20 },
        },
        create_public_booking: { data: { error: "Time slot is not available" } },
      },
    });
    const result = await runAgentToolCore({
      toolName: "create_booking",
      input: {},
      mode: "commit",
      proposalId: "99999999-9999-9999-9999-999999999999",
      ctx: baseCtx,
      supabase: client,
    });
    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.error).toContain("Time slot is not available");
  });

  it("enforces the cancellation notice policy", async () => {
    const soon = new Date(Date.now() + 2 * 3_600_000).toISOString(); // 2h away, policy is 24h
    const { client } = makeMockSupabase({
      responses: {
        ai_action_requests: {
          data: {
            id: "99999999-9999-9999-9999-999999999999",
            business_id: "biz-1",
            actor_user_id: "user-1",
            action_type: "cancel_booking",
            proposal: { booking_id: "44444444-4444-4444-4444-444444444444" },
            status: "pending",
          },
        },
        set_ai_action_request_decision: { data: true },
        bookings: {
          data: {
            id: "44444444-4444-4444-4444-444444444444",
            start_time: soon,
            end_time: soon,
            status: "pending",
            staff_id: "22222222-2222-2222-2222-222222222222",
            service_id: "11111111-1111-1111-1111-111111111111",
            customer_id: "33333333-3333-3333-3333-333333333333",
          },
        },
      },
    });
    const result = await runAgentToolCore({
      toolName: "cancel_booking",
      input: {},
      mode: "commit",
      proposalId: "99999999-9999-9999-9999-999999999999",
      ctx: baseCtx,
      supabase: client,
    });
    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.error).toContain("24 hours notice");
  });
});
