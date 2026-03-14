import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BackIcon, SpeakerIcon, MicIcon } from '../components/Icons'
import { useProgress } from '../context/ProgressContext'
import { SCENARIOS } from '../data/lessons'
import './VoiceScreen.css'

export default function VoiceScreen() {
  const { scenarioId, lessonId } = useParams()
  const navigate = useNavigate()
  const { unlockNextAfterLesson } = useProgress()
  const [timer, setTimer] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [waveformBars] = useState(Array(12).fill(0.15))

  const scenario = SCENARIOS[scenarioId]
  const lesson = scenario?.lessons?.find((l) => l.id === lessonId)
  const lessonIndex = scenario?.lessons?.findIndex((l) => l.id === lessonId) ?? 0
  const nextLesson = scenario?.lessons?.[lessonIndex + 1]
  const totalLessons = scenario?.lessons?.length ?? 4
  const stepProgress = lessonIndex + 1

  useEffect(() => {
    if (!isRecording) return
    const id = setInterval(() => setTimer((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [isRecording])

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleBack = () => navigate(-1)

  const handleMicClick = () => {
    setIsRecording(!isRecording)
    if (!isRecording) setTimer(0)
  }

  const handleNext = () => {
    unlockNextAfterLesson(lessonId)
    if (nextLesson) {
      navigate(`/lesson/${scenarioId}/${nextLesson.id}`)
    } else {
      navigate('/')
    }
  }

  const handleListen = () => {
    if (lesson && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(lesson.phrase)
      utterance.rate = 0.9
      window.speechSynthesis.speak(utterance)
    }
  }

  if (!lesson) {
    return (
      <div className="voice-screen">
        <button className="voice-back" onClick={() => navigate('/')} aria-label="Back">
          <BackIcon />
        </button>
        <p>Lesson not found</p>
      </div>
    )
  }

  return (
    <div className="voice-screen">
      <header className="voice-header">
        <button className="voice-back" onClick={handleBack} aria-label="Back">
          <BackIcon />
        </button>
        <button className="voice-speaker" onClick={handleListen} aria-label="Listen">
          <SpeakerIcon />
        </button>
        <div className="voice-dots" aria-hidden>
          {Array.from({ length: totalLessons }).map((_, i) => (
            <span
              key={i}
              className={`voice-dot ${i < stepProgress ? 'active' : ''}`}
            />
          ))}
        </div>
      </header>

      <div className="voice-timer">{formatTime(timer)}</div>

      <div className="voice-card">
        <div className="voice-avatar">
          <svg viewBox="0 0 48 48" fill="none" aria-hidden>
            <circle cx="24" cy="20" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M8 44C8 32 14 28 24 28C34 28 40 32 40 44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="voice-waveform">
          {waveformBars.map((h, i) => (
            <span
              key={i}
              className="voice-bar"
              style={{
                height: `${(isRecording ? 0.3 + Math.random() * 0.5 : h) * 100}%`,
                animationDelay: `${i * 0.05}s`,
              }}
            />
          ))}
        </div>
      </div>

      <button
        className="voice-mic-btn"
        onClick={handleMicClick}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        <MicIcon size={72} />
      </button>

      <button className="voice-next-btn" onClick={handleNext} aria-label="Next">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="voice-progress-dots" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`voice-progress-dot ${i < 3 ? 'filled' : ''}`}
          />
        ))}
      </div>
    </div>
  )
}
