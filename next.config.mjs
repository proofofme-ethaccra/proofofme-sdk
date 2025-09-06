/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // 🚀 disables ESLint on Vercel & next build
  },
};

export default nextConfig;
