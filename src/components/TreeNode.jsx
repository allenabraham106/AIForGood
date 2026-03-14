import './TreeNode.css'

export default function TreeNode({ node, status, isClickable, onClick }) {
  const isActive = status === 'active'
  const isLocked = status === 'locked'

  return (
    <g
      className={`tree-node tree-node--${status} ${isClickable ? 'tree-node--clickable' : ''}`}
      onClick={onClick}
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
    >
      {/* Unlocked: soft glow behind solid circle */}
      {isActive && (
        <>
          <circle cx={node.x} cy={node.y} r="12" fill="url(#node-glow)" opacity="0.6" />
          <circle cx={node.x} cy={node.y} r="6" fill="#7ab87a" />
        </>
      )}
      {/* Locked: dark green, dormant, no glow */}
      {isLocked && (
        <circle cx={node.x} cy={node.y} r="6" fill="#1a2e1c" stroke="#2d4a30" strokeWidth="1.5" opacity="1" />
      )}
    </g>
  )
}
