import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  GEMINI_API_KEY?: string;
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

// V4.1: 이모지/아이콘 완전 제거 함수 (100% 텍스트 기반)
function removeAllEmojisAndSymbols(text: string): string {
  return text
    // 유니코드 이모지 제거
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
    // 추가: 특수 기호들 제거
    .replace(/[📌🎯🎬🖼️✅❶❷❸■▶✨💡📍📄💬📝✔️➡️]/g, '')
}

// V4.1: 100% 텍스트 기반 가독성 최적화 로직
function cleanReadabilityOptimizer(text: string): string {
  let cleaned = removeAllEmojisAndSymbols(text)
  
  // 문장 단위 강제 여백 (마침표 후 줄바꿈)
  cleaned = cleaned
    .split('. ')
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0)
    .join('.\n\n')
  
  // 불필요한 공백 중복 제거
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  
  return cleaned.trim()
}

// 스타일 설정
const styleConfigs = {
  A: { name: '전문가형 (C-Rank)', suffix: '습니다', prompt: '신뢰감 있는 전문가 톤으로 작성. 데이터와 근거를 명확히 제시.' },
  B: { name: '친근형 (AEO)', suffix: '해요', prompt: '이웃과 대화하듯 부드러운 에디터 톤. 질문/답변 형식 강조.' },
  C: { name: '실용 정보 (GEO)', suffix: '요약체', prompt: '데이터와 팩트 위주의 건조한 톤. 핵심만 간결하게 전달.' }
}

