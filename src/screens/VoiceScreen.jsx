import { useState, useEffect, useRef } from 'react'
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

const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

export default function VoiceScreen() {
  const { scenarioId, lessonId } = useParams()
  const navigate = useNavigate()
  const { unlockNextAfterLesson } = useProgress()
  const [timer, setTimer] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [answer, setAnswer] = useState('')
  const [phraseCorrect, setPhraseCorrect] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [bengaliTranslation, setBengaliTranslation] = useState('')
  const [bengaliPronunciation, setBengaliPronunciation] = useState('')
  const recognitionRef = useRef(null)
  const transcriptAccumulatorRef = useRef('')
  const didRequestResponseRef = useRef(false)

  const scenario = SCENARIOS[scenarioId]
  const lesson = scenario?.lessons?.find((l) => l.id === lessonId)
  const lessonIndex = scenario?.lessons?.findIndex((l) => l.id === lessonId) ?? 0
  const nextLesson = scenario?.lessons?.[lessonIndex + 1]
  const totalLessons = scenario?.lessons?.length ?? 4
  const stepProgress = lessonIndex + 1

  useEffect(() => {
    setPhraseCorrect(false)
    setAnswer('')
    setTranscript('')
    setBengaliTranslation('')
    setBengaliPronunciation('')
  }, [lessonId])

  useEffect(() => {
    if (!lesson?.phrase) return
    let cancelled = false
    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: lesson.phrase }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!cancelled && data?.translated) {
          setBengaliTranslation(data.translated)
          setBengaliPronunciation(data.pronunciation || '')
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [lesson?.phrase])

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

  const fetchVoiceResponse = async (text, expectedPhrase) => {
    setIsLoading(true)
    setAnswer('')
    try {
      const res = await fetch('/api/voice-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, expectedPhrase: expectedPhrase || '' }),
      })
      const raw = await res.text()
      let data = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch (_) {
        // Server returned non-JSON (e.g. 404 HTML)
      }
      if (res.ok && data.answer) {
        const correct = data.correct === true
        setPhraseCorrect(correct)
        setAnswer(data.answer)
        if ('speechSynthesis' in window) {
          const u = new SpeechSynthesisUtterance(data.answer)
          u.rate = 0.9
          window.speechSynthesis.speak(u)
        }
      } else {
        const msg = data.error || data.detail || data.hint
        const detail = data.detail && data.detail !== msg ? data.detail : ""
        if (msg) {
          setAnswer(detail ? `${msg}: ${detail}` : msg)
        } else if (res.status === 404) {
          setAnswer("Voice API not found. Run 'npx vercel dev' for local API, or check deployment.")
        } else {
          setAnswer(`Request failed (${res.status}). Try again.`)
        }
      }
    } catch (err) {
      setAnswer(err?.message?.includes('fetch') ? 'Network error. Check connection.' : 'Something went wrong. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMicClick = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsRecording(false)
      return
    }
    setTranscript('')
    setAnswer('')
    transcriptAccumulatorRef.current = ''
    didRequestResponseRef.current = false
    setTimer(0)
    if (!SpeechRecognition) {
      setAnswer('Voice input is not supported in this browser. Try Chrome.')
      return
    }
    setIsRecording(true)
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-CA'
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const part = event.results[i][0].transcript
          transcriptAccumulatorRef.current += part
          setTranscript((prev) => prev + part)
        }
      }
    }
    recognition.onend = () => {
      if (didRequestResponseRef.current) return
      const text = transcriptAccumulatorRef.current.trim()
      didRequestResponseRef.current = true
      if (text) fetchVoiceResponse(text, lesson?.phrase)
      else {
        setPhraseCorrect(false)
        setAnswer('No speech heard. Try again and speak clearly.')
      }
    }
    recognition.start()
    recognitionRef.current = recognition
  }

  useEffect(() => {
    if (!isRecording && recognitionRef.current) {
      recognitionRef.current = null
    }
  }, [isRecording])

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
      <motion.div className="voice-stage" variants={stagger}>
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

      <div className="voice-interaction">
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
          <>
            <p className="voice-phrase">{lesson.phrase}</p>
            {bengaliTranslation && (
              <div className="voice-bengali-block">
                <p className="voice-phrase-bengali" lang="bn" aria-label="Bengali translation">
                  বাংলা: {bengaliTranslation}
                </p>
                {bengaliPronunciation && (
                  <p className="voice-phrase-pronunciation" aria-label="Bengali pronunciation">
                    Pronunciation: {bengaliPronunciation}
                  </p>
                )}
                {bengaliTranslation && 'speechSynthesis' in window && (
                  <button
                    type="button"
                    className="voice-bengali-listen"
                    onClick={() => {
                      const u = new SpeechSynthesisUtterance(bengaliTranslation)
                      u.lang = 'bn'
                      u.rate = 0.85
                      window.speechSynthesis.speak(u)
                    }}
                    aria-label="Listen to Bengali pronunciation"
                  >
                    Listen (Bengali)
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {(transcript || answer || isLoading) && (
          <div className={`voice-feedback ${answer && !isLoading && !phraseCorrect ? 'voice-feedback-incorrect' : ''}`} aria-live="polite">
            {transcript && <p className="voice-you-said">You said: {transcript}</p>}
            {isLoading && <p className="voice-loading">Thinking…</p>}
            {answer && !isLoading && <p className={phraseCorrect ? 'voice-answer' : 'voice-answer voice-answer-incorrect'}>{answer}</p>}
          </div>
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
          disabled={!phraseCorrect}
          aria-label={phraseCorrect ? 'Next' : 'Say the phrase correctly to continue'}
          whileHover={phraseCorrect ? { scale: 1.01 } : {}}
          whileTap={phraseCorrect ? { scale: 0.98 } : {}}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      </motion.div>
      </div>
      </motion.div>
    </motion.div>
  )
}
