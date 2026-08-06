import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    incomingRequests: {
      // Appwrite returns one-time OAuth credentials in this callback URL.
      // Keep the complete query string out of local development logs.
      ignore: [/\/auth\/google\/callback(?:\?|$)/],
    },
  },
};

export default nextConfig;
