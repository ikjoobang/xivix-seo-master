# XIVIX HYBRID AGENT

## 프로젝트 개요
- **이름**: XIVIX HYBRID AGENT
- **버전**: V4
- **목표**: Gemini AI를 통한 1,700자+ SEO 원고 자동 생성 및 네이버 블로그 최적화
- **기술 스택**: Hono + TypeScript + TailwindCSS + Gemini API + Cloudflare Pages

## URL
- **미리보기**: https://3000-i0w1zx7q2xd8pqxy7ilgn-de59bda9.sandbox.novita.ai
- **Production**: (Cloudflare Pages 배포 후 업데이트)

## 주요 기능

### 1. AI 생성 모드 (Gemini API)
- **1,700자 이상** SEO 최적화 원고 자동 생성
- **C-Rank/AEO/GEO** 최적화 구조 적용
- **이모지 0%** 완전 제거

### 2. 스타일 선택 (A/B/C형)
| 스타일 | 설명 | 문체 |
|--------|------|------|
| A형 | 전문가형 (C-Rank) | ~습니다 |
| B형 | 친근형 (AEO) | ~해요 |
| C형 | 실용 정보 (GEO) | 요약체 |

### 3. 변환 모드
- 기존 AI 원문을 네이버 최적화 형식으로 변환
- Q&A 구조 자동 감지
- 네이버 가이드 자동 삽입

### 4. 미디어 연동
- studiojuai-mp4 URL 입력 가능
- 동영상/이미지 위치 자동 배치

## API 엔드포인트

### POST /api/generate
Gemini API를 통해 SEO 원고 생성

**Request:**
```json
{
  "topic": "포스팅 주제",
  "style": "A",
  "apiKey": "Gemini API Key",
  "mediaUrl": "미디어 URL (선택)"
}
```

**Response:**
```json
{
  "result": "변환된 텍스트",
  "rawLength": 2500,
  "style": "전문가형 (C-Rank)"
}
```

### POST /api/transform
기존 원문을 네이버 최적화 형식으로 변환

**Request:**
```json
{
  "text": "변환할 원문",
  "mediaUrl": "미디어 URL (선택)"
}
```

## 사용 가이드

1. **API 설정**: 우측 상단 "API 설정" 버튼 클릭 → Gemini API 키 입력
2. **주제 입력**: 포스팅 주제 입력
3. **스타일 선택**: A/B/C형 중 선택
4. **미디어 URL**: studiojuai-mp4에서 생성한 URL 입력 (선택)
5. **원고 생성**: "1,700자 SEO 원고 생성" 버튼 클릭
6. **복사**: 결과 복사 후 네이버 에디터에 붙여넣기
7. **맞춤법 검사**: 네이버 에디터에서 [맞춤법] 버튼 클릭

## Gemini API 키 발급
1. [Google AI Studio](https://aistudio.google.com/apikey) 접속
2. "Create API Key" 클릭
3. 발급된 키를 앱 설정에 입력

## SEO 최적화 전략

| 최적화 | 설명 |
|--------|------|
| **C-Rank** | 1,700자+ 장문, 구조화된 정보 |
| **AEO** | Q&A 형식, 답변 엔진 최적화 |
| **GEO** | AI 모델이 인용하기 좋은 구조 |
| **NO EMOJI** | 이모지 완전 제거로 저품질 방지 |

## 배포

### Cloudflare Pages 배포
```bash
# 빌드
npm run build

# 배포
npx wrangler pages deploy dist --project-name xivix-hybrid-agent

# 환경 변수 설정 (선택)
npx wrangler pages secret put GEMINI_API_KEY --project-name xivix-hybrid-agent
```

## 프로젝트 구조
```
webapp/
├── src/
│   └── index.tsx      # Hono 서버 + Hybrid Agent UI
├── dist/              # 빌드 결과물
├── ecosystem.config.cjs # PM2 설정
├── wrangler.jsonc     # Cloudflare 설정
├── package.json       # 의존성
└── README.md          # 문서
```

## 다음 개발 단계
- [ ] Cloudflare Pages 정식 배포
- [ ] 환경 변수로 GEMINI_API_KEY 관리
- [ ] studiojuai-mp4 API 직접 연동
- [ ] 생성 히스토리 저장 (KV Storage)

---

**XIVIX HYBRID AGENT V4** | SEO / AEO / C-RANK / GEO | NO EMOJI
