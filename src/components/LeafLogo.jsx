export default function LeafLogo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M16 4C12 8 8 14 8 20C8 24 11 28 16 28C21 28 24 24 24 20C24 14 20 8 16 4Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <path
        d="M16 4C14 6 12 10 10 14L16 28L22 14C20 10 18 6 16 4Z"
        fill="currentColor"
        fillOpacity="0.6"
      />
    </svg>
  )
}
