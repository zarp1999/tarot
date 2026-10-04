import type { DeckCard } from './deck'
import {
  getCardReading,
  getCardSourceName,
  type CardReading,
  type ReadingLanguage,
  type ReadingTopics,
} from './readings'

const READING_API_URL =
  import.meta.env.VITE_READING_API_URL ??
  'https://tarot-reading-api.zarp-191.workers.dev/api/reading'

type AiTopics = {
  answer?: string
  general?: string
  advice?: string
  caution?: string
}

type AiReadingResponse = {
  topics: AiTopics
  orientationLabel: string
  source?: string
  error?: string
}

function mergeAiTopics(
  fallback: ReadingTopics,
  ai: AiTopics,
  hasQuestion: boolean,
): ReadingTopics {
  const advice = String(ai.advice ?? '').trim()
  const caution = String(ai.caution ?? '').trim()
  const answer = String(ai.answer ?? '').trim()
  const general = String(ai.general ?? '').trim()

  if (!advice || !caution) {
    throw new Error('Reading API topics incomplete')
  }

  if (hasQuestion) {
    const body = answer || general
    if (!body) {
      throw new Error('Reading API answer missing')
    }
    return {
      ...fallback,
      answer: body,
      general: body,
      love: '',
      career: '',
      advice,
      caution,
    }
  }

  const body = general || answer
  if (!body) {
    throw new Error('Reading API general missing')
  }

  return {
    ...fallback,
    general: body,
    love: '',
    career: '',
    advice,
    caution,
    answer: undefined,
  }
}

export async function fetchCardReading(
  card: DeckCard,
  options: {
    language: ReadingLanguage
    question?: string
    signal?: AbortSignal
  },
): Promise<{ reading: CardReading; source: 'deepseek' | 'local' }> {
  const fallback = getCardReading(card, {
    language: options.language,
    reversed: card.reversed,
  })
  const question = options.question?.trim() || ''

  try {
    const response = await fetch(READING_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: options.signal,
      body: JSON.stringify({
        id: card.id,
        name: options.language === 'mn' ? card.nameMn : card.nameJa,
        nameEn: getCardSourceName(card.id),
        reversed: card.reversed,
        language: options.language,
        question,
      }),
    })

    const data = (await response.json()) as AiReadingResponse
    if (!response.ok || !data.topics) {
      throw new Error(data.error || `Reading API failed: ${response.status}`)
    }

    return {
      source: 'deepseek',
      reading: {
        ...fallback,
        orientationLabel: data.orientationLabel || fallback.orientationLabel,
        topics: mergeAiTopics(fallback.topics, data.topics, Boolean(question)),
      },
    }
  } catch (error) {
    if (
      (error instanceof DOMException && error.name === 'AbortError') ||
      options.signal?.aborted
    ) {
      throw error
    }
    return { source: 'local', reading: fallback }
  }
}
