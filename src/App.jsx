import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BranchScreen from './screens/BranchScreen'
import PhraseScreen from './screens/PhraseScreen'
import VoiceScreen from './screens/VoiceScreen'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BranchScreen />} />
        <Route path="/lesson/:scenarioId/:lessonId" element={<PhraseScreen />} />
        <Route path="/practice/:scenarioId/:lessonId" element={<VoiceScreen />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
