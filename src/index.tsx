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
    version: 'V6.0',
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
[📷 이미지 삽입 권장: 주제를 대표하는 메인 이미지]

2. 각 소제목 시작 부분:
[📷 이미지 삽입 권장: 해당 섹션 관련 이미지]

3. 본문 1/3 지점:
[🎬 동영상/Shorts 삽입 권장: 관련 영상 콘텐츠]

4. 본문 2/3 지점:
[😊 이모티콘/스티커 삽입 권장: 네이버 스티커로 포인트]

5. Q&A 섹션:
[💬 인용구 삽입 권장: 네이버 인용구 기능 활용]

6. 글 마무리 부분:
[🖼️ 배너/CTA 이미지 삽입 권장: 상담/구매 유도 이미지]

[제목 작성 규칙]
- 주제를 그대로 쓰지 말고 클릭하고 싶은 제목으로 변환
- 숫자, 질문, 경험담, 비교 활용
- 예: "겨울 디퓨저" → "디퓨저 하나로 숙면 끝! 겨울 꿀잠 비법 3가지"

[본문 작성 규칙]
- 순수 읽는 글만 1,700자 이상 (미디어 가이드 제외)
- 5개 이상 소제목으로 구조화
- 각 문단 2-3문장으로 짧게 (모바일 가독성)
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
      .replace(/\[📷[^\]]*\]/g, '')
      .replace(/\[🎬[^\]]*\]/g, '')
      .replace(/\[😊[^\]]*\]/g, '')
      .replace(/\[💬[^\]]*\]/g, '')
      .replace(/\[🖼️[^\]]*\]/g, '')
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
      // 각 주제에 대해 생성 API 호출 (내부 로직 재사용)
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
    // 문단 단위로 여백 추가
    const paragraphs = cleaned.split(/\n\n+/)
    cleaned = paragraphs.map(p => {
      const sentences = p.split(/(?<=[.!?])\s+/)
      let result = ''
      let count = 0
      for (const sentence of sentences) {
        result += sentence + ' '
        count++
        if (count >= 2) {
          result = result.trim() + '\n\n'
          count = 0
        }
      }
      return result.trim()
    }).join('\n\n')
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

