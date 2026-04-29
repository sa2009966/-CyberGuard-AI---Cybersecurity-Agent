/** @type {import('next').NextConfig} */
const nextConfig = {
  // CyberGuard AI - Production-ready Vercel deployment configuration
  
  // Webpack configuration for handling native modules and optional dependencies
  // This ensures discord.js native modules don't block the build even if installed
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark optional native modules as external so they're not bundled
      // These modules are only loaded at runtime if available
      config.externals = config.externals || {}
      
      // Ensure externals is a proper object
      if (Array.isArray(config.externals)) {
        const arr = config.externals
        config.externals = {}
        arr.forEach((ext) => {
          if (typeof ext === 'string') {
            config.externals[ext] = ext
          } else if (typeof ext === 'object') {
            Object.assign(config.externals, ext)
          }
        })
      }

      // Discord.js optional native modules - these won't block the build
      // if not found, discord.js will degrade gracefully
      const optionalNativeModules = [
        'zlib-sync',        // WebSocket compression
        'bufferutil',       // WebSocket performance
        'utf-8-validate',   // WebSocket validation
        'sharp',            // Image processing
        'sqlite3',          // Database
        'mysql2',           // Database
        'pg',               // Database
        'mongodb',          // Database
      ]

      optionalNativeModules.forEach((module) => {
        config.externals[module] = module
      })
    }

    return config
  },

  // Experimental flags for better bundling
  experimental: {
    // Allows webpack config to work alongside Turbopack
    esmExternals: true,
  },
}

module.exports = nextConfig
