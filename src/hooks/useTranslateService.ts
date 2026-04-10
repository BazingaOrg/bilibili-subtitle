import {useAppSelector} from './redux'
import {useInterval} from 'ahooks'
import useTranslate from './useTranslate'

/**
 * Service是单例，类似后端的服务概念
 */
const useTranslateService = () => {
  const taskIds = useAppSelector(state => state.env.taskIds)
  const {getTask} = useTranslate()

  // 每0.5秒检测获取结果
  useInterval(async () => {
    if (taskIds != null) {
      for (const taskId of taskIds) {
        await getTask(taskId)
      }
    }
  }, 500)
}

export default useTranslateService
