import { describe, expect, it } from "vitest";
import { isPrivateIp, validateGatewayUrl } from "./security";

describe("llm-gateway security helpers", () => {
  it("detects private and reserved IP ranges", () => {
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.4")).toBe(true);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });

  it("rejects non-https gateway URLs before DNS lookup", async () => {
    await expect(validateGatewayUrl("http://example.com")).rejects.toThrow(
      "Gateway URL must use HTTPS",
    );
  });

  it("rejects blocked hosts", async () => {
    await expect(validateGatewayUrl("https://localhost/api")).rejects.toThrow(
      "Gateway URL points to a blocked host",
    );
  });
});