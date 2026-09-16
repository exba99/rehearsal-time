import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // The Agent SDK spawns a native Claude Code binary: keep it out of the bundle.
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
  // Allow the dev server to be opened through a Tailscale HTTPS hostname.
  allowedDevOrigins: ["*.ts.net"],
};
export default nextConfig;
