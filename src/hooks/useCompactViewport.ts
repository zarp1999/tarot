import { useEffect, useState } from 'react'

/** Rough phone / narrow viewport check for layout and touch affordances. */
export function useCompactViewport(maxWidthPx = 720) {
  const [compact, setCompact] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia(`(max-width: ${maxWidthPx}px)`).matches
  })

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${maxWidthPx}px)`)
    const update = () => setCompact(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [maxWidthPx])

  return compact
}
