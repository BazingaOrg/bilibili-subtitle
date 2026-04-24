import {TASK_EXPIRE_TIME} from '../consts/const'
import {handleChatCompleteTask, repairSummaryJson} from './openaiService'
import {finalizeVideoSummary, parseSummaryContentStrict, updateVideoSummaryStage} from './summarySessionService'
import {ensureSummaryEmailSent} from './summaryEmailService'
import {ensureLegacyApiSecretReady, getApiSecret} from './secretService'

export const tasksMap = new Map<string, Task>()

const getApiSecretOrThrow = async () => {
  await ensureLegacyApiSecretReady()
  const apiKey = await getApiSecret()
  if (apiKey == null) {
    throw new Error('API key is not configured')
  }
  return apiKey
}

const tryRepairSummaryTaskContent = async (task: Task, apiKey: string) => {
  if (task.def.extra?.summaryAutoRepair !== true) {
    return
  }

  const content = task.resp?.choices?.[0]?.message?.content?.trim()
  if (typeof content !== 'string' || content.length === 0) {
    return
  }

  const strictParseResult = parseSummaryContentStrict(content)
  if (strictParseResult.error == null) {
    return
  }

  const summarySessionKey = task.def.extra?.summarySessionKey as string | undefined
  if (typeof summarySessionKey === 'string' && summarySessionKey.length > 0) {
    await updateVideoSummaryStage({
      sessionKey: summarySessionKey,
      recoveryStage: 'repairing',
      clearStreamingContent: false,
    })
  }

  const repairedContent = await repairSummaryJson({
    serverUrl: task.def.serverUrl,
    apiKey,
    model: task.def.data?.model,
    content,
  })

  task.resp = {
    choices: [
      {
        message: {
          content: repairedContent,
        },
      },
    ],
  }
}

const rerunChatCompleteTask = async (task: Task, apiKey: string) => {
  if (task.def.extra?.summaryAutoRetry !== true) {
    throw new Error(task.error ?? 'Summary auto retry disabled')
  }

  const summarySessionKey = task.def.extra?.summarySessionKey as string | undefined
  if (typeof summarySessionKey === 'string' && summarySessionKey.length > 0) {
    await updateVideoSummaryStage({
      sessionKey: summarySessionKey,
      recoveryStage: 'retrying',
      clearStreamingContent: true,
    })
  }

  const modelName = String(task.def.data?.model ?? '').toLowerCase()
  const nextTemperature = Number(task.def.data?.temperature)
  if (Number.isFinite(nextTemperature) && nextTemperature > 0) {
    task.def.data = {
      ...task.def.data,
      temperature: modelName.startsWith('kimi')
        ? 1
        : Math.max(0, Math.min(nextTemperature, 0.2)),
    }
  }

  task.error = undefined
  task.resp = undefined
  await handleChatCompleteTask(task, apiKey)
}

export const handleTask = async (task: Task) => {
  console.debug(`处理任务: ${task.id} (type: ${task.def.type})`)
  try {
    task.status = 'running'
    switch (task.def.type) {
      case 'chatComplete': {
        const apiKey = await getApiSecretOrThrow()
        await handleChatCompleteTask(task, apiKey)
        break
      }
      default:
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`任务类型不支持: ${task.def.type}`)
    }

    console.debug(`处理任务成功: ${task.id} (type: ${task.def.type})`)
  } catch (e: any) {
    console.debug(`处理任务失败，准备重试: ${task.id} (type: ${task.def.type})`, e.message)

    try {
      switch (task.def.type) {
        case 'chatComplete': {
          const apiKey = await getApiSecretOrThrow()
          await rerunChatCompleteTask(task, apiKey)
          console.debug(`处理任务重试成功: ${task.id} (type: ${task.def.type})`)
          break
        }
        default:
          throw e
      }
    } catch (retryError: any) {
      task.error = retryError?.message ?? e.message
      console.debug(`处理任务失败: ${task.id} (type: ${task.def.type})`, task.error)
    }
  }

  if (task.error == null && task.def.type === 'chatComplete') {
    try {
      const apiKey = await getApiSecretOrThrow()
      await tryRepairSummaryTaskContent(task, apiKey)
    } catch (repairError: any) {
      console.debug(`总结修复失败，保留原始结果: ${task.id} (type: ${task.def.type})`, repairError?.message ?? repairError)
    }
  }

  task.status = 'done'
  task.endTime = Date.now()

  const summarySessionKey = task.def.extra?.summarySessionKey as string | undefined
  if (typeof summarySessionKey === 'string' && summarySessionKey.length > 0) {
    const content = task.resp?.choices?.[0]?.message?.content?.trim()
    finalizeVideoSummary({
      sessionKey: summarySessionKey,
      content,
      taskError: task.error,
    }).then(async () => {
      await ensureSummaryEmailSent(summarySessionKey)
    }).catch(console.error)
  }
}

export const initTaskService = () => {
  // 处理任务: tasksMap
  setInterval(() => {
    for (const task of tasksMap.values()) {
      if (task.status === 'pending') {
        handleTask(task).catch(console.error)
        break
      } else if (task.status === 'running') {
        break
      }
    }
  }, 1000)
  // 检测清理tasksMap
  setInterval(() => {
    const now = Date.now()

    for (const [taskId, task] of tasksMap) {
      if (task.startTime < now - TASK_EXPIRE_TIME) {
        tasksMap.delete(taskId)
        console.debug(`清理任务: ${task.id} (type: ${task.def.type})`)
      }
    }
  }, 10000)
}
