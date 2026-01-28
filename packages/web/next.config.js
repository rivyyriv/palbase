/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@palbase/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.petfinder.com',
      },
      {
        protocol: 'https',
        hostname: '**.adoptapet.com',
      },
      {
        protocol: 'https',
        hostname: '**.aspca.org',
      },
      {
        protocol: 'https',
        hostname: '**.bestfriends.org',
      },
      {
        protocol: 'https',
        hostname: '**.petsmartcharities.org',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
    ],
  },
};

module.exports = nextConfig;
