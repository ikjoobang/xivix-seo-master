import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Cloudflare Workers 환경 타입
type Bindings = {
  GEMINI_API_KEY?: string;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS
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

// 스타일 설정
const styleConfigs = {
  A: { name: '전문가형 (C-Rank)', suffix: '습니다', prompt: '전문적이고 학술적인 톤으로 작성. 데이터와 근거를 명확히 제시.' },
  B: { name: '친근형 (AEO)', suffix: '해요', prompt: '부드러운 에디터 톤, 질문/답변 형식 강조, 독자와 대화하듯 작성.' },
  C: { name: '실용 정보 (GEO)', suffix: '요약체', prompt: '데이터와 정보 중심의 건조한 톤, 핵심만 간결하게 전달.' }
}

// Gemini API를 통한 원고 생성
app.post('/api/generate', async (c) => {
  const { topic, style, apiKey } = await c.req.json()
  
  if (!topic) {
    return c.json({ error: '주제를 입력해주세요.' }, 400)
  }
  
  // API 키 확인 (환경변수 또는 클라이언트 제공)
  const geminiKey = apiKey || c.env?.GEMINI_API_KEY
  if (!geminiKey) {
    return c.json({ error: 'Gemini API 키가 필요합니다. 설정에서 입력해주세요.' }, 400)
  }
  
  const config = styleConfigs[style as keyof typeof styleConfigs] || styleConfigs.A
  
  const systemPrompt = `당신은 네이버 블로그 SEO 전문가입니다. 다음 조건을 반드시 지켜 글을 작성하세요:

1. 분량: 공백 포함 1,700자 이상의 장문으로 작성
2. 이모지: 절대로 사용하지 마세요 (이모지, 이모티콘 완전 금지)
3. 문체: "${config.suffix}" 체를 일관되게 사용
4. 톤: ${config.prompt}
5. 구조:
   - [서론] 주제 소개 및 독자 관심 유도
   - [핵심 요약] 3줄로 핵심 내용 요약
   - [본문] 3개 이상의 소제목으로 구분하여 상세 설명
   - [Q&A] 독자가 궁금해할 질문 2-3개와 답변
   - [결론] 핵심 정리 및 행동 유도
6. SEO: 주제 관련 키워드를 자연스럽게 반복 사용
7. GEO: 신뢰할 수 있는 출처나 구체적인 데이터 언급
8. 각 소제목은 "1.", "2.", "3." 형식으로 번호를 붙이세요
9. Q&A 섹션은 "Q." "A." 형식으로 작성하세요`

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
    
    // 이모지 제거 및 포맷팅 적용
    const cleanedText = removeAllEmojis(generatedText)
    const formattedResult = formatForNaver(cleanedText)
    
    return c.json({ 
      result: formattedResult,
      rawLength: generatedText.length,
      style: config.name
    })
  } catch (error) {
    console.error('Gemini API Error:', error)
    return c.json({ error: 'AI 생성 중 오류가 발생했습니다.' }, 500)
  }
})

// 텍스트 변환 API (기존 V3 로직)
app.post('/api/transform', async (c) => {
  const { text, mediaUrl = '' } = await c.req.json()
  
  if (!text) {
    return c.json({ error: 'text is required' }, 400)
  }
  
  const cleanedText = removeAllEmojis(text)
  const formattedResult = formatForNaver(cleanedText, mediaUrl)
  
  return c.json({ 
    result: formattedResult,
    emojiRemoved: true
  })
})

