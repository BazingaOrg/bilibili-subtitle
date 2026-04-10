import {createSlice, PayloadAction} from '@reduxjs/toolkit'
import {find} from 'lodash-es'
import {DEFAULT_SERVER_URL_OPENAI, TOTAL_HEIGHT_DEF} from '../consts/const'

interface EnvState {
  envData: EnvData
  envReady: boolean

  tempData: TempData
  tempReady: boolean

  path?: 'app' | 'options'

  fold: boolean // fold app
  foldAll?: boolean // fold all segments
  autoScroll?: boolean
  checkAutoScroll?: boolean
  curOffsetTop?: number
  floatKeyPointsSegIdx?: number // segment的startIdx

  noVideo?: boolean
  totalHeight: number
  curIdx?: number // 从0开始
  needScroll?: boolean
  chapters?: Chapter[]
  infos?: any[]
  curInfo?: any
  curFetched?: boolean
  data?: Transcript
  uploadedTranscript?: Transcript
  segments?: Segment[]
  url?: string
  title?: string
  ctime?: number | null
  author?: string
  taskIds?: string[]
  lastSummarizeTime?: number

  /**
   * 是否输入中（中文）
   */
  inputting: boolean

  searchText: string
  searchResult: Record<string, boolean>

  // 当前视频是否计算过操作
  reviewAction: boolean
}

const initialState: EnvState = {
  envData: {
    serverUrl: DEFAULT_SERVER_URL_OPENAI,
    summarizeEnable: true,
    emailAutoSendEnabled: false,
    autoExpand: true,
    theme: 'light',
    searchEnabled: true,
  },
  tempData: {
  },
  totalHeight: TOTAL_HEIGHT_DEF,
  autoScroll: true,
  envReady: false,
  tempReady: false,
  fold: true,

  inputting: false,

  searchText: '',
  searchResult: {},

  reviewAction: false,
}

