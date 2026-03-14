import { useNavigate } from 'react-router-dom'
import LeafLogo from '../components/LeafLogo'
import TreeNode from '../components/TreeNode'
import TreeBranches from '../components/TreeBranches'
import {
  SproutIcon,
  SpeakIcon,
  PeopleIcon,
  ChartIcon,
  LockIcon,
} from '../components/Icons'
import { SCENARIOS, TREE_NODES, SECTION_STATUS } from '../data/lessons'
import './BranchScreen.css'

const CATEGORY_COLORS = {
  blue: 'var(--accent-blue)',
  orange: 'var(--accent-orange)',
  green: 'var(--accent-light)',
  grey: 'var(--text-muted)',
}

export default function BranchScreen() {
  const navigate = useNavigate()
  const overallProgress = 0

  const handleNodeClick = (node) => {
    const status = SECTION_STATUS[node.section]
    if (status === 'locked') return
    navigate(`/lesson/${node.section}/${node.id}`)
  }

  const handleCategoryClick = (key) => {
    const scenario = SCENARIOS[key]
    if (scenario?.locked) return
    const sectionLocked = SECTION_STATUS[key] === 'locked'
    if (sectionLocked) return
    const firstLesson = scenario?.lessons?.[0]
    if (firstLesson) navigate(`/lesson/${key}/${firstLesson.id}`)
  }

  const CategoryIcon = ({ id }) => {
    switch (id) {
      case 'basics': return <SproutIcon size={36} />
      case 'speaking': return <SpeakIcon size={36} />
      case 'community': return <PeopleIcon size={36} />
      case 'progress': return <ChartIcon size={36} />
      default: return null
    }
  }

  return (
    <div className="branch-screen">
      <header className="branch-header">
        <LeafLogo size={28} className="branch-logo" />
        <h1 className="branch-title">Branch</h1>
        <div className="branch-progress-bar">
          <div className="branch-progress-fill" style={{ width: `${overallProgress * 100}%` }} />
        </div>
      </header>

      <main className="branch-tree-container">
        <svg viewBox="0 0 100 95" className="branch-tree-svg">
          <defs>
            <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#7ab87a" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#5a8f5a" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#4a8a82" stopOpacity="0" />
            </radialGradient>
          </defs>
          <TreeBranches />
          {TREE_NODES.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              status={SECTION_STATUS[node.section]}
              isClickable={SECTION_STATUS[node.section] === 'active'}
              onClick={() => handleNodeClick(node)}
            />
          ))}
        </svg>
      </main>

      <nav className="branch-categories">
        {Object.entries(SCENARIOS).map(([key, scenario]) => {
          const isLocked = scenario.locked || SECTION_STATUS[key] === 'locked'
          return (
          <button
            key={key}
            className={`category-btn ${isLocked ? 'locked' : ''} ${SECTION_STATUS[key] === 'active' ? 'active' : ''}`}
            onClick={() => handleCategoryClick(key)}
            disabled={isLocked}
            aria-label={key}
          >
            {scenario.locked && (
              <span className="category-lock">
                <LockIcon size={14} />
              </span>
            )}
            <span className="category-icon" style={{ color: CATEGORY_COLORS[scenario.color] }}>
              <CategoryIcon id={key} />
            </span>
            <span className="category-progress" style={{ color: isLocked ? 'var(--text-muted)' : CATEGORY_COLORS[scenario.color] }}>
              {scenario.label}
            </span>
          </button>
        )})}
      </nav>
    </div>
  )
}
