import { useProgress } from '../context/ProgressContext'

const BRANCH = '#6b4423'
const BRANCH_DIMMER = 'rgba(107, 68, 35, 0.45)'

const BARK = {
  dark: '#4a3828',
  mid: '#6b4423',
  light: '#8b6342',
}

export default function TreeBranches() {
  const { isSectionActive } = useProgress()
  const basics = isSectionActive('basics') ? BRANCH : BRANCH_DIMMER
  const speaking = isSectionActive('speaking') ? BRANCH : BRANCH_DIMMER
  const community = isSectionActive('community') ? BRANCH : BRANCH_DIMMER

  return (
    <g className="tree-branches">
      {/* Trunk — thick warm brown */}
      <path d="M50 95 L50 70" stroke={BARK.dark} strokeWidth="8" strokeLinecap="round" />
      <path d="M50 95 L50 70" stroke={BARK.mid} strokeWidth="5" strokeLinecap="round" />
      <path d="M50 95 L50 70" stroke={BARK.light} strokeWidth="3" strokeLinecap="round" />

      {/* Left - Basics */}
      <path d="M50 70 Q35 68 22 62 L18 72" fill="none" stroke={basics} strokeWidth="4" strokeLinecap="round" />
      <path d="M22 62 Q15 55 10 52" fill="none" stroke={basics} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M22 62 Q28 56 26 52" fill="none" stroke={basics} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M22 62 Q18 48 18 32" fill="none" stroke={basics} strokeWidth="3.5" strokeLinecap="round" />

      {/* Right - Speaking */}
      <path d="M50 70 Q65 68 78 62 L82 72" fill="none" stroke={speaking} strokeWidth="4" strokeLinecap="round" />
      <path d="M78 62 Q85 55 90 52" fill="none" stroke={speaking} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M78 62 Q72 56 74 52" fill="none" stroke={speaking} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M78 62 Q82 48 82 32" fill="none" stroke={speaking} strokeWidth="3.5" strokeLinecap="round" />

      {/* Center - Community */}
      <path d="M50 70 L50 55" fill="none" stroke={community} strokeWidth="4" strokeLinecap="round" />
      <path d="M50 55 Q54 48 58 35" fill="none" stroke={community} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M50 55 Q46 48 42 35" fill="none" stroke={community} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M50 55 L50 18" fill="none" stroke={community} strokeWidth="3.5" strokeLinecap="round" />
    </g>
  )
}
