import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@emisso/talk", async () => {
  const actual = await vi.importActual<typeof import("@emisso/talk")>("@emisso/talk");
  return {
    ...actual,
    navigate: vi.fn(),
  };
});

import { createTalkRouter } from "../src/create-talk-router";
import { navigate } from "@emisso/talk";
import type { TalkResult } from "@emisso/talk";

const mockedNavigate = vi.mocked(navigate);

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/talk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const routerConfig = {
  anthropicApiKey: "sk-test-key-123",
  repo: "test-org/test-repo",
  githubToken: "ghp_test-token",
};

const successResult: TalkResult = {
  success: true,
  answer: "The auth module handles login",
  codeSnippets: [],
  filesExplored: ["src/auth.ts"],
  costUsd: 0.003,
  durationMs: 4500,
  model: "claude-haiku-4-5-20251001",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedNavigate.mockResolvedValue(successResult);
});

describe("createTalkRouter", () => {
  it("valid POST → calls navigate and returns 200 JSON", async () => {
    const { POST } = createTalkRouter(routerConfig);
    const res = await POST(mockRequest({ query: "How does auth work?" }));
    expect(res.status).toBe(200);
    expect(mockedNavigate).toHaveBeenCalledTimes(1);
  });

  it("response body matches navigate result", async () => {
    const { POST } = createTalkRouter(routerConfig);
    const res = await POST(mockRequest({ query: "q" }));
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.answer).toBe("The auth module handles login");
  });

  it("missing query field → 400", async () => {
    const { POST } = createTalkRouter(routerConfig);
    const res = await POST(mockRequest({ notQuery: "hello" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("query");
  });

  it("query is a number → 400", async () => {
    const { POST } = createTalkRouter(routerConfig);
    const res = await POST(mockRequest({ query: 42 }));
    expect(res.status).toBe(400);
  });

  it("passes conversationId from body", async () => {
    const { POST } = createTalkRouter(routerConfig);
    await POST(mockRequest({ query: "q", conversationId: "conv-123" }));
    expect(mockedNavigate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ conversationId: "conv-123" }),
    );
  });

  it("passes valid queryCategory from body", async () => {
    const { POST } = createTalkRouter(routerConfig);
    await POST(mockRequest({ query: "q", queryCategory: "troubleshoot" }));
    expect(mockedNavigate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ queryCategory: "troubleshoot" }),
    );
  });

  it("ignores invalid queryCategory", async () => {
    const { POST } = createTalkRouter(routerConfig);
    await POST(mockRequest({ query: "q", queryCategory: "not_a_category" }));
    expect(mockedNavigate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ queryCategory: undefined }),
    );
  });

  it("onRequest middleware returns Response → short-circuits", async () => {
    const { POST } = createTalkRouter({
      ...routerConfig,
      onRequest: async () => new Response("blocked", { status: 403 }),
    });
    const res = await POST(mockRequest({ query: "q" }));
    expect(res.status).toBe(403);
    expect(mockedNavigate).not.toHaveBeenCalled();
  });

  it("onRequest middleware returns void → continues", async () => {
    const { POST } = createTalkRouter({
      ...routerConfig,
      onRequest: async () => undefined,
    });
    const res = await POST(mockRequest({ query: "q" }));
    expect(res.status).toBe(200);
    expect(mockedNavigate).toHaveBeenCalled();
  });

  it("navigate throws → 500", async () => {
    mockedNavigate.mockRejectedValueOnce(new Error("Internal failure"));
    const { POST } = createTalkRouter(routerConfig);
    const res = await POST(mockRequest({ query: "q" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
  });
});
