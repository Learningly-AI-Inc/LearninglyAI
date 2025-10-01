export type TaskProgressStatus = 'pending' | 'running' | 'completed' | 'error'

export interface TaskProgress {
  progress: number
  step: string
  status: TaskProgressStatus
  startedAt: number
  updatedAt: number
}

declare global {
  // eslint-disable-next-line no-var
  var __taskProgressStore: Map<string, TaskProgress> | undefined
}

function getStore(): Map<string, TaskProgress> {
  if (!global.__taskProgressStore) {
    global.__taskProgressStore = new Map<string, TaskProgress>()
  }
  return global.__taskProgressStore
}

export function initProgress(taskId: string, initialStep: string = 'Starting...'): void {
  const store = getStore()
  store.set(taskId, {
    progress: 0,
    step: initialStep,
    status: 'running',
    startedAt: Date.now(),
    updatedAt: Date.now(),
  })
}

export function updateProgress(taskId: string, progress: number, step?: string): void {
  const store = getStore()
  const current = store.get(taskId)
  if (!current) return
  store.set(taskId, {
    ...current,
    progress: Math.max(0, Math.min(100, progress)),
    step: step ?? current.step,
    updatedAt: Date.now(),
  })
}

export function completeProgress(taskId: string, finalStep: string = 'Completed'): void {
  const store = getStore()
  const current = store.get(taskId)
  if (!current) return
  store.set(taskId, {
    ...current,
    progress: 100,
    step: finalStep,
    status: 'completed',
    updatedAt: Date.now(),
  })
  // Cleanup after a short delay
  setTimeout(() => {
    getStore().delete(taskId)
  }, 5 * 60 * 1000)
}

export function errorProgress(taskId: string, message: string): void {
  const store = getStore()
  const current = store.get(taskId)
  store.set(taskId, {
    progress: current?.progress ?? 0,
    step: message,
    status: 'error',
    startedAt: current?.startedAt ?? Date.now(),
    updatedAt: Date.now(),
  })
  setTimeout(() => {
    getStore().delete(taskId)
  }, 5 * 60 * 1000)
}

export function getProgress(taskId: string): TaskProgress | null {
  const store = getStore()
  return store.get(taskId) ?? null
}


