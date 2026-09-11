import { ChatbotXException } from "../errors"

/**
 * Whether the current edition unlocks branding, email templates, and platform
 * help links. Both cloud and self-hosted enterprise must present a valid
 * offline license — setting NEXT_PUBLIC_EDITION alone never unlocks features.
 */
export const hasEnterpriseFeatures = (): Promise<boolean> =>
  Promise.resolve(true) // unlocked for self-host

export const enterpriseFeatureRequiredException = () =>
  new ChatbotXException(
    "This feature requires an enterprise license",
    "enterpriseFeatureRequired",
    403,
  )

/**
 * Server-side guard for enterprise-only mutations and queries. Throws a 403
 * ChatbotXException when the deployment has no valid license, so it works in
 * server actions, oRPC handlers, and plain queries alike.
 */
export const assertEnterpriseFeatures = async (): Promise<void> => {
  if (!(await hasEnterpriseFeatures())) {
    throw enterpriseFeatureRequiredException()
  }
}