export const slice = createSlice({
  name: 'env',
  initialState,
  reducers: {
    setEnvData: (state, action: PayloadAction<EnvData>) => {
      state.envData = {
        ...state.envData,
        ...action.payload,
      }
    },
    setEnvReady: (state) => {
      state.envReady = true
    },
    setTempData: (state, action: PayloadAction<Partial<TempData>>) => {
      state.tempData = {
        ...state.tempData,
        ...action.payload,
      }
    },
    setReviewAction: (state, action: PayloadAction<boolean>) => {
      state.reviewAction = action.payload
    },
    setPath: (state, action: PayloadAction<'app' | 'options' | undefined>) => {
      state.path = action.payload
    },
    setTempReady: (state) => {
      state.tempReady = true
    },
    setSearchText: (state, action: PayloadAction<string>) => {
      state.searchText = action.payload
    },
    setSearchResult: (state, action: PayloadAction<Record<string, boolean>>) => {
      state.searchResult = action.payload
    },
    setFloatKeyPointsSegIdx: (state, action: PayloadAction<number | undefined>) => {
      state.floatKeyPointsSegIdx = action.payload
    },
    setFoldAll: (state, action: PayloadAction<boolean>) => {
      state.foldAll = action.payload
    },
    setTotalHeight: (state, action: PayloadAction<number>) => {
      state.totalHeight = action.payload
    },
    setTaskIds: (state, action: PayloadAction<string[]>) => {
      state.taskIds = action.payload
    },
    setLastSummarizeTime: (state, action: PayloadAction<number>) => {
      state.lastSummarizeTime = action.payload
    },
    addTaskId: (state, action: PayloadAction<string>) => {
      state.taskIds = [...(state.taskIds ?? []), action.payload]
    },
    delTaskId: (state, action: PayloadAction<string>) => {
      state.taskIds = state.taskIds?.filter(id => id !== action.payload)
    },
    setSummaryContent: (state, action: PayloadAction<{
      segmentStartIdx: number
      type: SummaryType
      content?: any
    }>) => {
      const segment = find(state.segments, {startIdx: action.payload.segmentStartIdx})
      if (segment != null) {
        let summary = segment.summaries[action.payload.type]
        if (!summary) {
          summary = {
            type: action.payload.type,
            status: 'done',
            content: action.payload.content,
          }
          segment.summaries[action.payload.type] = summary
        } else {
          summary.content = action.payload.content
        }
      }
    },
    setSummaryStatus: (state, action: PayloadAction<{
      segmentStartIdx: number
      type: SummaryType
      status: SummaryStatus
    }>) => {
      const segment = find(state.segments, {startIdx: action.payload.segmentStartIdx})
      if (segment != null) {
        let summary = segment.summaries[action.payload.type]
        if (summary) {
          summary.status = action.payload.status
        } else {
          summary = {
            type: action.payload.type,
            status: action.payload.status,
          }
          segment.summaries[action.payload.type] = summary
        }
      }
    },
    setSummaryError: (state, action: PayloadAction<{
      segmentStartIdx: number
      type: SummaryType
      error?: string
    }>) => {
      const segment = find(state.segments, {startIdx: action.payload.segmentStartIdx})
      if (segment != null) {
        let summary = segment.summaries[action.payload.type]
        if (summary) {
          summary.error = action.payload.error
        } else {
          summary = {
            type: action.payload.type,
            status: 'done',
            error: action.payload.error,
          }
          segment.summaries[action.payload.type] = summary
        }
      }
    },
    setSegmentFold: (state, action: PayloadAction<{
      segmentStartIdx: number
      fold: boolean
    }>) => {
      const segment = find(state.segments, {startIdx: action.payload.segmentStartIdx})
      if (segment != null) {
        segment.fold = action.payload.fold
      }
    },
    setCurIdx: (state, action: PayloadAction<number | undefined>) => {
      state.curIdx = action.payload
    },
    setAutoScroll: (state, action: PayloadAction<boolean>) => {
      state.autoScroll = action.payload
    },
    setCheckAutoScroll: (state, action: PayloadAction<boolean>) => {
      state.checkAutoScroll = action.payload
    },
    setCurOffsetTop: (state, action: PayloadAction<number | undefined>) => {
      state.curOffsetTop = action.payload
    },
    setNoVideo: (state, action: PayloadAction<boolean>) => {
      state.noVideo = action.payload
    },
    setNeedScroll: (state, action: PayloadAction<boolean>) => {
      state.needScroll = action.payload
    },
    setUrl: (state, action: PayloadAction<string | undefined>) => {
      state.url = action.payload
    },
    setTitle: (state, action: PayloadAction<string | undefined>) => {
      state.title = action.payload
    },
    setCtime: (state, action: PayloadAction<number | null | undefined>) => {
      state.ctime = action.payload
    },
    setAuthor: (state, action: PayloadAction<string | undefined>) => {
      state.author = action.payload
    },
    setChapters: (state, action: PayloadAction<Chapter[]>) => {
      state.chapters = action.payload
    },
    setInfos: (state, action: PayloadAction<any[]>) => {
      state.infos = action.payload
    },
    setCurInfo: (state, action: PayloadAction<any>) => {
      state.curInfo = action.payload
    },
    setCurFetched: (state, action: PayloadAction<boolean>) => {
      state.curFetched = action.payload
    },
    setData: (state, action: PayloadAction<Transcript | undefined>) => {
      state.data = action.payload
    },
    setUploadedTranscript: (state, action: PayloadAction<Transcript | undefined>) => {
      state.uploadedTranscript = action.payload
    },
    setSegments: (state, action: PayloadAction<Segment[] | undefined>) => {
      state.segments = action.payload
    },
    setFold: (state, action: PayloadAction<boolean>) => {
      state.fold = action.payload
    },
    setInputting: (state, action: PayloadAction<boolean>) => {
      state.inputting = action.payload
    },
  },
})

export const {
  setPath,
  setUrl,
  setTempReady,
  setTempData,
  setUploadedTranscript,
  setTotalHeight,
  setCheckAutoScroll,
  setCurOffsetTop,
  setFloatKeyPointsSegIdx,
  setFoldAll,
  setSegmentFold,
  setSummaryContent,
  setSummaryStatus,
  setSummaryError,
  setTitle,
  setSegments,
  setLastSummarizeTime,
  addTaskId,
  delTaskId,
  setTaskIds,
  setAutoScroll,
  setNoVideo,
  setReviewAction,
  setNeedScroll,
  setCurIdx,
  setEnvData,
  setEnvReady,
  setInfos,
  setCurInfo,
  setCurFetched,
  setData,
  setFold,
  setSearchText,
  setSearchResult,
  setInputting,
  setCtime,
  setAuthor,
  setChapters,
} = slice.actions

export default slice.reducer
