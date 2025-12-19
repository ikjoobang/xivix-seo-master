import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// Enable CORS
app.use('/api/*', cors())

// V3: 이모지 완전 제거 함수
function removeAllEmojis(text: string): string {
  // 모든 유니코드 이모지 제거 (확장된 정규식)
  return text
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Symbols & Pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport & Map
    .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Alchemical Symbols
    .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Geometric Shapes Extended
    .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Supplemental Arrows-C
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
}

// V3: 텍스트 변환 API (SEO 보존 모드 지원)
app.post('/api/transform', async (c) => {
  const { text, useSuffixChange = false } = await c.req.json()
  
  if (!text) {
    return c.json({ error: 'text is required' }, 400)
  }
  
  // 1. 이모지 완전 제거 (100% 박멸)
  let processed = removeAllEmojis(text)
  
  // 2. 선택적 어미 변환 (SEO 보존을 위해 기본값 false)
  if (useSuffixChange) {
    processed = processed
      .replace(/합니다\./g, '해요.')
      .replace(/입니다\./g, '예요.')
  }
  
  // 3. 띄어쓰기/맞춤법 최적화: trim 및 문단 간격 보존
  let lines = processed.split('\n').map(line => line.trim())
  let finalLines: string[] = []
  
  // [상단] 핵심 요약 (인용구 가이드) - 이모지 없음
  finalLines.push('[네이버 인용구: 요약형]')
  finalLines.push('제목: 이 포스팅의 핵심 3줄 요약')
  finalLines.push('1. (여기에 첫 번째 핵심 내용을 입력하세요)')
  finalLines.push('2. (여기에 두 번째 핵심 내용을 입력하세요)')
  finalLines.push('3. (여기에 세 번째 핵심 내용을 입력하세요)')
  finalLines.push('---')
  finalLines.push('')
  
  lines.forEach((line, index) => {
    if (line === '') {
      finalLines.push('') // 빈 줄 보존 (문단 간격 유지)
      return
    }
    
    // Q&A 구조 감지 (AEO/C-Rank 최적화)
    if (line.startsWith('Q.') || line.startsWith('질문:') || line.match(/^Q\d/)) {
      finalLines.push('')
      finalLines.push('[인용구: 말풍선형]')
      finalLines.push(line)
    } else if (line.startsWith('A.') || line.startsWith('Answer:') || line.startsWith('답변:') || line.match(/^A\d/)) {
      finalLines.push('')
      finalLines.push('[강조 텍스트: 볼드]')
      finalLines.push(line)
    }
    // 소제목 감지 (번호 또는 # 시작)
    else if (line.match(/^\d\./) || line.startsWith('#')) {
      finalLines.push('')
      finalLines.push('[스티커 삽입 위치]')
      finalLines.push(line)
    }
    // 일반 텍스트
    else {
      finalLines.push(line)
    }
    
    // [중간] 동영상/이미지 슬롯 가이드 (글 중간 지점)
    if (index === Math.floor(lines.length / 2) && lines.length > 5) {
      finalLines.push('')
      finalLines.push('')
      finalLines.push('[네이버 동영상/Shorts 삽입 영역]')
      finalLines.push('')
    }
  })
  
  // [하단] CTA 가이드 - 이모지 없음
  finalLines.push('')
  finalLines.push('')
  finalLines.push('[이미지 클릭 링크 가이드]')
  finalLines.push('(배너 이미지를 넣고 링크를 연결하세요: "상담은 위 이미지를 클릭하세요")')
  finalLines.push('')
  finalLines.push('[공감과 댓글 유도 문구]')
  finalLines.push('궁금하신 점은 언제든 댓글로 남겨주세요.')
  
  return c.json({ 
    result: finalLines.join('\n'),
    emojiRemoved: true,
    suffixChanged: useSuffixChange
  })
})

