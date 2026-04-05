import { resolve4, resolve6 } from "node:dns/promises";

const BLOCKED_HOSTS = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "[::1]",
  "169.254.169.254", "metadata.google.internal",
]);

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  /^::1$/,
  /^::$/,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

export function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_RANGES.some((pattern) => pattern.test(ip));
}

export async function validateGatewayUrl(baseUrl: string): Promise<void> {
  let parsed: URL;

  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("Invalid gateway URL");
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`Gateway URL must use HTTPS (got ${parsed.protocol})`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname)) {
    throw new Error("Gateway URL points to a blocked host");
  }

  if (
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost")
  ) {
    throw new Error("Gateway URL points to a blocked host");
  }

  if (isPrivateIp(hostname)) {
    throw new Error("Gateway URL points to a private/reserved IP range");
  }

  const allAddresses: string[] = [];

  try {
    const ipv4Addresses = await resolve4(hostname);
    allAddresses.push(...ipv4Addresses);
  } catch {}

  try {
    const ipv6Addresses = await resolve6(hostname);
    allAddresses.push(...ipv6Addresses);
  } catch {}

  if (allAddresses.length === 0) {
    throw new Error(`Gateway hostname ${hostname} could not be resolved`);
  }

  for (const address of allAddresses) {
    if (isPrivateIp(address)) {
      throw new Error(`Gateway hostname ${hostname} resolves to private IP ${address}`);
    }
  }
}