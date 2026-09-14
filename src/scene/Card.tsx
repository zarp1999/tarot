import { animated, useSpring } from '@react-spring/three'
import { useCursor } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef, useState, Suspense } from 'react'
import type { Group, Object3D } from 'three'
import type { DeckCard } from '../data/deck'
import { useCompactViewport } from '../hooks/useCompactViewport'
import { CardFace } from './CardFace'

export type CardPhase = 'intro' | 'shuffle' | 'gather' | 'lineup' | 'ready'

type CardProps = {
  object: Object3D
  restPosition: [number, number, number]
  index: number
  count: number
  phase: CardPhase
  shuffleStartedAt: number | null
  gatherStartedAt: number | null
  deckCard?: DeckCard
  onGathered?: () => void
  onLinedUp?: () => void
  onSelect?: (card: DeckCard) => void
}

const TAU = Math.PI * 2
export const SHUFFLE_DURATION = 2.4
export const SPREAD_DURATION = 0.75
export const GATHER_DURATION = 0.95

function pilePosition(
  index: number,
  rest: [number, number, number],
): [number, number, number] {
  return [
    (index - 3) * 0.012,
    rest[1] + 0.4 + index * 0.01,
    rest[2],
  ]
}

function easeOutCubic(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return 1 - (1 - x) ** 3
}

