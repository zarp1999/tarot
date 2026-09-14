import { useTexture } from '@react-three/drei'
import { SRGBColorSpace, type Texture } from 'three'

type CardFaceProps = {
  imageUrl: string
  reversed?: boolean
}

/** Front art on the underside of a face-down card (local -Y). */
export function CardFace({ imageUrl, reversed = false }: CardFaceProps) {
  const texture = useTexture(imageUrl, (loaded) => {
    const map = (Array.isArray(loaded) ? loaded[0] : loaded) as Texture
    map.colorSpace = SRGBColorSpace
    map.anisotropy = 8
    map.needsUpdate = true
  })

  return (
    <mesh
      position={[0, -0.011, 0]}
      rotation={[Math.PI / 2, 0, reversed ? Math.PI : 0]}
    >
      <planeGeometry args={[0.185, 0.318]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.9}
        metalness={0}
        toneMapped
      />
    </mesh>
  )
}
