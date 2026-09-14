import names from './names.json'
import { assetUrl } from './assetUrl'

export type CardIdentity = {
  id: number
  nameJa: string
  nameMn: string
  image: string
}

/** A drawn card, including upright / reversed orientation. */
export type DeckCard = CardIdentity & {
  reversed: boolean
}

type NameEntry = {
  id: number
  name_ja: string
  name_mn: string
}

/** Map dataset id (0–77) to `/cards/*.png` used in public/cards. */
export function cardImagePath(id: number): string {
  if (!Number.isInteger(id) || id < 0 || id > 77) {
    throw new Error(`カードIDは0〜77です: ${id}`)
  }
  if (id <= 21) {
    return assetUrl(`cards/major_${id}.png`)
  }
  if (id <= 35) {
    return assetUrl(`cards/wands_${id - 22}.png`)
  }
  if (id <= 49) {
    return assetUrl(`cards/cups_${id - 36}.png`)
  }
  if (id <= 63) {
    return assetUrl(`cards/swords_${id - 50}.png`)
  }
  return assetUrl(`cards/pentacles_${id - 64}.png`)
}

export const DECK: CardIdentity[] = (names as NameEntry[]).map((entry) => ({
  id: entry.id,
  nameJa: entry.name_ja,
  nameMn: entry.name_mn,
  image: cardImagePath(entry.id),
}))

/** Draw `count` unique cards without replacement; each may be upright or reversed. */
export function drawRandomCards(
  count: number,
  random: () => number = Math.random,
): DeckCard[] {
  if (count < 1 || count > DECK.length) {
    throw new Error(`抽選枚数は1〜${DECK.length}です`)
  }
  const pool = [...DECK]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const tmp = pool[i]
    pool[i] = pool[j]
    pool[j] = tmp
  }
  return pool.slice(0, count).map((card) => ({
    ...card,
    reversed: random() < 0.5,
  }))
}
