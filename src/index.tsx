import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  GEMINI_API_KEY?: string;
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

// 이모지 완전 제거 함수
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
}

// V4: 뭉침 방지 가독성 최적화 함수
function readabilityOptimizer(text: string): string {
  // 1. 이모지 제거
  let cleaned = removeAllEmojis(text)
  
  // 2. 마침표 기준으로 문장 분리 후 줄바꿈 2번 (모바일 최적화)
  // 단, 소수점이나 번호(1. 2. 등)는 제외
  cleaned = cleaned
    .replace(/([가-힣a-zA-Z])\. /g, '$1.\n\n')  // 문장 끝 마침표 후 줄바꿈
    .replace(/\n{3,}/g, '\n\n')  // 불필요한 공백 중복 제거
    .replace(/\n\n([1-9]\.)/g, '\n\n\n$1')  // 번호 리스트 앞에 추가 줄바꿈
  
  return cleaned.trim()
}

// 스타일 설정
const styleConfigs = {
  A: { name: '전문가형 (C-Rank)', suffix: '습니다', prompt: '신뢰감 있는 전문가 톤으로 작성. 데이터와 근거를 명확히 제시.' },
  B: { name: '친근형 (AEO)', suffix: '해요', prompt: '이웃과 대화하듯 부드러운 에디터 톤. 질문/답변 형식 강조.' },
  C: { name: '실용 정보 (GEO)', suffix: '요약체', prompt: '데이터와 팩트 위주의 건조한 톤. 핵심만 간결하게 전달.' }
}

