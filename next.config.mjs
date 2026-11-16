/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // cacheComponents and partialPrefetching were switched off here: they speed up
  // public pages rendered on the server. This app is private and loads its data
  // in the browser after login, so they only produced warnings.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
