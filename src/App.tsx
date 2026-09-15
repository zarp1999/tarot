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
const GATE_PASSWORD = '0830'

function readGateUnlocked(): boolean {
  try {
    return sessionStorage.getItem(GATE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function LoadingScreen({ suppress }: { suppress: boolean }) {
  const { active, progress } = useProgress()
  if (suppress || !active) {
    return null
  }

  return (
    <div className="loader" aria-live="polite">
      部屋を用意しています {Math.round(progress)}%
    </div>
  )
}

function StartOverlay({
  started,
  onStart,
}: {
  started: boolean
  onStart: () => void
}) {
  const { active } = useProgress()
  if (started || active) {
    return null
  }

  return (
    <div className="start-overlay">
      <button type="button" className="start-overlay__button" onClick={onStart}>
        占いを始める
      </button>
    </div>
  )
}

function AccessGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

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
    <div className="access-gate">
      <form className="access-gate__panel" onSubmit={handleSubmit}>
        <label className="access-gate__label" htmlFor="access-password">
          パスワード
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
            パスワードが違います
          </p>
        ) : null}
        <button type="submit" className="access-gate__submit">
          入室する
        </button>
      </form>
    </div>
  )
}

export default function App() {
  const [unlocked, setUnlocked] = useState(readGateUnlocked)
  const [fateSeed, setFateSeed] = useState<number | null>(null)
  const [selectedCard, setSelectedCard] = useState<DeckCard | null>(null)
  const [language, setLanguage] = useState<ReadingLanguage>('ja')
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
        <AccessGate onUnlock={() => setUnlocked(true)} />
      </div>
    )
  }

  return (
    <div className="app">
      <LoadingScreen suppress={started} />
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
      <StartOverlay started={started} onStart={handleStart} />
      {reading ? (
        <CardModal
          key={`${reading.id}-${reading.orientation}`}
          reading={reading}
          language={language}
          onLanguageChange={setLanguage}
          onClose={() => setSelectedCard(null)}
        />
      ) : null}
    </div>
  )
}