// V4.1: Gemini API를 통한 원고 생성 (서버 환경변수만 사용)
app.post('/api/generate', async (c) => {
  const { topic, style, enableReadability = true } = await c.req.json()
  
  if (!topic) {
    return c.json({ error: '주제를 입력해주세요.' }, 400)
  }
  
  const geminiKey = c.env?.GEMINI_API_KEY
  if (!geminiKey) {
    return c.json({ error: '서버에 API 키가 설정되어 있지 않습니다. 관리자에게 문의하세요.' }, 400)
  }
  
  const config = styleConfigs[style as keyof typeof styleConfigs] || styleConfigs.A
  
  // V4.1: 강화된 프롬프트
  const systemPrompt = `당신은 네이버 블로그 SEO 전문가입니다. 다음 조건을 반드시 지켜 글을 작성하세요:

1. 분량: 공백 포함 1,800자 이상의 매우 상세한 장문으로 작성
2. 절대 조건: 모든 형태의 이모지, 특수 아이콘(별, 체크, 화살표 등) 사용 금지
3. 문체: "${config.suffix}" 체를 일관되게 사용
4. 톤: ${config.prompt}
5. 구조:
   - [서론] 주제 소개 및 독자 관심 유도 (2-3문장)
   - [본문] 5개 이상의 소제목으로 구분하여 상세 설명
   - [Q&A] "Q."와 "A." 형식의 질의응답 3개 이상 포함
   - [결론] 핵심 정리 및 행동 유도
6. 가독성: 각 단락은 2문장 내외로 매우 짧게 구성
7. SEO: 주제 관련 키워드를 자연스럽게 반복 사용
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
    
    // V4.1: 가독성 최적화 및 포맷팅
    let processedText = enableReadability ? cleanReadabilityOptimizer(generatedText) : removeAllEmojisAndSymbols(generatedText)
    const formattedResult = formatForNaverV41(processedText)
    
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
  const { text, enableReadability = true } = await c.req.json()
  
  if (!text) {
    return c.json({ error: 'text is required' }, 400)
  }
  
  let processedText = enableReadability ? cleanReadabilityOptimizer(text) : removeAllEmojisAndSymbols(text)
  const formattedResult = formatForNaverV41(processedText)
  
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
  
  const reformatted = cleanReadabilityOptimizer(text)
  
  return c.json({ 
    result: reformatted,
    readabilityApplied: true
  })
})

// V4.1: 네이버 최적화 포맷팅 (100% 텍스트 기반, 아이콘 0%)
function formatForNaverV41(text: string): string {
  let lines = text.split('\n').map(line => line.trim()).filter(line => line !== '')
  let finalLines: string[] = []
  
  // [상단] 요약문 통합 구조 (단일화, 아이콘 없음)
  finalLines.push('[네이버 인용구: 요약형]')
  finalLines.push('')
  finalLines.push('제목: 이번 포스팅 핵심 요약 3줄')
  finalLines.push('')
  finalLines.push('1. 전문가의 시각으로 분석한 최신 정보 제공')
  finalLines.push('2. 독자가 바로 실천할 수 있는 구체적 팁 포함')
  finalLines.push('3. C-Rank 알고리즘을 준수한 고품질 콘텐츠')
  finalLines.push('')
  finalLines.push('---')
  finalLines.push('')
  finalLines.push('')
  
  let videoInserted = false
  const totalLines = lines.length
  
  lines.forEach((line, index) => {
    // 소제목 감지 시 스티커 가이드 배치 (본문 소제목 상단에만)
    if (line.match(/^[1-9]\./) || line.startsWith('#')) {
      finalLines.push('')
      finalLines.push('')
      finalLines.push('[네이버 스티커 삽입 권장]')
      finalLines.push('')
      finalLines.push('**' + line.replace(/^#+\s*/, '').trim() + '**')
      finalLines.push('')
    }
    // Q&A 섹션 가이드 (인용구: 말풍선형)
    else if (line.startsWith('Q.') || line.startsWith('질문:') || line.match(/^Q\d/)) {
      finalLines.push('')
      finalLines.push('')
      finalLines.push('[네이버 인용구: 말풍선형]')
      finalLines.push('')
      finalLines.push(line)
      finalLines.push('')
    }
    // 답변 섹션
    else if (line.startsWith('A.') || line.startsWith('답변:') || line.match(/^A\d/)) {
      finalLines.push('')
      finalLines.push('**' + line + '**')
      finalLines.push('')
      finalLines.push('')
    }
    // 일반 텍스트
    else {
      finalLines.push(line)
      finalLines.push('')
    }
    
    // 미디어 슬롯 자동 배치 (글의 1/3 지점) - 100% 텍스트
    if (!videoInserted && index === Math.floor(totalLines / 3)) {
      finalLines.push('')
      finalLines.push('')
      finalLines.push('[네이버 동영상/Shorts 삽입 영역]')
      finalLines.push('(studiojuai-mp4 API 연동 위치)')
      finalLines.push('')
      finalLines.push('')
      videoInserted = true
    }
  })
  
  // [하단] CTA 마감 (100% 텍스트 기반)
  finalLines.push('')
  finalLines.push('')
  finalLines.push('---')
  finalLines.push('')
  finalLines.push('')
  finalLines.push('[이미지 클릭 배너 가이드]')
  finalLines.push('(배너 이미지 삽입 후 상담 링크 연결: XIVIX Agency)')
  finalLines.push('')
  finalLines.push('')
  finalLines.push('[공감과 댓글 유도 문구]')
  finalLines.push('궁금하신 점은 언제든 댓글로 남겨주세요.')
  
  return finalLines.join('\n')
}

// Main page - V4.1 UI (Pure Text, Native Guide, No Emoji)
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX SEO MASTER V4.1</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');
    body { font-family: 'Noto Sans KR', sans-serif; background-color: #f8f9fa; }
    .loading { display: none; }
    .loading.show { display: inline-flex; }
    .style-btn.active { border-color: #000; background-color: #000; color: white; }
    .toast { animation: slideIn 0.3s ease-out; }
    @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    #preview { line-height: 2.0; }
  </style>
</head>
<body class="min-h-screen p-4 md:p-6">
  <div class="max-w-7xl mx-auto">
    
    <!-- Main Card -->
    <div class="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
      
      <!-- Header -->
      <div class="bg-gray-900 p-6 text-white">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-xl md:text-2xl font-black italic tracking-tight">XIVIX SEO MASTER V4.1</h1>
            <p class="text-[10px] text-gray-400 uppercase tracking-[0.2em] mt-1">Pure Text | Native Guide | No Emoji</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="reformatContent()" class="text-[10px] bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded transition">
              <i class="fas fa-align-left mr-1"></i>여백 재정렬
            </button>

            <button onclick="copyToClipboard()" class="text-[10px] bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded transition">
              <i class="fas fa-copy mr-1"></i>전체 복사
            </button>
            <button onclick="downloadTxt()" class="text-[10px] bg-green-600 hover:bg-green-700 px-3 py-2 rounded transition">
              <i class="fas fa-download mr-1"></i>TXT 저장
            </button>
          </div>
        </div>
        
        <!-- Tab Navigation -->
        <div class="mt-6 flex gap-2">
          <button onclick="switchTab('generate')" id="tab-generate" class="px-5 py-2 rounded-full text-xs font-bold transition bg-white text-black">
            AI 생성
          </button>
          <button onclick="switchTab('transform')" id="tab-transform" class="px-5 py-2 rounded-full text-xs font-bold transition bg-gray-800 text-gray-300 hover:bg-gray-700">
            변환 모드
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-0">
        
        <!-- Left Panel: Controls -->
        <div class="lg:col-span-4 p-6 md:p-8 border-r border-gray-100 bg-gray-50">
          
          <!-- AI Generate Mode -->
          <div id="panel-generate">
            <label class="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">포스팅 주제</label>
            <input 
              id="topic"
              class="w-full p-4 border border-gray-200 rounded-xl mb-5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="예: 잠 잘오는 침실 디퓨저 위치"
            />
            
            <label class="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">스타일 선택</label>
            <div class="space-y-2 mb-5">
              <button onclick="selectStyle('A')" id="style-A" class="style-btn active w-full p-3 text-left rounded-lg border border-gray-200 text-xs transition-all hover:border-gray-400">
                <span class="font-bold">A형: 전문가형 (C-Rank)</span>
                <span class="block text-gray-500 mt-1">신뢰감 있는 전문가 톤</span>
              </button>
              <button onclick="selectStyle('B')" id="style-B" class="style-btn w-full p-3 text-left rounded-lg border border-gray-200 text-xs transition-all hover:border-gray-400">
                <span class="font-bold">B형: 친근형 (AEO)</span>
                <span class="block text-gray-500 mt-1">이웃과 대화하는 부드러운 톤</span>
              </button>
              <button onclick="selectStyle('C')" id="style-C" class="style-btn w-full p-3 text-left rounded-lg border border-gray-200 text-xs transition-all hover:border-gray-400">
                <span class="font-bold">C형: 실용 정보 (GEO)</span>
                <span class="block text-gray-500 mt-1">데이터와 팩트 위주</span>
              </button>
            </div>
            
            <!-- Readability Toggle -->
            <div class="mb-5 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <label class="flex items-center cursor-pointer">
                <input type="checkbox" id="readabilityToggle" checked class="w-4 h-4 text-blue-600 rounded">
                <span class="ml-2 text-xs font-bold text-blue-700">뭉침 방지 (가독성 최적화)</span>
              </label>
              <p class="text-[10px] text-blue-600 mt-1">문장마다 줄바꿈을 넣어 모바일 가독성 극대화</p>
            </div>
            
            <button 
              onclick="generateContent()"
              id="generate-btn"
              class="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transform active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <i class="fas fa-spinner fa-spin loading" id="generate-loading"></i>
              <span id="generate-text">SEO 원고 생성</span>
            </button>
          </div>
          
          <!-- Transform Mode -->
          <div id="panel-transform" class="hidden">
            <label class="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">원문 입력</label>
            <textarea
              id="rawText"
              class="w-full h-[280px] p-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="AI가 생성한 원문을 붙여넣으세요..."
            ></textarea>
            
            <button 
              onclick="transformText()"
              id="transform-btn"
              class="w-full mt-5 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transform active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <i class="fas fa-spinner fa-spin loading" id="transform-loading"></i>
              <span>SEO 최적화 변환</span>
            </button>
          </div>
          
          <!-- Status -->
          <div class="mt-5 p-3 bg-gray-100 rounded-lg">
            <div class="flex items-center gap-2 text-xs">
              <i class="fas fa-info-circle text-gray-400"></i>
              <span id="status-text" class="text-gray-600">대기 중</span>
            </div>
          </div>
        </div>
        
        <!-- Right Panel: Output -->
        <div class="lg:col-span-8 p-6 md:p-8">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
            <h3 class="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">Final Optimized Content</h3>
            <span id="char-count" class="text-[10px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">0자</span>
          </div>
          
          <div
            id="preview"
            class="w-full h-[550px] md:h-[600px] p-6 bg-white border border-gray-100 rounded-2xl overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap shadow-inner"
          >결과가 여기에 표시됩니다.


[XIVIX SEO MASTER V4.1 주요 기능]


1. 100% 텍스트 기반 가이드

모든 아이콘/이모지를 텍스트로 교체하여 저품질 리스크 0%


2. 요약문 단일화

AI 생성 요약문과 가이드 틀이 겹치지 않도록 구조 통합


3. 스티커 위치 최적화

본문 소제목(Sub-heading) 상단에만 배치하여 시각적 위계 확립


4. 강제 여백 로직 강화

문장 끝 + 가이드 문구 전후에 여백 추가로 뭉침 완전 해결


[사용 방법]

1. 주제 입력
2. 스타일 선택 (A/B/C형)
3. SEO 원고 생성 클릭
4. 전체 복사 후 네이버 에디터에 붙여넣기</div>
        </div>
      </div>
    </div>

    <!-- Guide Cards -->
    <div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
        <h4 class="font-bold text-gray-800 text-xs mb-1">이모지 0%</h4>
        <p class="text-[10px] text-gray-600">100% 텍스트 기반으로 저품질 원천 차단</p>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
        <h4 class="font-bold text-gray-800 text-xs mb-1">뭉침 방지</h4>
        <p class="text-[10px] text-gray-600">문장마다 줄바꿈으로 가독성 극대화</p>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
        <h4 class="font-bold text-gray-800 text-xs mb-1">C-Rank 최적화</h4>
        <p class="text-[10px] text-gray-600">1,800자+ 장문 + 5개 소제목</p>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500">
        <h4 class="font-bold text-gray-800 text-xs mb-1">AEO 최적화</h4>
        <p class="text-[10px] text-gray-600">Q&A 3개+로 답변 엔진 최적화</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-6 text-center text-gray-400 text-[10px] pb-4">
      <p>XIVIX SEO MASTER V4.1 | Pure Text | Native Guide | No Emoji</p>
    </div>
  </div>



  <!-- Toast -->
  <div id="toast" class="fixed top-4 right-4 px-5 py-3 rounded-lg shadow-lg hidden toast z-50"></div>

  <script>
    let currentStyle = 'A';
    let currentTab = 'generate';
    
    function switchTab(tab) {
      currentTab = tab;
      document.getElementById('panel-generate').classList.toggle('hidden', tab !== 'generate');
      document.getElementById('panel-transform').classList.toggle('hidden', tab !== 'transform');
      
      const genTab = document.getElementById('tab-generate');
      const transTab = document.getElementById('tab-transform');
      
      if (tab === 'generate') {
        genTab.className = 'px-5 py-2 rounded-full text-xs font-bold transition bg-white text-black';
        transTab.className = 'px-5 py-2 rounded-full text-xs font-bold transition bg-gray-800 text-gray-300 hover:bg-gray-700';
      } else {
        transTab.className = 'px-5 py-2 rounded-full text-xs font-bold transition bg-white text-black';
        genTab.className = 'px-5 py-2 rounded-full text-xs font-bold transition bg-gray-800 text-gray-300 hover:bg-gray-700';
      }
    }
    
    function selectStyle(style) {
      currentStyle = style;
      document.querySelectorAll('.style-btn').forEach(btn => btn.classList.remove('active'));
      document.getElementById('style-' + style).classList.add('active');
    }
    

    
    async function generateContent() {
      const topic = document.getElementById('topic').value.trim();
      const enableReadability = document.getElementById('readabilityToggle').checked;
      
      if (!topic) {
        showToast('주제를 입력해주세요!', 'warning');
        return;
      }
      
      setLoading('generate', true);
      document.getElementById('status-text').textContent = '분석 중... (약 10-20초)';
      
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, style: currentStyle, enableReadability })
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
          '생성 완료 (' + data.style + ', ' + data.rawLength + '자)';
        
        showToast('가이드가 생성되었습니다!', 'success');
      } catch (error) {
        showToast('생성 중 오류가 발생했습니다.', 'error');
        document.getElementById('status-text').textContent = '오류 발생';
      } finally {
        setLoading('generate', false);
      }
    }
    
    async function transformText() {
      const rawText = document.getElementById('rawText').value.trim();
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
          body: JSON.stringify({ text: rawText, enableReadability })
        });
        
        const data = await response.json();
        
        if (data.error) {
          showToast(data.error, 'error');
          return;
        }
        
        document.getElementById('preview').textContent = data.result;
        document.getElementById('char-count').textContent = data.result.length + '자';
        document.getElementById('status-text').textContent = '변환 완료';
        
        showToast('변환이 완료되었습니다!', 'success');
      } catch (error) {
        showToast('변환 중 오류가 발생했습니다.', 'error');
      } finally {
        setLoading('transform', false);
      }
    }
    
    async function reformatContent() {
      const preview = document.getElementById('preview').textContent;
      if (!preview || preview.includes('결과가 여기에')) {
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
        showToast('여백 재정렬 완료!', 'success');
      } catch (error) {
        showToast('재정렬 중 오류가 발생했습니다.', 'error');
      }
    }
    
    function setLoading(type, isLoading) {
      const loading = document.getElementById(type + '-loading');
      const btn = document.getElementById(type + '-btn');
      
      loading.classList.toggle('show', isLoading);
      btn.disabled = isLoading;
      btn.classList.toggle('opacity-75', isLoading);
    }
    
    async function copyToClipboard() {
      const preview = document.getElementById('preview').textContent;
      if (!preview || preview.includes('결과가 여기에')) {
        showToast('먼저 원고를 생성해주세요!', 'warning');
        return;
      }
      
      try {
        await navigator.clipboard.writeText(preview);
        showToast('가이드가 복사되었습니다. 네이버 에디터에 붙여넣으세요.', 'success');
      } catch (error) {
        const textarea = document.createElement('textarea');
        textarea.value = preview;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('가이드가 복사되었습니다.', 'success');
      }
    }
    
    function downloadTxt() {
      const preview = document.getElementById('preview').textContent;
      if (!preview || preview.includes('결과가 여기에')) {
        showToast('먼저 원고를 생성해주세요!', 'warning');
        return;
      }
      
      const blob = new Blob([preview], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'xivix_seo_' + new Date().toISOString().slice(0,10) + '.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('TXT 파일이 다운로드되었습니다.', 'success');
    }
    
    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      toast.className = 'fixed top-4 right-4 px-5 py-3 rounded-lg shadow-lg toast flex items-center gap-2 z-50';
      
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
      
      toast.innerHTML = icon + '<span class="text-sm">' + message + '</span>';
      toast.classList.remove('hidden');
      
      setTimeout(() => toast.classList.add('hidden'), 3500);
    }
    

  </script>
</body>
</html>`)
})

export default app
