import { useEffect, useRef, useState, type RefObject } from 'react'
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
    more: '下に続きます',
    loading: 'カードを読み解いています…',
    fallback: '接続できないため、保存された解説を表示しています。',
  },
  mn: {
    restart: 'Дахин мэргэлэх',
    restartAria: 'Хуудсыг дахин ачаалж эхнээс нь мэргэлэх',
    question: 'Таны асуулт',
    answer: 'Хариулт',
    more: 'Доош үргэлжилнэ',
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

function useCanScrollMore(
  panelRef: RefObject<HTMLDivElement | null>,
  contentKey: string,
) {
  const [canScrollMore, setCanScrollMore] = useState(false)

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) {
      return
    }

    const update = () => {
      const remaining = panel.scrollHeight - panel.scrollTop - panel.clientHeight
      setCanScrollMore(remaining > 12)
    }

    update()
    panel.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)

    const observer = new ResizeObserver(update)
    observer.observe(panel)

    return () => {
      panel.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      observer.disconnect()
    }
  }, [panelRef, contentKey])

  return canScrollMore
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
  const panelRef = useRef<HTMLDivElement>(null)
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

  const contentKey = [
    loading,
    source,
    language,
    question,
    reading.id,
    reading.orientation,
    ...sections.map((section) => `${section.key}:${section.body}`),
  ].join('|')

  const canScrollMore = useCanScrollMore(panelRef, contentKey)

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
      <div className={`card-modal__sheet${canScrollMore ? ' has-more' : ''}`}>
        <div ref={panelRef} className="card-modal__panel">
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
        <div className="card-modal__more" aria-hidden={!canScrollMore}>
          <span className="card-modal__more-label">{ui.more}</span>
          <span className="card-modal__more-chevron" />
        </div>
      </div>
    </div>
  )
}
