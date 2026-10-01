import { useEffect, useState } from 'react'
import type { CardReading, ReadingLanguage } from '../data/readings'

type CardModalProps = {
  reading: CardReading
  language: ReadingLanguage
  onLanguageChange: (language: ReadingLanguage) => void
  onClose: () => void
}

const UI = {
  ja: {
    close: '閉じる',
    closeAria: '閉じる',
  },
  mn: {
    close: 'Хаах',
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

export function CardModal({
  reading,
  language,
  onLanguageChange,
  onClose,
}: CardModalProps) {
  const reducedMotion = usePrefersReducedMotion()
  const ui = UI[language]
  const sections = [
    { key: 'general', heading: reading.labels.general, body: reading.topics.general },
    { key: 'love', heading: reading.labels.love, body: reading.topics.love },
    { key: 'career', heading: reading.labels.career, body: reading.topics.career },
    { key: 'advice', heading: reading.labels.advice, body: reading.topics.advice },
    { key: 'caution', heading: reading.labels.caution, body: reading.topics.caution },
  ]

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

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
              className="card-modal__close"
              onClick={onClose}
            >
              {ui.close}
            </button>
          </div>
        </div>
        <div className="card-modal__layout">
          <div
            className={`card-modal__image-frame${reducedMotion ? ' is-instant' : ''}`}
          >
            <img
              className={`card-modal__image${reading.orientation === 'reversed' ? ' is-reversed' : ''}`}
              src={reading.image}
              alt={`${reading.name}（${reading.orientationLabel}）`}
            />
          </div>
          <div className="card-modal__body">
            <p className="card-modal__orientation">{reading.orientationLabel}</p>
            <h2 id="card-modal-title" className="card-modal__title">
              {reading.name}
            </h2>
            {sections.map((section) => (
              <section key={section.key} className="card-modal__section">
                <h3>{section.heading}</h3>
                <p>{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
