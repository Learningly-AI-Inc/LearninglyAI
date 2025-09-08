/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'upload.wikimedia.org'],
    formats: ['image/webp', 'image/avif'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable compression
  compress: true,
  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude PDF.js from server-side rendering
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Suppress Adobe PDF Services SDK warnings
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
      /Module not found: Can't resolve 'fs'/,
      /Module not found: Can't resolve 'path'/,
    ];

    return config;
  },
  // Security headers for legal platform
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        // Ensure PDFs are served with correct MIME type and can be embedded
        source: '/uploads/:path*.pdf',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/pdf',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN', // Allow embedding in same origin
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig