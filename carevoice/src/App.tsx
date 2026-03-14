import { useState } from 'react';
import './App.css';
import { Tree } from './components/Tree';

type TreeLevel = 0 | 1 | 2 | 3 | 4;

function App() {
  const [level, setLevel] = useState<TreeLevel>(0);

  return (
    <div className="app">
      <div className="tree-only">
        <Tree level={level} />
      </div>
      <div className="level-controls">
        <span className="level-label">Scenarios completed</span>
        <div className="level-buttons">
          {([0, 1, 2, 3, 4] as const).map((n) => (
            <button
              key={n}
              className={level === n ? 'active' : ''}
              onClick={() => setLevel(n)}
              type="button"
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
