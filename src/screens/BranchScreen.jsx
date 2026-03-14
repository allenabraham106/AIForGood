import { useNavigate } from 'react-router-dom'
import LeafLogo from '../components/LeafLogo'
import {
  SproutIcon,
  SpeakIcon,
  PeopleIcon,
  ChartIcon,
  LockIcon,
} from '../components/Icons'
import { SCENARIOS, TREE_NODES, SECTION_STATUS } from '../data/lessons'
import './BranchScreen.css'

const SECTION_COLORS = {
  active: { border: 'var(--accent-light)', fill: 'var(--bg-card)', branch: '#9ed89e' },
  locked: { border: 'var(--accent-purple)', fill: 'var(--bg-dark)', branch: '#8b7cb8' },
}

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
          {/* Trunk - bottom center */}
          <path d="M50 95 L50 70" stroke="#6B5344" strokeWidth="4" strokeLinecap="round" />
          <path d="M50 95 L50 70" stroke="#8B7355" strokeWidth="2.5" strokeLinecap="round" />

          {/* Left branch - basics (green when active, purple when locked) */}
          <path d="M50 70 Q35 68 22 62 L18 72" fill="none" stroke={SECTION_COLORS[SECTION_STATUS.basics].branch} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M22 62 Q15 55 10 52" fill="none" stroke={SECTION_COLORS[SECTION_STATUS.basics].branch} strokeWidth="2" strokeLinecap="round" />
          <path d="M22 62 Q28 56 26 52" fill="none" stroke={SECTION_COLORS[SECTION_STATUS.basics].branch} strokeWidth="2" strokeLinecap="round" />
          <path d="M22 62 Q18 48 18 32" fill="none" stroke={SECTION_COLORS[SECTION_STATUS.basics].branch} strokeWidth="2" strokeLinecap="round" />

          {/* Right branch - speaking */}
          <path d="M50 70 Q65 68 78 62 L82 72" fill="none" stroke={SECTION_COLORS[SECTION_STATUS.speaking].branch} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M78 62 Q85 55 90 52" fill="none" stroke={SECTION_COLORS[SECTION_STATUS.speaking].branch} strokeWidth="2" strokeLinecap="round" />
          <path d="M78 62 Q72 56 74 52" fill="none" stroke={SECTION_COLORS[SECTION_STATUS.speaking].branch} strokeWidth="2" strokeLinecap="round" />
          <path d="M78 62 Q82 48 82 32" fill="none" stroke={SECTION_COLORS[SECTION_STATUS.speaking].branch} strokeWidth="2" strokeLinecap="round" />

          {/* Center branch - community */}
          <path d="M50 70 L50 55" fill="none" stroke={SECTION_COLORS[SECTION_STATUS.community].branch} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M50 55 Q54 48 58 35" fill="none" stroke={SECTION_COLORS[SECTION_STATUS.community].branch} strokeWidth="2" strokeLinecap="round" />
          <path d="M50 55 Q46 48 42 35" fill="none" stroke={SECTION_COLORS[SECTION_STATUS.community].branch} strokeWidth="2" strokeLinecap="round" />
          <path d="M50 55 L50 18" fill="none" stroke={SECTION_COLORS[SECTION_STATUS.community].branch} strokeWidth="2" strokeLinecap="round" />

          {TREE_NODES.map((node) => {
            const status = SECTION_STATUS[node.section]
            const colors = SECTION_COLORS[status]
            const isClickable = status === 'active'
            return (
              <g
                key={node.id}
                className={`tree-node ${status} ${isClickable ? 'clickable' : ''}`}
                onClick={() => handleNodeClick(node)}
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="6"
                  fill={colors.fill}
                  stroke={colors.border}
                  strokeWidth="1.5"
                />
                <g transform={`translate(${node.x - 4}, ${node.y - 4})`} style={{ pointerEvents: 'none' }}>
                  {status === 'locked' ? (
                    <path d="M2 5V3.5C2 2.7 2.7 2 3.5 2h1C5.3 2 6 2.7 6 3.5V5H2zm0 0h4v3a1 1 0 01-1 1H3a1 1 0 01-1-1V5z" fill="#d4a84b" stroke="#d4a84b" strokeWidth="0.5" />
                  ) : node.type === 'achievement' ? (
                    <path d="M4 0l1 3 3 .5-2 2.5.5 3L4 7 1.5 8.5 2 5.5 0 3l3-.5L4 0z" fill="#e8a54b" />
                  ) : (
                    <>
                      <circle cx="2.5" cy="4" r="0.8" fill="#9ed89e" />
                      <circle cx="4" cy="4" r="0.8" fill="#9ed89e" />
                      <circle cx="5.5" cy="4" r="0.8" fill="#9ed89e" />
                    </>
                  )}
                </g>
              </g>
            )
          })}
        </svg>
      </main>

      <nav className="branch-categories">
        {Object.entries(SCENARIOS).map(([key, scenario]) => {
          const isLocked = scenario.locked || SECTION_STATUS[key] === 'locked'
          return (
          <button
            key={key}
            className={`category-btn ${isLocked ? 'locked' : ''}`}
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
