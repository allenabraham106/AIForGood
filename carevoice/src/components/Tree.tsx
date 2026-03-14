import { useEffect, useState } from 'react';

export type TreeLevel = 0 | 1 | 2 | 3 | 4;

interface TreeProps {
  level: TreeLevel;
  onBloomComplete?: () => void;
}

export function Tree({ level, onBloomComplete }: TreeProps) {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (level > 0) {
      setAnimating(true);
      const t = setTimeout(() => {
        setAnimating(false);
        onBloomComplete?.();
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [level, onBloomComplete]);

  const showLeaves = (section: 1 | 2 | 3 | 4) => level >= section;

  return (
    <div className="tree-wrapper" aria-hidden="true">
      <svg viewBox="0 0 280 300" className="tree-svg">
        <defs>
          <linearGradient id="snow-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e8f4f8" />
            <stop offset="100%" stopColor="#d0e8f0" />
          </linearGradient>
          <linearGradient id="sky-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#b8d4e3" />
            <stop offset="100%" stopColor="#e2eef4" />
          </linearGradient>
        </defs>

        <rect width="280" height="300" fill="url(#sky-grad)" />
        <ellipse cx="140" cy="265" rx="120" ry="45" fill="url(#snow-grad)" />
        <ellipse cx="140" cy="270" rx="100" ry="35" fill="#fff" opacity="0.9" />
        <ellipse cx="70" cy="260" rx="25" ry="20" fill="#fff" opacity="0.85" />
        <ellipse cx="210" cy="262" rx="28" ry="22" fill="#fff" opacity="0.85" />

        <rect x="125" y="165" width="30" height="100" fill="#4a3728" rx="2" />

        <g className={`section section-1 ${showLeaves(1) ? 'has-leaf' : ''} ${animating && level === 1 ? 'blooming' : ''}`}>
          <path d="M140 175 Q100 150 70 120" stroke="#4a3728" strokeWidth="10" fill="none" strokeLinecap="round" />
          {showLeaves(1) && <circle cx="82" cy="122" r="14" fill="#2e7d32" className="leaf" />}
        </g>

        <g className={`section section-2 ${showLeaves(2) ? 'has-leaf' : ''} ${animating && level === 2 ? 'blooming' : ''}`}>
          <path d="M140 172 Q180 148 210 118" stroke="#4a3728" strokeWidth="10" fill="none" strokeLinecap="round" />
          {showLeaves(2) && <circle cx="198" cy="122" r="14" fill="#2e7d32" className="leaf" />}
        </g>

        <g className={`section section-3 ${showLeaves(3) ? 'has-leaf' : ''} ${animating && level === 3 ? 'blooming' : ''}`}>
          <path d="M135 200 Q95 185 65 160" stroke="#4a3728" strokeWidth="9" fill="none" strokeLinecap="round" />
          {showLeaves(3) && <circle cx="78" cy="165" r="14" fill="#2e7d32" className="leaf" />}
        </g>

        <g className={`section section-4 ${showLeaves(4) ? 'has-leaf' : ''} ${animating && level === 4 ? 'blooming' : ''}`}>
          <path d="M145 198 Q185 182 215 158" stroke="#4a3728" strokeWidth="9" fill="none" strokeLinecap="round" />
          {showLeaves(4) && <circle cx="202" cy="162" r="14" fill="#2e7d32" className="leaf" />}
        </g>

        <path d="M140 168 L140 100" stroke="#4a3728" strokeWidth="8" fill="none" strokeLinecap="round" />

        {level === 0 && (
          <g className="snow-dust">
            <circle cx="72" cy="122" r="5" fill="#fff" opacity="0.75" />
            <circle cx="208" cy="120" r="5" fill="#fff" opacity="0.75" />
            <circle cx="68" cy="162" r="4" fill="#fff" opacity="0.65" />
            <circle cx="212" cy="160" r="4" fill="#fff" opacity="0.65" />
          </g>
        )}
      </svg>
    </div>
  );
}
