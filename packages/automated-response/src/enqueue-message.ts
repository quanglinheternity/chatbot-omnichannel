import { aiAgentService, workspaceService } from "@chatbotx.io/business"
import { isSmartResponseDelayOption } from "@chatbotx.io/database/partials"
import { simpleQueue } from "@chatbotx.io/redis"
import { AIJobAction, aiAgentQueue } from "@chatbotx.io/worker-config"
import { getKey } from "./constants"
import { matchesAnyKeywordRule } from "./keyword-match"
import { logger } from "./lib/logger"
import {
  isSmartDelayEligible,
  resolveAutomatedResponseTiming,
} from "./smart-delay"
import { automatedResponseService } from "./utils"

export const enqueueMessage = async (props: {
  conversationId: string
  contactInboxId: string
  messageId: string
  messageText?: string
  workspaceId: string
  /** Defer processing until a human-handoff pause expires. */
  deferUntil?: Date
}) => {
  const key = getKey(props)
  let timing = resolveAutomatedResponseTiming(null)

  try {
    const workspace = await workspaceService.findById({ id: props.workspaceId })
    const workspaceDelay = workspace?.smartResponseDelaySeconds

    if (isSmartResponseDelayOption(workspaceDelay)) {
      const [allAutomatedResponses, aiAgent] = await Promise.all([
        props.messageText
          ? automatedResponseService.getAll(props.workspaceId)
          : Promise.resolve([]),
        aiAgentService.findDefault(props.workspaceId),
      ])
      const keywordRules = allAutomatedResponses.filter(
        (rule) => rule.type === "inbound",
      )
      const matchesKeyword = props.messageText
        ? matchesAnyKeywordRule(props.messageText, keywordRules)
        : false

      timing = resolveAutomatedResponseTiming(
        isSmartDelayEligible({
          hasAiAgent: Boolean(aiAgent),
          matchesKeyword,
          workspaceDelay,
        })
          ? workspace
          : null,
      )
    } else {
      timing = resolveAutomatedResponseTiming(workspace)
    }
  } catch (error) {
    logger.warn(error, "Smart delay lookup failed; using default timing")
  }

  // A message received while a human has control must remain queued until the
  // configured handoff window expires. Keep the delay and deduplication TTL
  // aligned so the delayed job can still read the message id from Redis.
  const deferDelaySeconds = props.deferUntil
    ? Math.max(0, Math.ceil((props.deferUntil.getTime() - Date.now()) / 1000))
    : 0
  const delaySeconds = Math.max(timing.delaySeconds, deferDelaySeconds)
  const deduplicationTtlSeconds = props.deferUntil
    ? delaySeconds + timing.ttlSeconds
    : timing.ttlSeconds
  const messageQueueTtlSeconds = Math.max(
    timing.ttlSeconds * 5000,
    delaySeconds + timing.ttlSeconds + 60,
  )

  try {
    await Promise.all([
      aiAgentQueue.add(
        AIJobAction.processAutomatedResponse,
        {
          type: AIJobAction.processAutomatedResponse,
          data: {
            conversationId: props.conversationId,
            contactInboxId: props.contactInboxId,
            messageId: props.messageId,
          },
        },
        {
          deduplication: {
            id: key,
            ttl: deduplicationTtlSeconds * 1000,
            extend: true,
            replace: true,
          },
          delay: delaySeconds * 1000,
          jobId: `automated-response-${props.messageId}`,
        },
      ),
      simpleQueue.enqueue(
        key,
        props.messageId,
        messageQueueTtlSeconds, // keep the key longer than process job
      ),
    ])
  } catch (error) {
    logger.error(error, "Unable to trigger automated response")
  }
}
