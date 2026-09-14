import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CardReading, ReadingLanguage } from '../data/readings'

type CardModalProps = {
  reading: CardReading
  language: ReadingLanguage
  onLanguageChange: (language: ReadingLanguage) => void
  onClose: () => void
}

type TextBlock = {
  key: string
  heading?: string
  full: string
}

const CARD_REVEAL_MS = 800
const CHAR_MS = 28
const SECTION_PAUSE_MS = 180

const UI = {
  ja: {
    close: '閉じる',
    skip: 'スキップ',
    closeAria: '閉じる',
  },
  mn: {
    close: 'Хаах',
    skip: 'Алгасах',
    closeAria: 'Хаах',
  },
} as const

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return reduced
}

function TypewriterLine({
  text,
  active,
  done,
  onComplete,
  charMs,
  skip,
}: {
  text: string
  active: boolean
  done: boolean
  onComplete: () => void
  charMs: number
  skip: boolean
}) {
  const chars = useMemo(() => Array.from(text), [text])
  const [count, setCount] = useState(0)
  const completedRef = useRef(false)

  useEffect(() => {
    if (done || skip || !active) {
      return
    }
    if (count >= chars.length) {
      if (!completedRef.current) {
        completedRef.current = true
        onComplete()
      }
      return
    }

    const timer = window.setTimeout(() => {
      setCount((current) => current + 1)
    }, charMs)

    return () => window.clearTimeout(timer)
  }, [active, charMs, chars.length, count, done, onComplete, skip])

  const visibleCount = done || skip ? chars.length : count
  const showCaret = active && !done && !skip && visibleCount < chars.length

  return (
    <span className={showCaret ? 'is-typing' : undefined}>
      {chars.slice(0, visibleCount).join('')}
    </span>
  )
}

export function CardModal({
  reading,
  language,
  onLanguageChange,
  onClose,
}: CardModalProps) {
  const reducedMotion = usePrefersReducedMotion()
  const [cardReady, setCardReady] = useState(false)
  const [blockIndex, setBlockIndex] = useState(0)
  const [skipAll, setSkipAll] = useState(false)
  const languageRef = useRef(language)
  const ui = UI[language]

  const blocks = useMemo<TextBlock[]>(
    () => [
      { key: 'orientation', full: reading.orientationLabel },
      { key: 'title', full: reading.name },
      {
        key: 'general',
        heading: reading.labels.general,
        full: reading.topics.general,
      },
      {
        key: 'love',
        heading: reading.labels.love,
        full: reading.topics.love,
      },
      {
        key: 'career',
        heading: reading.labels.career,
        full: reading.topics.career,
      },
      {
        key: 'advice',
        heading: reading.labels.advice,
        full: reading.topics.advice,
      },
      {
        key: 'caution',
        heading: reading.labels.caution,
        full: reading.topics.caution,
      },
    ],
    [reading],
  )

  const finishImmediately = useCallback(() => {
    setSkipAll(true)
    setCardReady(true)
    setBlockIndex(blocks.length)
  }, [blocks.length])

  const advance = useCallback(() => {
    window.setTimeout(() => {
      setBlockIndex((current) => current + 1)
    }, SECTION_PAUSE_MS)
  }, [])

  const revealDone = cardReady || skipAll || reducedMotion
  const typingSkip = skipAll || reducedMotion
  const activeBlock = typingSkip ? blocks.length : blockIndex

  useEffect(() => {
    if (languageRef.current === language) {
      return
    }
    languageRef.current = language
    setSkipAll(true)
    setCardReady(true)
    setBlockIndex(blocks.length)
  }, [language, blocks.length])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        finishImmediately()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [finishImmediately, onClose])

  useEffect(() => {
    if (reducedMotion) {
      return
    }

    const timer = window.setTimeout(() => {
      setCardReady(true)
    }, CARD_REVEAL_MS)

    return () => window.clearTimeout(timer)
  }, [reducedMotion])

  return (
    <div
      className="card-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-modal-title"
      lang={language}
    >
      <button
        type="button"
        className="card-modal__backdrop"
        aria-label={ui.closeAria}
        onClick={onClose}
      />
      <div className="card-modal__panel">
        <div className="card-modal__toolbar">
          <div className="card-modal__langs" role="group" aria-label="Language">
            <button
              type="button"
              className={`card-modal__lang${language === 'ja' ? ' is-active' : ''}`}
              aria-pressed={language === 'ja'}
              onClick={() => onLanguageChange('ja')}
            >
              日本語
            </button>
            <button
              type="button"
              className={`card-modal__lang${language === 'mn' ? ' is-active' : ''}`}
              aria-pressed={language === 'mn'}
              onClick={() => onLanguageChange('mn')}
            >
              Монгол
            </button>
          </div>
          <div className="card-modal__actions">
            <button
              type="button"
              className="card-modal__skip"
              onClick={finishImmediately}
            >
              {ui.skip}
            </button>
            <button
              type="button"
              className="card-modal__close"
              onClick={onClose}
            >
              {ui.close}
            </button>
          </div>
        </div>
        <div className="card-modal__layout">
          <div
            className={`card-modal__image-frame${revealDone ? ' is-revealed' : ''}${reducedMotion ? ' is-instant' : ''}`}
          >
            <img
              className={`card-modal__image${reading.orientation === 'reversed' ? ' is-reversed' : ''}`}
              src={reading.image}
              alt={`${reading.name}（${reading.orientationLabel}）`}
            />
          </div>
          <div className="card-modal__body" aria-live="polite">
            <p className="card-modal__orientation">
              <TypewriterLine
                key={`${reading.id}-${language}-orientation`}
                text={blocks[0].full}
                active={revealDone && activeBlock === 0}
                done={activeBlock > 0}
                skip={typingSkip}
                charMs={CHAR_MS}
                onComplete={advance}
              />
            </p>
            <h2 id="card-modal-title" className="card-modal__title">
              <TypewriterLine
                key={`${reading.id}-${language}-title`}
                text={blocks[1].full}
                active={revealDone && activeBlock === 1}
                done={activeBlock > 1}
                skip={typingSkip}
                charMs={CHAR_MS}
                onComplete={advance}
              />
            </h2>
            {blocks.slice(2).map((block, index) => {
              const absoluteIndex = index + 2
              if (!typingSkip && activeBlock < absoluteIndex) {
                return null
              }

              return (
                <section key={`${language}-${block.key}`} className="card-modal__section">
                  <h3>{block.heading}</h3>
                  <p>
                    <TypewriterLine
                      key={`${reading.id}-${language}-${block.key}`}
                      text={block.full}
                      active={revealDone && activeBlock === absoluteIndex}
                      done={activeBlock > absoluteIndex}
                      skip={typingSkip}
                      charMs={CHAR_MS}
                      onComplete={advance}
                    />
                  </p>
                </section>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
