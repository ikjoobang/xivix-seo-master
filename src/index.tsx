import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  GEMINI_API_KEY?: string;
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

// Health Check API
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    version: 'V7.1',
    timestamp: new Date().toISOString(),
    services: {
      transform: 'active',
      reformat: 'active',
      generate: 'active (requires GEMINI_API_KEY)',
      youtube: 'active',
      bulk: 'active',
      keyword: 'active'
    }
  })
})

// V6.0: 이모지 완전 제거
function removeAllEmojis(text: string): string {
  return text
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F700}-\u{1F77F}]/gu, '')
    .replace(/[\u{1F780}-\u{1F7FF}]/gu, '')
    .replace(/[\u{1F800}-\u{1F8FF}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[📌🎯🎬🖼️✅❶❷❸■▶✨💡📍📄💬📝✔️➡️⭐🔥💯👍🏻❤️]/g, '')
}

// V6.0: 카테고리별 프롬프트
const categoryConfigs = {
  info: {
    name: '정보성 블로그',
    icon: 'fa-info-circle',
    description: '정보 전달 중심의 글',
    prompt: `당신은 해당 분야의 전문가입니다. 독자에게 유용한 정보를 체계적으로 전달하는 글을 작성하세요.
- 팩트 기반의 정확한 정보 제공
- 단계별/항목별로 구조화
- 독자가 실제 활용할 수 있는 구체적인 팁 포함
- "알아보겠습니다", "소개해드릴게요" 같은 정보 전달형 표현 사용`
  },
  review: {
    name: '후기성 블로그',
    icon: 'fa-star',
    description: '실제 경험 기반 후기',
    prompt: `당신은 직접 사용/경험해본 일반인입니다. 진짜 써본 사람의 솔직한 후기처럼 작성하세요.
- "솔직히 처음엔 별 기대 없었는데~"
- "근데 써보니까 진짜~"
- "단점도 있긴 한데~"
- 장점만 나열하지 말고 작은 단점도 언급하면서 전체적으로 긍정적 결론`
  },
  product: {
    name: '제품 홍보',
    icon: 'fa-shopping-bag',
    description: '제품/서비스 홍보글',
    prompt: `당신은 매장 사장님입니다. 손님에게 제품을 추천하는 느낌으로 작성하세요.
- "저희 매장에서 가장 인기 있는~"
- "직접 써보고 손님들께 추천드리는~"  
- "이 가격에 이 품질은 정말~"
- 구매 포인트와 혜택을 자연스럽게 강조`
  },
  rewrite: {
    name: '새로운 글로 바꾸기',
    icon: 'fa-sync-alt',
    description: '기존 글을 새롭게',
    prompt: `기존 글의 핵심 내용은 유지하면서 완전히 새로운 문체와 구조로 재작성하세요.
- 같은 내용이지만 다른 관점으로
- 문장 구조 완전히 변경
- 새로운 예시와 비유 추가
- 독창적인 표현으로 재구성`
  },
  youtube: {
    name: '유튜브 요약/풀이',
    icon: 'fa-youtube',
    description: '영상 내용을 블로그로',
    prompt: `유튜브 영상의 핵심 내용을 블로그 글로 재구성하세요.
- 영상의 주요 포인트 정리
- 타임라인별 핵심 내용 요약  
- 영상에서 언급된 정보 상세 풀이
- "영상에서 000님이 말씀하신 것처럼~" 같은 연결 표현`
  },
  bulk: {
    name: '대량 글 생성',
    icon: 'fa-layer-group',
    description: '여러 주제 한번에',
    prompt: `블로그 글을 작성하세요. 각 글은 독립적이면서도 일관된 품질을 유지해야 합니다.`
  }
}

// V6.0: 문체 설정
const toneConfigs = {
  haeyo: {
    name: '해요체',
    suffix: '요',
    description: '친근하고 부드러운 말투',
    prompt: `"~해요", "~거든요", "~더라고요", "~있어요" 체를 사용하세요.
절대 "~습니다", "~입니다" 같은 딱딱한 존댓말 금지.
친근하고 부드럽게 대화하듯 작성하세요.`
  },
  formal: {
    name: '습니다체',
    suffix: '습니다',
    description: '공식적이고 신뢰감 있는 말투',
    prompt: `"~습니다", "~됩니다", "~있습니다" 체를 사용하세요.
격식 있고 전문적인 느낌으로 작성하세요.
신뢰감과 전문성을 전달하세요.`
  }
}

