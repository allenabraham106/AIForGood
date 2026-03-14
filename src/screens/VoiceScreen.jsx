import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BackIcon, SpeakerIcon, MicIcon } from '../components/Icons'
import { useProgress } from '../context/ProgressContext'
import { SCENARIOS } from '../data/lessons'
import './VoiceScreen.css'

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
}

const stagger = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.08,
    },
  },
}

export default function VoiceScreen() {
  const { scenarioId, lessonId } = useParams()
  const navigate = useNavigate()
  const { unlockNextAfterLesson } = useProgress()
  const [timer, setTimer] = useState(0)
  const [isRecording, setIsRecording] = useState(false)

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
    <motion.div
      className="voice-screen"
      initial="initial"
      animate="animate"
      variants={stagger}
    >
      <header className="voice-header">
        <button className="voice-back" onClick={handleBack} aria-label="Back">
          <BackIcon />
        </button>
        <div className="voice-dots" aria-hidden>
          {Array.from({ length: totalLessons }).map((_, i) => (
            <span
              key={i}
              className={`voice-dot ${i < stepProgress ? 'active' : ''}`}
            />
          ))}
        </div>
        <button className="voice-speaker" onClick={handleListen} aria-label="Listen">
          <SpeakerIcon />
        </button>
      </header>

      <motion.div
        className="voice-timer"
        aria-live="polite"
        variants={fadeIn}
      >
        {formatTime(timer)}
      </motion.div>

      <motion.div
        className="voice-card"
        variants={fadeIn}
      >
        <div className="voice-card-glow" aria-hidden />
        <div className="voice-avatar-wrap">
          <div className="voice-avatar">
            <svg viewBox="0 0 48 48" fill="none" aria-hidden>
              <circle cx="24" cy="20" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M8 44C8 32 14 28 24 28C34 28 40 32 40 44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <div className={`voice-waveform ${isRecording ? 'active' : ''}`} aria-hidden>
          {Array.from({ length: 16 }).map((_, i) => (
            <motion.span
              key={i}
              className="voice-bar"
              animate={
                isRecording
                  ? {
                      height: ['20%', '92%', '30%', '78%', '20%'],
                      transition: {
                        duration: 0.85,
                        repeat: Infinity,
                        delay: i * 0.04,
                        ease: [0.4, 0, 0.6, 1],
                      },
                    }
                  : { height: '20%' }
              }
            />
          ))}
        </div>
        {lesson?.phrase && (
          <p className="voice-phrase">{lesson.phrase}</p>
        )}
      </motion.div>

      <motion.div
        className="voice-mic-section"
        variants={fadeIn}
      >
        <div className="voice-mic-glow" aria-hidden />
        <motion.button
          className={`voice-mic-btn ${isRecording ? 'recording' : ''}`}
          onClick={handleMicClick}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
        >
          <span className="voice-mic-icon">
            <MicIcon size={72} />
          </span>
        </motion.button>
        <div className="voice-status-dots" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className={`voice-status-dot ${isRecording ? 'active' : ''}`}
              animate={{
                scale: isRecording ? [1, 1.25, 1] : 1,
                opacity: isRecording ? [0.8, 1, 0.8] : 0.4,
              }}
              transition={{
                duration: 1,
                repeat: isRecording ? Infinity : 0,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </motion.div>

      <motion.div className="voice-footer" variants={fadeIn}>
        <motion.button
          className="voice-next-btn"
          onClick={handleNext}
          aria-label="Next"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          Continue
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
