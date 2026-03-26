/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [480, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 24, 32, 40, 48, 56, 64, 96, 128, 256, 320],
  },
};

export default nextConfig;
