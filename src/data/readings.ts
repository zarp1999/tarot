import detailed from './cards.detailed.ja-mn.json'
import type { DeckCard } from './deck'

export type ReadingLanguage = 'ja' | 'mn'
export type ReadingOrientation = 'upright' | 'reversed'

export type ReadingTopics = {
  general: string
  love: string
  career: string
  advice: string
  caution: string
}

export type CardReading = {
  id: number
  name: string
  image: string
  orientation: ReadingOrientation
  orientationLabel: string
  labels: {
    general: string
    love: string
    career: string
    advice: string
    caution: string
  }
  topics: ReadingTopics
}

type DetailedDataset = {
  labels: Record<
    ReadingLanguage,
    {
      upright: string
      reversed: string
      general: string
      love: string
      career: string
      advice: string
      caution: string
    }
  >
  cards: Array<{
    id: number
    locales: Record<
      ReadingLanguage,
      {
        name: string
        upright: ReadingTopics
        reversed: ReadingTopics
      }
    >
  }>
}

const dataset = detailed as DetailedDataset

export function getCardReading(
  card: DeckCard,
  options?: {
    language?: ReadingLanguage
    reversed?: boolean
  },
): CardReading {
  const language = options?.language ?? 'ja'
  const reversed = options?.reversed ?? card.reversed
  const orientation: ReadingOrientation = reversed ? 'reversed' : 'upright'
  const entry = dataset.cards.find((item) => item.id === card.id)
  if (!entry) {
    throw new Error(`カード解説が見つかりません: ${card.id}`)
  }

  const localized = entry.locales[language]
  const labels = dataset.labels[language]

  return {
    id: card.id,
    name: localized.name,
    image: card.image,
    orientation,
    orientationLabel: labels[orientation],
    labels: {
      general: labels.general,
      love: labels.love,
      career: labels.career,
      advice: labels.advice,
      caution: labels.caution,
    },
    topics: localized[orientation],
  }
}
