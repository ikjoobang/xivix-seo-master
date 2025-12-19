import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// Enable CORS
app.use('/api/*', cors())

// Style configurations for text transformation
const styleConfigs = {
  A: { name: '비즈니스형', suffix: '습니다', quote: '버티컬형' },
  B: { name: '친근한 소통형', suffix: '해요', quote: '박스형' },
  C: { name: '실용 정보형', suffix: '요약체', quote: '구분선형' },
  D: { name: '스토리텔링형', suffix: '혼합체', quote: '따옴표형' }
}

// Text transformation API
app.post('/api/transform', async (c) => {
  const { text, style } = await c.req.json()
  
  if (!text || !style) {
    return c.json({ error: 'text and style are required' }, 400)
  }
  
  const config = styleConfigs[style as keyof typeof styleConfigs]
  if (!config) {
    return c.json({ error: 'Invalid style. Use A, B, C, or D' }, 400)
  }
  
  let processed = text
  
  // 어미 가변화 (봇 인식 회피)
  if (config.suffix === '해요') {
    processed = processed.replace(/합니다\./g, '해요.').replace(/입니다\./g, '예요.')
  } else if (config.suffix === '습니다') {
    processed = processed.replace(/해요\./g, '합니다.').replace(/예요\./g, '입니다.')
  } else if (config.suffix === '요약체') {
    processed = processed.replace(/합니다\./g, '함.').replace(/입니다\./g, '임.')
  }
  
  // 네이티브 요소 자동 배치
  const lines = processed.split('\n')
  const finalLines: string[] = []
  
  // 상단 인용구 요약 배치
  finalLines.push('---')
  finalLines.push(`[네이버 인용구: ${config.quote}]`)
  finalLines.push('🎯 오늘 포스팅의 핵심 3줄 요약')
  finalLines.push('1. 내용을 입력하세요 (네이버 에디터에서 인용구 처리)')
  finalLines.push('2. 내용을 입력하세요')
  finalLines.push('3. 내용을 입력하세요')
  finalLines.push('--- \n')
  
  lines.forEach((line, index) => {
    // 소제목 처리 (이모지 대신 네이버 스티커 가이드)
    if (line.startsWith('#') || line.match(/^\d\./)) {
      finalLines.push('\n[네이버 스티커 삽입 권장]')
      finalLines.push(`**${line.replace(/[#\d\.]/g, '').trim()}**\n`)
    } else {
      finalLines.push(line)
    }
    
    // 중간 - 네이버 동영상 유도 (체류시간 증대)
    if (index === Math.floor(lines.length / 3)) {
      finalLines.push('\n🎬 [네이버 동영상 업로드 위치]')
      finalLines.push('(관련 영상이나 AutoClipAi로 만든 짧은 영상을 넣어주세요)\n')
    }
    
    // 하단부 - 이미지 클릭 및 상담 링크 유도
    if (index === Math.floor(lines.length * 0.7)) {
      finalLines.push('\n🖼️ [이미지 클릭 유도 배너 삽입]')
      finalLines.push('(문구: "자세한 상담은 위 이미지를 클릭해 주세요")\n')
    }
  })
  
  // 마무리 - 질문 및 공유 유도
  finalLines.push('\n\n-------------------')
  finalLines.push('궁금하신 점은 언제든 댓글 남겨주세요!')
  finalLines.push('[공감과 댓글은 XIVIX에 큰 힘이 됩니다]')
  
  return c.json({ 
    result: finalLines.join('\n'),
    style: config.name
  })
})

// Get style configurations
app.get('/api/styles', (c) => {
  return c.json(styleConfigs)
})

// Main page
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX Naver Post Master</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
    body { font-family: 'Noto Sans KR', sans-serif; }
    .style-btn.active { background-color: #16a34a; color: white; border-color: #16a34a; }
    .loading { display: none; }
    .loading.show { display: inline-block; }
    textarea:focus, .output-area:focus { outline: none; box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.3); }
    .toast { animation: slideIn 0.3s ease-out; }
    @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  </style>
