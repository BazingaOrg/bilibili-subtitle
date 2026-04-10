import {useAppDispatch, useAppSelector} from './redux'
import {useCallback} from 'react'
import {
  addTaskId,
  delTaskId,
  setLastSummarizeTime,
  setSummaryContent,
  setSummaryError,
  setSummaryStatus,
  setReviewAction,
  setTempData
} from '../redux/envReducer'
import {
  LANGUAGES_MAP,
  PROMPT_DEFAULTS,
  PROMPT_TYPE_SUMMARIZE_BRIEF,
  SUMMARIZE_LANGUAGE_DEFAULT,
  SUMMARIZE_THRESHOLD,
} from '../consts/const'
import toast from 'react-hot-toast'
import {useMemoizedFn} from 'ahooks/es'
import {extractJsonObject, getModel} from '../utils/bizUtil'
import {formatTime} from '../utils/util'
import { useMessage } from './useMessageService'

const resolveTemperature = (envData: EnvData, defaultTemperature: number) => {
  const modelName = (getModel(envData) ?? '').toLowerCase()

  // Some Kimi models only accept temperature=1.
  if (modelName.startsWith('kimi')) {
    return 1
  }

  return defaultTemperature
}

const useTranslate = () => {
  const dispatch = useAppDispatch()
  const envData = useAppSelector(state => state.env.envData)
  const summarizeLanguage = LANGUAGES_MAP[envData.summarizeLanguage??SUMMARIZE_LANGUAGE_DEFAULT]
  const title = useAppSelector(state => state.env.title)
  const reviewed = useAppSelector(state => state.env.tempData.reviewed)
  const reviewAction = useAppSelector(state => state.env.reviewAction)
  const reviewActions = useAppSelector(state => state.env.tempData.reviewActions)
  const {sendExtension} = useMessage(!!envData.sidePanel)

  const addSummarizeTask = useCallback(async (segment: Segment) => {
    // review action
    if (reviewed === undefined && !reviewAction) {
      dispatch(setReviewAction(true))
      dispatch(setTempData({
        reviewActions: (reviewActions ?? 0) + 1
      }))
    }

    if (segment.text.length >= SUMMARIZE_THRESHOLD) {
      let subtitles = ''
      for (const item of segment.items) {
        subtitles += formatTime(item.from) + ' ' + item.content + '\n'
      }
      let prompt: string = envData.prompts?.[PROMPT_TYPE_SUMMARIZE_BRIEF]??PROMPT_DEFAULTS[PROMPT_TYPE_SUMMARIZE_BRIEF]
      // replace params
      prompt = prompt.replaceAll('{{language}}', summarizeLanguage.name)
      prompt = prompt.replaceAll('{{title}}', title??'')
      prompt = prompt.replaceAll('{{subtitles}}', subtitles)
      prompt = prompt.replaceAll('{{segment}}', segment.text)

      const taskDef: TaskDef = {
        type: 'chatComplete',
        serverUrl: envData.serverUrl,
        data: {
          model: getModel(envData),
          messages: [
            {
              role: 'user',
              content: prompt,
            }
          ],
          temperature: resolveTemperature(envData, 0.5),
          n: 1,
          stream: false,
        },
        extra: {
          type: 'summarize',
          startIdx: segment.startIdx,
          apiKey: envData.apiKey,
        }
      }
      console.debug('addSummarizeTask', taskDef)
      dispatch(setSummaryStatus({segmentStartIdx: segment.startIdx, type: 'brief', status: 'pending'}))
      dispatch(setLastSummarizeTime(Date.now()))
      const task = await sendExtension(null, 'ADD_TASK', {taskDef})
      dispatch(addTaskId(task.id))
    }
  }, [dispatch, envData, reviewAction, reviewActions, reviewed, sendExtension, summarizeLanguage.name, title])

  const handleSummarize = useMemoizedFn((task: Task, content?: string) => {
    content = extractJsonObject(content??'')
    let obj
    try {
      obj = JSON.parse(content)
    } catch (e) {
      task.error = 'failed'
    }

    dispatch(setSummaryContent({
      segmentStartIdx: task.def.extra.startIdx,
      type: 'brief',
      content: obj,
    }))
    dispatch(setSummaryStatus({segmentStartIdx: task.def.extra.startIdx, type: 'brief', status: 'done'}))
    dispatch(setSummaryError({segmentStartIdx: task.def.extra.startIdx, type: 'brief', error: task.error}))
    console.debug('setSummary', task.def.extra.startIdx, 'brief', obj, task.error)
  })

  const getTask = useCallback(async (taskId: string) => {
    const taskResp = await sendExtension(null, 'GET_TASK', {taskId})
    if (taskResp.code === 'ok') {
      console.debug('getTask', taskResp.task)
      const task: Task = taskResp.task
      const taskType: string | undefined = task.def.extra?.type
      const content = task.resp?.choices?.[0]?.message?.content?.trim()
      if (task.status === 'done') {
        // 异常提示
        if (task.error) {
          toast.error(task.error)
        }
        // 删除任务
        dispatch(delTaskId(taskId))
        // 处理结果
        if (taskType === 'summarize') {
          handleSummarize(task, content)
        }
      }
    } else {
      dispatch(delTaskId(taskId))
    }
  }, [dispatch, handleSummarize, sendExtension])

  return {getTask, addSummarizeTask}
}

export default useTranslate
