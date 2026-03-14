import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import LeafLogo from '../components/LeafLogo'
import { BackIcon, PlayIcon, NextIcon } from '../components/Icons'
import { SCENARIOS } from '../data/lessons'
import './PhraseScreen.css'

export default function PhraseScreen() {
  const { scenarioId, lessonId } = useParams()
  const navigate = useNavigate()
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress] = useState(0)

  const scenario = SCENARIOS[scenarioId]
  const lesson = scenario?.lessons?.find((l) => l.id === lessonId)
  const lessonIndex = scenario?.lessons?.findIndex((l) => l.id === lessonId) ?? 0

  const handlePlay = () => {
    setIsPlaying(true)
    // Simulate audio playback - in production, use Web Speech API or pre-recorded audio
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(lesson?.phrase || '')
      utterance.rate = 0.9
      utterance.onend = () => setIsPlaying(false)
      window.speechSynthesis.speak(utterance)
    } else {
      setTimeout(() => setIsPlaying(false), 2000)
    }
  }

  const handleNext = () => {
    // Go to voice practice for this same lesson
    navigate(`/practice/${scenarioId}/${lessonId}`)
  }

  const handleBack = () => navigate(-1)

  if (!lesson) {
    return (
      <div className="phrase-screen">
        <button className="phrase-back" onClick={() => navigate('/')} aria-label="Back">
          <BackIcon />
        </button>
        <p>Lesson not found</p>
      </div>
    )
  }

  return (
    <div className="phrase-screen">
      <header className="phrase-header">
        <button className="phrase-back" onClick={handleBack} aria-label="Back">
          <BackIcon />
        </button>
      </header>

      <div className="phrase-logo">
        <LeafLogo size={48} />
      </div>

      <div className="phrase-card">
        <p className="phrase-text">{lesson.phrase}</p>
        <button
          className="phrase-play-btn"
          onClick={handlePlay}
          disabled={isPlaying}
          aria-label="Play audio"
        >
          <PlayIcon size={56} />
        </button>
      </div>

      <div className="phrase-progress-ring">
        <svg viewBox="0 0 36 36">
          <path
            className="phrase-progress-bg"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className="phrase-progress-fill"
            strokeDasharray={`${progress * 100}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
      </div>

      <button className="phrase-next-btn" onClick={handleNext} aria-label="Next">
        <NextIcon size={28} />
      </button>
    </div>
  )
}