// Main page - V3 UI
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XIVIX SEO MASTER V3</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
    body { font-family: 'Noto Sans KR', sans-serif; }
    .loading { display: none; }
    .loading.show { display: inline-block; }
    textarea:focus { outline: none; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3); }
    .toast { animation: slideIn 0.3s ease-out; }
    @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .toggle-checkbox:checked { right: 0; border-color: #2563eb; }
    .toggle-checkbox:checked + .toggle-label { background-color: #2563eb; }
  </style>
</head>
<body class="min-h-screen bg-gray-100">
  <div class="max-w-7xl mx-auto px-4 py-6">
    
    <!-- Header - Dark Theme -->
    <div class="bg-gray-900 rounded-xl shadow-2xl overflow-hidden mb-6">
      <div class="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <i class="fas fa-shield-alt text-blue-400"></i>
            XIVIX SEO MASTER V3
          </h1>
          <p class="text-gray-400 mt-1 text-sm">NO EMOJI | SEO SAFE | C-Rank/AEO 최적화</p>
        </div>
        <div class="flex items-center gap-4">
          <!-- SEO 보존 모드 토글 -->
          <div class="flex items-center gap-2">
            <label class="flex items-center cursor-pointer">
              <div class="relative">
                <input type="checkbox" id="suffixToggle" class="sr-only peer">
                <div class="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-blue-600 transition-all"></div>
                <div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5"></div>
              </div>
              <span class="ml-2 text-sm text-gray-300">어미 자동 변환</span>
            </label>
          </div>
          <span class="text-xs bg-gray-700 text-gray-300 px-4 py-2 rounded-full">
            <i class="fas fa-user-shield mr-1"></i>
            방대표님 전용
          </span>
        </div>
      </div>
    </div>

    <!-- Info Banner -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div class="flex items-start gap-3">
        <i class="fas fa-info-circle text-blue-500 mt-1"></i>
        <div class="text-sm text-blue-700">
          <strong>V3 업데이트:</strong> 
          이모지 100% 제거 | SEO 키워드 보존 | Q&A 구조 자동 감지 | 
          <span class="text-blue-900 font-medium">복사 후 네이버 에디터에서 [맞춤법] 버튼을 클릭하여 최종 교정하세요.</span>
        </div>
      </div>
    </div>

    <!-- Main Editor -->
    <div class="bg-white rounded-xl shadow-xl overflow-hidden">
      <div class="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
        
        <!-- Input Section -->
        <div class="p-6">
          <h3 class="text-xs font-black text-gray-400 mb-3 uppercase tracking-widest flex items-center gap-2">
            <span class="w-6 h-6 bg-gray-900 text-white rounded flex items-center justify-center text-xs">1</span>
            INPUT (AI RAW TEXT)
          </h3>
          <textarea
            id="rawText"
            class="w-full h-[550px] p-4 text-sm leading-relaxed bg-gray-50 border border-gray-200 rounded-lg resize-none"
            placeholder="AI가 생성한 원문을 붙여넣으세요...

[지원하는 구조]
Q. 질문 형식
A. 답변 형식
1. 번호 리스트
# 소제목

[자동 처리]
- 모든 이모지 자동 제거
- Q&A 구조 자동 감지
- 네이버 가이드 자동 삽입"
          ></textarea>
        </div>
        
        <!-- Output Section -->
        <div class="p-6 bg-gray-50">
          <h3 class="text-xs font-black text-gray-400 mb-3 uppercase tracking-widest flex items-center gap-2">
            <span class="w-6 h-6 bg-blue-600 text-white rounded flex items-center justify-center text-xs">2</span>
            OUTPUT (NAVER GUIDE)
          </h3>
          <div
            id="preview"
            class="w-full h-[550px] p-4 text-sm leading-relaxed overflow-y-auto whitespace-pre-wrap text-gray-800 bg-white border border-gray-200 rounded-lg"
          >변환 버튼을 누르면 이모지가 제거된 깨끗한 가이드가 나옵니다.

[V3 주요 기능]
- 이모지 완전 제거 (저품질 방지)
- SEO 키워드/문장 구조 보존
- Q&A 구조 자동 감지 (AEO 최적화)
- 네이버 인용구/스티커 가이드 자동 삽입

[사용 방법]
1. 왼쪽에 AI 원문 붙여넣기
2. "SEO 최적화 변환" 버튼 클릭
3. 결과 복사 후 네이버 에디터에 붙여넣기
4. [맞춤법] 버튼으로 최종 교정</div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="p-6 bg-gray-100 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-2 text-sm text-gray-500">
          <i class="fas fa-check-circle text-green-500"></i>
          <span id="status-text">대기 중</span>
        </div>
        <div class="flex gap-3">
          <button
            onclick="clearAll()"
            class="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
          >
            <i class="fas fa-redo"></i>
            초기화
          </button>
          <button
            onclick="transformText()"
            class="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <i class="fas fa-sync-alt loading" id="loading-icon"></i>
            <i class="fas fa-magic" id="transform-icon"></i>
            SEO 최적화 변환
          </button>
          <button
            onclick="copyToClipboard()"
            class="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <i class="fas fa-copy"></i>
            전체 복사하기
          </button>
        </div>
      </div>
    </div>

    <!-- Guide Section -->
    <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white p-5 rounded-lg shadow border-l-4 border-red-500">
        <h4 class="font-bold text-gray-800 mb-2 flex items-center gap-2">
          <i class="fas fa-ban text-red-500"></i>
          이모지 0%
        </h4>
        <p class="text-sm text-gray-600">모든 이모지 완전 제거. AI가 넣은 이모지도 자동 삭제됩니다.</p>
      </div>
      <div class="bg-white p-5 rounded-lg shadow border-l-4 border-blue-500">
        <h4 class="font-bold text-gray-800 mb-2 flex items-center gap-2">
          <i class="fas fa-search text-blue-500"></i>
          SEO 보존
        </h4>
        <p class="text-sm text-gray-600">어미 변환은 선택 옵션. 키워드 밀도와 문장 구조가 유지됩니다.</p>
      </div>
      <div class="bg-white p-5 rounded-lg shadow border-l-4 border-green-500">
        <h4 class="font-bold text-gray-800 mb-2 flex items-center gap-2">
          <i class="fas fa-comments text-green-500"></i>
          AEO 최적화
        </h4>
        <p class="text-sm text-gray-600">Q&A 구조 자동 감지. 답변 엔진이 좋아하는 형식으로 변환됩니다.</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-6 text-center text-gray-400 text-sm">
      <p>XIVIX SEO MASTER V3 | NO EMOJI | SEO SAFE | C-Rank/AEO 최적화</p>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toast" class="fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg hidden toast">
    <span id="toast-message">복사되었습니다!</span>
  </div>

  <script>
    async function transformText() {
      const rawText = document.getElementById('rawText').value.trim();
      if (!rawText) {
        showToast('먼저 원문을 입력해주세요!', 'warning');
        return;
      }
      
      const useSuffixChange = document.getElementById('suffixToggle').checked;
      
      // Show loading
      document.getElementById('loading-icon').classList.add('show');
      document.getElementById('transform-icon').style.display = 'none';
      document.getElementById('status-text').textContent = '변환 중...';
      
      try {
        const response = await fetch('/api/transform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: rawText, useSuffixChange })
        });
        
        const data = await response.json();
        
        if (data.error) {
          showToast(data.error, 'error');
          document.getElementById('status-text').textContent = '오류 발생';
          return;
        }
        
        document.getElementById('preview').textContent = data.result;
        
        const statusMsg = data.suffixChanged 
          ? '변환 완료 (어미 변환 적용됨)' 
          : '변환 완료 (SEO 원문 보존)';
        document.getElementById('status-text').textContent = statusMsg;
        
        showToast('SEO 최적화 변환이 완료되었습니다!', 'success');
      } catch (error) {
        showToast('변환 중 오류가 발생했습니다.', 'error');
        document.getElementById('status-text').textContent = '오류 발생';
      } finally {
        document.getElementById('loading-icon').classList.remove('show');
        document.getElementById('transform-icon').style.display = 'inline';
      }
    }
    
    async function copyToClipboard() {
      const preview = document.getElementById('preview').textContent;
      if (!preview || preview.includes('변환 버튼을 누르면')) {
        showToast('먼저 변환을 실행해주세요!', 'warning');
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
    
    function clearAll() {
      document.getElementById('rawText').value = '';
      document.getElementById('preview').textContent = \`변환 버튼을 누르면 이모지가 제거된 깨끗한 가이드가 나옵니다.

[V3 주요 기능]
- 이모지 완전 제거 (저품질 방지)
- SEO 키워드/문장 구조 보존
- Q&A 구조 자동 감지 (AEO 최적화)
- 네이버 인용구/스티커 가이드 자동 삽입

[사용 방법]
1. 왼쪽에 AI 원문 붙여넣기
2. "SEO 최적화 변환" 버튼 클릭
3. 결과 복사 후 네이버 에디터에 붙여넣기
4. [맞춤법] 버튼으로 최종 교정\`;
      document.getElementById('status-text').textContent = '대기 중';
      showToast('초기화되었습니다.', 'info');
    }
    
    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      const toastMessage = document.getElementById('toast-message');
      
      toast.className = 'fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg toast flex items-center gap-2';
      
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
        case 'info':
          toast.classList.add('bg-blue-600', 'text-white');
          icon = '<i class="fas fa-info-circle"></i>';
          break;
      }
      
      toast.innerHTML = icon + '<span>' + message + '</span>';
      toast.classList.remove('hidden');
      
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 4000);
    }
  </script>
</body>
</html>`)
})

export default app
