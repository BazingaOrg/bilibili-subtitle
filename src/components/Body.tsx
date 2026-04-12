import React, { useCallback, useEffect, useRef } from 'react'
import {
  setAutoScroll,
  setCheckAutoScroll,
  setFoldAll,
  setNeedScroll,
  setSegmentFold,
  setTempData
} from '../redux/envReducer'
import { useAppDispatch, useAppSelector } from '../hooks/redux'
import {
  AiOutlineAim,
  AiOutlineCloseCircle,
  FaRegArrowAltCircleDown,
  IoWarning,
  MdExpand
} from 'react-icons/all'
import classNames from 'classnames'
import toast from 'react-hot-toast'
import SegmentCard from './SegmentCard'
import {
  DEFAULT_USE_PORT,
  HEADER_HEIGHT,
  SUMMARIZE_ALL_THRESHOLD,
  TITLE_HEIGHT
} from '../consts/const'
import { FaClipboardList } from 'react-icons/fa'
import useTranslate from '../hooks/useTranslate'
import useKeyService from '../hooks/useKeyService'
import RateExtension from '../components/RateExtension'
import ApiKeyReminder from './ApiKeyReminder'
import { useMessaging } from '../message'

const Body = () => {
  const dispatch = useAppDispatch()
  const noVideo = useAppSelector(state => state.env.noVideo)
  const autoScroll = useAppSelector(state => state.env.autoScroll)
  const segments = useAppSelector(state => state.env.segments)
  const foldAll = useAppSelector(state => state.env.foldAll)
  const envData = useAppSelector(state => state.env.envData)
  const compact = useAppSelector(state => state.env.tempData.compact)
  const floatKeyPointsSegIdx = useAppSelector(state => state.env.floatKeyPointsSegIdx)
  const summarizeEnable = useAppSelector(state => state.env.envData.summarizeEnable)
  const { addSummarizeTask } = useTranslate()
  // const infos = useAppSelector(state => state.env.infos)
  const bodyRef = useRef<any>()
  const curOffsetTop = useAppSelector(state => state.env.curOffsetTop)
  const checkAutoScroll = useAppSelector(state => state.env.checkAutoScroll)
  const needScroll = useAppSelector(state => state.env.needScroll)
  const totalHeight = useAppSelector(state => state.env.totalHeight)
  // const title = useAppSelector(state => state.env.title)
  // const fontSize = useAppSelector(state => state.env.envData.fontSize)
  const { disconnected } = useMessaging(DEFAULT_USE_PORT)

  const normalCallback = useCallback(() => {
    dispatch(setTempData({
      compact: false
    }))
  }, [dispatch])

  const compactCallback = useCallback(() => {
    dispatch(setTempData({
      compact: true
    }))
  }, [dispatch])

  const posCallback = useCallback(() => {
    dispatch(setNeedScroll(true))
  }, [dispatch])

  const onSummarizeAll = useCallback(() => {
    const apiKey = envData.apiKey
    if (typeof apiKey !== 'string' || apiKey.length === 0) {
      toast.error('请先在选项页面设置ApiKey!')
      return
    }
    const segments_ = []
    for (const segment of segments ?? []) {
      const summary = segment.summaries.brief
      if (summary == null || summary.status === 'init' || (summary.status === 'done' && summary.error != null)) {
        segments_.push(segment)
      }
    }
    if (segments_.length === 0) {
      toast.error('没有可总结的段落!')
      return
    }
    if (segments_.length < SUMMARIZE_ALL_THRESHOLD || confirm(`确定总结${segments_.length}个段落?`)) {
      for (const segment of segments_) {
        addSummarizeTask(segment).catch(console.error)
      }
      toast.success(`已添加${segments_.length}个总结任务!`)
    }
  }, [addSummarizeTask, envData.apiKey, segments])

  const onFoldAll = useCallback(() => {
    dispatch(setFoldAll(foldAll !== true))
    for (const segment of segments ?? []) {
      dispatch(setSegmentFold({
        segmentStartIdx: segment.startIdx,
        fold: foldAll !== true
      }))
    }
  }, [dispatch, foldAll, segments])

  const onEnableAutoScroll = useCallback(() => {
    dispatch(setAutoScroll(true))
    dispatch(setNeedScroll(true))
  }, [dispatch])

  const onWheel = useCallback(() => {
    if (autoScroll === true) {
      dispatch(setAutoScroll(false))
    }
  }, [autoScroll, dispatch])

  // service
  useKeyService()

  // 自动滚动
  useEffect(() => {
    if (checkAutoScroll === true && curOffsetTop != null && autoScroll === true && needScroll !== true) {
      if (bodyRef.current.scrollTop <= curOffsetTop - bodyRef.current.offsetTop - (totalHeight - 160) + (floatKeyPointsSegIdx != null ? 100 : 0) ||
        bodyRef.current.scrollTop >= curOffsetTop - bodyRef.current.offsetTop - 40 - 10
      ) {
        dispatch(setNeedScroll(true))
        dispatch(setCheckAutoScroll(false))
        console.debug('need scroll')
      }
    }
  }, [autoScroll, checkAutoScroll, curOffsetTop, dispatch, floatKeyPointsSegIdx, needScroll, totalHeight])

  return <div className='relative bg-base-100'>
    {/* title */}
    <div className='absolute top-1 left-6 flex-center gap-1'>
      <AiOutlineAim className='cursor-pointer' onClick={posCallback} title='滚动到视频位置' />
      {segments != null && segments.length > 0 &&
        <MdExpand className={classNames('cursor-pointer', foldAll === true ? 'text-accent' : '')} onClick={onFoldAll}
          title='展开/折叠全部' />}
    </div>
    <div className='flex justify-center'>
      <div className='tabs'>
        <a className={classNames('tab tab-sm tab-bordered', compact !== true && 'tab-active')}
          onClick={normalCallback}>列表视图</a>
        <a className={classNames('tab tab-sm tab-bordered', compact === true && 'tab-active')}
          onClick={compactCallback}>文章视图</a>
      </div>
    </div>
    <div className='absolute top-1 right-6'>
      {summarizeEnable === true &&
        <div className='tooltip tooltip-left cursor-pointer z-[100]' data-tip='总结全部' onClick={onSummarizeAll}>
          <FaClipboardList />
        </div>}
      {noVideo === true && <div className='tooltip tooltip-left ml-2' data-tip='当前浏览器不支持视频跳转'>
        <IoWarning className='text-warning' />
      </div>}
    </div>

    {disconnected && <div className='flex flex-col justify-center items-center gap-2 text-sm bg-error/15 border border-error/40 rounded-md mx-2 py-2'>
      <span className='flex items-center gap-1 text-error'><AiOutlineCloseCircle className='text-error' />已断开连接</span>
    </div>}

    {/* auto scroll btn */}
    {autoScroll !== true && <div
      className='absolute z-[999] top-[96px] right-6 tooltip tooltip-left cursor-pointer rounded-full bg-primary/15 hover:bg-primary/25 text-primary p-1.5 text-xl border border-primary/30 transition-colors'
      data-tip='开启自动滚动'
      onClick={onEnableAutoScroll}>
      <FaRegArrowAltCircleDown />
    </div>}

    {/* body */}
    <div ref={bodyRef} onWheel={onWheel}
      className={classNames('flex flex-col gap-1.5 overflow-y-auto select-text scroll-smooth', floatKeyPointsSegIdx != null && 'pb-[100px]')}
      style={{
        height: `${totalHeight - HEADER_HEIGHT - TITLE_HEIGHT}px`
      }}
    >
      {/* segments */}
      {segments?.map((segment, segmentIdx) => <SegmentCard key={segment.startIdx} segment={segment}
        segmentIdx={segmentIdx} bodyRef={bodyRef} />)}

      <ApiKeyReminder />

      <RateExtension />
    </div>
  </div>
}

export default Body
