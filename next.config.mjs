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
    return [
      {
        source: "/app-inventor/:path*",
        destination: "http://localhost:8888/:path*",
      },
      {
        source: "/app-inventor",
        destination: "http://localhost:8888/",
      },
      {
        source: "/ode/:path*",
        destination: "http://localhost:8888/ode/:path*",
      },
      {
        source: "/login",
        destination: "http://localhost:8888/login",
      },
      {
        source: "/login/:path*",
        destination: "http://localhost:8888/login/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        // Cross-origin isolation required for WebContainers (SharedArrayBuffer).
        // credentialless (not require-corp) so external images/fonts and
        // third-party scripts can still load.
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
      {
        // Razorpay checkout pages need permissive COEP/COOP to load the checkout SDK.
        // This override must come AFTER the global rule so it wins when both match.
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
