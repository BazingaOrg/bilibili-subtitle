import {useAppDispatch, useAppSelector} from './redux'
import {useContext, useEffect} from 'react'
import {
  setCurFetched,
  setCurIdx,
  setCurInfo,
  setData,
  setFoldAll,
  setNoVideo,
  setSegmentFold,
  setSegments,
  setTotalHeight,
  setTempData,
} from '../redux/envReducer'
import {EventBusContext} from '../Router'
import {EVENT_EXPAND, TOTAL_HEIGHT_MAX, TOTAL_HEIGHT_MIN, WORDS_MIN, WORDS_RATE} from '../consts/const'
import {useAsyncEffect, useInterval} from 'ahooks'
import {getModelMaxTokens, getWholeText} from '../utils/bizUtil'
import { useMessage } from './useMessageService'
import { setCurrentTime } from '../redux/currentTimeReducer'
import { RootState } from '../store'
import {logMessagingError} from '@/utils/messageError'

/**
 * Service是单例，类似后端的服务概念
 */
const useSubtitleService = () => {
  const dispatch = useAppDispatch()
  const infos = useAppSelector(state => state.env.infos)
  const curInfo = useAppSelector(state => state.env.curInfo)
  const curFetched = useAppSelector(state => state.env.curFetched)
  const fold = useAppSelector(state => state.env.fold)
  const envReady = useAppSelector(state => state.env.envReady)
  const envData = useAppSelector((state: RootState) => state.env.envData)
  const data = useAppSelector((state: RootState) => state.env.data)
  const chapters = useAppSelector((state: RootState) => state.env.chapters)
  const currentTime = useAppSelector((state: RootState) => state.currentTime.currentTime)
  const curIdx = useAppSelector((state: RootState) => state.env.curIdx)
  const eventBus = useContext(EventBusContext)
  const needScroll = useAppSelector(state => state.env.needScroll)
  const segments = useAppSelector(state => state.env.segments)
  const reviewed = useAppSelector(state => state.env.tempData.reviewed)
  const reviewActions = useAppSelector(state => state.env.tempData.reviewActions)
  const {sendInject} = useMessage(Boolean(envData.sidePanel))

  // 如果reviewActions达到15次，则设置reviewed为false
  useEffect(() => {
    if (reviewed === undefined && reviewActions != null && reviewActions >= 15) {
      dispatch(setTempData({
        reviewed: false
      }))
    }
  }, [reviewActions, dispatch, reviewed])

  // 有数据时自动展开
  useEffect(() => {
    if ((data != null) && data.body.length > 0) {
      eventBus.emit({
        type: EVENT_EXPAND
      })
    }
  }, [data, eventBus, infos])

  // 当前未展示 & (未折叠 | 自动展开) & 有列表 => 展示第一个
  useEffect(() => {
    let autoExpand = envData.autoExpand
    // 如果显示在侧边栏，则自动展开
    if (envData.sidePanel === true) {
      autoExpand = true
    }
    const shouldAutoExpand = autoExpand === true
    if (curInfo == null && (!fold || (envReady && shouldAutoExpand)) && infos != null && infos.length > 0) {
      dispatch(setCurInfo(infos[0]))
      dispatch(setCurFetched(false))
    }
  }, [curInfo, dispatch, envData.autoExpand, envReady, fold, infos, envData.sidePanel])
  // 获取
  useEffect(() => {
    if (curInfo != null && curFetched !== true) {
      sendInject(null, 'GET_SUBTITLE', {info: curInfo}).then(data => {
        data?.body?.forEach((item: TranscriptItem, idx: number) => {
          item.idx = idx
        })
        // dispatch(setCurInfo(data.data.info))
        dispatch(setCurFetched(true))
        dispatch(setData(data))

        console.debug('subtitle', data)
      }).catch(error => {
        logMessagingError('GET_SUBTITLE', error)
      })
    }
  }, [curFetched, curInfo, dispatch, sendInject])

  useAsyncEffect(async () => {
    // 初始获取列表
    if (envReady) {
      sendInject(null, 'REFRESH_VIDEO_INFO', {force: true}).catch(error => {
        logMessagingError('REFRESH_VIDEO_INFO', error)
      })
    }
  }, [envReady, sendInject])

  useAsyncEffect(async () => {
    // 更新设置信息
    sendInject(null, 'GET_VIDEO_ELEMENT_INFO', {}).then(info => {
      dispatch(setNoVideo(info.noVideo))
      if (envData.sidePanel === true) {
        // get screen height
        dispatch(setTotalHeight(window.innerHeight))
      } else {
        dispatch(setTotalHeight(Math.min(Math.max(info.totalHeight, TOTAL_HEIGHT_MIN), TOTAL_HEIGHT_MAX)))
      }
    }).catch(error => {
      logMessagingError('GET_VIDEO_ELEMENT_INFO', error)
    })
  }, [envData.sidePanel, infos, sendInject])

  // 更新当前位置
  useEffect(() => {
    let newCurIdx
    if (data?.body != null && currentTime != null) {
      for (let i=0; i<data.body.length; i++) {
        const item = data.body[i]
        if (item.from != null && currentTime < item.from) {
          break
        } else {
          newCurIdx = i
        }
      }
    }
    // 只有当索引发生变化时才更新状态
    if (newCurIdx !== curIdx) {
      dispatch(setCurIdx(newCurIdx))
    }
  }, [currentTime, data?.body, dispatch, curIdx])

  // 需要滚动 => segment自动展开
  useEffect(() => {
    if (needScroll === true && curIdx != null) { // 需要滚动
      for (const segment of segments??[]) { // 检测segments
        if (segment.startIdx <= curIdx && curIdx <= segment.endIdx) { // 找到对应的segment
          if (segment.fold === true) { // 需要展开
            dispatch(setSegmentFold({
              segmentStartIdx: segment.startIdx,
              fold: false
            }))
          }
          break
        }
      }
    }
  }, [curIdx, dispatch, needScroll, segments])

  // data等变化时自动刷新segments
  useEffect(() => {
    let segments: Segment[] | undefined
    const items = data?.body
    if (items != null) {
      if (envData.summarizeEnable === true) { // 分段
        let size = envData.words
        if (size == null || Number.isNaN(size)) { // 默认
          size = getModelMaxTokens(envData)*WORDS_RATE
        }
        size = Math.max(size, WORDS_MIN)

        segments = []

        // 如果启用章节模式且有章节信息，按章节分割
        if ((envData.chapterMode ?? true) && chapters != null && chapters.length > 0) {
          for (let chapterIdx = 0; chapterIdx < chapters.length; chapterIdx++) {
            const chapter = chapters[chapterIdx]
            const nextChapter = chapters[chapterIdx + 1]

            // 找到属于当前章节的字幕项
            const chapterItems = items.filter(item => {
              const itemTime = item.from
              return itemTime >= chapter.from && (nextChapter != null ? itemTime < nextChapter.from : true)
            })

            if (chapterItems.length === 0) continue

            // 如果章节内容过长，需要进一步分割
            const chapterText = getWholeText(chapterItems.map(item => item.content))
            if (chapterText.length <= size) {
              // 章节内容不长，作为一个segment
              segments.push({
                items: chapterItems,
                startIdx: chapterItems[0].idx,
                endIdx: chapterItems[chapterItems.length - 1].idx,
                text: chapterText,
                fold: true,
                chapterTitle: chapter.content,
                summaries: {},
              })
            } else {
              // 章节内容过长，需要分割成多个segment
              let transcriptItems: TranscriptItem[] = []
              let totalLength = 0
              for (let i = 0; i < chapterItems.length; i++) {
                const item = chapterItems[i]
                transcriptItems.push(item)
                totalLength += item.content.length
                if (totalLength >= size || i === chapterItems.length - 1) {
                  segments.push({
                    items: transcriptItems,
                    startIdx: transcriptItems[0].idx,
                    endIdx: transcriptItems[transcriptItems.length - 1].idx,
                    text: getWholeText(transcriptItems.map(item => item.content)),
                    fold: true,
                    chapterTitle: chapter.content,
                    summaries: {},
                  })
                  // reset
                  transcriptItems = []
                  totalLength = 0
                }
              }
            }
          }
        } else {
          // 没有章节信息，按原来的逻辑分割
          let transcriptItems: TranscriptItem[] = []
          let totalLength = 0
          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            transcriptItems.push(item)
            totalLength += item.content.length
            if (totalLength >= size || i === items.length-1) { // new segment or last
              // add
              segments.push({
                items: transcriptItems,
                startIdx: transcriptItems[0].idx,
                endIdx: transcriptItems[transcriptItems.length - 1].idx,
                text: getWholeText(transcriptItems.map(item => item.content)),
                fold: true,
                summaries: {},
              })
              // reset
              transcriptItems = []
              totalLength = 0
            }
          }
        }
      } else { // 都放一个分段
        segments = [{
          items,
          startIdx: 0,
          endIdx: items.length-1,
          text: getWholeText(items.map(item => item.content)),
          fold: true,
          summaries: {},
        }]
      }
    }
    dispatch(setSegments(segments))
    dispatch(setFoldAll((segments?.length ?? 0) > 0))
  }, [data?.body, dispatch, envData, chapters])

  // 每0.5秒更新当前视频时间
  useInterval(() => {
    sendInject(null, 'GET_VIDEO_STATUS', {}).then(status => {
      // 只有当时间发生显著变化时才更新状态（差异大于0.1秒），避免不必要的重新渲染
      if (currentTime == null || Math.abs(status.currentTime - currentTime) > 0.1) {
        dispatch(setCurrentTime(status.currentTime))
      }
    }).catch(error => {
      logMessagingError('GET_VIDEO_STATUS', error)
    })
  }, 500)
}

export default useSubtitleService
