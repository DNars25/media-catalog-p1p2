/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
    ],
  },
  webpack: (config) => {
    return config
  },
}

module.exports = nextConfig
```

Salve com **CTRL + S** e feche.

Depois no **Git Bash**, vamos também testar o build localmente. Digite:
```
pnpm install