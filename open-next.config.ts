import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Defaults only: no R2 / KV / D1 bindings, so everything stays on the free tier.
export default defineCloudflareConfig();