</head>
<body class="min-h-screen bg-gray-50">
  <div class="max-w-7xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl shadow-xl p-6 mb-6 text-white">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <i class="fas fa-magic"></i>
            XIVIX NAVER MASTER
          </h1>
          <p class="text-green-100 mt-1 text-sm md:text-base">네이티브 최적화 & 저품질 방지 에디터</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs bg-green-800 px-4 py-2 rounded-full">
            <i class="fas fa-user-shield mr-1"></i>
            방대표님 전용 에이전트
          </span>
        </div>
      </div>
    </div>

    <!-- Style Controller -->
    <div class="bg-white rounded-xl shadow-lg p-4 mb-6">
      <h3 class="text-sm font-bold text-gray-500 mb-3">
        <i class="fas fa-palette mr-2"></i>스타일 선택 (클릭하면 변환됩니다)
      </h3>
      <div class="flex flex-wrap gap-2">
        <button onclick="selectStyle('A')" id="btn-A" class="style-btn px-4 py-2 rounded-full border-2 border-gray-300 font-medium transition-all hover:border-green-500 text-sm md:text-base">
          A형 (비즈니스형)
        </button>
        <button onclick="selectStyle('B')" id="btn-B" class="style-btn px-4 py-2 rounded-full border-2 border-gray-300 font-medium transition-all hover:border-green-500 text-sm md:text-base">
          B형 (친근한 소통형)
        </button>
        <button onclick="selectStyle('C')" id="btn-C" class="style-btn px-4 py-2 rounded-full border-2 border-gray-300 font-medium transition-all hover:border-green-500 text-sm md:text-base">
          C형 (실용 정보형)
        </button>
        <button onclick="selectStyle('D')" id="btn-D" class="style-btn px-4 py-2 rounded-full border-2 border-gray-300 font-medium transition-all hover:border-green-500 text-sm md:text-base">
          D형 (스토리텔링형)
        </button>
      </div>
    </div>

    <!-- Main Editor -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Input Section -->
      <div class="bg-white rounded-xl shadow-lg overflow-hidden">
        <div class="bg-gray-100 px-6 py-3 border-b">
          <h3 class="text-sm font-bold text-gray-600 flex items-center gap-2">
            <i class="fas fa-robot text-blue-500"></i>
            1. AI 초안 붙여넣기
          </h3>
        </div>
        <div class="p-4">
          <textarea
            id="rawText"
            class="w-full h-[500px] p-4 bg-gray-50 rounded-lg border border-gray-200 resize-none text-sm leading-relaxed"
            placeholder="여기에 AI가 작성한 내용을 넣으세요...

예시:
1. 오늘의 주제를 소개합니다.
2. 핵심 내용을 설명합니다.
3. 결론을 정리합니다.

# 소제목 예시
본문 내용이 여기에 들어갑니다."
          ></textarea>
        </div>
        <div class="px-4 pb-4">
          <button 
            onclick="transformText()"
            class="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
          >
            <i class="fas fa-sync-alt loading" id="loading-icon"></i>
            <i class="fas fa-wand-magic-sparkles" id="transform-icon"></i>
            <span>변환하기</span>
          </button>
        </div>
      </div>

      <!-- Output Section -->
      <div class="bg-white rounded-xl shadow-lg overflow-hidden">
        <div class="bg-gray-100 px-6 py-3 border-b flex justify-between items-center">
          <h3 class="text-sm font-bold text-gray-600 flex items-center gap-2">
            <i class="fas fa-file-alt text-green-500"></i>
            2. 네이버 최적화 결과 (복사용)
          </h3>
          <span id="style-badge" class="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hidden">
            A형 적용됨
          </span>
        </div>
        <div class="p-4">
          <div
            id="preview"
            class="output-area w-full h-[500px] p-4 border border-gray-200 rounded-lg overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-gray-700 bg-gray-50"
          >원문을 입력하고 스타일 버튼을 누르면
저품질 방지 가이드가 포함된 글이 생성됩니다.