// Gemini API를 통한 원고 생성 (V4: 뭉침 방지 적용)
app.post('/api/generate', async (c) => {
  const { topic, style, apiKey, enableReadability = true } = await c.req.json()
  
  if (!topic) {
    return c.json({ error: '주제를 입력해주세요.' }, 400)
  }
  
  const geminiKey = apiKey || c.env?.GEMINI_API_KEY
  if (!geminiKey) {
    return c.json({ error: 'Gemini API 키가 필요합니다. 설정에서 입력해주세요.' }, 400)
  }
  
  const config = styleConfigs[style as keyof typeof styleConfigs] || styleConfigs.A
  
  // V4: 개선된 프롬프트 (1,800자+, 5개 소제목, 짧은 단락)
  const systemPrompt = `당신은 네이버 블로그 SEO 전문가입니다. 다음 조건을 반드시 지켜 글을 작성하세요:

1. 분량: 공백 포함 1,800자 이상의 매우 상세한 장문으로 작성
2. 이모지: 절대로 사용하지 마세요 (이모지, 이모티콘 완전 금지)
3. 문체: "${config.suffix}" 체를 일관되게 사용
4. 톤: ${config.prompt}
5. 구조:
   - [서론] 주제 소개 및 독자 관심 유도 (2-3문장)
   - [본문] 5개 이상의 소제목으로 구분하여 상세 설명
   - [Q&A] "Q."와 "A." 형식의 질의응답 3개 이상 포함
   - [결론] 핵심 정리 및 행동 유도
6. 가독성: 각 단락은 2~3문장 이내로 짧게 구성 (뭉침 방지)
7. SEO: 주제 관련 키워드를 자연스럽게 반복 사용
8. 각 소제목은 "1.", "2.", "3." 형식으로 번호를 붙이세요
9. Q&A 섹션은 "Q." "A." 형식으로 작성하세요
10. 문장과 문장 사이에 자연스러운 흐름을 유지하세요`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\n주제: ${topic}\n\n위 조건에 맞춰 네이버 블로그 포스팅을 작성해주세요.`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          }
        })
      }
    )
    
    if (!response.ok) {
      const errorData = await response.json()
      return c.json({ error: `Gemini API 오류: ${errorData.error?.message || '알 수 없는 오류'}` }, 500)
    }
    
    const data = await response.json()
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    if (!generatedText) {
      return c.json({ error: 'AI 응답이 비어있습니다.' }, 500)
    }
    
    // V4: 가독성 최적화 적용
    let processedText = enableReadability ? readabilityOptimizer(generatedText) : removeAllEmojis(generatedText)
    const formattedResult = formatForNaverV4(processedText)
    
    return c.json({ 
      result: formattedResult,
      rawLength: generatedText.length,
      style: config.name,
      readabilityApplied: enableReadability
    })
  } catch (error) {
    console.error('Gemini API Error:', error)
    return c.json({ error: 'AI 생성 중 오류가 발생했습니다.' }, 500)
  }
})

// 텍스트 변환 API
app.post('/api/transform', async (c) => {
  const { text, mediaUrl = '', enableReadability = true } = await c.req.json()
  
  if (!text) {
    return c.json({ error: 'text is required' }, 400)
  }
  
  let processedText = enableReadability ? readabilityOptimizer(text) : removeAllEmojis(text)
  const formattedResult = formatForNaverV4(processedText, mediaUrl)
  
  return c.json({ 
    result: formattedResult,
    emojiRemoved: true,
    readabilityApplied: enableReadability
  })
})

// 강제 줄바꿈 재정렬 API
app.post('/api/reformat', async (c) => {
  const { text } = await c.req.json()
  
  if (!text) {
    return c.json({ error: 'text is required' }, 400)
  }
  
  const reformatted = readabilityOptimizer(text)
  
  return c.json({ 
    result: reformatted,
    readabilityApplied: true
  })
})

// V4: 네이버 최적화 포맷팅 (뭉침 방지 + 여백 강화)
function formatForNaverV4(text: string, mediaUrl: string = ''): string {
  let lines = text.split('\n').map(line => line.trim()).filter(line => line !== '')
  let finalLines: string[] = []
  
  // [상단] 핵심 요약 인용구 (여백 강화)
  finalLines.push('[인용구: 요약형]')
  finalLines.push('')
  finalLines.push('포스팅 핵심 요약 3줄')
  finalLines.push('')
  finalLines.push('1. 10년 차 전문가가 분석한 최신 트렌드 반영')
  finalLines.push('2. 실생활에 바로 적용 가능한 실전 팁 중심')
  finalLines.push('3. C-Rank 알고리즘에 맞춘 신뢰도 높은 정보')
  finalLines.push('')
  finalLines.push('---')
  finalLines.push('')
  finalLines.push('')
  
  let videoInserted = false
  let imageInserted = false
  const totalLines = lines.length
  
  lines.forEach((line, index) => {
    // Q&A 구조 감지 (여백 강화)
    if (line.startsWith('Q.') || line.startsWith('질문:') || line.match(/^Q\d/)) {
      finalLines.push('')
      finalLines.push('')
      finalLines.push('[인용구: 말풍선형]')
      finalLines.push('')
      finalLines.push(line)
      finalLines.push('')
    } else if (line.startsWith('A.') || line.startsWith('답변:') || line.match(/^A\d/)) {
      finalLines.push('')
      finalLines.push('[스티커 삽입 권장]')
      finalLines.push('')
      finalLines.push('**' + line + '**')
      finalLines.push('')
      finalLines.push('')
    }
    // 소제목 감지 (번호 리스트)
    else if (line.match(/^[1-9]\./)) {
      finalLines.push('')
      finalLines.push('')
      finalLines.push('[스티커 삽입 위치]')
      finalLines.push('')
      finalLines.push(line)
      finalLines.push('')
    }
    // # 소제목
    else if (line.startsWith('#')) {
      finalLines.push('')
      finalLines.push('')
      finalLines.push('[스티커 삽입 위치]')
      finalLines.push('')
      finalLines.push(line.replace(/^#+\s*/, ''))
      finalLines.push('')
    }
    // 일반 텍스트
    else {
      finalLines.push(line)
      finalLines.push('')  // 문단 간 여백
    }
    
    // 동영상 삽입 (글의 1/2 지점)
    if (!videoInserted && index === Math.floor(totalLines / 2)) {
      finalLines.push('')
      finalLines.push('')
      if (mediaUrl) {
        finalLines.push(`[동영상 삽입: ${mediaUrl}]`)
      } else {
        finalLines.push('[동영상 삽입 위치: studiojuai-mp4 연동]')
      }
      finalLines.push('')
      finalLines.push('')
      videoInserted = true
    }
    
    // 이미지 삽입 (글의 3/4 지점)
    if (!imageInserted && index === Math.floor(totalLines * 0.75)) {
      finalLines.push('')
      finalLines.push('')
      finalLines.push('[이미지 삽입 위치]')
      finalLines.push('')
      finalLines.push('')
      imageInserted = true
    }
  })
  
  // [하단] CTA 가이드 (여백 강화)
  finalLines.push('')
  finalLines.push('')
  finalLines.push('---')
  finalLines.push('')
  finalLines.push('')
  finalLines.push('[이미지 클릭 유도 배너 삽입]')
  finalLines.push('')
  finalLines.push('(상담 연결: XIVIX 리브랜딩 에이전시)')
  finalLines.push('')
  finalLines.push('')
  finalLines.push('[공감과 댓글 유도 문구]')
  finalLines.push('')
  finalLines.push('궁금하신 점은 언제든 댓글로 남겨주세요.')
  
  return finalLines.join('\n')
}

// Main page - V4 UI (뭉침 방지 & 가독성 최적화)
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX HYBRID V4</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');
    body { font-family: 'Noto Sans KR', sans-serif; background-color: #f4f7f6; }
    .loading { display: none; }
    .loading.show { display: inline-flex; }
    .style-btn.active { border-color: #16a34a; background-color: #f0fdf4; color: #15803d; }
    .toast { animation: slideIn 0.3s ease-out; }
    @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    #preview { line-height: 2.2; }
  </style>
</head>
<body class="min-h-screen p-4 md:p-8">
  <div class="max-w-7xl mx-auto">
    
    <!-- Main Card -->
    <div class="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100">
      
      <!-- Header -->
      <div class="bg-[#1a1c1e] p-6 md:p-8 text-white">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-black tracking-tight italic">XIVIX HYBRID V4</h1>
            <p class="text-xs text-gray-400 mt-1 uppercase tracking-[0.2em]">No Clumping | High Readability | SEO Safe</p>
          </div>
          <div class="flex items-center gap-3">
            <button onclick="reformatContent()" class="text-xs bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition flex items-center gap-2">
              <i class="fas fa-align-left"></i>
              강제 줄바꿈 재정렬
            </button>
            <button onclick="openSettings()" class="text-xs bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition flex items-center gap-2">
              <i class="fas fa-cog"></i>
              API 설정
            </button>
          </div>
        </div>
        
        <!-- Tab Navigation -->
        <div class="mt-6 flex gap-2">
          <button onclick="switchTab('generate')" id="tab-generate" class="px-6 py-2 rounded-full text-sm font-bold transition bg-white text-black">
            <i class="fas fa-magic mr-2"></i>AI 생성
          </button>
          <button onclick="switchTab('transform')" id="tab-transform" class="px-6 py-2 rounded-full text-sm font-bold transition bg-gray-800 text-gray-300 hover:bg-gray-700">
            <i class="fas fa-exchange-alt mr-2"></i>변환 모드
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-0">
        
        <!-- Left Panel: Controls -->
        <div class="lg:col-span-4 p-6 md:p-8 border-r border-gray-100 bg-[#fbfbfb]">
          
          <!-- AI Generate Mode -->
          <div id="panel-generate">
            <label class="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest">포스팅 주제</label>
            <input 
              id="topic"
              class="w-full p-4 md:p-5 border-2 border-gray-100 rounded-2xl mb-6 focus:border-green-500 transition-all outline-none shadow-sm text-sm"
              placeholder="예: 잠 잘오는 침실 디퓨저 위치"
            />
            
            <label class="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest">스타일 선택</label>
            <div class="space-y-3 mb-6">
              <button onclick="selectStyle('A')" id="style-A" class="style-btn active w-full p-4 text-left rounded-xl border-2 border-gray-100 transition-all hover:border-gray-300">
                <span class="block font-bold text-sm">A형: 전문가형 (C-Rank)</span>
                <span class="block text-xs text-gray-500 mt-1">신뢰감 있는 전문가 톤</span>
              </button>
              <button onclick="selectStyle('B')" id="style-B" class="style-btn w-full p-4 text-left rounded-xl border-2 border-gray-100 transition-all hover:border-gray-300">
                <span class="block font-bold text-sm">B형: 친근형 (AEO)</span>
                <span class="block text-xs text-gray-500 mt-1">이웃과 대화하는 부드러운 톤</span>
              </button>
              <button onclick="selectStyle('C')" id="style-C" class="style-btn w-full p-4 text-left rounded-xl border-2 border-gray-100 transition-all hover:border-gray-300">
                <span class="block font-bold text-sm">C형: 실용 정보 (GEO)</span>
                <span class="block text-xs text-gray-500 mt-1">데이터와 팩트 위주</span>
              </button>
            </div>
            
            <!-- Readability Toggle -->
            <div class="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <label class="flex items-center cursor-pointer">
                <input type="checkbox" id="readabilityToggle" checked class="w-5 h-5 text-green-600 rounded">
                <span class="ml-3 text-sm font-bold text-blue-700">뭉침 방지 (가독성 최적화)</span>
              </label>
              <p class="text-xs text-blue-600 mt-2">문장마다 줄바꿈을 넣어 모바일에서 읽기 편하게 만듭니다.</p>
            </div>
            
            <!-- Media URL -->
            <div class="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <label class="block text-xs font-black text-gray-500 mb-2 uppercase">
                <i class="fas fa-film mr-1"></i>미디어 URL (선택)
              </label>
              <input 
                id="mediaUrl"
                class="w-full p-3 border border-gray-200 rounded-lg text-sm bg-white"
                placeholder="studiojuai-mp4 URL"
              />
            </div>
            
            <button 
              onclick="generateContent()"
              id="generate-btn"
              class="w-full py-5 md:py-6 bg-green-600 text-white rounded-2xl font-black text-lg md:text-xl shadow-lg hover:bg-green-700 transform active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <i class="fas fa-spinner fa-spin loading" id="generate-loading"></i>
              <i class="fas fa-robot" id="generate-icon"></i>
              <span id="generate-text">1,800자 원고 생성</span>
            </button>
          </div>
          
          <!-- Transform Mode -->
          <div id="panel-transform" class="hidden">
            <label class="block text-xs font-black text-gray-400 mb-3 uppercase tracking-widest">원문 입력</label>
            <textarea
              id="rawText"
              class="w-full h-[300px] p-4 border-2 border-gray-100 rounded-2xl focus:border-green-500 transition-all outline-none text-sm resize-none"
              placeholder="AI가 생성한 원문을 붙여넣으세요..."
            ></textarea>
            
            <button 
              onclick="transformText()"
              id="transform-btn"
              class="w-full mt-6 py-5 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-lg hover:bg-blue-700 transform active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <i class="fas fa-spinner fa-spin loading" id="transform-loading"></i>
              <i class="fas fa-magic" id="transform-icon"></i>
              <span>SEO 최적화 변환</span>
            </button>
          </div>
          
          <!-- Status -->
          <div class="mt-6 p-4 bg-gray-100 rounded-xl">
            <div class="flex items-center gap-2 text-sm">
              <i class="fas fa-info-circle text-gray-400"></i>
              <span id="status-text" class="text-gray-600">대기 중</span>
            </div>
          </div>
        </div>
        
        <!-- Right Panel: Output -->
        <div class="lg:col-span-8 p-6 md:p-8 bg-white">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h3 class="text-xs font-black text-gray-400 tracking-[0.2em] uppercase">Final Optimized Content</h3>
            <div class="flex items-center gap-3">
              <span id="char-count" class="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">0자</span>
              <button 
                onclick="copyToClipboard()"
                class="bg-blue-600 text-white px-6 py-2 rounded-full font-bold text-xs shadow-md hover:bg-blue-700 transition"
              >
                <i class="fas fa-copy mr-1"></i>COPY
              </button>
            </div>
          </div>
          
          <div
            id="preview"
            class="w-full h-[600px] md:h-[650px] p-6 md:p-8 bg-[#fdfdfd] border border-gray-100 rounded-[1.5rem] overflow-y-auto text-[15px] text-gray-700 whitespace-pre-wrap shadow-inner"
          >주제를 입력하고 버튼을 누르면 뭉침 없는 깨끗한 글이 나옵니다.


[XIVIX HYBRID V4 주요 기능]


1. 뭉침 방지 (No Clumping)

문장마다 자동 줄바꿈을 넣어 모바일에서 2-3줄 단위로 가독성 최적화


2. 가독성 최적화 (High Readability)

각 단락을 2-3문장으로 짧게 구성하여 스크롤 피로도 감소


3. SEO 최적화 (SEO Safe)

이모지 0% + C-Rank/AEO/GEO 구조 + 1,800자 이상 장문


[사용 방법]

1. 포스팅 주제 입력
2. 스타일 선택 (A/B/C형)
3. "1,800자 원고 생성" 클릭
4. 결과 복사 후 네이버 에디터에 붙여넣기</div>
        </div>
      </div>
    </div>

    <!-- Guide Cards -->
    <div class="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-red-500">
        <h4 class="font-bold text-gray-800 mb-2 flex items-center gap-2">
          <i class="fas fa-ban text-red-500"></i>
          이모지 0%
        </h4>
        <p class="text-xs text-gray-600">저품질 방지를 위해 모든 이모지 자동 삭제</p>
      </div>
      <div class="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-blue-500">
        <h4 class="font-bold text-gray-800 mb-2 flex items-center gap-2">
          <i class="fas fa-align-left text-blue-500"></i>
          뭉침 방지
        </h4>
        <p class="text-xs text-gray-600">문장마다 줄바꿈으로 모바일 가독성 극대화</p>
      </div>
      <div class="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-green-500">
        <h4 class="font-bold text-gray-800 mb-2 flex items-center gap-2">
          <i class="fas fa-chart-line text-green-500"></i>
          C-Rank 최적화
        </h4>
        <p class="text-xs text-gray-600">1,800자+ 장문 + 5개 소제목 구조화</p>
      </div>
      <div class="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-purple-500">
        <h4 class="font-bold text-gray-800 mb-2 flex items-center gap-2">
          <i class="fas fa-comments text-purple-500"></i>
          AEO 최적화
        </h4>
        <p class="text-xs text-gray-600">Q&A 3개 이상으로 답변 엔진 최적화</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-8 text-center text-gray-400 text-sm pb-6">
      <p>XIVIX HYBRID V4 | No Clumping | High Readability | SEO Safe</p>
    </div>
  </div>

  <!-- Settings Modal -->
  <div id="settings-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
    <div class="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-lg font-bold">API 설정</h3>
        <button onclick="closeSettings()" class="text-gray-400 hover:text-gray-600">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">Gemini API Key</label>
          <input 
            type="password"
            id="apiKey"
            class="w-full p-3 border border-gray-300 rounded-lg text-sm"
            placeholder="AIza..."
          />
          <p class="text-xs text-gray-500 mt-2">
            <a href="https://aistudio.google.com/apikey" target="_blank" class="text-blue-600 underline">Google AI Studio</a>에서 API 키를 발급받으세요.
          </p>
        </div>
        <button onclick="saveSettings()" class="w-full py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition">
          저장하기
        </button>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <div id="toast" class="fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg hidden toast z-50"></div>

  <script>
    let currentStyle = 'A';
    let currentTab = 'generate';
    
    // Tab switching
    function switchTab(tab) {
      currentTab = tab;
      document.getElementById('panel-generate').classList.toggle('hidden', tab !== 'generate');
      document.getElementById('panel-transform').classList.toggle('hidden', tab !== 'transform');
      
      const genTab = document.getElementById('tab-generate');
      const transTab = document.getElementById('tab-transform');
      
      if (tab === 'generate') {
        genTab.className = 'px-6 py-2 rounded-full text-sm font-bold transition bg-white text-black';
        transTab.className = 'px-6 py-2 rounded-full text-sm font-bold transition bg-gray-800 text-gray-300 hover:bg-gray-700';
      } else {
        transTab.className = 'px-6 py-2 rounded-full text-sm font-bold transition bg-white text-black';
        genTab.className = 'px-6 py-2 rounded-full text-sm font-bold transition bg-gray-800 text-gray-300 hover:bg-gray-700';
      }
    }
    
    // Style selection
    function selectStyle(style) {
      currentStyle = style;
      document.querySelectorAll('.style-btn').forEach(btn => btn.classList.remove('active'));
      document.getElementById('style-' + style).classList.add('active');
    }
    
    // Settings modal
    function openSettings() {
      document.getElementById('settings-modal').classList.remove('hidden');
      document.getElementById('settings-modal').classList.add('flex');
      const savedKey = localStorage.getItem('gemini_api_key');
      if (savedKey) document.getElementById('apiKey').value = savedKey;
    }
    
    function closeSettings() {
      document.getElementById('settings-modal').classList.add('hidden');
      document.getElementById('settings-modal').classList.remove('flex');
    }
    
    function saveSettings() {
      const apiKey = document.getElementById('apiKey').value.trim();
      if (apiKey) {
        localStorage.setItem('gemini_api_key', apiKey);
        showToast('API 키가 저장되었습니다.', 'success');
        closeSettings();
      } else {
        showToast('API 키를 입력해주세요.', 'warning');
      }
    }
    
    // Generate content
    async function generateContent() {
      const topic = document.getElementById('topic').value.trim();
      const mediaUrl = document.getElementById('mediaUrl').value.trim();
      const enableReadability = document.getElementById('readabilityToggle').checked;
      const apiKey = localStorage.getItem('gemini_api_key');
      
      if (!topic) {
        showToast('주제를 입력해주세요!', 'warning');
        return;
      }
      
      if (!apiKey) {
        showToast('먼저 API 설정에서 Gemini API 키를 입력해주세요.', 'warning');
        openSettings();
        return;
      }
      
      setLoading('generate', true);
      document.getElementById('status-text').textContent = 'AI 분석 및 집필 중... (약 10-20초)';
      
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, style: currentStyle, apiKey, mediaUrl, enableReadability })
        });
        
        const data = await response.json();
        
        if (data.error) {
          showToast(data.error, 'error');
          document.getElementById('status-text').textContent = '오류 발생';
          return;
        }
        
        document.getElementById('preview').textContent = data.result;
        document.getElementById('char-count').textContent = data.result.length + '자';
        document.getElementById('status-text').textContent = 
          '생성 완료 (' + data.style + ', ' + data.rawLength + '자, 뭉침방지: ' + (data.readabilityApplied ? 'ON' : 'OFF') + ')';
        
        showToast('SEO 최적화 원고가 생성되었습니다!', 'success');
      } catch (error) {
        showToast('생성 중 오류가 발생했습니다.', 'error');
        document.getElementById('status-text').textContent = '오류 발생';
      } finally {
        setLoading('generate', false);
      }
    }
    
    // Transform text
    async function transformText() {
      const rawText = document.getElementById('rawText').value.trim();
      const mediaUrl = document.getElementById('mediaUrl').value.trim();
      const enableReadability = document.getElementById('readabilityToggle').checked;
      
      if (!rawText) {
        showToast('원문을 입력해주세요!', 'warning');
        return;
      }
      
      setLoading('transform', true);
      document.getElementById('status-text').textContent = '변환 중...';
      
      try {
        const response = await fetch('/api/transform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: rawText, mediaUrl, enableReadability })
        });
        
        const data = await response.json();
        
        if (data.error) {
          showToast(data.error, 'error');
          return;
        }
        
        document.getElementById('preview').textContent = data.result;
        document.getElementById('char-count').textContent = data.result.length + '자';
        document.getElementById('status-text').textContent = '변환 완료 (이모지 제거, 뭉침방지: ' + (data.readabilityApplied ? 'ON' : 'OFF') + ')';
        
        showToast('변환이 완료되었습니다!', 'success');
      } catch (error) {
        showToast('변환 중 오류가 발생했습니다.', 'error');
      } finally {
        setLoading('transform', false);
      }
    }
    
    // Reformat content (강제 줄바꿈 재정렬)
    async function reformatContent() {
      const preview = document.getElementById('preview').textContent;
      if (!preview || preview.includes('주제를 입력하고')) {
        showToast('먼저 원고를 생성해주세요!', 'warning');
        return;
      }
      
      try {
        const response = await fetch('/api/reformat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: preview })
        });
        
        const data = await response.json();
        
        if (data.error) {
          showToast(data.error, 'error');
          return;
        }
        
        document.getElementById('preview').textContent = data.result;
        document.getElementById('char-count').textContent = data.result.length + '자';
        showToast('줄바꿈 재정렬이 완료되었습니다!', 'success');
      } catch (error) {
        showToast('재정렬 중 오류가 발생했습니다.', 'error');
      }
    }
    
    // Set loading state
    function setLoading(type, isLoading) {
      const loading = document.getElementById(type + '-loading');
      const icon = document.getElementById(type + '-icon');
      const btn = document.getElementById(type + '-btn');
      
      loading.classList.toggle('show', isLoading);
      icon.style.display = isLoading ? 'none' : 'inline';
      btn.disabled = isLoading;
      btn.classList.toggle('opacity-75', isLoading);
    }
    
    // Copy to clipboard
    async function copyToClipboard() {
      const preview = document.getElementById('preview').textContent;
      if (!preview || preview.includes('주제를 입력하고')) {
        showToast('먼저 원고를 생성해주세요!', 'warning');
        return;
      }
      
      try {
        await navigator.clipboard.writeText(preview);
        showToast('복사 완료! 네이버 에디터에서 [맞춤법] 검사를 실행하세요.', 'success');
      } catch (error) {
        const textarea = document.createElement('textarea');
        textarea.value = preview;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('복사 완료!', 'success');
      }
    }
    
    // Toast notification
    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      toast.className = 'fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg toast flex items-center gap-2 z-50';
      
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
      
      setTimeout(() => toast.classList.add('hidden'), 4000);
    }
    
    // Close modal on outside click
    document.getElementById('settings-modal').addEventListener('click', function(e) {
      if (e.target === this) closeSettings();
    });
  </script>
</body>
</html>`)
})

export default app
