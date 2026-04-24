import {STORAGE_ENV} from '@/consts/const'

const STORAGE_API_SECRET = 'makunabe_secret_v1'
let secretMigrationPromise: Promise<void> | undefined

interface SecretPayload {
  apiKey?: string
}

const normalizeApiKey = (apiKey?: string) => {
  if (typeof apiKey !== 'string') {
    return ''
  }
  return apiKey.trim()
}

const parseSecretPayload = (rawValue: unknown): SecretPayload => {
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    return {}
  }

  try {
    const parsed = JSON.parse(rawValue) as SecretPayload
    return typeof parsed === 'object' && parsed != null ? parsed : {}
  } catch {
    return {}
  }
}

const readEnvDataFromSyncStorage = async (): Promise<Record<string, unknown> | undefined> => {
  const result = await chrome.storage.sync.get(STORAGE_ENV)
  const rawValue = result?.[STORAGE_ENV]
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    return undefined
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>
    return typeof parsed === 'object' && parsed != null ? parsed : undefined
  } catch {
    return undefined
  }
}

const writeEnvDataToSyncStorage = async (envData: Record<string, unknown>) => {
  await chrome.storage.sync.set({
    [STORAGE_ENV]: JSON.stringify(envData),
  })
}

const syncSecretStatusToEnvData = async (configured: boolean) => {
  const envData = (await readEnvDataFromSyncStorage()) ?? {}
  delete envData.apiKey
  envData.apiKeyConfigured = configured
  await writeEnvDataToSyncStorage(envData)
}

export const getApiSecret = async (): Promise<string | undefined> => {
  const result = await chrome.storage.local.get(STORAGE_API_SECRET)
  const payload = parseSecretPayload(result?.[STORAGE_API_SECRET])
  const apiKey = normalizeApiKey(payload.apiKey)
  return apiKey.length > 0 ? apiKey : undefined
}

export const hasApiSecret = async () => {
  return (await getApiSecret()) != null
}

export const setApiSecret = async (apiKey: string) => {
  const normalizedApiKey = normalizeApiKey(apiKey)
  if (normalizedApiKey.length === 0) {
    throw new Error('API key is empty')
  }

  await chrome.storage.local.set({
    [STORAGE_API_SECRET]: JSON.stringify({
      apiKey: normalizedApiKey,
    } satisfies SecretPayload),
  })
  await syncSecretStatusToEnvData(true)
}

export const clearApiSecret = async () => {
  await chrome.storage.local.remove(STORAGE_API_SECRET)
  await syncSecretStatusToEnvData(false)
}

export const migrateLegacyApiSecret = async () => {
  const envData = await readEnvDataFromSyncStorage()
  if (envData == null) {
    return
  }

  const legacyApiKey = normalizeApiKey(envData.apiKey as string | undefined)
  const currentApiKey = await getApiSecret()
  const nextApiKey = currentApiKey ?? (legacyApiKey.length > 0 ? legacyApiKey : undefined)

  if (currentApiKey == null && legacyApiKey.length > 0) {
    await chrome.storage.local.set({
      [STORAGE_API_SECRET]: JSON.stringify({
        apiKey: legacyApiKey,
      } satisfies SecretPayload),
    })
  }

  delete envData.apiKey
  envData.apiKeyConfigured = nextApiKey != null
  await writeEnvDataToSyncStorage(envData)
}

export const ensureLegacyApiSecretReady = async () => {
  if (secretMigrationPromise == null) {
    secretMigrationPromise = migrateLegacyApiSecret().catch((error) => {
      secretMigrationPromise = undefined
      throw error
    })
  }

  await secretMigrationPromise
}