💡 <strong>방대표님 TIP:</strong>
■ 매일 다른 스타일(A~D)을 사용하세요
■ 복사 후 [스티커/동영상] 자리에 실제 기능 삽입
■ 이미지에 링크를 걸어 전환율을 높이세요</div>
        </div>
        <div class="px-4 pb-4 flex gap-2">
          <button
            onclick="copyToClipboard()"
            class="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <i class="fas fa-copy"></i>
            <span>전체 복사하기</span>
          </button>
          <button
            onclick="clearAll()"
            class="px-4 bg-gray-200 text-gray-600 py-3 rounded-lg font-bold hover:bg-gray-300 transition-all"
          >
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Tips Section -->
    <div class="mt-6 bg-blue-50 rounded-xl p-6 border border-blue-200">
      <h3 class="font-bold text-blue-800 mb-4 flex items-center gap-2">
        <i class="fas fa-lightbulb text-yellow-500"></i>
        저품질 방지 전략 가이드
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-blue-700">
        <div class="bg-white p-4 rounded-lg">
          <strong class="block mb-2">❶ 봇 인식 회피</strong>
          <p>매일 다른 스타일(A~D)을 사용하여 어미 패턴을 변화시키세요.</p>
        </div>
        <div class="bg-white p-4 rounded-lg">
          <strong class="block mb-2">❷ 네이버 스티커</strong>
          <p>외부 이모지 대신 네이버 OGQ 스티커를 [스티커 삽입] 위치에 넣으세요.</p>
        </div>
        <div class="bg-white p-4 rounded-lg">
          <strong class="block mb-2">❸ 동영상 필수</strong>
          <p>체류시간 증대를 위해 15초 내외 영상을 꼭 삽입하세요.</p>
        </div>
        <div class="bg-white p-4 rounded-lg">
          <strong class="block mb-2">❹ 이미지 링크</strong>
          <p>텍스트 링크보다 이미지에 링크를 걸면 클릭률이 3배 높습니다.</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-6 text-center text-gray-400 text-sm">
      <p>XIVIX Naver Post Master v1.0 | 네이티브 최적화 에디터</p>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toast" class="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg hidden toast">
    <i class="fas fa-check-circle mr-2"></i>
    <span id="toast-message">복사되었습니다!</span>
  </div>

  <script>
    let currentStyle = 'A';
    
    function selectStyle(style) {
      currentStyle = style;
      // Update button states
      document.querySelectorAll('.style-btn').forEach(btn => btn.classList.remove('active'));
      document.getElementById('btn-' + style).classList.add('active');
      
      // Auto transform if there's text
      const rawText = document.getElementById('rawText').value.trim();
      if (rawText) {
        transformText();
      }
    }
    
    async function transformText() {
      const rawText = document.getElementById('rawText').value.trim();
      if (!rawText) {
        showToast('먼저 원문을 입력해주세요!', 'warning');
        return;
      }
      
      // Show loading
      document.getElementById('loading-icon').classList.add('show');
      document.getElementById('transform-icon').style.display = 'none';
      
      try {
        const response = await fetch('/api/transform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: rawText, style: currentStyle })
        });
        
        const data = await response.json();
        
        if (data.error) {
          showToast(data.error, 'error');
          return;
        }
        
        document.getElementById('preview').textContent = data.result;
        document.getElementById('style-badge').textContent = currentStyle + '형 적용됨';
        document.getElementById('style-badge').classList.remove('hidden');
        
        showToast(data.style + ' 스타일로 변환 완료!', 'success');
      } catch (error) {
        showToast('변환 중 오류가 발생했습니다.', 'error');
      } finally {
        document.getElementById('loading-icon').classList.remove('show');
        document.getElementById('transform-icon').style.display = 'inline';
      }
    }
    
    async function copyToClipboard() {
      const preview = document.getElementById('preview').textContent;
      if (!preview || preview.includes('원문을 입력하고')) {
        showToast('먼저 변환을 실행해주세요!', 'warning');
        return;
      }
      
      try {
        await navigator.clipboard.writeText(preview);
        showToast('클립보드에 복사되었습니다! 네이버 에디터에 붙여넣으세요.', 'success');
      } catch (error) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = preview;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('클립보드에 복사되었습니다!', 'success');
      }
    }
    
    function clearAll() {
      document.getElementById('rawText').value = '';
      document.getElementById('preview').innerHTML = \`원문을 입력하고 스타일 버튼을 누르면
저품질 방지 가이드가 포함된 글이 생성됩니다.

💡 <strong>방대표님 TIP:</strong>
■ 매일 다른 스타일(A~D)을 사용하세요
■ 복사 후 [스티커/동영상] 자리에 실제 기능 삽입
■ 이미지에 링크를 걸어 전환율을 높이세요\`;
      document.getElementById('style-badge').classList.add('hidden');
      showToast('초기화되었습니다.', 'info');
    }
    
    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      const toastMessage = document.getElementById('toast-message');
      
      // Set color based on type
      toast.className = 'fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg toast';
      switch(type) {
        case 'success':
          toast.classList.add('bg-green-600', 'text-white');
          break;
        case 'warning':
          toast.classList.add('bg-yellow-500', 'text-white');
          break;
        case 'error':
          toast.classList.add('bg-red-600', 'text-white');
          break;
        case 'info':
          toast.classList.add('bg-blue-600', 'text-white');
          break;
      }
      
      toastMessage.textContent = message;
      toast.classList.remove('hidden');
      
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 3000);
    }
    
    // Initialize with style A selected
    document.addEventListener('DOMContentLoaded', () => {
      selectStyle('A');
    });
  </script>
</body>
</html>`)
})

export default app