// V6.0: Gemini API를 통한 원고 생성
app.post('/api/generate', async (c) => {
  const { 
    topic, 
    category = 'info', 
    tone = 'haeyo', 
    originalText = '',
    youtubeUrl = '',
    enableReadability = true 
  } = await c.req.json()
  
  if (!topic && category !== 'rewrite') {
    return c.json({ error: '주제를 입력해주세요.' }, 400)
  }
  
  if (category === 'rewrite' && !originalText) {
    return c.json({ error: '새로 쓸 원본 글을 입력해주세요.' }, 400)
  }
  
  const geminiKey = c.env?.GEMINI_API_KEY
  if (!geminiKey) {
    return c.json({ error: '서버에 API 키가 설정되어 있지 않습니다. 관리자에게 문의하세요.' }, 400)
  }
  
  const catConfig = categoryConfigs[category as keyof typeof categoryConfigs] || categoryConfigs.info
  const toneConfig = toneConfigs[tone as keyof typeof toneConfigs] || toneConfigs.haeyo
  
  // V6.0: 네이버 상위노출 + 미디어 삽입 위치 + SEO/AEO/C-RANK/GEO 최적화 프롬프트
  const systemPrompt = `${catConfig.prompt}

${toneConfig.prompt}

[최종 목표]
네이버 블로그 상단(1위) 노출을 목표로 작성합니다.

[반드시 지켜야 할 출력 형식]
===제목===
SEO 최적화된 클릭하고 싶은 제목 (15-30자, 숫자/질문/감정 활용)

===본문===
1,700자 이상의 순수 본문 내용

===해시태그===
#해시태그1 #해시태그2 ... (15-20개)

[SEO/AEO/C-RANK/GEO 최적화 규칙]
■ SEO: 핵심 키워드 제목/본문에 5-7회 자연스럽게 반복
■ AEO: 질문-답변 구조 3개 이상 포함 (Q. 질문? → A. 답변)
■ C-RANK: 1,700자 이상, 5개 이상 소제목, 전문성 있는 구조
■ GEO: AI가 인용하기 좋은 명확한 정보 구조

[미디어 삽입 위치 표시 - 반드시 포함!]
본문 작성 시 아래 가이드를 적절한 위치에 삽입하세요:

1. 글 시작 부분 (인트로 후):
[이미지 삽입: 주제를 대표하는 메인 이미지]

2. 각 소제목 시작 부분:
[이미지 삽입: 해당 섹션 관련 이미지]

3. 본문 1/3 지점:
[동영상 삽입: 관련 영상 콘텐츠]

4. 본문 2/3 지점:
[스티커 삽입: 네이버 스티커로 포인트]

5. Q&A 섹션:
[인용구 삽입: 네이버 인용구 기능 활용]

6. 글 마무리 부분:
[배너 삽입: 상담/구매 유도 이미지]

[제목 작성 규칙]
- 주제를 그대로 쓰지 말고 클릭하고 싶은 제목으로 변환
- 숫자, 질문, 경험담, 비교 활용
- 예: "겨울 디퓨저" → "디퓨저 하나로 숙면 끝! 겨울 꿀잠 비법 3가지"

[본문 작성 규칙 - 네이버 모바일 앱 최적화 필수!]
- 순수 읽는 글만 1,700자 이상 (미디어 가이드 제외)
- 5개 이상 소제목으로 구조화
- 각 문단 2-3문장으로 짧게 작성 (모바일에서 한 화면에 2-3줄만 보임)
- 문장과 문장 사이 충분한 여백
- 긴 문장 금지 (한 문장 40자 이내 권장)
- 구체적인 경험담/예시 포함

[금지 사항]
- 이모지/특수문자 사용 금지 (미디어 가이드 제외)
- 뻔한 인사말 금지 ("안녕하세요 오늘은~" X)
- 마크다운 서식 금지 (**, ##, [] 등)`

  let userPrompt = ''
  if (category === 'rewrite') {
    userPrompt = `아래 원본 글을 완전히 새로운 글로 재작성해주세요:\n\n${originalText}`
  } else if (category === 'youtube') {
    userPrompt = `유튜브 영상 주제: ${topic}\n${youtubeUrl ? `영상 URL: ${youtubeUrl}` : ''}\n\n이 영상 내용을 블로그 글로 작성해주세요.`
  } else {
    userPrompt = `주제: ${topic}\n\n위 조건에 맞춰 네이버 블로그 상위노출용 글을 작성해주세요.`
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\n${userPrompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 8192,
          }
        })
      }
    )
    
    if (!response.ok) {
      const errorData = await response.json()
      return c.json({ error: `Gemini API 오류: ${errorData.error?.message || '알 수 없는 오류'}` }, 500)
    }
    
    const data = await response.json()
    let generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    if (!generatedText) {
      return c.json({ error: 'AI 응답이 비어있습니다.' }, 500)
    }
    
    // 이모지 제거 (미디어 가이드 아이콘은 유지)
    generatedText = removeAllEmojis(generatedText)
    
    // 제목, 본문, 해시태그 분리
    let title = ''
    let content = ''
    let hashtags = ''
    
    // ===제목=== 패턴으로 추출
    const titleMatch = generatedText.match(/===\s*제목\s*===\s*([\s\S]*?)(?=\n*===\s*본문|$)/i)
    if (titleMatch) title = titleMatch[1].trim().replace(/^["']|["']$/g, '')
    
    // ===본문=== 패턴으로 추출
    const contentMatch = generatedText.match(/===\s*본문\s*===\s*([\s\S]*?)(?=\n*===\s*해시태그|$)/i)
    if (contentMatch) content = contentMatch[1].trim()
    
    // ===해시태그=== 패턴으로 추출
    const hashtagMatch = generatedText.match(/===\s*해시태그\s*===\s*([\s\S]*)$/i)
    if (hashtagMatch) hashtags = hashtagMatch[1].trim()
    
    // 폴백 로직
    if (!title || !content) {
      const lines = generatedText.split('\n').filter(l => l.trim())
      if (lines.length > 0) {
        title = lines[0].replace(/^[#\[\]제목:=]+\s*/g, '').trim()
        content = lines.slice(1).join('\n').trim()
      }
    }
    
    if (!title) title = topic + ' 완벽 가이드'
    
    // 본문 포맷팅
    const formattedContent = formatForCopyPaste(content, enableReadability)
    
    // 순수 글자수 계산 (미디어 가이드 제외)
    const pureTextLength = formattedContent
      .replace(/\[[^\]]*삽입[^\]]*\]/g, '')
      .replace(/\s+/g, ' ')
      .trim().length
    
    // 해시태그 정리
    const cleanHashtags = [...new Set(hashtags.match(/#[^\s#]+/g) || [])].join(' ')
    
    return c.json({ 
      title: title,
      content: formattedContent,
      hashtags: cleanHashtags,
      rawLength: content.length,
      pureTextLength: pureTextLength,
      category: catConfig.name,
      tone: toneConfig.name,
      readabilityApplied: enableReadability
    })
  } catch (error) {
    console.error('Gemini API Error:', error)
    return c.json({ error: 'AI 생성 중 오류가 발생했습니다.' }, 500)
  }
})

// V6.0: 대량 글 생성 API
app.post('/api/bulk-generate', async (c) => {
  const { topics, category = 'info', tone = 'haeyo' } = await c.req.json()
  
  if (!topics || !Array.isArray(topics) || topics.length === 0) {
    return c.json({ error: '주제 목록을 입력해주세요.' }, 400)
  }
  
  if (topics.length > 10) {
    return c.json({ error: '한 번에 최대 10개까지만 생성 가능합니다.' }, 400)
  }
  
  const geminiKey = c.env?.GEMINI_API_KEY
  if (!geminiKey) {
    return c.json({ error: '서버에 API 키가 설정되어 있지 않습니다.' }, 400)
  }
  
  const results = []
  
  for (const topic of topics) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `네이버 블로그 상위노출용 글을 작성하세요.
주제: ${topic}
- 제목 (15-30자, SEO 최적화)
- 본문 (1,700자 이상)
- 해시태그 (15-20개)

형식:
===제목===
제목 내용
===본문===
본문 내용
===해시태그===
#태그들`
              }]
            }],
            generationConfig: { temperature: 0.9, maxOutputTokens: 4096 }
          })
        }
      )
      
      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      
      const titleMatch = text.match(/===\s*제목\s*===\s*([\s\S]*?)(?=\n*===\s*본문|$)/i)
      const contentMatch = text.match(/===\s*본문\s*===\s*([\s\S]*?)(?=\n*===\s*해시태그|$)/i)
      const hashtagMatch = text.match(/===\s*해시태그\s*===\s*([\s\S]*)$/i)
      
      results.push({
        topic,
        title: titleMatch ? titleMatch[1].trim() : topic,
        content: contentMatch ? removeAllEmojis(contentMatch[1].trim()) : '',
        hashtags: hashtagMatch ? hashtagMatch[1].trim() : '',
        success: true
      })
    } catch (error) {
      results.push({ topic, success: false, error: '생성 실패' })
    }
  }
  
  return c.json({ results, total: topics.length, success: results.filter(r => r.success).length })
})

