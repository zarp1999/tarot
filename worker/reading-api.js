/**
 * Cloudflare Worker: tarot reading API
 *
 * Paste this file into the Worker editor (or deploy with Wrangler),
 * then set Secret: DEEPSEEK_API_KEY
 *
 * POST /api/reading
 * {
 *   "id": 0,
 *   "name": "愚者",
 *   "nameEn": "The Fool",
 *   "reversed": false,
 *   "language": "ja",
 *   "question": "転職すべきか迷っています"
 * }
 *
 * With question  → topics: { answer, advice, caution }
 * Without question → topics: { general, advice, caution }
 */

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://zarp1999.github.io',
]

const LABELS = {
  ja: {
    upright: '正位置',
    reversed: '逆位置',
  },
  mn: {
    upright: 'Зөв байрлал',
    reversed: 'Урвуу байрлал',
  },
}

function corsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin),
    },
  })
}

function buildSystemPrompt(language, hasQuestion) {
  if (language === 'mn') {
    if (hasQuestion) {
      return [
        'Та таро уншдаг мэргэжилтэн.',
        'Хэрэглэгчийн асуултад шууд хариулна. Хайр, ажил гэх мэт тусдаа ангилал бичихгүй.',
        'Зөвхөн JSON буцаана. Markdown, тайлбар, код блок хэрэглэхгүй.',
        'JSON бүтэц нь яг дараах байх ёстой:',
        '{"answer":"...","advice":"...","caution":"..."}',
        'answer: асуултад шууд хариулсан 3-6 өгүүлбэр.',
        'advice, caution: тус бүр 2-4 өгүүлбэр.',
        'Асуулт ирээдүйн түгшүүр, ажил, хайр аль нь байсан ч answer дотор нь хариул.',
        'Ирээдүйг баталгаажуулсан мэт, эсвэл бусдын бодлыг мэдэж байгаа мэт бичихээс зайлсхий.',
      ].join(' ')
    }

    return [
      'Та таро уншдаг мэргэжилтэн.',
      'Асуулт байхгүй тул ерөнхий уншлага өгнө.',
      'Зөвхөн JSON буцаана. Markdown, тайлбар, код блок хэрэглэхгүй.',
      'JSON бүтэц нь яг дараах байх ёстой:',
      '{"general":"...","advice":"...","caution":"..."}',
      'Талбар бүрт 2-4 өгүүлбэртэй, практик, хүндэтгэлтэй тайлбар бич.',
      'Хайр, ажил гэсэн тусдаа талбар бичихгүй.',
      'Ирээдүйг баталгаажуулсан мэт бичихээс зайлсхий.',
    ].join(' ')
  }

  if (hasQuestion) {
    return [
      'あなたはタロットの読み解きを書く編集者です。',
      '相談者の質問に直接答える。恋愛・仕事などの別カテゴリは書かない。',
      '出力はJSONのみ。Markdownや前置き、コードフェンスは禁止。',
      'JSONの形は必ず次のとおり:',
      '{"answer":"...","advice":"...","caution":"..."}',
      'answerは質問への直接の回答（3〜6文）。',
      'adviceとcautionは各2〜4文。',
      '将来の不安・仕事・恋愛など、質問のテーマはすべてanswerに含める。',
      '断定的な予言や、他人の内心を言い当てる表現は避ける。',
    ].join(' ')
  }

  return [
    'あなたはタロットの読み解きを書く編集者です。',
    '質問がないので、カードの一般的な読みを書く。',
    '出力はJSONのみ。Markdownや前置き、コードフェンスは禁止。',
    'JSONの形は必ず次のとおり:',
    '{"general":"...","advice":"...","caution":"..."}',
    '各フィールドは2〜4文。実践的で丁寧な日本語。',
    '恋愛・仕事の別フィールドは書かない。',
    '断定的な予言は避ける。',
  ].join(' ')
}

