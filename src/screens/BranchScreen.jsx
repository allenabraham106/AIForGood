import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import LeafLogo from '../components/LeafLogo'
import TreeNode from '../components/TreeNode'
import TreeBranches from '../components/TreeBranches'
import Snowflakes from '../components/Snowflakes'
import Stars from '../components/Stars'
import Clouds from '../components/Clouds'
import HappySun from '../components/HappySun'
import {
  SproutIcon,
  SpeakIcon,
  PeopleIcon,
  ChartIcon,
  LockIcon,
} from '../components/Icons'
import { useProgress } from '../context/ProgressContext'
import { SCENARIOS, TREE_NODES } from '../data/lessons'
import './BranchScreen.css'

const CATEGORY_COLORS = {
  blue: 'var(--accent-blue)',
  orange: 'var(--accent-orange)',
  green: 'var(--accent-light)',
  grey: 'var(--text-muted)',
}

export default function BranchScreen() {
  const navigate = useNavigate()
  const { getNodeStatus, isSectionActive, getCompletedCount } = useProgress()

  const completedTotal = getCompletedCount('basics') + getCompletedCount('speaking') + getCompletedCount('community')
  const overallProgress = completedTotal / 12

  const handleNodeClick = (node) => {
    const status = getNodeStatus(node)
    if (status === 'locked') return
    navigate(`/lesson/${node.section}/${node.id}`)
  }

  const handleCategoryClick = (key) => {
    const scenario = SCENARIOS[key]
    if (scenario?.locked) return
    if (!isSectionActive(key)) return
    const firstLesson = scenario?.lessons?.[0]
    if (firstLesson) navigate(`/lesson/${key}/${firstLesson.id}`)
  }

  const CategoryIcon = ({ id }) => {
    switch (id) {
      case 'basics': return <SproutIcon size={28} />
      case 'speaking': return <SpeakIcon size={28} />
      case 'community': return <PeopleIcon size={28} />
      case 'progress': return <ChartIcon size={28} />
      default: return null
    }
  }

  const [searchParams] = useSearchParams()
  const isDemoMode = searchParams.get('demo') === '1'
  const [demoLevel, setDemoLevel] = useState(1)

  const realLevel = isSectionActive('progress') ? 4
    : isSectionActive('community') ? 3
    : isSectionActive('speaking') ? 2
    : 1

  const level = isDemoMode ? demoLevel : realLevel

  const showSnowflakes = level === 1
  const showStars = level === 2 || level === 3
  const starsVariant = level === 2 ? 'night' : 'dawn'
  const showSun = level === 4
  const showClouds = level === 4

  return (
    <div className={`branch-screen branch-screen--level-${level}`}>
      {isDemoMode && (
        <div className="branch-demo" role="group" aria-label="Demo level selector">
          <span className="branch-demo-label">Demo level:</span>
          <div className="branch-demo-btns">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                className={level === n ? 'active' : ''}
                onClick={() => setDemoLevel(n)}
                aria-pressed={level === n}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
      {showSnowflakes && <Snowflakes />}
      {showStars && <Stars variant={starsVariant} />}
      {level === 3 && (
        <div className="branch-dawn-glow" aria-hidden="true" />
      )}
      {showClouds && <Clouds />}
      {showSun && <HappySun side="right" size={90} />}
      <header className="branch-header">
        <div className="branch-header-top">
          <LeafLogo size={28} className="branch-logo" />
          <h1 className="branch-title">Branch</h1>
          <span className="branch-level-badge">Level {level}</span>
        </div>
        <div className="branch-progress-bar">
          <div className="branch-progress-fill" style={{ width: `${overallProgress * 100}%` }} />
        </div>
      </header>

      <main className="branch-tree-container">
        <svg viewBox="0 0 100 95" className="branch-tree-svg">
          <defs>
            <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#81c784" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#66bb6a" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#4caf50" stopOpacity="0" />
            </radialGradient>
          </defs>
          <TreeBranches />
          {TREE_NODES.map((node) => {
            const status = getNodeStatus(node)
            return (
              <TreeNode
                key={node.id}
                node={node}
                status={status}
                isClickable={status === 'active'}
                onClick={() => handleNodeClick(node)}
              />
            )
          })}
        </svg>
      </main>

      <nav className="branch-categories">
        {Object.entries(SCENARIOS).map(([key, scenario]) => {
          const isLocked = scenario.locked || !isSectionActive(key)
          const completed = getCompletedCount(key)
          const label = scenario.locked ? '0/4' : `${completed}/4`
          return (
          <button
            key={key}
            className={`category-btn ${isLocked ? 'locked' : ''} ${isSectionActive(key) ? 'active' : ''} ${key === 'basics' && isSectionActive(key) ? 'basics-active' : ''}`}
            onClick={() => handleCategoryClick(key)}
            disabled={isLocked}
            aria-label={key}
          >
            {scenario.locked && (
              <span className="category-lock">
                <LockIcon size={14} />
              </span>
            )}
            <span className="category-icon" style={{ color: isLocked ? 'var(--text-muted)' : '#7da882' }}>
              <CategoryIcon id={key} />
            </span>
            <span className="category-progress" style={{ color: isLocked ? 'var(--text-muted)' : '#7da882' }}>
              {label}
            </span>
          </button>
        )})}
      </nav>
      <footer className="branch-footer">
        <a href="/demo/" className="branch-demo-link" aria-label="Open CareVoice audio demo">
          CareVoice audio demo
        </a>
      </footer>
    </div>
  )
}
