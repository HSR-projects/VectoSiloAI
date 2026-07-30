/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.google.com" },
      { protocol: "https", hostname: "**" },
    ],
  },
  async rewrites() {
    return [];
  },
  async headers() {
    return [
      {
        // Allow cross-origin map embeds (OpenStreetMap), videos, and SDKs in Firefox and Chrome.
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
        ],
      },
      {
        // Razorpay checkout pages need permissive COEP/COOP to load the checkout SDK.
        source: "/razorpay/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
        ],
      },
      {
        // Published project view pages render srcDoc iframes that load
        // cross-origin scripts (Babel CDN, esm.sh). Relax COEP so those
        // resources aren't blocked.
        source: "/view/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias["@mediapipe/pose"] = false;
    config.resolve.alias["@tensorflow/tfjs-backend-webgpu"] = false;
    return config;
  },
};

export default nextConfig;
