import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import type { HandoffRuntimeConfig } from "../ports/config-repo";
import type { ChannelAdapter } from "../ports/channel-adapter";

export type DispatchInput = {
  config: HandoffRuntimeConfig;
  message: string;
  // Used when notify_channel is 'telegram' — reuses the same bot adapter.
  channelAdapter: ChannelAdapter | null;
  // Optional metadata bundled into webhook payloads.
  payload?: Record<string, unknown>;
};

export type DispatchResult =
  | { ok: true }
  | { ok: false; reason: string };

const WEBHOOK_TIMEOUT_MS = 5_000;

export async function dispatchHandoffNotification(
  input: DispatchInput,
): Promise<DispatchResult> {
  const { config, message, channelAdapter, payload } = input;
  if (!config.notifyTarget) {
    return { ok: false, reason: "notify_target not configured" };
  }

  switch (config.notifyChannel) {
    case "telegram": {
      if (!channelAdapter) {
        return { ok: false, reason: "no channel adapter for telegram notify" };
      }
      await channelAdapter.notifyOwner(config.notifyTarget, message);
      return { ok: true };
    }
    case "webhook": {
      const guard = await guardWebhookUrl(config.notifyTarget);
      if (!guard.ok) return { ok: false, reason: guard.reason };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
      try {
        const res = await fetch(config.notifyTarget, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message, ...(payload ?? {}) }),
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) {
          return { ok: false, reason: `webhook ${res.status}` };
        }
        return { ok: true };
      } catch (err) {
        const reason =
          err instanceof Error && err.name === "AbortError"
            ? "webhook timeout"
            : "webhook fetch failed";
        return { ok: false, reason };
      } finally {
        clearTimeout(timer);
      }
    }
    case "email":
      // Free Supabase plan doesn't include email; UI hides this option.
      return { ok: false, reason: "email notify not implemented" };
  }
}

// SSRF guard: parse the URL, allow https only, resolve the hostname, and
// reject private / loopback / link-local IPs. notify_target is admin input
// and would otherwise let an attacker hit cloud IMDS or internal services and
// exfiltrate the payload (tenantId, conversationId, message body).
async function guardWebhookUrl(
  raw: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "invalid webhook url" };
  }
  if (url.protocol !== "https:") {
    return { ok: false, reason: "webhook must use https" };
  }
  const hostname = url.hostname;
  const ipVersion = isIP(hostname);
  const candidates: string[] = [];
  if (ipVersion) {
    candidates.push(hostname);
  } else {
    try {
      const records = await lookup(hostname, { all: true });
      for (const r of records) candidates.push(r.address);
    } catch {
      return { ok: false, reason: "dns resolve failed" };
    }
  }
  for (const ip of candidates) {
    if (isBlockedIp(ip)) {
      return { ok: false, reason: "webhook target resolves to blocked ip" };
    }
  }
  return { ok: true };
}

function isBlockedIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return isBlockedIPv4(ip);
  if (v === 6) return isBlockedIPv6(ip);
  // Unknown format — treat as blocked to fail closed.
  return true;
}

function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local (incl. AWS/GCP IMDS)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isBlockedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // loopback / unspecified
  if (lower.startsWith("fe80:") || lower.startsWith("fe80::")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA fc00::/7
  if (lower.startsWith("ff")) return true; // multicast
  if (lower.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 — re-check as v4
    const v4 = lower.slice(7);
    if (isIP(v4) === 4) return isBlockedIPv4(v4);
  }
  return false;
}
