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
    version: 'V5.0',
    timestamp: new Date().toISOString(),
    services: {
      transform: 'active',
      reformat: 'active',
      generate: 'active (requires GEMINI_API_KEY)'
    }
  })
})

// V5.0: 이모지 완전 제거 (복사 붙여넣기 최적화)
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

// V5.0: 스타일 설정 - 매장 직원/관리자가 직접 쓴 느낌
const styleConfigs = {
  A: { 
    name: '사장님 스타일', 
    suffix: '요', 
    prompt: `당신은 작은 매장을 운영하는 사장님입니다. 
손님들에게 진심으로 추천하는 느낌으로, 너무 전문적이지 않게 편하게 말하듯 작성하세요.
"저희 매장에서는~", "직접 써보니까~", "손님들 반응이~" 같은 표현을 자연스럽게 사용하세요.
절대 "~습니다", "~입니다" 같은 딱딱한 존댓말 금지. "~요", "~거든요", "~더라고요" 체를 사용하세요.`
  },
  B: { 
    name: '직원 추천 스타일', 
    suffix: '요', 
    prompt: `당신은 매장에서 일하는 직원입니다.
고객에게 제품/서비스를 친근하게 설명하는 느낌으로 작성하세요.
"제가 직접 써봤는데요~", "다른 분들도 많이 찾으시는~", "요즘 인기 많은~" 같은 표현을 사용하세요.
마치 카톡으로 친구한테 추천해주는 것처럼 자연스럽게 써주세요.`
  },
  C: { 
    name: '솔직 후기 스타일', 
    suffix: '요', 
    prompt: `당신은 직접 사용해본 일반인입니다.
광고 같지 않게, 진짜 써본 사람의 솔직한 후기처럼 작성하세요.
"솔직히 처음엔 별 기대 없었는데~", "근데 써보니까 진짜~", "단점도 있긴 한데~" 같은 표현을 사용하세요.
장점만 나열하지 말고, 작은 단점도 솔직하게 언급하면서 전체적으로 긍정적인 결론을 내세요.`
  }
}

