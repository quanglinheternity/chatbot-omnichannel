import { getLicenseStatus } from "../enterprise/license/service"
import { ChatbotXException } from "../errors"
import { isCloud } from "../keys"

/**
 * Whether the current edition unlocks branding, email templates, and platform
 * help links. Self-hosted deployments are unlocked; Cloud deployments must
 * present a valid offline license.
 */
export const hasEnterpriseFeatures = async (): Promise<boolean> => {
  if (!isCloud()) {
    return true
  }

  const license = await getLicenseStatus()
  return license.state === "valid"
}

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
