import {DEFAULT_SERVER_URL_OPENAI} from '../consts/const'

export interface ModelDiscoveryResult {
  models: string[]
}

export const getServerUrl = (serverUrl?: string) => {
  if (serverUrl == null || serverUrl.length === 0) {
    return DEFAULT_SERVER_URL_OPENAI
  }
  if (serverUrl.endsWith('/')) {
    serverUrl = serverUrl.slice(0, -1)
  }
  // 如果serverUrl以https://generativelanguage.googleapis.com开头，则直接返回
  if (serverUrl.toLowerCase().startsWith('https://generativelanguage.googleapis.com')) {
    return serverUrl
  }
  // 如果serverUrl不以/vxxx结尾，则添加/v1
  if (!/\/v\d+$/.test(serverUrl.toLowerCase())) {
    serverUrl += '/v1'
  }
  return serverUrl
}

const getErrorMessage = async (resp: Response) => {
  try {
    const data = await resp.json() as { error?: { message?: string }, message?: string }
    return data.error?.message ?? data.message
  } catch {
    return undefined
  }
}

export const discoverModels = async (params: { serverUrl?: string, apiKey?: string }): Promise<ModelDiscoveryResult> => {
  const serverUrl = getServerUrl(params.serverUrl)
  const resp = await fetch(`${serverUrl}/models`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(typeof params.apiKey === 'string' && params.apiKey.length > 0 ? {Authorization: 'Bearer ' + params.apiKey} : {}),
    },
  })
  if (!resp.ok) {
    const errorMessage = await getErrorMessage(resp)
    throw new Error(errorMessage ?? `Failed to fetch model list: ${resp.status}`)
  }

  const data = await resp.json() as { data?: Array<{ id?: string }> }
  const modelSet = new Set<string>()
  for (const item of data.data ?? []) {
    if (typeof item.id === 'string' && item.id.trim().length > 0) {
      modelSet.add(item.id.trim())
    }
  }
  const models = [...modelSet]
  if (models.length === 0) {
    throw new Error('No models returned from server')
  }
  return {models}
}

export const handleChatCompleteTask = async (task: Task) => {
  const data = task.def.data
  const serverUrl = getServerUrl(task.def.serverUrl)
  const resp = await fetch(`${serverUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + task.def.extra.apiKey,
    },
    body: JSON.stringify(data),
  })
  task.resp = await resp.json()
  const responsePayload = task.resp as {
    usage?: { total_tokens?: number }
    error?: { code?: string, message?: string }
  }

  if (responsePayload.usage != null) {
    return (responsePayload.usage.total_tokens ?? 0) > 0
  }

  const errorCode = responsePayload.error?.code ?? ''
  const errorMessage = responsePayload.error?.message ?? ''
  throw new Error(`${errorCode} ${errorMessage}`.trim())
}
