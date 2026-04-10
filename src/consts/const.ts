export const DEFAULT_USE_PORT = false

export const EVENT_EXPAND = 'expand'

export const APP_DOM_ID = 'bilibili-subtitle'

export const IFRAME_ID = 'bilibili-subtitle-iframe'

export const STORAGE_ENV = 'bilibili-subtitle_env'
export const STORAGE_TEMP = 'bilibili-subtitle_temp'

export const PROMPT_TYPE_SUMMARIZE_BRIEF = 'summarize_brief'
export const PROMPT_TYPES = [{
  name: '总结',
  type: PROMPT_TYPE_SUMMARIZE_BRIEF,
}]

export const SUMMARIZE_TYPES = {
  brief: {
    name: '总结',
    desc: '一句话总结',
    downloadName: '💡视频总结💡',
    promptType: PROMPT_TYPE_SUMMARIZE_BRIEF,
  },
}

export const PROMPT_DEFAULTS = {
  [PROMPT_TYPE_SUMMARIZE_BRIEF]: `You are a helpful assistant that summarize video subtitle.
Summarize in language '{{language}}'.
Answer in markdown json format.

example output format:

\`\`\`json
{
  "summary": "brief summary"
}
\`\`\`

The video's title: '''{{title}}'''.
The video's subtitles:

'''
{{segment}}
'''`,
}

export const TASK_EXPIRE_TIME = 15*60*1000

export const PAGE_MAIN = 'main'
export const PAGE_SETTINGS = 'settings'

export const TOTAL_HEIGHT_MIN = 400
export const TOTAL_HEIGHT_DEF = 520
export const TOTAL_HEIGHT_MAX = 800
export const HEADER_HEIGHT = 44
export const TITLE_HEIGHT = 24
export const SEARCH_BAR_HEIGHT = 32
export const RECOMMEND_HEIGHT = 36

export const WORDS_RATE = 0.75
export const WORDS_MIN = 500
export const WORDS_MAX = 16000
export const WORDS_STEP = 500
export const SUMMARIZE_THRESHOLD = 100
export const SUMMARIZE_LANGUAGE_DEFAULT = 'cn'
export const SUMMARIZE_ALL_THRESHOLD = 5
export const DEFAULT_SERVER_URL_OPENAI = 'https://api.openai.com'
export const DEFAULT_SERVER_URL_GEMINI = 'https://generativelanguage.googleapis.com/v1beta/openai/'
export const CUSTOM_MODEL_TOKENS = 16385

export const MODEL_TIP = '推荐gpt-4o-mini，能力强，价格低，token上限大'
export const MODELS = [{
  code: 'gpt-4o-mini',
  name: 'gpt-4o-mini',
  tokens: 128000,
}, {
  code: 'gpt-3.5-turbo-0125',
  name: 'gpt-3.5-turbo-0125',
  tokens: 16385,
}, {
  code: 'custom',
  name: '自定义',
}]
export const MODEL_DEFAULT = MODELS[0].code
export const MODEL_MAP: {[key: string]: typeof MODELS[number]} = {}
for (const model of MODELS) {
  MODEL_MAP[model.code] = model
}

export const LANGUAGES = [{
  code: 'en',
  name: 'English',
}, {
  code: 'ja',
  name: '日本語',
}, {
  code: 'ena',
  name: 'American English',
}, {
  code: 'enb',
  name: 'British English',
}, {
  code: 'cn',
  name: '中文简体',
}, {
  code: 'cnt',
  name: '中文繁体',
}, {
  code: 'Spanish',
  name: 'español',
}, {
  code: 'French',
  name: 'Français',
}, {
  code: 'Arabic',
  name: 'العربية',
}, {
  code: 'Russian',
  name: 'русский',
}, {
  code: 'German',
  name: 'Deutsch',
}, {
  code: 'Portuguese',
  name: 'Português',
}, {
  code: 'Italian',
  name: 'Italiano',
}, {
  code: 'ko',
  name: '한국어',
}, {
  code: 'hi',
  name: 'हिन्दी',
}, {
  code: 'tr',
  name: 'Türkçe',
}, {
  code: 'nl',
  name: 'Nederlands',
}, {
  code: 'pl',
  name: 'Polski',
}, {
  code: 'sv',
  name: 'Svenska',
}, {
  code: 'vi',
  name: 'Tiếng Việt',
}, {
  code: 'th',
  name: 'ไทย',
}, {
  code: 'id',
  name: 'Bahasa Indonesia',
}, {
  code: 'el',
  name: 'Ελληνικά',
}, {
  code: 'he',
  name: 'עברית',
}]
export const LANGUAGES_MAP: {[key: string]: typeof LANGUAGES[number]} = {}
for (const language of LANGUAGES) {
  LANGUAGES_MAP[language.code] = language
}
