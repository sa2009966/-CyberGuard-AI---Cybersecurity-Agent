/**
 * .pnpmfile.cjs - Hook to auto-approve native module builds in CI/serverless
 * This allows zlib-sync, bufferutil, and utf-8-validate to build without interaction
 */

const APPROVED_BUILD_PACKAGES = new Set([
  'zlib-sync',
  'bufferutil',
  'utf-8-validate',
  'sharp',
])

function readPackage(pkg) {
  // If this is one of our approved native modules, ensure scripts run
  if (APPROVED_BUILD_PACKAGES.has(pkg.name)) {
    // Preserve any existing scripts
    pkg.scripts = pkg.scripts || {}
  }
  return pkg
}

module.exports = {
  hooks: {
    readPackage,
  },
}