// Main page - V6.0 UI
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>XIVIX SEO MASTER V6.0</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');
    body { font-family: 'Noto Sans KR', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
    .loading { display: none; }
    .loading.show { display: inline-flex; }
    .category-btn.active { border-color: #3b82f6; background-color: #eff6ff; color: #1d4ed8; }
    .tone-btn.active { border-color: #10b981; background-color: #ecfdf5; color: #059669; }
    .toast { animation: slideIn 0.3s ease-out; }
    @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    #preview { line-height: 2.0; }
    .tab-btn.active { background-color: #1f2937; color: white; }
    .media-guide { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 8px 12px; margin: 8px 0; font-size: 12px; color: #92400e; }
    .gradient-text { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  </style>
</head>
<body class="p-2 md:p-4">
  <div class="max-w-7xl mx-auto">
    
    <!-- Main Card -->
    <div class="bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden">
      
      <!-- Header -->
      <div class="bg-gradient-to-r from-gray-900 to-gray-800 p-4 md:p-6 text-white">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
          <div>
            <h1 class="text-lg md:text-2xl font-black italic tracking-tight">XIVIX SEO MASTER V6.0</h1>
            <p class="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-[0.15em] md:tracking-[0.2em] mt-1">SEO | AEO | C-Rank | GEO | 네이버 상위노출</p>
          </div>
          <div class="flex items-center gap-1 md:gap-2 flex-wrap">
            <button onclick="copyTitle()" class="text-[9px] md:text-[10px] bg-gray-800 hover:bg-gray-700 px-2 md:px-3 py-1.5 md:py-2 rounded transition">
              <i class="fas fa-heading mr-1"></i>제목
            </button>
            <button onclick="copyToClipboard()" class="text-[9px] md:text-[10px] bg-gray-800 hover:bg-gray-700 px-2 md:px-3 py-1.5 md:py-2 rounded transition">
              <i class="fas fa-copy mr-1"></i>본문
            </button>
            <button onclick="copyHashtags()" class="text-[9px] md:text-[10px] bg-purple-600 hover:bg-purple-700 px-2 md:px-3 py-1.5 md:py-2 rounded transition">
              <i class="fas fa-hashtag mr-1"></i>태그
            </button>
            <button onclick="copyAll()" class="text-[9px] md:text-[10px] bg-blue-600 hover:bg-blue-700 px-2 md:px-3 py-1.5 md:py-2 rounded transition">
              <i class="fas fa-clipboard mr-1"></i>전체
            </button>
            <button onclick="downloadTxt()" class="text-[9px] md:text-[10px] bg-green-600 hover:bg-green-700 px-2 md:px-3 py-1.5 md:py-2 rounded transition">
              <i class="fas fa-download mr-1"></i>TXT
            </button>
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="flex border-b border-gray-200 overflow-x-auto">
        <button onclick="switchTab('generate')" id="tab-generate" class="tab-btn active flex-1 min-w-[100px] py-3 text-xs md:text-sm font-medium text-center transition-all">
          <i class="fas fa-pen-fancy mr-1"></i>글 생성
        </button>
        <button onclick="switchTab('bulk')" id="tab-bulk" class="tab-btn flex-1 min-w-[100px] py-3 text-xs md:text-sm font-medium text-gray-500 text-center transition-all">
          <i class="fas fa-layer-group mr-1"></i>대량 생성
        </button>
        <button onclick="switchTab('keyword')" id="tab-keyword" class="tab-btn flex-1 min-w-[100px] py-3 text-xs md:text-sm font-medium text-gray-500 text-center transition-all">
          <i class="fas fa-search mr-1"></i>키워드 찾기
        </button>
        <button onclick="switchTab('rewrite')" id="tab-rewrite" class="tab-btn flex-1 min-w-[100px] py-3 text-xs md:text-sm font-medium text-gray-500 text-center transition-all">
          <i class="fas fa-sync-alt mr-1"></i>새로 쓰기
        </button>
      </div>

      <!-- Content Panels -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-0">
        
        <!-- Left Panel -->
        <div class="lg:col-span-4 p-4 md:p-6 border-r border-gray-100 bg-gray-50">
          
          <!-- Generate Tab -->
          <div id="panel-generate" class="tab-panel">
            <!-- Category Selection -->
            <label class="block text-[9px] md:text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">카테고리 선택</label>
            <div class="grid grid-cols-2 gap-2 mb-4">
              <button onclick="selectCategory('info')" id="cat-info" class="category-btn active p-2 md:p-3 rounded-lg border border-gray-200 text-[10px] md:text-xs text-left transition-all hover:border-blue-300">
                <i class="fas fa-info-circle mr-1 text-blue-500"></i>정보성
              </button>
              <button onclick="selectCategory('review')" id="cat-review" class="category-btn p-2 md:p-3 rounded-lg border border-gray-200 text-[10px] md:text-xs text-left transition-all hover:border-blue-300">
                <i class="fas fa-star mr-1 text-yellow-500"></i>후기성
              </button>
              <button onclick="selectCategory('product')" id="cat-product" class="category-btn p-2 md:p-3 rounded-lg border border-gray-200 text-[10px] md:text-xs text-left transition-all hover:border-blue-300">
                <i class="fas fa-shopping-bag mr-1 text-pink-500"></i>제품 홍보
              </button>
              <button onclick="selectCategory('youtube')" id="cat-youtube" class="category-btn p-2 md:p-3 rounded-lg border border-gray-200 text-[10px] md:text-xs text-left transition-all hover:border-blue-300">
                <i class="fab fa-youtube mr-1 text-red-500"></i>유튜브 요약
              </button>
            </div>
            
            <!-- Tone Selection -->
            <label class="block text-[9px] md:text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">문체 선택</label>
            <div class="grid grid-cols-2 gap-2 mb-4">
              <button onclick="selectTone('haeyo')" id="tone-haeyo" class="tone-btn active p-2 md:p-3 rounded-lg border border-gray-200 text-[10px] md:text-xs text-left transition-all hover:border-green-300">
                <span class="font-bold">해요체</span>
                <span class="block text-gray-500 mt-0.5 text-[9px]">~해요, ~거든요</span>
              </button>
              <button onclick="selectTone('formal')" id="tone-formal" class="tone-btn p-2 md:p-3 rounded-lg border border-gray-200 text-[10px] md:text-xs text-left transition-all hover:border-green-300">
                <span class="font-bold">습니다체</span>
                <span class="block text-gray-500 mt-0.5 text-[9px]">~합니다, ~입니다</span>
              </button>
            </div>
            
            <!-- Topic Input -->
            <label class="block text-[9px] md:text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">포스팅 주제</label>
            <input 
              id="topic"
              class="w-full p-3 md:p-4 border border-gray-200 rounded-xl mb-3 md:mb-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="예: 겨울철 디퓨저 추천"
            />
            
            <!-- YouTube URL (conditional) -->
            <div id="youtube-input" class="hidden mb-3 md:mb-4">
              <label class="block text-[9px] md:text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">유튜브 URL (선택)</label>
              <input 
                id="youtube-url"
                class="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
                placeholder="https://youtube.com/..."
              />
            </div>
            
            <button 
              onclick="generateContent()"
              id="generate-btn"
              class="w-full py-3 md:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transform active:scale-95 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <i class="fas fa-spinner fa-spin loading" id="generate-loading"></i>
              <span id="generate-text">블로그 글 생성</span>
            </button>
          </div>
          
          <!-- Bulk Tab -->
          <div id="panel-bulk" class="tab-panel hidden">
            <label class="block text-[9px] md:text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">주제 목록 (줄바꿈으로 구분)</label>
            <textarea 
              id="bulk-topics"
              class="w-full p-3 md:p-4 border border-gray-200 rounded-xl mb-3 md:mb-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 h-40 md:h-48"
              placeholder="겨울철 디퓨저 추천&#10;봄철 알레르기 예방법&#10;여름 에어컨 청소&#10;(최대 10개)"
            ></textarea>
            <button 
              onclick="bulkGenerate()"
              id="bulk-btn"
              class="w-full py-3 md:py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-red-600 transform active:scale-95 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <i class="fas fa-spinner fa-spin loading" id="bulk-loading"></i>
              <span id="bulk-text">대량 생성 시작</span>
            </button>
          </div>
          
          <!-- Keyword Tab -->
          <div id="panel-keyword" class="tab-panel hidden">
            <label class="block text-[9px] md:text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">메인 키워드</label>
            <input 
              id="main-keyword"
              class="w-full p-3 md:p-4 border border-gray-200 rounded-xl mb-3 md:mb-4 text-sm outline-none focus:ring-2 focus:ring-green-500"
              placeholder="예: 디퓨저 추천"
            />
            <button 
              onclick="findKeywords()"
              id="keyword-btn"
              class="w-full py-3 md:py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl font-bold hover:from-green-600 hover:to-teal-600 transform active:scale-95 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <i class="fas fa-spinner fa-spin loading" id="keyword-loading"></i>
              <span id="keyword-text">스마트블록 키워드 찾기</span>
            </button>
          </div>
          
          <!-- Rewrite Tab -->
          <div id="panel-rewrite" class="tab-panel hidden">
            <label class="block text-[9px] md:text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">원본 글</label>
            <textarea 
              id="original-text"
              class="w-full p-3 md:p-4 border border-gray-200 rounded-xl mb-3 md:mb-4 text-sm outline-none focus:ring-2 focus:ring-purple-500 h-40 md:h-48"
              placeholder="새로 쓸 원본 글을 붙여넣으세요..."
            ></textarea>
            <button 
              onclick="rewriteContent()"
              id="rewrite-btn"
              class="w-full py-3 md:py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transform active:scale-95 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <i class="fas fa-spinner fa-spin loading" id="rewrite-loading"></i>
              <span id="rewrite-text">새로운 글로 변환</span>
            </button>
          </div>
          
          <!-- Status -->
          <div class="mt-4 md:mt-5 p-3 bg-gray-100 rounded-lg">
            <div class="flex items-center gap-2 text-xs">
              <i class="fas fa-info-circle text-gray-400"></i>
              <span id="status-text" class="text-gray-600">대기 중</span>
            </div>
          </div>
        </div>
        
        <!-- Right Panel -->
        <div class="lg:col-span-8 p-4 md:p-6">
          
          <!-- Title Section -->
          <div class="mb-3 md:mb-4">
            <label class="block text-[9px] md:text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">생성된 제목 (SEO 최적화)</label>
            <div id="title-box" class="p-3 md:p-4 bg-blue-50 rounded-xl border border-blue-200 text-base md:text-lg font-bold text-gray-800 min-h-[48px] md:min-h-[56px] flex items-center">
              제목이 여기에 표시됩니다
            </div>
          </div>
          
          <!-- Content Section -->
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-3 mb-2">
            <h3 class="text-[9px] md:text-[10px] font-black text-gray-400 tracking-[0.15em] md:tracking-[0.2em] uppercase">본문 내용</h3>
            <div class="flex gap-2">
              <span id="char-count" class="text-[9px] md:text-[10px] text-gray-400 bg-gray-100 px-2 md:px-3 py-1 rounded-full">0자</span>
              <span id="pure-char-count" class="text-[9px] md:text-[10px] text-green-600 bg-green-100 px-2 md:px-3 py-1 rounded-full">순수: 0자</span>
            </div>
          </div>
          
          <div
            id="preview"
            class="w-full h-[280px] md:h-[350px] p-4 md:p-6 bg-white border border-gray-100 rounded-2xl overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap shadow-inner mb-3 md:mb-4"
          >본문이 여기에 표시됩니다.

[📷 이미지 삽입 권장: 주제를 대표하는 메인 이미지]

미디어 삽입 위치가 표시됩니다:
• [📷 이미지] - 이미지 삽입 권장 위치
• [🎬 동영상] - 영상/Shorts 삽입 권장 위치
• [😊 이모티콘] - 네이버 스티커 삽입 권장 위치
• [💬 인용구] - 네이버 인용구 기능 활용 위치
• [🖼️ 배너] - CTA 배너 이미지 삽입 위치</div>
          
          <!-- Hashtag Section -->
          <div class="mb-2">
            <div class="flex justify-between items-center mb-2">
              <h3 class="text-[9px] md:text-[10px] font-black text-gray-400 tracking-[0.15em] md:tracking-[0.2em] uppercase">해시태그 (SEO 최적화)</h3>
              <button onclick="copyHashtags()" class="text-[9px] md:text-[10px] bg-purple-100 text-purple-700 hover:bg-purple-200 px-2 md:px-3 py-1 rounded-full transition">
                <i class="fas fa-hashtag mr-1"></i>복사
              </button>
            </div>
            <div
              id="hashtags"
              class="p-3 md:p-4 bg-purple-50 rounded-xl border border-purple-200 text-xs md:text-sm text-purple-800 min-h-[50px] md:min-h-[60px]"
            >해시태그가 여기에 표시됩니다</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Guide Cards -->
    <div class="mt-4 md:mt-6 grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
      <div class="bg-white p-3 md:p-4 rounded-xl shadow-sm border-l-4 border-red-500">
        <h4 class="font-bold text-gray-800 text-[10px] md:text-xs mb-0.5 md:mb-1">SEO</h4>
        <p class="text-[8px] md:text-[10px] text-gray-600">검색 최적화</p>
      </div>
      <div class="bg-white p-3 md:p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
        <h4 class="font-bold text-gray-800 text-[10px] md:text-xs mb-0.5 md:mb-1">AEO</h4>
        <p class="text-[8px] md:text-[10px] text-gray-600">Q&A 최적화</p>
      </div>
      <div class="bg-white p-3 md:p-4 rounded-xl shadow-sm border-l-4 border-purple-500">
        <h4 class="font-bold text-gray-800 text-[10px] md:text-xs mb-0.5 md:mb-1">C-RANK</h4>
        <p class="text-[8px] md:text-[10px] text-gray-600">전문성 구조</p>
      </div>
      <div class="bg-white p-3 md:p-4 rounded-xl shadow-sm border-l-4 border-green-500">
        <h4 class="font-bold text-gray-800 text-[10px] md:text-xs mb-0.5 md:mb-1">GEO</h4>
        <p class="text-[8px] md:text-[10px] text-gray-600">AI 인용 최적화</p>
      </div>
      <div class="bg-white p-3 md:p-4 rounded-xl shadow-sm border-l-4 border-orange-500">
        <h4 class="font-bold text-gray-800 text-[10px] md:text-xs mb-0.5 md:mb-1">1,700자+</h4>
        <p class="text-[8px] md:text-[10px] text-gray-600">순수 본문</p>
      </div>
      <div class="bg-white p-3 md:p-4 rounded-xl shadow-sm border-l-4 border-gray-500">
        <h4 class="font-bold text-gray-800 text-[10px] md:text-xs mb-0.5 md:mb-1">이모지 0%</h4>
        <p class="text-[8px] md:text-[10px] text-gray-600">저품질 방지</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-4 md:mt-6 text-center text-white/70 text-[9px] md:text-[10px] pb-4">
      <p>XIVIX SEO MASTER V6.0 | 네이버 블로그 상단(1위) 노출 최적화</p>
    </div>
  </div>

  <!-- Toast -->
  <div id="toast" class="fixed top-4 right-4 px-4 md:px-5 py-2 md:py-3 rounded-lg shadow-lg hidden toast z-50 text-sm"></div>

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
      document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
      document.getElementById('cat-' + cat).classList.add('active');
      
      // Show YouTube URL input for youtube category
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
          body: JSON.stringify({ 
            topic, 
            category: currentCategory, 
            tone: currentTone,
            youtubeUrl,
            enableReadability: true 
          })
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
        
        // Display bulk results
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
          body: JSON.stringify({ 
            topic: '원본 글 재작성',
            category: 'rewrite',
            tone: currentTone,
            originalText,
            enableReadability: true 
          })
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
      document.getElementById('pure-char-count').textContent = '순수: ' + (data.pureTextLength || 0) + '자';
      document.getElementById('hashtags').textContent = data.hashtags || '';
      document.getElementById('status-text').textContent = 
        '생성 완료 (' + (data.category || '') + ', ' + (data.tone || '') + ', ' + (data.pureTextLength || 0) + '자)';
      
      showToast('제목 + 본문 + 해시태그가 생성되었습니다!', 'success');
    }
    
    function setLoading(type, isLoading) {
      const loading = document.getElementById(type + '-loading');
      const btn = document.getElementById(type + '-btn');
      
      if (loading) loading.classList.toggle('show', isLoading);
      if (btn) {
        btn.disabled = isLoading;
        btn.classList.toggle('opacity-75', isLoading);
      }
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
      toast.className = 'fixed top-4 right-4 px-4 md:px-5 py-2 md:py-3 rounded-lg shadow-lg toast flex items-center gap-2 z-50 text-sm';
      
      let icon = '';
      switch(type) {
        case 'success':
          toast.classList.add('bg-green-600', 'text-white');
          icon = '<i class="fas fa-check-circle"></i>';
          break;
        case 'warning':
          toast.classList.add('bg-yellow-500', 'text-white');
          icon = '<i class="fas fa-exclamation-triangle"></i>';
          break;
        case 'error':
          toast.classList.add('bg-red-600', 'text-white');
          icon = '<i class="fas fa-times-circle"></i>';
          break;
      }
      
      toast.innerHTML = icon + '<span>' + message + '</span>';
      toast.classList.remove('hidden');
      
      setTimeout(() => toast.classList.add('hidden'), 3500);
    }
  </script>
</body>
</html>`)
})

export default app
