import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSpring } from '@react-spring/three'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import {
  Mesh,
  Object3D,
  PerspectiveCamera,
  Vector3,
  type Camera,
  SpotLight as ThreeSpotLight,
} from 'three'
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
const LOOK_AT_COMPACT = [0, 0.7, 0.95] as const
const CAMERA_START = [0, 3.05, 5.1] as const
const CAMERA_END = [0, 2.35, 2.8] as const
/** Keep the phone camera inside the ger while framing the card row. */
const CAMERA_END_COMPACT = [0, 2.4, 2.85] as const
/** Center-to-center spacing for the compact lineup (avoids overlap). */
const COMPACT_CARD_PITCH = 0.2
/** Uniform card scale on phones so 7 cards fit without stacking. */
const COMPACT_CARD_SCALE = 0.72
const COMPACT_FOV = 68
const DESKTOP_FOV = 55

function restPositionForViewport(
  rest: [number, number, number],
  index: number,
  count: number,
  compact: boolean,
): [number, number, number] {
  if (!compact) {
    return rest
  }
  const x = (index - (count - 1) / 2) * COMPACT_CARD_PITCH
  return [x, rest[1], rest[2]]
}

function lookAtForViewport(compact: boolean) {
  return compact ? LOOK_AT_COMPACT : LOOK_AT
}

function cameraEndForViewport(compact: boolean) {
  return compact ? CAMERA_END_COMPACT : CAMERA_END
}

const LOOK_SENSITIVITY = 0.0045
const PITCH_LIMIT = Math.PI / 2 - 0.12

/** Fixed camera position; pointer drag changes look direction only. */
function FixedLookControls({
  position,
  initialLookAt,
}: {
  position: readonly [number, number, number]
  initialLookAt: readonly [number, number, number]
}) {
  const { camera, gl } = useThree()
  const yawRef = useRef(0)
  const pitchRef = useRef(0)
  const draggingRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  const lookDir = useMemo(() => new Vector3(), [])

  useLayoutEffect(() => {
    camera.position.set(position[0], position[1], position[2])
    camera.lookAt(initialLookAt[0], initialLookAt[1], initialLookAt[2])
    camera.getWorldDirection(lookDir)
    yawRef.current = Math.atan2(lookDir.x, lookDir.z)
    pitchRef.current = Math.asin(
      Math.max(-1, Math.min(1, lookDir.y)),
    )
  }, [camera, initialLookAt, lookDir, position])

  useEffect(() => {
    const element = gl.domElement

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return
      }
      draggingRef.current = true
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) {
        return
      }
      const dx = event.clientX - lastPointerRef.current.x
      const dy = event.clientY - lastPointerRef.current.y
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      yawRef.current -= dx * LOOK_SENSITIVITY
      pitchRef.current -= dy * LOOK_SENSITIVITY
      pitchRef.current = Math.max(
        -PITCH_LIMIT,
        Math.min(PITCH_LIMIT, pitchRef.current),
      )
    }

    const onPointerUp = () => {
      draggingRef.current = false
    }

    element.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    return () => {
      element.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [gl])

  useFrame(() => {
    camera.position.set(position[0], position[1], position[2])
    const yaw = yawRef.current
    const pitch = pitchRef.current
    lookDir.set(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch),
    )
    camera.lookAt(
      camera.position.x + lookDir.x,
      camera.position.y + lookDir.y,
      camera.position.z + lookDir.z,
    )
  })

  return null
}

function applyViewportCamera(camera: Camera, compact: boolean) {
  if (camera instanceof PerspectiveCamera) {
    camera.fov = compact ? COMPACT_FOV : DESKTOP_FOV
    camera.updateProjectionMatrix()
  }
  const lookAt = lookAtForViewport(compact)
  camera.position.set(...CAMERA_START)
  camera.lookAt(lookAt[0], lookAt[1], lookAt[2])
}

function IdleCamera({ compact }: { compact: boolean }) {
  const { camera } = useThree()

  useLayoutEffect(() => {
    applyViewportCamera(camera, compact)
  }, [camera, compact])

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
  const lookAt = lookAtForViewport(compact)

  useLayoutEffect(() => {
    applyViewportCamera(camera, compact)
  }, [camera, compact])

  useSpring({
    from: { x: CAMERA_START[0], y: CAMERA_START[1], z: CAMERA_START[2] },
    to: { x: end[0], y: end[1], z: end[2] },
    delay: 400,
    config: { mass: 1, tension: 80, friction: 28 },
    onChange: ({ value }) => {
      camera.position.set(value.x, value.y, value.z)
      camera.lookAt(lookAt[0], lookAt[1], lookAt[2])
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
        <IdleCamera compact={compact} />
      )}
      {phase === 'ready' ? (
        <FixedLookControls
          position={cameraEndForViewport(compact)}
          initialLookAt={lookAtForViewport(compact)}
        />
      ) : null}
      <FortuneParlorLights />
      <primitive object={room} />
      {cards.map(({ object, restPosition }, index) => (
        <Card
          key={object.name}
          object={object}
          restPosition={restPositionForViewport(
            restPosition,
            index,
            cards.length,
            compact,
          )}
          displayScale={compact ? COMPACT_CARD_SCALE : 1}
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
