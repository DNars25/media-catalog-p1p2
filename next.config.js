/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
    ],
    unoptimized: true,
  },
}

module.exports = nextConfig
```

Salve **CTRL + S** e feche. Depois:
```
git add next.config.js
```
```
git commit -m "liberar imagens TMDB sem otimizacao"
```
```
git push