import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'branch-progress'

const INITIAL_STATE = {
  branch1: [true, false, false, false],
  branch2: [false, false, false, false],
  branch3: [false, false, false, false],
  branch4: [false, false, false, false],
}

function loadProgress() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        branch1: parsed.branch1 ?? INITIAL_STATE.branch1,
        branch2: parsed.branch2 ?? INITIAL_STATE.branch2,
        branch3: parsed.branch3 ?? INITIAL_STATE.branch3,
        branch4: parsed.branch4 ?? INITIAL_STATE.branch4,
      }
    }
  } catch (_) {}
  return { ...INITIAL_STATE }
}

function saveProgress(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (_) {}
}

// Map lessonId (b1, s1, c1, etc) to branch key and index
const LESSON_TO_BRANCH = {
  b1: ['branch1', 0], b2: ['branch1', 1], b3: ['branch1', 2], b4: ['branch1', 3],
  s1: ['branch2', 0], s2: ['branch2', 1], s3: ['branch2', 2], s4: ['branch2', 3],
  c1: ['branch3', 0], c2: ['branch3', 1], c3: ['branch3', 2], c4: ['branch3', 3],
}

const ProgressContext = createContext(null)

export function ProgressProvider({ children }) {
  const [progress, setProgress] = useState(loadProgress)

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  const isLeafUnlocked = useCallback((branchKey, index) => {
    const branch = progress[branchKey]
    return branch && branch[index] === true
  }, [progress])

  const unlockLeaf = useCallback((branchKey, index) => {
    setProgress((prev) => {
      const branch = [...(prev[branchKey] ?? [false, false, false, false])]
      if (index >= 0 && index < branch.length) {
        branch[index] = true
      }
      return { ...prev, [branchKey]: branch }
    })
  }, [])

  const unlockNextAfterLesson = useCallback((lessonId) => {
    const [branchKey, index] = LESSON_TO_BRANCH[lessonId] ?? [null, -1]
    if (!branchKey) return
    const nextIndex = index + 1
    const branch = progress[branchKey]
    if (nextIndex < (branch?.length ?? 0)) {
      unlockLeaf(branchKey, nextIndex)
    } else {
      const nextBranch = branchKey === 'branch1' ? 'branch2' : branchKey === 'branch2' ? 'branch3' : branchKey === 'branch3' ? 'branch4' : null
      if (nextBranch) unlockLeaf(nextBranch, 0)
    }
  }, [progress, unlockLeaf])

  const getNodeStatus = useCallback((node) => {
    const [branchKey, index] = LESSON_TO_BRANCH[node.id] ?? [null, -1]
    if (!branchKey) return 'locked'
    return isLeafUnlocked(branchKey, index) ? 'active' : 'locked'
  }, [isLeafUnlocked])

  const isSectionActive = useCallback((sectionKey) => {
    const branchMap = { basics: 'branch1', speaking: 'branch2', community: 'branch3', progress: 'branch4' }
    const branchKey = branchMap[sectionKey]
    const branch = progress[branchKey]
    return branch?.some(Boolean) ?? false
  }, [progress])

  const getCompletedCount = useCallback((sectionKey) => {
    const branchMap = { basics: 'branch1', speaking: 'branch2', community: 'branch3', progress: 'branch4' }
    const branch = progress[branchMap[sectionKey]]
    return branch?.filter(Boolean).length ?? 0
  }, [progress])

  const value = {
    progress,
    isLeafUnlocked,
    unlockLeaf,
    unlockNextAfterLesson,
    getNodeStatus,
    isSectionActive,
    getCompletedCount,
  }

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}
