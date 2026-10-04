import { useEffect, useState } from 'react'
import type { CardReading, ReadingLanguage } from '../data/readings'

type CardModalProps = {
  reading: CardReading
  question: string
  loading: boolean
  source: 'deepseek' | 'local' | null
  language: ReadingLanguage
  onLanguageChange: (language: ReadingLanguage) => void
  onRestart: () => void
}

const UI = {
  ja: {
    restart: '最初から占う',
    restartAria: 'ページを再読み込みして最初から占う',
    question: 'あなたの相談',
    answer: '回答',
    loading: 'カードを読み解いています…',
    fallback: '接続できないため、保存された解説を表示しています。',
  },
  mn: {
    restart: 'Дахин мэргэлэх',
    restartAria: 'Хуудсыг дахин ачаалж эхнээс нь мэргэлэх',
    question: 'Таны асуулт',
    answer: 'Хариулт',
    loading: 'Хөзрийг тайлж байна…',
    fallback: 'Холболт амжилтгүй тул хадгалсан тайлбарыг харуулж байна.',
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
  question,
  loading,
  source,
  language,
  onLanguageChange,
  onRestart,
}: CardModalProps) {
  const reducedMotion = usePrefersReducedMotion()
  const ui = UI[language]
  const hasQuestion = Boolean(question.trim())
  const sections = (
    hasQuestion
      ? [
          {
            key: 'answer',
            heading: ui.answer,
            body: reading.topics.answer || reading.topics.general,
          },
          {
            key: 'advice',
            heading: reading.labels.advice,
            body: reading.topics.advice,
          },
          {
            key: 'caution',
            heading: reading.labels.caution,
            body: reading.topics.caution,
          },
        ]
      : [
          {
            key: 'general',
            heading: reading.labels.general,
            body: reading.topics.general,
          },
          {
            key: 'advice',
            heading: reading.labels.advice,
            body: reading.topics.advice,
          },
          {
            key: 'caution',
            heading: reading.labels.caution,
            body: reading.topics.caution,
          },
        ]
  ).filter((section) => Boolean(section.body?.trim()))

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onRestart()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onRestart])

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
        aria-label={ui.restartAria}
        onClick={onRestart}
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
              onClick={onRestart}
            >
              {ui.restart}
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
            {question ? (
              <p className="card-modal__question">
                <span className="card-modal__question-label">{ui.question}</span>
                {question}
              </p>
            ) : null}
            <p className="card-modal__orientation">{reading.orientationLabel}</p>
            <h2 id="card-modal-title" className="card-modal__title">
              {reading.name}
            </h2>
            {loading ? (
              <p className="card-modal__status" aria-live="polite">
                {ui.loading}
              </p>
            ) : null}
            {!loading && source === 'local' ? (
              <p className="card-modal__status is-fallback" aria-live="polite">
                {ui.fallback}
              </p>
            ) : null}
            {!loading
              ? sections.map((section) => (
                  <section key={section.key} className="card-modal__section">
                    <h3>{section.heading}</h3>
                    <p>{section.body}</p>
                  </section>
                ))
              : null}
          </div>
        </div>
      </div>
    </div>
  )
}
