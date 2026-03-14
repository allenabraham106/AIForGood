/**
 * Starfield for levels 2–3. Level 2: full night sky. Level 3: fading stars (dawn).
 */
export default function Stars({ variant = 'night' }) {
  const count = variant === 'dawn' ? 40 : 60
  const baseOpacity = variant === 'dawn' ? 0.4 : 0.9

  const stars = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(i * 5.7 + 1) % 100}%`,
    top: `${(i * 3.1 + 2) % 95}%`,
    size: 1 + (i % 3),
    opacity: baseOpacity * (0.5 + (i % 5) * 0.15),
    twinkleDelay: `${(i % 4) * 0.5}s`,
  }))

  return (
    <div className={`stars stars--${variant}`} aria-hidden="true">
      {stars.map((s) => (
        <span
          key={s.id}
          className="star"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            animationDelay: s.twinkleDelay,
          }}
        />
      ))}
    </div>
  )
}
