// Next.js config.
//
// On Netlify the frontend and the API run on the same origin: the API is a
// Function reachable at /.netlify/functions/api, and netlify.toml redirects
// /api/* and /storage/* to it. So in production NEXT_PUBLIC_API_URL is empty
// and the client just calls /api/... directly — no rewrite needed here.
//
// For local dev we keep a /api/proxy/* rewrite that fans out to the standalone
// Express on :4000, so you can hit a same-origin URL during development too.
const config = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL;
    if (!api) return []; // production / same-origin
    return [{ source: '/api/proxy/:path*', destination: `${api}/api/:path*` }];
  },
};
export default config;