// 네이버 최적화 포맷팅 함수
function formatForNaver(text: string, mediaUrl: string = ''): string {
  let lines = text.split('\n').map(line => line.trim())
  let finalLines: string[] = []
  
  // [상단] 핵심 요약 인용구 가이드
  finalLines.push('[네이버 인용구: 요약형]')
  finalLines.push('제목: 이 포스팅의 핵심 3줄 요약')
  finalLines.push('1. (AI가 생성한 첫 번째 핵심 내용)')
  finalLines.push('2. (AI가 생성한 두 번째 핵심 내용)')
  finalLines.push('3. (AI가 생성한 세 번째 핵심 내용)')
  finalLines.push('---')
  finalLines.push('')
  
  let videoInserted = false
  let imageInserted = false
  
  lines.forEach((line, index) => {
    if (line === '') {
      finalLines.push('')
      return
    }
    
    // Q&A 구조 감지
    if (line.startsWith('Q.') || line.startsWith('질문:') || line.match(/^Q\d/)) {
      finalLines.push('')
      finalLines.push('[인용구: 말풍선형]')
      finalLines.push(line)
    } else if (line.startsWith('A.') || line.startsWith('답변:') || line.match(/^A\d/)) {
      finalLines.push('')
      finalLines.push('[강조 텍스트: 볼드]')
      finalLines.push(line)
    }
    // 소제목 감지
    else if (line.match(/^\d\./) || line.startsWith('#')) {
      finalLines.push('')
      finalLines.push('[스티커 삽입 위치]')
      finalLines.push(line)
    }
    else {
      finalLines.push(line)
    }
    
    // 동영상 삽입 (글의 1/3 지점)
    if (!videoInserted && index === Math.floor(lines.length / 3) && lines.length > 10) {
      finalLines.push('')
      if (mediaUrl) {
        finalLines.push(`[동영상 삽입: ${mediaUrl}]`)
      } else {
        finalLines.push('[네이버 동영상/Shorts 삽입 영역]')
      }
      finalLines.push('')
      videoInserted = true
    }
    
    // 이미지 삽입 (글의 2/3 지점)
    if (!imageInserted && index === Math.floor(lines.length * 0.66) && lines.length > 10) {
      finalLines.push('')
      finalLines.push('[이미지 삽입 위치]')
      finalLines.push('')
      imageInserted = true
    }
  })
  
  // [하단] CTA 가이드
  finalLines.push('')
  finalLines.push('')
  finalLines.push('[이미지 클릭 링크 가이드]')
  finalLines.push('(배너 이미지를 넣고 링크를 연결하세요: "상담은 위 이미지를 클릭하세요")')
  finalLines.push('')
  finalLines.push('[공감과 댓글 유도 문구]')
  finalLines.push('궁금하신 점은 언제든 댓글로 남겨주세요.')
  
  return finalLines.join('\n')
}

