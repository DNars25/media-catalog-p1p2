/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['image.tmdb.org'],
  },
}

module.exports = nextConfig
