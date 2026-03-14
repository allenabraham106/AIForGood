export default function Snowflakes() {
  const flakes = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${(i * 4.2 + 2) % 100}%`,
    delay: `${(i * 0.6) % 10}s`,
    duration: `${10 + (i % 4)}s`,
    fontSize: 8 + (i % 6),
    opacity: 0.25 + (i % 5) * 0.1,
  }))

  return (
    <div className="snowflakes" aria-hidden="true">
      {flakes.map((f) => (
        <span
          key={f.id}
          className="snowflake"
          style={{
            left: f.left,
            animationDelay: f.delay,
            animationDuration: f.duration,
            fontSize: f.fontSize,
            opacity: f.opacity,
          }}
        >
          ❄
        </span>
      ))}
    </div>
  )
}