// Main page - Hybrid Master UI
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX HYBRID AGENT</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');
    body { font-family: 'Noto Sans KR', sans-serif; }
    .loading { display: none; }
    .loading.show { display: inline-flex; }
    .tab-btn.active { background-color: #000; color: white; }
    .style-btn.active { border-color: #000; background-color: #f3f4f6; }
    .toast { animation: slideIn 0.3s ease-out; }
    @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .animate-pulse { animation: pulse 2s ease-in-out infinite; }
  </style>
</head>
<body class="min-h-screen bg-gray-50">
  <div class="max-w-7xl mx-auto">
    
    <!-- Header -->
    <div class="bg-black text-white">
      <div class="px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-black italic tracking-tight">XIVIX HYBRID AGENT</h1>
          <p class="text-gray-400 text-sm mt-1">SEO / AEO / C-RANK / GEO V4 | NO EMOJI</p>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="openSettings()" class="text-xs bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-full transition flex items-center gap-2">
            <i class="fas fa-cog"></i>
            API 설정
          </button>
          <span class="text-xs bg-gray-800 px-4 py-2 rounded-full">
            <i class="fas fa-user-shield mr-1"></i>
            방대표님 전용
          </span>
        </div>
      </div>
      
      <!-- Tab Navigation -->
      <div class="px-6 pb-4 flex gap-2">
        <button onclick="switchTab('generate')" id="tab-generate" class="tab-btn px-6 py-2 rounded-full text-sm font-bold transition bg-white text-black">
          <i class="fas fa-magic mr-2"></i>AI 생성
        </button>
        <button onclick="switchTab('transform')" id="tab-transform" class="tab-btn px-6 py-2 rounded-full text-sm font-bold transition bg-gray-800 text-gray-300 hover:bg-gray-700">
          <i class="fas fa-exchange-alt mr-2"></i>변환 모드
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="bg-white shadow-xl">
      <div class="grid grid-cols-1 lg:grid-cols-12">
        
        <!-- Left Panel: Controls -->
        <div class="lg:col-span-4 p-6 border-r border-gray-100 bg-gray-50">
          
          <!-- AI Generate Mode -->
          <div id="panel-generate">
            <div class="mb-6">
              <label class="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">포스팅 주제</label>
              <input 
                id="topic"
                class="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-black focus:ring-0 outline-none transition text-sm"
                placeholder="예: 1인 미용실 마케팅 자동화 전략"
              />
            </div>
            
            <div class="mb-6">
              <label class="block text-xs font-black text-gray-500 mb-3 uppercase tracking-widest">스타일 선택</label>
              <div class="space-y-2">
                <button onclick="selectStyle('A')" id="style-A" class="style-btn active w-full p-4 text-left rounded-xl border-2 border-gray-200 transition hover:border-gray-400">
                  <div class="font-bold text-sm text-gray-800">A형: 전문가형 (C-Rank)</div>
                  <div class="text-xs text-gray-500 mt-1">전문적이고 학술적인 톤</div>
                </button>
                <button onclick="selectStyle('B')" id="style-B" class="style-btn w-full p-4 text-left rounded-xl border-2 border-gray-200 transition hover:border-gray-400">
                  <div class="font-bold text-sm text-gray-800">B형: 친근형 (AEO)</div>
                  <div class="text-xs text-gray-500 mt-1">부드러운 에디터 톤, Q&A 강조</div>
                </button>
                <button onclick="selectStyle('C')" id="style-C" class="style-btn w-full p-4 text-left rounded-xl border-2 border-gray-200 transition hover:border-gray-400">
                  <div class="font-bold text-sm text-gray-800">C형: 실용 정보 (GEO)</div>
                  <div class="text-xs text-gray-500 mt-1">데이터와 정보 중심</div>
                </button>
              </div>
            </div>
            
            <!-- Media API Section -->
            <div class="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <label class="block text-xs font-black text-blue-700 mb-2 uppercase tracking-widest">
                <i class="fas fa-film mr-1"></i>미디어 URL (선택)
              </label>
              <input 
                id="mediaUrl"
                class="w-full p-3 border border-blue-200 rounded-lg text-sm bg-white"
                placeholder="동영상/이미지 URL 입력"
              />
              <p class="text-xs text-blue-600 mt-2">studiojuai-mp4에서 생성한 미디어 URL을 입력하세요.</p>
            </div>
            
            <button 
              onclick="generateContent()"
              id="generate-btn"
              class="w-full py-4 bg-green-600 text-white rounded-xl font-black text-lg shadow-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              <i class="fas fa-spinner fa-spin loading" id="generate-loading"></i>
              <i class="fas fa-robot" id="generate-icon"></i>
              <span id="generate-text">1,700자 SEO 원고 생성</span>
            </button>
          </div>
          
          <!-- Transform Mode -->
          <div id="panel-transform" class="hidden">
            <div class="mb-6">
              <label class="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">원문 입력</label>
              <textarea
                id="rawText"
                class="w-full h-[300px] p-4 border-2 border-gray-200 rounded-xl focus:border-black focus:ring-0 outline-none transition text-sm resize-none"
                placeholder="AI가 생성한 원문을 붙여넣으세요...

[지원하는 구조]
Q. 질문 형식
A. 답변 형식
1. 번호 리스트
# 소제목"
              ></textarea>
            </div>
            
            <button 
              onclick="transformText()"
              id="transform-btn"
              class="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-lg shadow-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
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
        <div class="lg:col-span-8 p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <span class="w-6 h-6 bg-black text-white rounded flex items-center justify-center text-xs">2</span>
              FINAL NATIVE OPTIMIZED CONTENT
            </h3>
            <div class="flex gap-2">
              <span id="char-count" class="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">0자</span>
              <button 
                onclick="copyToClipboard()"
                class="text-xs font-bold text-blue-600 border border-blue-600 px-4 py-1 rounded-full hover:bg-blue-50 transition"
              >
                <i class="fas fa-copy mr-1"></i>COPY
              </button>
            </div>
          </div>
          
          <div
            id="preview"
            class="w-full h-[600px] p-6 bg-gray-50 border border-gray-200 rounded-xl overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-gray-700"
          >주제를 입력하고 생성 버튼을 누르면 SEO 최적화 원고가 이곳에 나타납니다.

[XIVIX HYBRID AGENT 주요 기능]

1. AI 생성 모드
   - Gemini API를 통해 1,700자 이상의 SEO 원고 자동 생성
   - C-Rank/AEO/GEO 최적화 구조 적용
   - 이모지 0% (완전 제거)

2. 변환 모드
   - 기존 AI 원문을 네이버 최적화 형식으로 변환
   - Q&A 구조 자동 감지
   - 네이버 가이드 자동 삽입

3. 미디어 연동
   - studiojuai-mp4 URL 입력 가능
   - 동영상/이미지 위치 자동 배치

[사용 방법]
1. 포스팅 주제 입력
2. 스타일 선택 (A/B/C형)
3. "1,700자 SEO 원고 생성" 클릭
4. 결과 복사 후 네이버 에디터에 붙여넣기</div>
        </div>
      </div>
    </div>

    <!-- Guide Cards -->
    <div class="px-6 py-6 grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-white p-5 rounded-xl shadow-sm border-l-4 border-red-500">
        <h4 class="font-bold text-gray-800 mb-2 flex items-center gap-2">
          <i class="fas fa-ban text-red-500"></i>
          이모지 0%
        </h4>
        <p class="text-xs text-gray-600">AI가 넣은 이모지도 자동 삭제됩니다.</p>
      </div>
      <div class="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-500">
        <h4 class="font-bold text-gray-800 mb-2 flex items-center gap-2">
          <i class="fas fa-chart-line text-blue-500"></i>
          C-Rank 최적화
        </h4>
        <p class="text-xs text-gray-600">1,700자 이상 장문 + 구조화된 정보</p>
      </div>
      <div class="bg-white p-5 rounded-xl shadow-sm border-l-4 border-green-500">
        <h4 class="font-bold text-gray-800 mb-2 flex items-center gap-2">
          <i class="fas fa-comments text-green-500"></i>
          AEO 최적화
        </h4>
        <p class="text-xs text-gray-600">Q&A 구조로 답변 엔진 최적화</p>
      </div>
      <div class="bg-white p-5 rounded-xl shadow-sm border-l-4 border-purple-500">
        <h4 class="font-bold text-gray-800 mb-2 flex items-center gap-2">
          <i class="fas fa-globe text-purple-500"></i>
          GEO 최적화
        </h4>
        <p class="text-xs text-gray-600">AI 모델이 인용하기 좋은 구조</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="text-center text-gray-400 text-sm pb-6">
      <p>XIVIX HYBRID AGENT V4 | SEO / AEO / C-RANK / GEO | NO EMOJI</p>
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
  <div id="toast" class="fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg hidden toast z-50">
    <span id="toast-message"></span>
  </div>

  <script>
    let currentStyle = 'A';
    let currentTab = 'generate';
    
    // Tab switching
    function switchTab(tab) {
      currentTab = tab;
      document.getElementById('panel-generate').classList.toggle('hidden', tab !== 'generate');
      document.getElementById('panel-transform').classList.toggle('hidden', tab !== 'transform');
      document.getElementById('tab-generate').classList.toggle('active', tab === 'generate');
      document.getElementById('tab-transform').classList.toggle('active', tab === 'transform');
      document.getElementById('tab-generate').classList.toggle('bg-white', tab === 'generate');
      document.getElementById('tab-generate').classList.toggle('text-black', tab === 'generate');
      document.getElementById('tab-generate').classList.toggle('bg-gray-800', tab !== 'generate');
      document.getElementById('tab-generate').classList.toggle('text-gray-300', tab !== 'generate');
      document.getElementById('tab-transform').classList.toggle('bg-white', tab === 'transform');
      document.getElementById('tab-transform').classList.toggle('text-black', tab === 'transform');
      document.getElementById('tab-transform').classList.toggle('bg-gray-800', tab !== 'transform');
      document.getElementById('tab-transform').classList.toggle('text-gray-300', tab !== 'transform');
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
      if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
      }
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
    
    // Generate content with Gemini
    async function generateContent() {
      const topic = document.getElementById('topic').value.trim();
      const mediaUrl = document.getElementById('mediaUrl').value.trim();
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
      
      // Show loading
      setLoading('generate', true);
      document.getElementById('status-text').textContent = 'AI 분석 및 집필 중... (약 10-20초 소요)';
      
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, style: currentStyle, apiKey, mediaUrl })
        });
        
        const data = await response.json();
        
        if (data.error) {
          showToast(data.error, 'error');
          document.getElementById('status-text').textContent = '오류 발생';
          return;
        }
        
        document.getElementById('preview').textContent = data.result;
        document.getElementById('char-count').textContent = data.result.length + '자';
        document.getElementById('status-text').textContent = '생성 완료 (' + data.style + ', ' + data.rawLength + '자 원문)';
        
        showToast('SEO 최적화 원고가 생성되었습니다!', 'success');
      } catch (error) {
        showToast('생성 중 오류가 발생했습니다.', 'error');
        document.getElementById('status-text').textContent = '오류 발생';
      } finally {
        setLoading('generate', false);
      }
    }
    
    // Transform existing text
    async function transformText() {
      const rawText = document.getElementById('rawText').value.trim();
      const mediaUrl = document.getElementById('mediaUrl').value.trim();
      
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
          body: JSON.stringify({ text: rawText, mediaUrl })
        });
        
        const data = await response.json();
        
        if (data.error) {
          showToast(data.error, 'error');
          return;
        }
        
        document.getElementById('preview').textContent = data.result;
        document.getElementById('char-count').textContent = data.result.length + '자';
        document.getElementById('status-text').textContent = '변환 완료 (이모지 제거됨)';
        
        showToast('변환이 완료되었습니다!', 'success');
      } catch (error) {
        showToast('변환 중 오류가 발생했습니다.', 'error');
      } finally {
        setLoading('transform', false);
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
        showToast('클립보드 복사 완료! 네이버 에디터에서 [맞춤법] 검사를 실행하세요.', 'success');
      } catch (error) {
        const textarea = document.createElement('textarea');
        textarea.value = preview;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('클립보드 복사 완료!', 'success');
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
