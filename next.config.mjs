import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The parent home directory contains unrelated lockfiles. Pin tracing to
  // this deployment root so Vercel packages only this Next application.
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
