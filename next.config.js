/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // The cached snapshots live in ./data and are read at runtime by the
  // /api/data route. The path is computed, so the file tracer cannot see it;
  // include the directory explicitly or the deployment ships without data.
  outputFileTracingIncludes: {
    '/*': ['./data/**/*'],
  },
};

module.exports = nextConfig;
