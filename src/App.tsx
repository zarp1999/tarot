import { Suspense, useCallback, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { TableScene } from './scene/TableScene'
import { CardModal } from './components/CardModal'
import { getCardReading, type ReadingLanguage } from './data/readings'
import type { DeckCard } from './data/deck'
import { seedFromMoment } from './data/rng'
import './App.css'

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

export default function App() {
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
