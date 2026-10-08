import type { NextConfig } from "next";
const config: NextConfig = { poweredByHeader: false, reactStrictMode: true, transpilePackages: ["@dibora/core", "@dibora/types", "@dibora/validation"] };
export default config;
