/** Mulberry32 — compact seeded PRNG returning [0, 1). */
export function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Build a 32-bit seed from the instant the visitor chooses to begin. */
export function seedFromMoment(moment = performance.now()): number {
  let hash = Math.floor(moment * 1000) ^ Date.now()
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const noise = new Uint32Array(1)
    crypto.getRandomValues(noise)
    hash ^= noise[0]
  }
  return hash >>> 0
}
