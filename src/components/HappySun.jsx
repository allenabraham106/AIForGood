export default function HappySun({ side = 'right', size = 80 }) {
  const rays = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * 360
    const rad = (angle * Math.PI) / 180
    const r1 = 38
    const r2 = 48
    const x1 = 50 + r1 * Math.cos(rad)
    const y1 = 50 + r1 * Math.sin(rad)
    const x2 = 50 + r2 * Math.cos(rad)
    const y2 = 50 + r2 * Math.sin(rad)
    return { x1, y1, x2, y2 }
  })

  return (
    <div className={`happy-sun happy-sun--${side}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="happy-sun-svg">
        {/* Rays */}
        <g className="sun-rays">
          {rays.map((r, i) => (
            <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="#ffb300" strokeWidth="4" strokeLinecap="round" />
          ))}
        </g>
        {/* Face circle */}
        <circle cx="50" cy="50" r="35" fill="#ffc107" stroke="#ff8f00" strokeWidth="2" />
        {/* Inner glow */}
        <circle cx="50" cy="50" r="32" fill="#ffe082" opacity="0.6" />
        {/* Eyes */}
        <ellipse cx="40" cy="45" rx="5" ry="6" fill="#333" />
        <ellipse cx="60" cy="45" rx="5" ry="6" fill="#333" />
        {/* Nose */}
        <ellipse cx="50" cy="52" rx="3" ry="4" fill="#ff8f00" />
        {/* Smile */}
        <path
          d="M 36 62 Q 50 75 64 62"
          fill="none"
          stroke="#b71c1c"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
