/** @type {import('next').NextConfig} */
const nextConfig = {
  // CyberGuard AI - Serverless optimized configuration
  // Note: Discord adapter removed to avoid bundling discord.js native modules (zlib-sync, bufferutil, utf-8-validate)
  // Only Slack adapter is active in this serverless deployment
}

module.exports = nextConfig
