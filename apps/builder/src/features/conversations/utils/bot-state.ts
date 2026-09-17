import type { ConversationModel } from "@chatbotx.io/database/types"
import { isPast } from "date-fns"

export function isConversationActive(
  conversation: Pick<ConversationModel, "botEnabled" | "botResumeAt">,
): boolean {
  if (conversation.botEnabled) {
    return true
  }

  if (!conversation.botResumeAt) {
    return false
  }

  return isPast(new Date(conversation.botResumeAt))
}