// V5.0: Gemini API를 통한 원고 생성 (매장 직원 느낌 + 제목 생성)
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
  
  // V5.0: 매장 직원/관리자 느낌의 자연스러운 프롬프트
  const systemPrompt = `${config.prompt}

[필수 조건]
1. 분량: 1,500자 이상 작성
2. 이모지/특수문자 절대 사용 금지 (별, 체크, 하트 등 전부 금지)
3. 문체: "~${config.suffix}" 체로 통일 (예: "좋더라고요", "추천드려요", "그렇거든요")
4. 절대 하지 말 것:
   - "~습니다", "~입니다" 같은 딱딱한 존댓말 금지
   - "본 포스팅은~", "오늘은 ~에 대해 알아보겠습니다" 같은 전형적인 블로그 서론 금지
   - 번호 매기기(1. 2. 3.) 금지
   - "Q.", "A." 형식의 Q&A 금지
   - "[서론]", "[본문]", "[결론]" 같은 구조 표시 금지

5. 반드시 할 것:
   - 첫 문장부터 바로 본론으로 시작
   - 마치 친한 손님에게 말하듯 자연스럽게
   - 실제 경험담처럼 ("제가 직접 써봤는데요", "손님들 반응 보니까")
   - 중간중간 짧은 감탄사 ("진짜", "확실히", "솔직히")
   - 자연스러운 문단 구분 (3-4문장마다)

6. 구조 (표시하지 말고 자연스럽게 흐르게):
   - 도입: 왜 이걸 소개하게 됐는지 간단히
   - 본문: 장점 2-3개, 사용 팁, 실제 경험
   - 마무리: 추천 이유 정리

[제목 생성]
글 맨 위에 SEO 최적화된 매력적인 제목을 작성하세요.
제목 형식: [제목] 실제 제목 내용
- 검색 키워드 포함
- 호기심 유발 (숫자, 질문, 비교 활용)
- 15-30자 사이
예시: [제목] 디퓨저 위치 하나 바꿨더니 잠이 쏟아지네요`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\n주제: ${topic}\n\n위 조건에 맞춰 블로그 글을 작성해주세요.`
            }]
          }],
          generationConfig: {
            temperature: 0.9,
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
    let generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    if (!generatedText) {
      return c.json({ error: 'AI 응답이 비어있습니다.' }, 500)
    }
    
    // 이모지 제거
    generatedText = removeAllEmojis(generatedText)
    
    // 제목 추출 (여러 패턴 지원)
    let title = ''
    const titlePatterns = [
      /\[제목\]\s*(.+?)(\n|$)/,
      /^#\s*(.+?)(\n|$)/,
      /^(.+?)(\n\n)/
    ]
    
    for (const pattern of titlePatterns) {
      const match = generatedText.match(pattern)
      if (match && match[1].length < 50) {
        title = match[1].trim()
        generatedText = generatedText.replace(pattern, '').trim()
        break
      }
    }
    
    // 제목이 없으면 첫 줄에서 추출
    if (!title) {
      const firstLine = generatedText.split('\n')[0]
      if (firstLine && firstLine.length < 50) {
        title = firstLine.trim()
        generatedText = generatedText.substring(firstLine.length).trim()
      }
    }
    
    // V5.0: 복사 붙여넣기 최적화 (가이드 문구 없이 바로 사용 가능)
    const formattedResult = formatForCopyPaste(generatedText, enableReadability)
    
    return c.json({ 
      title: title,
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

// V5.0: 복사 붙여넣기 최적화 포맷팅 (가이드 문구 제거, 바로 사용 가능)
function formatForCopyPaste(text: string, enableReadability: boolean): string {
  let cleaned = removeAllEmojis(text)
  
  // 불필요한 마크다운/서식 제거
  cleaned = cleaned
    .replace(/\*\*/g, '')  // 볼드 제거
    .replace(/\*/g, '')    // 이탤릭 제거
    .replace(/#{1,6}\s/g, '')  // 헤더 마크다운 제거
    .replace(/\[.*?\]/g, '')   // 대괄호 표시 제거
    .replace(/---/g, '')       // 구분선 제거
  
  if (enableReadability) {
    // 문단 단위로 여백 추가 (2-3문장마다)
    const sentences = cleaned.split(/(?<=[.!?])\s+/)
    let result = ''
    let count = 0
    
    for (const sentence of sentences) {
      result += sentence + ' '
      count++
      if (count >= 2 && Math.random() > 0.5) {
        result = result.trim() + '\n\n'
        count = 0
      } else if (count >= 3) {
        result = result.trim() + '\n\n'
        count = 0
      }
    }
    cleaned = result.trim()
  }
  
  // 과도한 줄바꿈 정리
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  
  return cleaned.trim()
}

// 텍스트 변환 API
app.post('/api/transform', async (c) => {
  const { text, enableReadability = true } = await c.req.json()
  
  if (!text) {
    return c.json({ error: 'text is required' }, 400)
  }
  
  const formattedResult = formatForCopyPaste(text, enableReadability)
  
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

// Main page - V5.0 UI (기존 스타일 유지 + 제목 생성)
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX SEO MASTER V5</title>
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
            <h1 class="text-xl md:text-2xl font-black italic tracking-tight">XIVIX SEO MASTER V5</h1>
            <p class="text-[10px] text-gray-400 uppercase tracking-[0.2em] mt-1">Natural Tone | Auto Title | Copy Ready</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="copyTitle()" class="text-[10px] bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded transition">
              <i class="fas fa-heading mr-1"></i>제목 복사
            </button>
            <button onclick="copyToClipboard()" class="text-[10px] bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded transition">
              <i class="fas fa-copy mr-1"></i>본문 복사
            </button>
            <button onclick="copyAll()" class="text-[10px] bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded transition">
              <i class="fas fa-clipboard mr-1"></i>전체 복사
            </button>
            <button onclick="downloadTxt()" class="text-[10px] bg-green-600 hover:bg-green-700 px-3 py-2 rounded transition">
              <i class="fas fa-download mr-1"></i>TXT 저장
            </button>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-0">
        
        <!-- Left Panel -->
        <div class="lg:col-span-4 p-6 md:p-8 border-r border-gray-100 bg-gray-50">
          
          <label class="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">포스팅 주제</label>
          <input 
            id="topic"
            class="w-full p-4 border border-gray-200 rounded-xl mb-5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="예: 겨울철 디퓨저 추천"
          />
          
          <label class="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">글쓰기 스타일</label>
          <div class="space-y-2 mb-5">
            <button onclick="selectStyle('A')" id="style-A" class="style-btn active w-full p-3 text-left rounded-lg border border-gray-200 text-xs transition-all hover:border-gray-400">
              <span class="font-bold">A형: 사장님 스타일</span>
              <span class="block text-gray-500 mt-1">"저희 매장에서 직접 써보니까요~"</span>
            </button>
            <button onclick="selectStyle('B')" id="style-B" class="style-btn w-full p-3 text-left rounded-lg border border-gray-200 text-xs transition-all hover:border-gray-400">
              <span class="font-bold">B형: 직원 추천 스타일</span>
              <span class="block text-gray-500 mt-1">"요즘 손님들 사이에서 인기예요~"</span>
            </button>
            <button onclick="selectStyle('C')" id="style-C" class="style-btn w-full p-3 text-left rounded-lg border border-gray-200 text-xs transition-all hover:border-gray-400">
              <span class="font-bold">C형: 솔직 후기 스타일</span>
              <span class="block text-gray-500 mt-1">"솔직히 처음엔 기대 안했는데요~"</span>
            </button>
          </div>
          
          <button 
            onclick="generateContent()"
            id="generate-btn"
            class="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transform active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <i class="fas fa-spinner fa-spin loading" id="generate-loading"></i>
            <span id="generate-text">블로그 글 생성</span>
          </button>
          
          <div class="mt-5 p-3 bg-gray-100 rounded-lg">
            <div class="flex items-center gap-2 text-xs">
              <i class="fas fa-info-circle text-gray-400"></i>
              <span id="status-text" class="text-gray-600">대기 중</span>
            </div>
          </div>
        </div>
        
        <!-- Right Panel -->
        <div class="lg:col-span-8 p-6 md:p-8">
          
          <!-- Title Section -->
          <div class="mb-4">
            <label class="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">생성된 제목 (SEO 최적화)</label>
            <div id="title-box" class="p-4 bg-blue-50 rounded-xl border border-blue-200 text-lg font-bold text-gray-800 min-h-[56px] flex items-center">
              제목이 여기에 표시됩니다
            </div>
          </div>
          
          <!-- Content Section -->
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-2">
            <h3 class="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">본문 내용</h3>
            <span id="char-count" class="text-[10px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">0자</span>
          </div>
          
          <div
            id="preview"
            class="w-full h-[450px] md:h-[500px] p-6 bg-white border border-gray-100 rounded-2xl overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap shadow-inner"
          >결과가 여기에 표시됩니다.


[XIVIX SEO MASTER V5 특징]

1. 매장 직원이 직접 쓴 듯한 자연스러운 톤
2. 체험단/광고 느낌 완전 제거
3. SEO 최적화 제목 자동 생성
4. 이모지 없이 깔끔하게
5. 바로 복사해서 네이버 블로그에 사용 가능


[사용 방법]
1. 주제 입력
2. 스타일 선택 (A/B/C형)
3. 블로그 글 생성 클릭
4. 전체 복사 후 네이버 에디터에 붙여넣기</div>
        </div>
      </div>
    </div>

    <!-- Guide Cards -->
    <div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
        <h4 class="font-bold text-gray-800 text-xs mb-1">자연스러운 톤</h4>
        <p class="text-[10px] text-gray-600">매장 직원이 직접 쓴 느낌</p>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
        <h4 class="font-bold text-gray-800 text-xs mb-1">제목 자동 생성</h4>
        <p class="text-[10px] text-gray-600">SEO 최적화 제목 포함</p>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
        <h4 class="font-bold text-gray-800 text-xs mb-1">바로 복사</h4>
        <p class="text-[10px] text-gray-600">수정 없이 바로 사용</p>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-gray-500">
        <h4 class="font-bold text-gray-800 text-xs mb-1">이모지 0%</h4>
        <p class="text-[10px] text-gray-600">저품질 방지 완벽 대응</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-6 text-center text-gray-400 text-[10px] pb-4">
      <p>XIVIX SEO MASTER V5 | Natural Tone | Auto Title | Copy Ready</p>
    </div>
  </div>

  <!-- Toast -->
  <div id="toast" class="fixed top-4 right-4 px-5 py-3 rounded-lg shadow-lg hidden toast z-50"></div>

  <script>
    let currentStyle = 'A';
    let currentTitle = '';
    
    function selectStyle(style) {
      currentStyle = style;
      document.querySelectorAll('.style-btn').forEach(btn => btn.classList.remove('active'));
      document.getElementById('style-' + style).classList.add('active');
    }
    
    async function generateContent() {
      const topic = document.getElementById('topic').value.trim();
      
      if (!topic) {
        showToast('주제를 입력해주세요!', 'warning');
        return;
      }
      
      setLoading(true);
      document.getElementById('status-text').textContent = '글 생성 중... (약 10-15초)';
      
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, style: currentStyle, enableReadability: true })
        });
        
        const data = await response.json();
        
        if (data.error) {
          showToast(data.error, 'error');
          document.getElementById('status-text').textContent = '오류 발생';
          return;
        }
        
        // 제목 표시
        currentTitle = data.title || topic;
        document.getElementById('title-box').textContent = currentTitle;
        
        // 본문 표시
        document.getElementById('preview').textContent = data.result;
        document.getElementById('char-count').textContent = data.result.length + '자';
        document.getElementById('status-text').textContent = 
          '생성 완료 (' + data.style + ', ' + data.rawLength + '자)';
        
        showToast('블로그 글이 생성되었습니다!', 'success');
      } catch (error) {
        showToast('생성 중 오류가 발생했습니다.', 'error');
        document.getElementById('status-text').textContent = '오류 발생';
      } finally {
        setLoading(false);
      }
    }
    
    function setLoading(isLoading) {
      const loading = document.getElementById('generate-loading');
      const btn = document.getElementById('generate-btn');
      
      loading.classList.toggle('show', isLoading);
      btn.disabled = isLoading;
      btn.classList.toggle('opacity-75', isLoading);
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
    
    async function copyToClipboard() {
      const preview = document.getElementById('preview').textContent;
      if (!preview || preview.includes('결과가 여기에')) {
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
      
      if (!preview || preview.includes('결과가 여기에')) {
        showToast('먼저 글을 생성해주세요!', 'warning');
        return;
      }
      
      const fullText = title + '\\n\\n' + preview;
      
      try {
        await navigator.clipboard.writeText(fullText);
        showToast('제목 + 본문이 복사되었습니다!', 'success');
      } catch (error) {
        fallbackCopy(fullText);
      }
    }
    
    function downloadTxt() {
      const title = document.getElementById('title-box').textContent;
      const preview = document.getElementById('preview').textContent;
      
      if (!preview || preview.includes('결과가 여기에')) {
        showToast('먼저 글을 생성해주세요!', 'warning');
        return;
      }
      
      const fullText = title + '\\n\\n' + preview;
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
