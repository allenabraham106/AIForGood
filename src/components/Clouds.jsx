export default function Clouds() {
  const clouds = [
    { id: 1, top: '18%', left: '5%', scale: 1, delay: '0s' },
    { id: 2, top: '28%', left: '55%', scale: 0.85, delay: '2s' },
    { id: 3, top: '12%', left: '75%', scale: 0.7, delay: '1s' },
    { id: 4, top: '35%', left: '20%', scale: 0.6, delay: '3s' },
    { id: 5, top: '8%', left: '35%', scale: 0.55, delay: '1.5s' },
  ]

  return (
    <div className="clouds" aria-hidden="true">
      {clouds.map((c) => (
        <div
          key={c.id}
          className="cloud"
          style={{
            top: c.top,
            left: c.left,
            '--cloud-scale': c.scale,
            animationDelay: c.delay,
          }}
        >
          <span className="cloud-puff" />
          <span className="cloud-puff" />
          <span className="cloud-puff" />
        </div>
      ))}
    </div>
  )
}
