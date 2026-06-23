import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fetchApi, ApiClientError } from "../../src/client/shared/api/client";
import * as sessionExpiredModule from "../../src/client/shared/components/SessionExpired";

describe("fetchApi Authentication Handling", () => {
  let notifySpy: any;

  beforeEach(() => {
    // Spy on notifySessionExpired
    notifySpy = vi.spyOn(sessionExpiredModule, "notifySessionExpired");
    // Mock global fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should successfully return data on 200 OK", async () => {
    const mockData = { name: "Test User" };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: mockData })
    });

    const result = await fetchApi("/test");

    expect(result).toEqual(mockData);
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it("should call notifySessionExpired and throw ApiClientError on HTTP 401", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: "UNAUTHORIZED", message: "Token expired" } })
    });

    await expect(fetchApi("/test")).rejects.toThrow(ApiClientError);
    expect(notifySpy).toHaveBeenCalledTimes(1);
  });

  it("should call notifySessionExpired and throw ApiClientError on Network/Fetch Error", async () => {
    // Simulate a network failure (e.g. CORS block, DNS error, or CF Access redirect blocking CORS)
    (global.fetch as any).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchApi("/test")).rejects.toThrow(ApiClientError);
    expect(notifySpy).toHaveBeenCalledTimes(1);
  });

  it("should throw standard ApiClientError without triggering session expired on other error statuses (e.g. 500)", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { code: "INTERNAL_ERROR", message: "Server error" } })
    });

    await expect(fetchApi("/test")).rejects.toThrow(ApiClientError);
    expect(notifySpy).not.toHaveBeenCalled();
  });
});
