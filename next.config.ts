import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // The Agent SDK spawns a native Claude Code binary: keep it out of the bundle.
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
  // In `next dev`, pages opened from another host (phone via Tailscale or LAN IP)
  // must be allowed, otherwise the page loads but buttons stay dead (no JS).
  allowedDevOrigins: ["*.trycloudflare.com", "*.ts.net", "192.168.*.*", "10.*.*.*", "100.*.*.*"],
};
export default nextConfig;
