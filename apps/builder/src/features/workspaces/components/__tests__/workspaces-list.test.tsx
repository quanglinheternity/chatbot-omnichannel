// @vitest-environment jsdom

import type React from "react"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { WorkspaceResource } from "../../schema/resource"

function translate(key: string, values?: { feature?: string; name?: string }) {
  if (key === "actions.createFeature") {
    return `Create ${values?.feature ?? ""}`
  }
  if (key === "fields.workspace.label") {
    return "Workspace"
  }
  if (key === "home.welcomeBack") {
    return `Welcome back, ${values?.name ?? ""}`
  }
  return key
}

vi.mock("next-intl/server", () => ({
  getTranslations: async () => translate,
}))

vi.mock("@chatbotx.io/business", () => ({
  isWorkspaceScheduledForDeletion: () => false,
}))

vi.mock("@/env", () => ({
  isCloud: () => false,
}))

vi.mock("@/enterprise/features/billing/upgrade-plan-dialog", () => ({
  UpgradePlanButton: ({ children }: { children?: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}))

vi.mock("../workspace-status-switch", () => ({
  WorkspaceStatusSwitch: () => null,
}))

const { default: WorkspacesList } = await import("../workspaces-list")

const USER = {
  name: "Jane Doe",
  email: "jane@example.test",
  image: null,
}

const EXISTING_WORKSPACE = {
  id: "workspace-1",
  name: "Existing workspace",
  logo: null,
  isActive: true,
  startTime: null,
  endTime: null,
  scheduledDeletionAt: null,
} as WorkspaceResource

describe("workspaces list", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it("offers creating another workspace when one already exists", async () => {
    const element = await WorkspacesList({
      user: USER,
      workspaces: [EXISTING_WORKSPACE],
    })

    act(() => root.render(element))

    const createLink = container.querySelector<HTMLAnchorElement>(
      'a[href="/channels/create"]',
    )
    expect(createLink?.textContent).toContain("Create Workspace")
  })
})