function buildUserPrompt(payload) {
  const hasQuestion = Boolean(payload.question)
  const orientation =
    payload.language === 'mn'
      ? payload.reversed
        ? 'урвуу байрлал'
        : 'зөв байрлал'
      : payload.reversed
        ? '逆位置'
        : '正位置'

  const fields = hasQuestion
    ? {
        answer: payload.language === 'mn' ? 'Асуултын хариулт' : '質問への回答',
        advice: payload.language === 'mn' ? 'Зөвлөгөө' : 'アドバイス',
        caution: payload.language === 'mn' ? 'Анхаарах зүйл' : '注意点',
      }
    : {
        general: payload.language === 'mn' ? 'Ерөнхий утга' : '全体の意味',
        advice: payload.language === 'mn' ? 'Зөвлөгөө' : 'アドバイス',
        caution: payload.language === 'mn' ? 'Анхаарах зүйл' : '注意点',
      }

  return JSON.stringify(
    {
      task: hasQuestion
        ? payload.language === 'mn'
          ? 'Асуултад шууд хариулж, зөвлөгөө болон анхаарах зүйлийг бич'
          : '質問に直接答え、アドバイスと注意点を書いてください'
        : payload.language === 'mn'
          ? 'Ерөнхий уншлага, зөвлөгөө, анхаарах зүйлийг бич'
          : '全体の意味、アドバイス、注意点を書いてください',
      language: payload.language,
      question: payload.question || null,
      cardId: payload.id,
      cardName: payload.name,
      cardNameEn: payload.nameEn || null,
      orientation,
      fields,
      guidance: hasQuestion
        ? payload.language === 'mn'
          ? 'Хайр/ажил/ирээдүй гэж тусад нь бүү ангил. Асуултын сэдвийг answer дотор хариул.'
          : '恋愛・仕事・将来などを別欄に分けない。質問の主題はanswerにまとめる。'
        : payload.language === 'mn'
          ? 'Хайр, ажил гэсэн тусдаа талбар бүү бич.'
          : '恋愛・仕事の別欄は書かない。',
    },
    null,
    2,
  )
}

function extractJsonObject(text) {
  const trimmed = String(text ?? '').trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('AI response was not valid JSON')
    }
    return JSON.parse(trimmed.slice(start, end + 1))
  }
}

function normalizeTopics(raw, hasQuestion) {
  if (hasQuestion) {
    const topics = {
      answer: String(raw?.answer ?? raw?.general ?? '').trim(),
      advice: String(raw?.advice ?? '').trim(),
      caution: String(raw?.caution ?? '').trim(),
    }
    for (const [key, value] of Object.entries(topics)) {
      if (!value) {
        throw new Error(`Missing topic field: ${key}`)
      }
    }
    return topics
  }

  const topics = {
    general: String(raw?.general ?? raw?.answer ?? '').trim(),
    advice: String(raw?.advice ?? '').trim(),
    caution: String(raw?.caution ?? '').trim(),
  }
  for (const [key, value] of Object.entries(topics)) {
    if (!value) {
      throw new Error(`Missing topic field: ${key}`)
    }
  }
  return topics
}

async function createReading(payload, apiKey) {
  const hasQuestion = Boolean(payload.question)
  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(payload.language, hasQuestion),
        },
        { role: 'user', content: buildUserPrompt(payload) },
      ],
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    const message =
      data?.error?.message || data?.message || `DeepSeek error ${response.status}`
    throw new Error(message)
  }

  const content = data?.choices?.[0]?.message?.content
  const parsed = extractJsonObject(content)
  return normalizeTopics(parsed, hasQuestion)
}

function parseRequestBody(body) {
  const language = body?.language === 'ja' ? 'ja' : 'mn'
  const id = Number(body?.id)
  const name = String(body?.name ?? '').trim()
  const nameEn = body?.nameEn ? String(body.nameEn).trim() : ''
  const question = body?.question ? String(body.question).trim().slice(0, 500) : ''
  const reversed = Boolean(body?.reversed)

  if (!Number.isInteger(id) || id < 0 || id > 77) {
    throw new Error('id must be an integer from 0 to 77')
  }
  if (!name) {
    throw new Error('name is required')
  }

  return { id, name, nameEn, reversed, language, question }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    const url = new URL(request.url)
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return jsonResponse({ ok: true, service: 'tarot-reading-api' }, 200, origin)
    }

    if (request.method !== 'POST' || url.pathname !== '/api/reading') {
      return jsonResponse({ error: 'Not Found' }, 404, origin)
    }

    if (!env.DEEPSEEK_API_KEY) {
      return jsonResponse(
        { error: 'DEEPSEEK_API_KEY is not configured' },
        500,
        origin,
      )
    }

    try {
      const body = await request.json()
      const payload = parseRequestBody(body)
      const topics = await createReading(payload, env.DEEPSEEK_API_KEY)
      const labels = LABELS[payload.language]

      return jsonResponse(
        {
          id: payload.id,
          name: payload.name,
          language: payload.language,
          question: payload.question || null,
          orientation: payload.reversed ? 'reversed' : 'upright',
          orientationLabel: payload.reversed ? labels.reversed : labels.upright,
          topics,
          source: 'deepseek',
        },
        200,
        origin,
      )
    } catch (error) {
      return jsonResponse(
        {
          error: error instanceof Error ? error.message : 'Unexpected error',
        },
        400,
        origin,
      )
    }
  },
}
