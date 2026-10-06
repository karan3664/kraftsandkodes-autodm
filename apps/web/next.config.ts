import type { NextConfig } from "next";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR || ".next",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@kdl/db", "@kdl/shared", "@kdl/instagram"],
  serverExternalPackages: [
    "@prisma/client",
    "bcryptjs",
    "ioredis",
    "razorpay",
    "nodemailer",
  ],
  logging: {
    // Dev access log prints full URLs; keep OAuth codes and verify tokens out of it.
    incomingRequests: {
      ignore: [/^\/api\/instagram\/callback/, /^\/api\/webhooks\/instagram/],
    },
  },
};

export default nextConfig;