// V6.0: 스마트블록 키워드 찾기 API
app.post('/api/keyword-finder', async (c) => {
  const { mainKeyword } = await c.req.json()
  
  if (!mainKeyword) {
    return c.json({ error: '메인 키워드를 입력해주세요.' }, 400)
  }
  
  const geminiKey = c.env?.GEMINI_API_KEY
  if (!geminiKey) {
    return c.json({ error: '서버에 API 키가 설정되어 있지 않습니다.' }, 400)
  }
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `네이버 스마트블록에 노출될 수 있는 연관 키워드를 찾아주세요.

메인 키워드: ${mainKeyword}

아래 형식으로 응답해주세요:

===스마트블록 키워드===
1. [키워드1] - 예상 검색량: 높음/중간/낮음
2. [키워드2] - 예상 검색량: 높음/중간/낮음
...

===롱테일 키워드===
1. [롱테일 키워드1]
2. [롱테일 키워드2]
...

===추천 블로그 제목===
1. [제목1]
2. [제목2]
...

===연관 질문 (AEO 최적화)===
Q1. 질문1?
Q2. 질문2?
...`
            }]
          }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      }
    )
    
    const data = await response.json()
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    return c.json({ 
      mainKeyword,
      result: result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return c.json({ error: '키워드 분석 중 오류가 발생했습니다.' }, 500)
  }
})

// 복사 붙여넣기 최적화 포맷팅
function formatForCopyPaste(text: string, enableReadability: boolean): string {
  let cleaned = text
  
  // 불필요한 마크다운 서식만 제거 (미디어 가이드는 유지)
  cleaned = cleaned
    .replace(/\*\*/g, '')
    .replace(/(?<!\[)\*(?!\])/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/---/g, '')
  
  if (enableReadability) {
    // 네이버 모바일 앱 최적화: 2문장마다 줄바꿈
    const sentences = cleaned.split(/(?<=[.!?])\s+/)
    let result = ''
    let count = 0
    
    for (const sentence of sentences) {
      if (!sentence.trim()) continue
      result += sentence.trim() + ' '
      count++
      // 2문장마다 줄바꿈 (모바일에서 2-3줄 단위로 끊어 읽기)
      if (count >= 2) {
        result = result.trim() + '\n\n'
        count = 0
      }
    }
    cleaned = result.trim()
  }
  
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  
  return cleaned.trim()
}

// 텍스트 변환 API
app.post('/api/transform', async (c) => {
  const { text, enableReadability = true } = await c.req.json()
  
  if (!text) {
    return c.json({ error: 'text is required' }, 400)
  }
  
  const formattedResult = formatForCopyPaste(removeAllEmojis(text), enableReadability)
  
  return c.json({ 
    result: formattedResult,
    emojiRemoved: true,
    readabilityApplied: enableReadability
  })
})

// 강제 여백 재정렬 API
app.post('/api/reformat', async (c) => {
  const { text } = await c.req.json()
  
  if (!text) {
    return c.json({ error: 'text is required' }, 400)
  }
  
  const reformatted = formatForCopyPaste(text, true)
  
  return c.json({ 
    result: reformatted,
    readabilityApplied: true
  })
})

