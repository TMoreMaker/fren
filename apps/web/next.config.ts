import type { NextConfig } from 'next'

// Next reads apps/web/.env, which is a symlink to the root .env (see README).
const nextConfig: NextConfig = {
  reactStrictMode: true,
}

export default nextConfig
