import { Suspense, useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { TableScene } from './scene/TableScene'
import { CardModal } from './components/CardModal'
import { getCardReading, type ReadingLanguage } from './data/readings'
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
  },
  mn: {
    password: 'Нууц үг',
    wrong: 'Нууц үг буруу байна',
    enter: 'Нээх',
    start: 'Мэргэ эхлүүлэх',
    loading: 'Өрөөг бэлдэж байна',
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
    return sessionStorage.getItem(LANG_STORAGE_KEY) === 'mn' ? 'mn' : 'ja'
  } catch {
    return 'ja'
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
  onStart,
}: {
  started: boolean
  language: ReadingLanguage
  onStart: () => void
}) {
  const { active } = useProgress()
  if (started || active) {
    return null
  }

  return (
    <div className="start-overlay" lang={language}>
      <button type="button" className="start-overlay__button" onClick={onStart}>
        {COPY[language].start}
      </button>
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
  const [selectedCard, setSelectedCard] = useState<DeckCard | null>(null)
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
  const reading = useMemo(
    () =>
      selectedCard
        ? getCardReading(selectedCard, { language })
        : null,
    [selectedCard, language],
  )

  const handleStart = useCallback(() => {
    setFateSeed(seedFromMoment())
  }, [])

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
      <StartOverlay started={started} language={language} onStart={handleStart} />
      {reading ? (
        <CardModal
          key={`${reading.id}-${reading.orientation}`}
          reading={reading}
          language={language}
          onLanguageChange={handleLanguageChange}
          onClose={() => setSelectedCard(null)}
        />
      ) : null}
    </div>
  )
}