// Main page - V7.0 UI (Typography & Visual Hierarchy System - No Purple)
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>XIVIX SEO MASTER</title>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    /* =========================================
       XIVIX V7.0 - Typography & Visual Hierarchy
       Color Scheme: Naver Green + Neutral Tones
       NO PURPLE - User Preference
       ========================================= */
    
    :root {
      /* Primary Colors - Naver Brand */
      --naver-green: #03C75A;
      --naver-green-dark: #02b351;
      --naver-green-light: #e8f7ee;
      
      /* Accent Colors (No Purple) */
      --accent-orange: #FF6B35;
      --accent-blue: #3b82f6;
      --accent-teal: #10b981;
      
      /* Neutral Colors */
      --black: #1a1a1a;
      --gray-900: #2d2d2d;
      --gray-700: #4a4a4a;
      --gray-600: #666666;
      --gray-500: #888888;
      --gray-400: #999999;
      --gray-300: #cccccc;
      --gray-200: #e0e0e0;
      --gray-100: #f0f0f0;
      --gray-50: #fafafa;
      --white: #ffffff;
      
      /* Typography Scale */
      --font-xs: 11px;
      --font-sm: 12px;
      --font-base: 14px;
      --font-md: 15px;
      --font-lg: 16px;
      --font-xl: 18px;
      --font-2xl: 20px;
      --font-3xl: 24px;
      
      /* Spacing */
      --space-xs: 4px;
      --space-sm: 8px;
      --space-md: 12px;
      --space-lg: 16px;
      --space-xl: 20px;
      --space-2xl: 24px;
      
      /* Border Radius */
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 12px;
      --radius-xl: 16px;
      
      /* Shadows */
      --shadow-sm: 0 2px 8px rgba(0,0,0,0.06);
      --shadow-md: 0 4px 20px rgba(0,0,0,0.08);
      --shadow-lg: 0 8px 30px rgba(0,0,0,0.12);
    }
    
    /* Reset & Base */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: var(--gray-700);
      word-break: keep-all;
      background-color: var(--gray-100);
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Mobile First Typography */
    @media (max-width: 768px) {
      body {
        font-size: 17px;
        line-height: 1.65;
        letter-spacing: -0.02em;
      }
      .container { padding: 0 var(--space-lg); }
    }
    
    /* Desktop Typography */
    @media (min-width: 769px) {
      body {
        font-size: var(--font-lg);
        line-height: 1.6;
        letter-spacing: -0.01em;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 40px;
      }
    }
    
    /* Links */
    a { 
      color: var(--naver-green); 
      text-decoration: none; 
      font-weight: 500;
      transition: color 0.2s;
    }
    a:hover { 
      text-decoration: underline; 
      color: var(--naver-green-dark);
    }
    
    /* Strong Text */
    strong, b { font-weight: 700; color: var(--black); }
    
    /* Card Component */
    .card {
      background: var(--white);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-md);
      overflow: hidden;
    }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, var(--black) 0%, var(--gray-900) 100%);
      padding: var(--space-xl) var(--space-2xl);
      color: var(--white);
    }
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-md);
    }
    
    .header h1 {
      font-size: var(--font-2xl);
      font-weight: 900;
      letter-spacing: -0.03em;
    }
    
    .header-subtitle {
      font-size: var(--font-xs);
      color: rgba(255,255,255,0.6);
      margin-top: var(--space-xs);
    }
    
    .header-actions {
      display: flex;
      gap: var(--space-sm);
      flex-wrap: wrap;
    }
    
    @media (min-width: 769px) {
      .header { padding: var(--space-2xl) 32px; }
      .header h1 { font-size: var(--font-3xl); }
    }
    
    /* Tabs */
    .tabs {
      display: flex;
      border-bottom: 1px solid var(--gray-200);
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .tabs::-webkit-scrollbar { display: none; }
    
    .tab-btn {
      flex: 1;
      min-width: 90px;
      padding: var(--space-lg);
      font-size: var(--font-sm);
      font-weight: 500;
      color: var(--gray-600);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    
    .tab-btn:hover {
      color: var(--naver-green);
    }
    
    .tab-btn.active {
      color: var(--naver-green);
      border-bottom-color: var(--naver-green);
      font-weight: 700;
    }
    
    /* Panel Layout */
    .panel-grid {
      display: grid;
      grid-template-columns: 1fr;
    }
    
    @media (min-width: 1024px) {
      .panel-grid {
        grid-template-columns: 380px 1fr;
      }
    }
    
    .left-panel {
      padding: var(--space-xl);
      background: var(--gray-50);
      border-right: 1px solid var(--gray-200);
    }
    
    .right-panel {
      padding: var(--space-xl);
    }
    
    @media (min-width: 769px) {
      .left-panel, .right-panel { padding: var(--space-2xl); }
    }
    
    /* Labels */
    .label {
      font-size: var(--font-xs);
      font-weight: 700;
      color: var(--gray-500);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: var(--space-sm);
    }
    
    /* Button Grid */
    .btn-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-sm);
      margin-bottom: var(--space-lg);
    }
    
    /* Category & Tone Buttons */
    .cat-btn, .tone-btn {
      padding: var(--space-md);
      font-size: var(--font-sm);
      font-weight: 500;
      text-align: left;
      background: var(--white);
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .cat-btn:hover, .tone-btn:hover {
      border-color: var(--naver-green);
    }
    
    .cat-btn.active {
      border-color: var(--naver-green);
      background: var(--naver-green-light);
      color: var(--naver-green);
    }
    
    .tone-btn.active {
      border-color: var(--black);
      background: var(--black);
      color: var(--white);
    }
    
    .cat-btn i, .tone-btn i {
      margin-right: var(--space-sm);
    }
    
    .btn-desc {
      display: block;
      font-size: var(--font-xs);
      color: var(--gray-400);
      margin-top: var(--space-xs);
    }
    
    .tone-btn.active .btn-desc {
      color: rgba(255,255,255,0.7);
    }
    
    /* Input Fields */
    .input {
      width: 100%;
      padding: var(--space-lg);
      font-size: var(--font-md);
      font-family: inherit;
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-md);
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      margin-bottom: var(--space-md);
    }
    
    .input:focus {
      border-color: var(--naver-green);
      box-shadow: 0 0 0 3px rgba(3, 199, 90, 0.1);
    }
    
    .textarea {
      width: 100%;
      padding: var(--space-lg);
      font-size: var(--font-md);
      font-family: inherit;
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-md);
      outline: none;
      resize: vertical;
      min-height: 160px;
      margin-bottom: var(--space-md);
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    
    .textarea:focus {
      border-color: var(--naver-green);
      box-shadow: 0 0 0 3px rgba(3, 199, 90, 0.1);
    }
    
    /* Primary Button */
    .btn-primary {
      width: 100%;
      padding: var(--space-lg);
      font-size: var(--font-md);
      font-weight: 700;
      font-family: inherit;
      color: var(--white);
      background: var(--naver-green);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }
    
    .btn-primary:hover {
      background: var(--naver-green-dark);
    }
    
    .btn-primary:active {
      transform: scale(0.98);
    }
    
    .btn-primary:disabled {
      background: var(--gray-300);
      cursor: not-allowed;
      transform: none;
    }
    
    .btn-primary.orange {
      background: var(--accent-orange);
    }
    
    .btn-primary.orange:hover {
      background: #e55a28;
    }
    
    .btn-primary.dark {
      background: var(--black);
    }
    
    .btn-primary.dark:hover {
      background: var(--gray-900);
    }
    
    /* Result Box */
    .result-box {
      background: var(--white);
      border: 1px solid var(--gray-200);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-lg);
      overflow: hidden;
    }
    
    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid var(--gray-200);
      background: var(--gray-50);
    }
    
    .result-title {
      font-size: var(--font-sm);
      font-weight: 700;
      color: var(--gray-600);
    }
    
    /* Copy Button */
    .copy-btn {
      padding: var(--space-sm) var(--space-lg);
      font-size: var(--font-sm);
      font-weight: 600;
      font-family: inherit;
      color: var(--white);
      background: var(--naver-green);
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .copy-btn:hover {
      background: var(--naver-green-dark);
    }
    
    .copy-btn.dark {
      background: var(--black);
    }
    
    .copy-btn.dark:hover {
      background: var(--gray-900);
    }
    
    .result-content {
      padding: var(--space-lg);
      font-size: var(--font-md);
      line-height: 1.7;
      min-height: 56px;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .result-content:hover {
      background: var(--gray-50);
    }
    
    /* Preview Box */
    .preview-box {
      padding: var(--space-xl);
      height: 320px;
      overflow-y: auto;
      font-size: var(--font-md);
      line-height: 1.8;
      white-space: pre-wrap;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    @media (min-width: 769px) {
      .preview-box { height: 380px; }
    }
    
    .preview-box:hover {
      background: var(--gray-50);
    }
    
    /* Hashtag Box */
    .hashtag-content {
      padding: var(--space-lg);
      font-size: var(--font-base);
      color: var(--naver-green);
      line-height: 1.9;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .hashtag-content:hover {
      background: var(--naver-green-light);
    }
    
    /* Action Row */
    .action-row {
      display: flex;
      gap: var(--space-md);
      margin-top: var(--space-lg);
    }
    
    .action-btn {
      flex: 1;
      padding: var(--space-lg);
      font-size: var(--font-base);
      font-weight: 700;
      font-family: inherit;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .action-btn.primary {
      color: var(--white);
      background: var(--naver-green);
    }
    
    .action-btn.primary:hover {
      background: var(--naver-green-dark);
    }
    
    .action-btn.secondary {
      color: var(--white);
      background: var(--black);
    }
    
    .action-btn.secondary:hover {
      background: var(--gray-900);
    }
    
    /* Status Box */
    .status-box {
      margin-top: var(--space-lg);
      padding: var(--space-md) var(--space-lg);
      background: var(--gray-100);
      border-radius: var(--radius-sm);
      font-size: var(--font-sm);
      color: var(--gray-600);
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }
    
    /* Info Cards */
    .info-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-sm);
      margin-top: var(--space-xl);
    }
    
    @media (min-width: 769px) {
      .info-cards {
        grid-template-columns: repeat(6, 1fr);
        gap: var(--space-md);
      }
    }
    
    .info-card {
      background: var(--white);
      padding: var(--space-lg);
      border-radius: var(--radius-md);
      border-left: 3px solid;
      box-shadow: var(--shadow-sm);
    }
    
    .info-card h4 {
      font-size: var(--font-sm);
      font-weight: 700;
      color: var(--gray-700);
      margin-bottom: var(--space-xs);
    }
    
    .info-card p {
      font-size: var(--font-xs);
      color: var(--gray-500);
    }
    
    /* Footer */
    .footer {
      margin-top: var(--space-2xl);
      padding: var(--space-xl);
      text-align: center;
      font-size: var(--font-sm);
      color: var(--gray-500);
    }
    
    .footer a {
      color: var(--naver-green);
      font-weight: 700;
    }
    
    /* Toast Notification */
    .toast {
      position: fixed;
      top: var(--space-xl);
      right: var(--space-xl);
      padding: var(--space-lg) var(--space-xl);
      background: var(--black);
      color: var(--white);
      border-radius: var(--radius-md);
      font-size: var(--font-base);
      font-weight: 500;
      box-shadow: var(--shadow-lg);
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
      display: none;
    }
    
    .toast.success { background: var(--naver-green); }
    .toast.warning { background: var(--accent-orange); }
    .toast.error { background: #dc3545; }
    .toast.show { display: flex; align-items: center; gap: var(--space-sm); }
    
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    /* Loading Spinner */
    .loading { display: none; }
    .loading.show { display: inline-block; }
    
    /* Hidden */
    .hidden { display: none !important; }
    
    /* Char Count */
    .char-count {
      display: inline-flex;
      gap: var(--space-sm);
      font-size: var(--font-sm);
    }
    
    .char-count span {
      padding: var(--space-xs) var(--space-md);
      border-radius: 20px;
      background: var(--gray-100);
      color: var(--gray-600);
    }
    
    .char-count .pure {
      background: var(--naver-green-light);
      color: var(--naver-green);
      font-weight: 600;
    }
    
    /* Dark Mode Support */
    @media (prefers-color-scheme: dark) {
      body { background-color: #121212; color: #e0e0e0; }
      .card { background: #1e1e1e; }
      .left-panel { background: #171717; border-color: #333; }
      .right-panel { background: #1a1a1a; }
      
      /* Result boxes - 텍스트 가시성 확보 */
      .result-box { background: #2a2a2a; border-color: #444; }
      .result-header { background: #222; border-color: #444; color: #ccc; }
      .result-title { color: #bbb; }
      .result-content { color: #e0e0e0; }
      .result-content:hover { background: #333; }
      
      /* Preview box - 본문 영역 */
      .preview-box { color: #e0e0e0; background: #2a2a2a; }
      .preview-box:hover { background: #333; }
      
      /* Hashtag */
      .hashtag-content { color: #05d662; background: #1a2e1f; }
      .hashtag-content:hover { background: #0d3d1f; }
      
      /* Input fields */
      .input, .textarea { background: #2a2a2a; border-color: #444; color: #e0e0e0; }
      .input::placeholder, .textarea::placeholder { color: #777; }
      
      /* Buttons */
      .cat-btn, .tone-btn { background: #2a2a2a; border-color: #444; color: #e0e0e0; }
      .cat-btn:hover, .tone-btn:hover { border-color: #05d662; }
      .cat-btn.active { background: #0a3d1f; border-color: #03C75A; color: #03C75A; }
      .tone-btn.active { background: #444; border-color: #666; color: #fff; }
      .btn-desc { color: #888; }
      
      /* Labels */
      .label { color: #999; }
      
      /* Status box */
      .status-box { background: #2a2a2a; color: #aaa; }
      
      /* Info cards */
      .info-card { background: #2a2a2a; }
      .info-card h4 { color: #ddd; }
      .info-card p { color: #999; }
      
      /* Char count */
      .char-count span { background: #333; color: #aaa; }
      .char-count .pure { background: #0a3d1f; color: #03C75A; }
      
      /* Tab buttons */
      .tabs { border-color: #333; background: #1a1a1a; }
      .tab-btn { color: #888; }
      .tab-btn:hover { color: #05d662; }
      .tab-btn.active { color: #03C75A; border-bottom-color: #03C75A; }
      
      /* Footer */
      .footer { color: #777; }
      
      /* Misc */
      strong, b { color: #fff; }
      a { color: #05d662; }
    }
  </style>
</head>
<body>
  <div class="container" style="padding-top: 20px; padding-bottom: 40px;">
    
    <!-- Main Card -->
    <div class="card">
      
      <!-- Header -->
      <div class="header">
        <div class="header-content">
          <div>
            <h1>XIVIX SEO MASTER</h1>
            <p class="header-subtitle">SEO | AEO | C-Rank | GEO | V7.1</p>
          </div>
          <div class="header-actions">
            <button onclick="copyTitle()" class="copy-btn dark">제목</button>
            <button onclick="copyToClipboard()" class="copy-btn dark">본문</button>
            <button onclick="copyHashtags()" class="copy-btn">태그</button>
            <button onclick="copyAll()" class="copy-btn">전체</button>
            <button onclick="downloadTxt()" class="copy-btn dark">TXT</button>
          </div>
        </div>
      </div>
      
      <!-- Tabs -->
      <div class="tabs">
        <button onclick="switchTab('generate')" id="tab-generate" class="tab-btn active">글 생성</button>
        <button onclick="switchTab('bulk')" id="tab-bulk" class="tab-btn">대량 생성</button>
        <button onclick="switchTab('keyword')" id="tab-keyword" class="tab-btn">키워드</button>
        <button onclick="switchTab('rewrite')" id="tab-rewrite" class="tab-btn">새로 쓰기</button>
      </div>
      
      <!-- Panel Grid -->
      <div class="panel-grid">
        
        <!-- Left Panel -->
        <div class="left-panel">
          
          <!-- Generate Tab -->
          <div id="panel-generate" class="tab-panel">
            <p class="label">카테고리</p>
            <div class="btn-grid">
              <button onclick="selectCategory('info')" id="cat-info" class="cat-btn active">
                <i class="fas fa-info-circle" style="color: #03C75A;"></i>정보성
              </button>
              <button onclick="selectCategory('review')" id="cat-review" class="cat-btn">
                <i class="fas fa-star" style="color: #fbbf24;"></i>후기성
              </button>
              <button onclick="selectCategory('product')" id="cat-product" class="cat-btn">
                <i class="fas fa-shopping-bag" style="color: #ec4899;"></i>제품홍보
              </button>
              <button onclick="selectCategory('youtube')" id="cat-youtube" class="cat-btn">
                <i class="fab fa-youtube" style="color: #ef4444;"></i>유튜브
              </button>
            </div>
            
            <p class="label">문체</p>
            <div class="btn-grid">
              <button onclick="selectTone('haeyo')" id="tone-haeyo" class="tone-btn active">
                해요체
                <span class="btn-desc">~해요, ~거든요</span>
              </button>
              <button onclick="selectTone('formal')" id="tone-formal" class="tone-btn">
                습니다체
                <span class="btn-desc">~합니다, ~입니다</span>
              </button>
            </div>
            
            <p class="label">포스팅 주제</p>
            <input id="topic" class="input" placeholder="예: 겨울철 디퓨저 추천" />
            
            <div id="youtube-input" class="hidden">
              <p class="label">유튜브 URL (선택)</p>
              <input id="youtube-url" class="input" placeholder="https://youtube.com/..." />
            </div>
            
            <button onclick="generateContent()" id="generate-btn" class="btn-primary">
              <i class="fas fa-spinner fa-spin loading" id="generate-loading"></i>
              <span id="generate-text">블로그 글 생성</span>
            </button>
          </div>
          
          <!-- Bulk Tab -->
          <div id="panel-bulk" class="tab-panel hidden">
            <p class="label">주제 목록 (줄바꿈 구분, 최대 10개)</p>
            <textarea id="bulk-topics" class="textarea" placeholder="겨울철 디퓨저 추천&#10;봄철 알레르기 예방법&#10;여름 에어컨 청소"></textarea>
            <button onclick="bulkGenerate()" id="bulk-btn" class="btn-primary orange">
              <i class="fas fa-spinner fa-spin loading" id="bulk-loading"></i>
              <span id="bulk-text">대량 생성</span>
            </button>
          </div>
          
          <!-- Keyword Tab -->
          <div id="panel-keyword" class="tab-panel hidden">
            <p class="label">메인 키워드</p>
            <input id="main-keyword" class="input" placeholder="예: 디퓨저 추천" />
            <button onclick="findKeywords()" id="keyword-btn" class="btn-primary">
              <i class="fas fa-spinner fa-spin loading" id="keyword-loading"></i>
              <span id="keyword-text">스마트블록 키워드 찾기</span>
            </button>
          </div>
          
          <!-- Rewrite Tab -->
          <div id="panel-rewrite" class="tab-panel hidden">
            <p class="label">원본 글</p>
            <textarea id="original-text" class="textarea" placeholder="새로 쓸 원본 글을 붙여넣으세요..."></textarea>
            <button onclick="rewriteContent()" id="rewrite-btn" class="btn-primary dark">
              <i class="fas fa-spinner fa-spin loading" id="rewrite-loading"></i>
              <span id="rewrite-text">새로운 글로 변환</span>
            </button>
          </div>
          
          <!-- Status -->
          <div class="status-box">
            <i class="fas fa-info-circle" style="margin-right: 6px;"></i>
            <span id="status-text">대기 중</span>
          </div>
        </div>
        
        <!-- Right Panel -->
        <div class="right-panel">
          
          <!-- Title Result -->
          <div class="result-box">
            <div class="result-header">
              <span class="result-title">생성된 제목 (SEO 최적화)</span>
              <button onclick="copyTitle()" class="copy-btn">제목 복사</button>
            </div>
            <div id="title-box" class="result-content" onclick="copyTitle()">
              제목이 여기에 표시됩니다
            </div>
          </div>
          
          <!-- Content Result -->
          <div class="result-box">
            <div class="result-header">
              <span class="result-title">본문 (네이버 모바일 최적화)</span>
              <div style="display: flex; align-items: center; gap: 10px;">
                <div class="char-count">
                  <span id="char-count">0자</span>
                  <span class="pure" id="pure-char-count">순수 0자</span>
                </div>
                <button onclick="copyToClipboard()" class="copy-btn dark">본문 복사</button>
              </div>
            </div>
            <div id="preview" class="preview-box" onclick="copyToClipboard()">본문이 여기에 표시됩니다.

네이버 모바일 앱 최적화:
■ 2-3문장마다 자동 줄바꿈
■ 모바일에서 읽기 편한 구조

미디어 삽입 위치 표시:
[이미지 삽입] - 이미지 넣을 위치
[동영상 삽입] - 영상 넣을 위치
[스티커 삽입] - 네이버 스티커 위치
[인용구 삽입] - 인용구 활용 위치</div>
          </div>
          
          <!-- Hashtag Result -->
          <div class="result-box">
            <div class="result-header">
              <span class="result-title">해시태그 (SEO 최적화)</span>
              <button onclick="copyHashtags()" class="copy-btn">해시태그 복사</button>
            </div>
            <div id="hashtags" class="hashtag-content" onclick="copyHashtags()">
              해시태그가 여기에 표시됩니다
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="action-row">
            <button onclick="copyAll()" class="action-btn primary">전체 복사 (제목+본문+해시태그)</button>
            <button onclick="downloadTxt()" class="action-btn secondary">TXT 저장</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Info Cards -->
    <div class="info-cards">
      <div class="info-card" style="border-color: #03C75A;">
        <h4>SEO</h4>
        <p>검색 최적화</p>
      </div>
      <div class="info-card" style="border-color: #3b82f6;">
        <h4>AEO</h4>
        <p>Q&A 최적화</p>
      </div>
      <div class="info-card" style="border-color: #1a1a1a;">
        <h4>C-RANK</h4>
        <p>전문성 구조</p>
      </div>
      <div class="info-card" style="border-color: #10b981;">
        <h4>GEO</h4>
        <p>AI 인용 최적화</p>
      </div>
      <div class="info-card" style="border-color: #FF6B35;">
        <h4>1,700자+</h4>
        <p>순수 본문</p>
      </div>
      <div class="info-card" style="border-color: #6b7280;">
        <h4>이모지 0%</h4>
        <p>저품질 방지</p>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <a href="https://xivix.kr/" target="_blank">XIVIX</a> | © 2026. ALL RIGHTS RESERVED.
    </div>
  </div>
  
  <!-- Toast -->
  <div id="toast" class="toast"></div>
  
  <script>
    let currentCategory = 'info';
    let currentTone = 'haeyo';
    let currentTitle = '';
    
    function switchTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.getElementById('tab-' + tab).classList.add('active');
      
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
      document.getElementById('panel-' + tab).classList.remove('hidden');
    }
    
    function selectCategory(cat) {
      currentCategory = cat;
      document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
      document.getElementById('cat-' + cat).classList.add('active');
      document.getElementById('youtube-input').classList.toggle('hidden', cat !== 'youtube');
    }
    
    function selectTone(tone) {
      currentTone = tone;
      document.querySelectorAll('.tone-btn').forEach(btn => btn.classList.remove('active'));
      document.getElementById('tone-' + tone).classList.add('active');
    }
    
    async function generateContent() {
      const topic = document.getElementById('topic').value.trim();
      const youtubeUrl = document.getElementById('youtube-url')?.value.trim() || '';
      
      if (!topic) {
        showToast('주제를 입력해주세요!', 'warning');
        return;
      }
      
      setLoading('generate', true);
      document.getElementById('status-text').textContent = '글 생성 중... (약 15-20초)';
      
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, category: currentCategory, tone: currentTone, youtubeUrl, enableReadability: true })
        });
        
        const data = await response.json();
        
        if (data.error) {
          showToast(data.error, 'error');
          document.getElementById('status-text').textContent = '오류 발생';
          return;
        }
        
        displayResult(data);
      } catch (error) {
        showToast('생성 중 오류가 발생했습니다.', 'error');
        document.getElementById('status-text').textContent = '오류 발생';
      } finally {
        setLoading('generate', false);
      }
    }
    
    async function bulkGenerate() {
      const topicsText = document.getElementById('bulk-topics').value.trim();
      const topics = topicsText.split('\\n').filter(t => t.trim());
      
      if (topics.length === 0) {
        showToast('주제를 입력해주세요!', 'warning');
        return;
      }
      
      if (topics.length > 10) {
        showToast('한 번에 최대 10개까지만 가능합니다.', 'warning');
        return;
      }
      
      setLoading('bulk', true);
      document.getElementById('status-text').textContent = '대량 생성 중... (' + topics.length + '개)';
      
      try {
        const response = await fetch('/api/bulk-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topics, category: currentCategory, tone: currentTone })
        });
        
        const data = await response.json();
        
        if (data.error) {
          showToast(data.error, 'error');
          return;
        }
        
        let resultHtml = '=== 대량 생성 결과 ===\\n\\n';
        data.results.forEach((r, i) => {
          resultHtml += '--- ' + (i+1) + '. ' + r.topic + ' ---\\n';
          resultHtml += '제목: ' + r.title + '\\n';
          resultHtml += '본문: ' + (r.content || '').substring(0, 200) + '...\\n';
          resultHtml += '해시태그: ' + r.hashtags + '\\n\\n';
        });
        
        document.getElementById('title-box').textContent = '대량 생성 완료: ' + data.success + '/' + data.total + '개 성공';
        document.getElementById('preview').textContent = resultHtml;
        document.getElementById('hashtags').textContent = '대량 생성 모드';
        document.getElementById('status-text').textContent = '대량 생성 완료';
        
        showToast(data.success + '개 글이 생성되었습니다!', 'success');
      } catch (error) {
        showToast('대량 생성 중 오류가 발생했습니다.', 'error');
      } finally {
        setLoading('bulk', false);
      }
    }
    
    async function findKeywords() {
      const mainKeyword = document.getElementById('main-keyword').value.trim();
      
      if (!mainKeyword) {
        showToast('메인 키워드를 입력해주세요!', 'warning');
        return;
      }
      
      setLoading('keyword', true);
      document.getElementById('status-text').textContent = '키워드 분석 중...';
      
      try {
        const response = await fetch('/api/keyword-finder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mainKeyword })
        });
        
        const data = await response.json();
        
        if (data.error) {
          showToast(data.error, 'error');
          return;
        }
        
        document.getElementById('title-box').textContent = '키워드 분석: ' + mainKeyword;
        document.getElementById('preview').textContent = data.result;
        document.getElementById('hashtags').textContent = '#' + mainKeyword.replace(/\\s+/g, '');
        document.getElementById('status-text').textContent = '키워드 분석 완료';
        
        showToast('스마트블록 키워드를 찾았습니다!', 'success');
      } catch (error) {
        showToast('키워드 분석 중 오류가 발생했습니다.', 'error');
      } finally {
        setLoading('keyword', false);
      }
    }
    
    async function rewriteContent() {
      const originalText = document.getElementById('original-text').value.trim();
      
      if (!originalText) {
        showToast('원본 글을 입력해주세요!', 'warning');
        return;
      }
      
      setLoading('rewrite', true);
      document.getElementById('status-text').textContent = '새로운 글로 변환 중...';
      
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: '원본 글 재작성', category: 'rewrite', tone: currentTone, originalText, enableReadability: true })
        });
        
        const data = await response.json();
        
        if (data.error) {
          showToast(data.error, 'error');
          return;
        }
        
        displayResult(data);
        showToast('새로운 글로 변환되었습니다!', 'success');
      } catch (error) {
        showToast('변환 중 오류가 발생했습니다.', 'error');
      } finally {
        setLoading('rewrite', false);
      }
    }
    
    function displayResult(data) {
      currentTitle = data.title || '';
      document.getElementById('title-box').textContent = currentTitle;
      document.getElementById('preview').textContent = data.content || '';
      document.getElementById('char-count').textContent = (data.rawLength || 0) + '자';
      document.getElementById('pure-char-count').textContent = '순수 ' + (data.pureTextLength || 0) + '자';
      document.getElementById('hashtags').textContent = data.hashtags || '';
      document.getElementById('status-text').textContent = '생성 완료 (' + (data.category || '') + ', ' + (data.tone || '') + ', ' + (data.pureTextLength || 0) + '자)';
      showToast('제목 + 본문 + 해시태그가 생성되었습니다!', 'success');
    }
    
    function setLoading(type, isLoading) {
      const loading = document.getElementById(type + '-loading');
      const btn = document.getElementById(type + '-btn');
      if (loading) loading.classList.toggle('show', isLoading);
      if (btn) btn.disabled = isLoading;
    }
    
    function copyTitle() {
      const title = document.getElementById('title-box').textContent;
      if (!title || title.includes('제목이 여기에')) {
        showToast('먼저 글을 생성해주세요!', 'warning');
        return;
      }
      navigator.clipboard.writeText(title);
      showToast('제목이 복사되었습니다!', 'success');
    }
    
    function copyHashtags() {
      const hashtags = document.getElementById('hashtags').textContent;
      if (!hashtags || hashtags.includes('해시태그가 여기에')) {
        showToast('먼저 글을 생성해주세요!', 'warning');
        return;
      }
      navigator.clipboard.writeText(hashtags);
      showToast('해시태그가 복사되었습니다!', 'success');
    }
    
    async function copyToClipboard() {
      const preview = document.getElementById('preview').textContent;
      if (!preview || preview.includes('본문이 여기에')) {
        showToast('먼저 글을 생성해주세요!', 'warning');
        return;
      }
      try {
        await navigator.clipboard.writeText(preview);
        showToast('본문이 복사되었습니다!', 'success');
      } catch (error) {
        fallbackCopy(preview);
      }
    }
    
    async function copyAll() {
      const title = document.getElementById('title-box').textContent;
      const preview = document.getElementById('preview').textContent;
      const hashtags = document.getElementById('hashtags').textContent;
      
      if (!preview || preview.includes('본문이 여기에')) {
        showToast('먼저 글을 생성해주세요!', 'warning');
        return;
      }
      
      const fullText = title + '\\n\\n' + preview + '\\n\\n' + hashtags;
      try {
        await navigator.clipboard.writeText(fullText);
        showToast('전체 내용이 복사되었습니다!', 'success');
      } catch (error) {
        fallbackCopy(fullText);
      }
    }
    
    function downloadTxt() {
      const title = document.getElementById('title-box').textContent;
      const preview = document.getElementById('preview').textContent;
      const hashtags = document.getElementById('hashtags').textContent;
      
      if (!preview || preview.includes('본문이 여기에')) {
        showToast('먼저 글을 생성해주세요!', 'warning');
        return;
      }
      
      const fullText = title + '\\n\\n' + preview + '\\n\\n' + hashtags;
      const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'xivix_blog_' + new Date().toISOString().slice(0,10) + '.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('TXT 파일이 다운로드되었습니다.', 'success');
    }
    
    function fallbackCopy(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('복사되었습니다!', 'success');
    }
    
    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      toast.className = 'toast ' + type + ' show';
      toast.innerHTML = '<i class="fas fa-' + (type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'times-circle') + '"></i>' + message;
      setTimeout(() => toast.classList.remove('show'), 3500);
    }
  </script>
</body>
</html>`)
})

export default app
