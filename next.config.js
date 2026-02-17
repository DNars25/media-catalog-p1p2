/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingExcludes: {
    '*': [
      './node_modules/@swc/core-linux-x64-gnu',
      './node_modules/@swc/core-linux-x64-musl',
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
    ],
  },
}

module.exports = nextConfig