function easeInOutCubic(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

function applyShufflePose(
  group: Group,
  index: number,
  count: number,
  restPosition: [number, number, number],
  elapsed: number,
  radiusScale: number,
) {
  const pile = pilePosition(index, restPosition)
  const spin = -elapsed * 2.9
  const base = spin + (index / count) * TAU
  const wobble = 0.07 * Math.sin(elapsed * 4.2 + index)
  const orbitRadius = (0.3 + wobble) * radiusScale
  const cy = restPosition[1] + 0.4

  const orbitX = orbitRadius * Math.cos(base)
  const orbitY = cy + 0.05 * Math.sin(elapsed * 5.5 + index * 0.9) * radiusScale
  const orbitZ = restPosition[2] + orbitRadius * Math.sin(base)

  // Blend from the resting pile into the orbit so the start does not jump.
  const blend = radiusScale
  group.position.set(
    pile[0] * (1 - blend) + orbitX * blend,
    pile[1] * (1 - blend) + orbitY * blend,
    pile[2] * (1 - blend) + orbitZ * blend,
  )
  group.rotation.set(
    0.12 * Math.sin(elapsed * 3 + index) * blend,
    base * blend,
    0.1 * Math.cos(elapsed * 2.6 + index) * blend,
  )
}

export function Card({
  object,
  restPosition,
  index,
  count,
  phase,
  shuffleStartedAt,
  gatherStartedAt,
  deckCard,
  onGathered,
  onLinedUp,
  onSelect,
}: CardProps) {
  const groupRef = useRef<Group>(null)
  const [flipped, setFlipped] = useState(false)
  const [hovered, setHovered] = useState(false)
  const gatheredReported = useRef(false)
  const linedUpReported = useRef(false)
  const interactive = phase === 'ready'
  const compact = useCompactViewport()
  useCursor(hovered && interactive && !compact)
  const hitSize: [number, number, number] = compact
    ? [0.3, 0.05, 0.48]
    : [0.2, 0.03, 0.34]

  useLayoutEffect(() => {
    object.traverse((child) => {
      if (/front/i.test(child.name)) {
        child.visible = false
      }
    })
  }, [object])

  const pile = pilePosition(index, restPosition)
  const motionDriven = phase === 'shuffle' || phase === 'gather'

  const [pose, poseApi] = useSpring(() => ({
    x: pile[0],
    y: pile[1],
    z: pile[2],
    rx: 0,
    ry: 0,
    rz: 0,
    config: { mass: 1, tension: 140, friction: 24 },
  }))

  const { flipX, liftY } = useSpring({
    flipX: flipped ? Math.PI : 0,
    liftY:
      flipped && interactive
        ? 0.28
        : hovered && interactive && !compact
          ? 0.04
          : 0,
    config: { mass: 1, tension: 170, friction: 22 },
  })

  useEffect(() => {
    if (phase === 'intro') {
      gatheredReported.current = false
      linedUpReported.current = false
      poseApi.set({
        x: pile[0],
        y: pile[1],
        z: pile[2],
        rx: 0,
        ry: 0,
        rz: 0,
      })
      return
    }

    if (phase === 'shuffle') {
      const group = groupRef.current
      if (group) {
        group.position.set(...pile)
        group.rotation.set(0, 0, 0)
      }
      return
    }

    if (phase === 'lineup') {
      const group = groupRef.current
      const from = group
        ? {
            x: group.position.x,
            y: group.position.y,
            z: group.position.z,
            rx: group.rotation.x,
            ry: group.rotation.y,
            rz: group.rotation.z,
          }
        : {
            x: pile[0],
            y: pile[1],
            z: pile[2],
            rx: 0,
            ry: 0,
            rz: 0,
          }

      // Lock spring to the live pose immediately so we never flash the pile.
      poseApi.set(from)
      poseApi.start({
        to: {
          x: restPosition[0],
          y: restPosition[1],
          z: restPosition[2],
          rx: 0,
          ry: 0,
          rz: 0,
        },
        delay: index * 60,
        onRest: () => {
          if (!linedUpReported.current) {
            linedUpReported.current = true
            onLinedUp?.()
          }
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react only to phase changes
  }, [phase])

  useFrame(({ clock }) => {
    const group = groupRef.current
    if (!group) {
      return
    }

    if (phase === 'shuffle' && shuffleStartedAt !== null) {
      const elapsed = Math.max(0, clock.elapsedTime - shuffleStartedAt)
      const spread = easeInOutCubic(elapsed / SPREAD_DURATION)
      applyShufflePose(group, index, count, restPosition, elapsed, spread)
      return
    }

    if (phase === 'gather' && gatherStartedAt !== null && shuffleStartedAt !== null) {
      const shuffleElapsed = gatherStartedAt - shuffleStartedAt
      const gatherElapsed = Math.max(0, clock.elapsedTime - gatherStartedAt)
      const gatherProgress = easeOutCubic(gatherElapsed / GATHER_DURATION)
      const radiusScale = 1 - gatherProgress
      const elapsed = shuffleElapsed + gatherElapsed
      applyShufflePose(group, index, count, restPosition, elapsed, radiusScale)

      if (gatherProgress >= 1 && !gatheredReported.current) {
        const target = pilePosition(index, restPosition)
        group.position.set(...target)
        group.rotation.set(0, 0, 0)
        gatheredReported.current = true
        onGathered?.()
      }
    }
  })

  return (
    <animated.group
      ref={groupRef}
      position-x={motionDriven ? undefined : pose.x}
      position-y={motionDriven ? undefined : pose.y}
      position-z={motionDriven ? undefined : pose.z}
      rotation-x={motionDriven ? undefined : pose.rx}
      rotation-y={motionDriven ? undefined : pose.ry}
      rotation-z={motionDriven ? undefined : pose.rz}
    >
      <animated.group position-y={liftY} rotation-x={flipX}>
        <mesh
          onPointerOver={(event: ThreeEvent<PointerEvent>) => {
            event.stopPropagation()
            if (!interactive) {
              return
            }
            setHovered(true)
          }}
          onPointerOut={() => setHovered(false)}
          onClick={(event: ThreeEvent<MouseEvent>) => {
            event.stopPropagation()
            if (!interactive || !deckCard) {
              return
            }
            setFlipped(true)
            onSelect?.(deckCard)
          }}
        >
          <boxGeometry key={compact ? 'hit-compact' : 'hit-desktop'} args={hitSize} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <primitive object={object} />
        {deckCard ? (
          <Suspense fallback={null}>
            <CardFace imageUrl={deckCard.image} reversed={deckCard.reversed} />
          </Suspense>
        ) : null}
      </animated.group>
    </animated.group>
  )
}
