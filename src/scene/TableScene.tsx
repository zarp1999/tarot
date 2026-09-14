import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSpring } from '@react-spring/three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, useTexture } from '@react-three/drei'
import { Mesh, Object3D, SpotLight as ThreeSpotLight } from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { Card, type CardPhase, SHUFFLE_DURATION } from './Card'
import { drawRandomCards, type DeckCard } from '../data/deck'
import { assetUrl } from '../data/assetUrl'
import { createRng } from '../data/rng'
import { useCompactViewport } from '../hooks/useCompactViewport'

const MODEL_URL = assetUrl('ger_shaman/ger_shaman.glb')

function prepareRoom(source: Object3D) {
  const room = clone(source)
  const found: Object3D[] = []

  room.traverse((child) => {
    if (/^TarotCard_\d{2}$/.test(child.name)) {
      found.push(child)
    }
    if (child instanceof Mesh) {
      child.receiveShadow = true
    }
  })

  const cards = found
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((object) => {
      const restPosition: [number, number, number] = [
        object.position.x,
        object.position.y,
        object.position.z,
      ]
      object.removeFromParent()
      object.position.set(0, 0, 0)
      object.rotation.set(0, 0, 0)
      object.traverse((child) => {
        if (child instanceof Mesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      return { object, restPosition }
    })

  return { room, cards }
}

// High-angle view: table in the foreground, shaman behind it (not head-on).
// Cards ≈ (0, 0.55, 1.07); shaman at origin facing +Z (entrance).
const LOOK_AT = [0, 0.85, 0.55] as const
const CAMERA_START = [0, 3.05, 5.1] as const
const CAMERA_END = [0, 2.35, 2.8] as const
const CAMERA_END_COMPACT = [0, 2.05, 2.35] as const

const POLAR_CENTER = Math.acos(
  (CAMERA_END[1] - LOOK_AT[1]) /
    Math.hypot(CAMERA_END[1] - LOOK_AT[1], CAMERA_END[2] - LOOK_AT[2]),
)
const POLAR_RANGE = 0.16

function LimitedLookControls() {
  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      enableZoom={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.35}
      target={[LOOK_AT[0], LOOK_AT[1], LOOK_AT[2]]}
      minAzimuthAngle={0}
      maxAzimuthAngle={0}
      minPolarAngle={POLAR_CENTER - POLAR_RANGE}
      maxPolarAngle={POLAR_CENTER + POLAR_RANGE}
    />
  )
}

function IdleCamera() {
  const { camera } = useThree()

  useLayoutEffect(() => {
    camera.position.set(...CAMERA_START)
    camera.lookAt(...LOOK_AT)
  }, [camera])

  return null
}

function SceneCamera({
  onSettled,
  compact,
}: {
  onSettled: () => void
  compact: boolean
}) {
  const { camera } = useThree()
  const end = compact ? CAMERA_END_COMPACT : CAMERA_END

  useLayoutEffect(() => {
    camera.position.set(...CAMERA_START)
    camera.lookAt(...LOOK_AT)
  }, [camera])

  useSpring({
    from: { x: CAMERA_START[0], y: CAMERA_START[1], z: CAMERA_START[2] },
    to: { x: end[0], y: end[1], z: end[2] },
    delay: 400,
    config: { mass: 1, tension: 80, friction: 28 },
    onChange: ({ value }) => {
      camera.position.set(value.x, value.y, value.z)
      camera.lookAt(...LOOK_AT)
    },
    onRest: onSettled,
  })

  return null
}

function TableReadingLight() {
  const lightRef = useRef<ThreeSpotLight>(null)
  const targetRef = useRef<Object3D>(null)

  useFrame(() => {
    const light = lightRef.current
    const target = targetRef.current
    if (!light || !target) {
      return
    }
    light.target = target
    light.target.updateMatrixWorld()
  })

  return (
    <>
      <spotLight
        ref={lightRef}
        position={[0, 2.6, 2.4]}
        angle={0.38}
        penumbra={0.65}
        intensity={55}
        color="#ffc089"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <object3D ref={targetRef} position={[0, 0.55, 1.05]} />
    </>
  )
}

function FortuneParlorLights() {
  return (
    <>
      <fog attach="fog" args={['#100c0a', 5.5, 14]} />
      <ambientLight intensity={2.5} color="#3d2a20" />
      <hemisphereLight args={['#1c2438', '#140e0a', 0.12]} />
      <spotLight
        position={[0, 3.5, 0.4]}
        angle={0.55}
        penumbra={0.75}
        intensity={28}
        color="#c9a078"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <TableReadingLight />
      <pointLight
        position={[-0.7, 1.05, 1.25]}
        intensity={8}
        color="#ff6a28"
        distance={3.2}
        decay={2}
      />
      <pointLight
        position={[0.7, 1.05, 1.25]}
        intensity={6}
        color="#ff7a38"
        distance={3.2}
        decay={2}
      />
      <pointLight
        position={[0.4, 1.9, -0.6]}
        intensity={8}
        color="#8aa0c8"
        distance={4.5}
        decay={2}
      />
    </>
  )
}

export function TableScene({
  started,
  fateSeed,
  onCardSelect,
}: {
  started: boolean
  fateSeed: number | null
  onCardSelect?: (card: DeckCard) => void
}) {
  const { scene } = useGLTF(MODEL_URL)
  const { room, cards } = useMemo(() => prepareRoom(scene), [scene])
  const compact = useCompactViewport()
  const drawnCards = useMemo(() => {
    if (!started || fateSeed === null) {
      return null
    }
    return drawRandomCards(cards.length, createRng(fateSeed))
  }, [started, fateSeed, cards.length])

  useEffect(() => {
    if (!drawnCards) {
      return
    }
    useTexture.preload(drawnCards.map((card) => card.image))
  }, [drawnCards])

  const { clock } = useThree()
  const [phase, setPhase] = useState<CardPhase>('intro')
  const [shuffleStartedAt, setShuffleStartedAt] = useState<number | null>(null)
  const [gatherStartedAt, setGatherStartedAt] = useState<number | null>(null)
  const introHandled = useRef(false)
  const gatheredIds = useRef(new Set<string>())
  const linedUpIds = useRef(new Set<string>())

  const handleIntroSettled = useCallback(() => {
    if (introHandled.current) {
      return
    }
    introHandled.current = true
    setShuffleStartedAt(clock.elapsedTime)
    setPhase('shuffle')
  }, [clock])

  useFrame(({ clock: frameClock }) => {
    if (phase !== 'shuffle' || shuffleStartedAt === null) {
      return
    }
    if (frameClock.elapsedTime - shuffleStartedAt >= SHUFFLE_DURATION) {
      gatheredIds.current.clear()
      setGatherStartedAt(frameClock.elapsedTime)
      setPhase('gather')
    }
  })

  const handleGathered = useCallback(
    (cardName: string) => {
      gatheredIds.current.add(cardName)
      if (gatheredIds.current.size >= cards.length) {
        linedUpIds.current.clear()
        setPhase('lineup')
      }
    },
    [cards.length],
  )

  const handleLinedUp = useCallback(
    (cardName: string) => {
      linedUpIds.current.add(cardName)
      if (linedUpIds.current.size >= cards.length) {
        setPhase('ready')
      }
    },
    [cards.length],
  )

  return (
    <>
      {started ? (
        <SceneCamera compact={compact} onSettled={handleIntroSettled} />
      ) : (
        <IdleCamera />
      )}
      {phase === 'ready' && !compact ? <LimitedLookControls /> : null}
      <FortuneParlorLights />
      <primitive object={room} />
      {cards.map(({ object, restPosition }, index) => (
        <Card
          key={object.name}
          object={object}
          restPosition={restPosition}
          index={index}
          count={cards.length}
          phase={phase}
          shuffleStartedAt={shuffleStartedAt}
          gatherStartedAt={gatherStartedAt}
          deckCard={drawnCards?.[index]}
          onGathered={() => handleGathered(object.name)}
          onLinedUp={() => handleLinedUp(object.name)}
          onSelect={onCardSelect}
        />
      ))}
    </>
  )
}

useGLTF.preload(MODEL_URL)
