import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProgressProvider } from './context/ProgressContext'
import BranchScreen from './screens/BranchScreen'
import PhraseScreen from './screens/PhraseScreen'
import VoiceScreen from './screens/VoiceScreen'

function App() {
  return (
    <ProgressProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<BranchScreen />} />
          <Route path="/lesson/:scenarioId/:lessonId" element={<PhraseScreen />} />
          <Route path="/practice/:scenarioId/:lessonId" element={<VoiceScreen />} />
        </Routes>
      </BrowserRouter>
    </ProgressProvider>
  )
}

export default App
