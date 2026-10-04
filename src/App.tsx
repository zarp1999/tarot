import { Suspense, useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { TableScene } from './scene/TableScene'
import { CardModal } from './components/CardModal'
import { fetchCardReading } from './data/fetchReading'
import { getCardReading, type CardReading, type ReadingLanguage } from './data/readings'
import type { DeckCard } from './data/deck'
import { seedFromMoment } from './data/rng'
import './App.css'

const GATE_STORAGE_KEY = 'tarot-access'
const LANG_STORAGE_KEY = 'tarot-lang'
const GATE_PASSWORD = '0830'

const COPY = {
  ja: {
    password: 'パスワード',
    wrong: 'パスワードが違います',
    enter: '入室する',
    start: '占いを始める',
    loading: '部屋を用意しています',
    questionLabel: '何を占いたいですか？',
    questionPlaceholder: '例: 仕事の進路、恋愛の悩み、今の迷い…',
    questionHint: '短くて大丈夫です。空欄でも始められます。',
  },
  mn: {
    password: 'Нууц үг',
    wrong: 'Нууц үг буруу байна',
    enter: 'Нээх',
    start: 'Мэргэ эхлүүлэх',
    loading: 'Өрөөг бэлдэж байна',
    questionLabel: 'Юуг мэргэхийг хүсэж байна вэ?',
    questionPlaceholder: 'Ж: Ажил, хайр, эргэлзээ…',
    questionHint: 'Товчхон байж болно. Хоосон орхиод ч эхлүүлж болно.',
  },
} as const

function readGateUnlocked(): boolean {
  try {
    return sessionStorage.getItem(GATE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function readLanguage(): ReadingLanguage {
  try {
    return sessionStorage.getItem(LANG_STORAGE_KEY) === 'ja' ? 'ja' : 'mn'
  } catch {
    return 'mn'
  }
}

function LoadingScreen({
  suppress,
  language,
}: {
  suppress: boolean
  language: ReadingLanguage
}) {
  const { active, progress } = useProgress()
  if (suppress || !active) {
    return null
  }

  return (
    <div className="loader" aria-live="polite" lang={language}>
      {COPY[language].loading} {Math.round(progress)}%
    </div>
  )
}

function StartOverlay({
  started,
  language,
  initialQuestion,
  onStart,
}: {
  started: boolean
  language: ReadingLanguage
  initialQuestion: string
  onStart: (question: string) => void
}) {
  const { active } = useProgress()
  const [question, setQuestion] = useState(initialQuestion)
  const copy = COPY[language]

  useEffect(() => {
    if (!started) {
      setQuestion(initialQuestion)
    }
  }, [started, initialQuestion])

  if (started || active) {
    return null
  }

  return (
    <div className="start-overlay" lang={language}>
      <form
        className="start-overlay__panel"
        onSubmit={(event) => {
          event.preventDefault()
          onStart(question.trim())
        }}
      >
        <label className="start-overlay__label" htmlFor="fortune-question">
          {copy.questionLabel}
        </label>
        <textarea
          id="fortune-question"
          className="start-overlay__textarea"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={copy.questionPlaceholder}
          rows={3}
          maxLength={500}
        />
        <p className="start-overlay__hint">{copy.questionHint}</p>
        <button type="submit" className="start-overlay__button">
          {copy.start}
        </button>
      </form>
    </div>
  )
}

function LanguageSwitch({
  language,
  onChange,
}: {
  language: ReadingLanguage
  onChange: (language: ReadingLanguage) => void
}) {
  return (
    <div className="access-gate__langs" role="group" aria-label="Language">
      <button
        type="button"
        className={`access-gate__lang${language === 'ja' ? ' is-active' : ''}`}
        aria-pressed={language === 'ja'}
        onClick={() => onChange('ja')}
      >
        日本語
      </button>
      <button
        type="button"
        className={`access-gate__lang${language === 'mn' ? ' is-active' : ''}`}
        aria-pressed={language === 'mn'}
        onClick={() => onChange('mn')}
      >
        Монгол
      </button>
    </div>
  )
}

function AccessGate({
  language,
  onLanguageChange,
  onUnlock,
}: {
  language: ReadingLanguage
  onLanguageChange: (language: ReadingLanguage) => void
  onUnlock: () => void
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const copy = COPY[language]

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password.trim() === GATE_PASSWORD) {
      try {
        sessionStorage.setItem(GATE_STORAGE_KEY, '1')
      } catch {
        // Ignore storage failures; unlock still works for this visit.
      }
      setError(false)
      onUnlock()
      return
    }
    setError(true)
  }

  return (
    <div className="access-gate" lang={language}>
      <form className="access-gate__panel" onSubmit={handleSubmit}>
        <LanguageSwitch language={language} onChange={onLanguageChange} />
        <label className="access-gate__label" htmlFor="access-password">
          {copy.password}
        </label>
        <input
          id="access-password"
          className="access-gate__input"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            if (error) {
              setError(false)
            }
          }}
          aria-invalid={error}
          aria-describedby={error ? 'access-password-error' : undefined}
        />
        {error ? (
          <p id="access-password-error" className="access-gate__error" role="alert">
            {copy.wrong}
          </p>
        ) : null}
        <button type="submit" className="access-gate__submit">
          {copy.enter}
        </button>
      </form>
    </div>
  )
}

export default function App() {
  const [unlocked, setUnlocked] = useState(readGateUnlocked)
  const [fateSeed, setFateSeed] = useState<number | null>(null)
  const [question, setQuestion] = useState('')
  const [selectedCard, setSelectedCard] = useState<DeckCard | null>(null)
  const [reading, setReading] = useState<CardReading | null>(null)
  const [readingLoading, setReadingLoading] = useState(false)
  const [readingSource, setReadingSource] = useState<'deepseek' | 'local' | null>(
    null,
  )
  const [language, setLanguage] = useState<ReadingLanguage>(readLanguage)

  const handleLanguageChange = useCallback((next: ReadingLanguage) => {
    setLanguage(next)
    try {
      sessionStorage.setItem(LANG_STORAGE_KEY, next)
    } catch {
      // Language still applies for this visit if storage is unavailable.
    }
  }, [])

  const started = fateSeed !== null

  const handleStart = useCallback((nextQuestion: string) => {
    setQuestion(nextQuestion)
    setFateSeed(seedFromMoment())
  }, [])

  const handleRestart = useCallback(() => {
    window.location.reload()
  }, [])

  useEffect(() => {
    if (!selectedCard) {
      return
    }

    const localReading = getCardReading(selectedCard, { language })
    setReading(localReading)
    setReadingLoading(true)
    setReadingSource(null)

    const controller = new AbortController()

    void fetchCardReading(selectedCard, {
      language,
      question,
      signal: controller.signal,
    })
      .then(({ reading: nextReading, source }) => {
        if (controller.signal.aborted) {
          return
        }
        setReading(nextReading)
        setReadingSource(source)
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return
        }
        setReading(localReading)
        setReadingSource('local')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setReadingLoading(false)
        }
      })

    return () => controller.abort()
  }, [selectedCard, language, question])

  if (!unlocked) {
    return (
      <div className="app">
        <AccessGate
          language={language}
          onLanguageChange={handleLanguageChange}
          onUnlock={() => setUnlocked(true)}
        />
      </div>
    )
  }

  return (
    <div className="app">
      <LoadingScreen suppress={started} language={language} />
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: 55, near: 0.1, far: 60 }}
        style={{ touchAction: 'none' }}
      >
        <color attach="background" args={['#100c0a']} />
        <Suspense fallback={null}>
          <TableScene
            started={started}
            fateSeed={fateSeed}
            onCardSelect={setSelectedCard}
          />
        </Suspense>
      </Canvas>
      <div className="vignette" aria-hidden="true" />
      <StartOverlay
        started={started}
        language={language}
        initialQuestion={question}
        onStart={handleStart}
      />
      {reading ? (
        <CardModal
          key={`${reading.id}-${reading.orientation}-${language}`}
          reading={reading}
          question={question}
          loading={readingLoading}
          source={readingSource}
          language={language}
          onLanguageChange={handleLanguageChange}
          onRestart={handleRestart}
        />
      ) : null}
    </div>
  )
}
