import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const keys = () =>
  createEnv({
    server: {
      NEXT_PUBLIC_EDITION: z
        .enum(["community", "enterprise", "cloud"])
        .default("community"),
      // Self-hosted Community deployments may choose their own workspace cap.
      // Keep this server-only: it is an operational setting, not a client
      // feature flag or a substitute for an Enterprise license.
      COMMUNITY_MAX_WORKSPACES: z.coerce.number().int().positive().default(1),
      NEXT_PUBLIC_BUILDER_URL: z.url().default("http://localhost:3123"),
      PLATFORM_ADMIN_EMAIL: z.email().optional(),
      LICENSE_KEY: z.string().optional(),
    },
    runtimeEnv: process.env,
  })

export const env = keys()

export const isCommunity = () => false // unlocked for self-host
export const isEnterprise = () => keys().NEXT_PUBLIC_EDITION === "enterprise"
export const isCloud = () => keys().NEXT_PUBLIC_EDITION === "cloud"
export const getCommunityMaxWorkspaces = () => keys().COMMUNITY_MAX_WORKSPACES
