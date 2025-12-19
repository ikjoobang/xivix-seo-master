# XIVIX SEO MASTER V4.1

## 프로젝트 개요
- **이름**: XIVIX SEO MASTER V4.1
- **버전**: V4.1 (Pure Text | Native Guide | No Emoji)
- **목표**: Gemini AI를 통한 1,800자+ SEO 원고 자동 생성 및 네이버 블로그 최적화
- **기술 스택**: Hono + TypeScript + TailwindCSS + Gemini API + Cloudflare Pages

## URL
- **Production**: https://xivix-seo-master.pages.dev
- **상태**: ✅ 배포 완료

## 주요 기능

### 1. 이모지 0% (100% 텍스트 기반)
- 모든 이모지/아이콘 완전 제거
- `[네이버 인용구]`, `[스티커 삽입]` 등 텍스트 가이드로 대체
- 저품질 리스크 원천 차단

### 2. AI 생성 모드 (Gemini API)
- **1,800자 이상** SEO 최적화 원고 자동 생성
- **C-Rank/AEO/GEO** 최적화 구조 적용
- 5개 이상 소제목 + 3개 이상 Q&A 구조

### 3. 스타일 선택 (A/B/C형)
| 스타일 | 설명 | 문체 |
|--------|------|------|
| A형 | 전문가형 (C-Rank) | ~습니다 |
| B형 | 친근형 (AEO) | ~해요 |
| C형 | 실용 정보 (GEO) | 요약체 |

### 4. 뭉침 방지 (가독성 최적화)
- 문장마다 자동 줄바꿈 (`\n\n`)
- 모바일 2-3줄 단위 가독성 극대화
- 강제 여백 재정렬 버튼

### 5. 변환 모드
- 기존 AI 원문을 네이버 최적화 형식으로 변환
- Q&A 구조 자동 감지 (말풍선형 인용구 적용)
- 네이버 가이드 자동 삽입

### 6. 편의 기능
- **전체 복사**: 원클릭 클립보드 복사
- **TXT 저장**: 파일 다운로드 (날짜 포함 파일명)
- **여백 재정렬**: 뭉침 방지 재적용

## API 엔드포인트

### POST /api/generate
Gemini API를 통해 SEO 원고 생성

**Request:**
```json
{
  "topic": "포스팅 주제",
  "style": "A",
  "apiKey": "Gemini API Key",
  "enableReadability": true
}
```

**Response:**
```json
{
  "result": "변환된 텍스트",
  "rawLength": 2500,
  "style": "전문가형 (C-Rank)",
  "readabilityApplied": true
}
```

### POST /api/transform
기존 원문을 네이버 최적화 형식으로 변환

**Request:**
```json
{
  "text": "변환할 원문",
  "enableReadability": true
}
```

### POST /api/reformat
여백 재정렬 (뭉침 방지)

**Request:**
```json
{
  "text": "재정렬할 텍스트"
}
```

## 사용 가이드

1. **API 설정**: 우측 상단 "API 설정" 버튼 클릭 → Gemini API 키 입력
2. **주제 입력**: 포스팅 주제 입력
3. **스타일 선택**: A/B/C형 중 선택
4. **뭉침 방지**: 체크박스 ON 권장 (모바일 가독성)
5. **원고 생성**: "SEO 원고 생성" 버튼 클릭
6. **복사/저장**: "전체 복사" 또는 "TXT 저장"
7. **네이버 에디터**: 붙여넣기 후 맞춤법 검사

## Gemini API 키 발급
1. [Google AI Studio](https://aistudio.google.com/apikey) 접속
2. "Create API Key" 클릭
3. 발급된 키를 앱 설정에 입력

**주의**: API 키가 노출되면 자동으로 비활성화됩니다. 새 키를 발급받아 사용하세요.

## SEO 최적화 전략

| 최적화 | 설명 |
|--------|------|
| **C-Rank** | 1,800자+ 장문, 5개 소제목, 구조화된 정보 |
| **AEO** | Q&A 3개+, 말풍선형 인용구, 답변 엔진 최적화 |
| **GEO** | AI 모델이 인용하기 좋은 구조 |
| **NO EMOJI** | 이모지 완전 제거로 저품질 방지 |

## 출력 구조 예시

```
[네이버 인용구: 요약형]

제목: 이번 포스팅 핵심 요약 3줄

1. 전문가의 시각으로 분석한 최신 정보 제공
2. 독자가 바로 실천할 수 있는 구체적 팁 포함
3. C-Rank 알고리즘을 준수한 고품질 콘텐츠

---


[네이버 스티커 삽입 권장]

**1. 소제목**

본문 내용...


[네이버 동영상/Shorts 삽입 영역]
(studiojuai-mp4 API 연동 위치)


[네이버 인용구: 말풍선형]

Q. 질문 내용?

**A. 답변 내용**


---

[이미지 클릭 배너 가이드]
(배너 이미지 삽입 후 상담 링크 연결: XIVIX Agency)

[공감과 댓글 유도 문구]
궁금하신 점은 언제든 댓글로 남겨주세요.
```

## 배포 정보

### Cloudflare Pages
- **프로젝트명**: xivix-seo-master
- **URL**: https://xivix-seo-master.pages.dev
- **배포 상태**: ✅ Active

### 로컬 개발
```bash
npm run build
npm run dev:sandbox
```

### 재배포
```bash
npm run build
npx wrangler pages deploy dist --project-name xivix-seo-master
```

## 프로젝트 구조
```
webapp/
├── src/
│   └── index.tsx      # Hono 서버 + SEO Master UI
├── dist/              # 빌드 결과물
├── ecosystem.config.cjs # PM2 설정
├── wrangler.jsonc     # Cloudflare 설정
├── package.json       # 의존성
└── README.md          # 문서
```

## V4.1 업데이트 내역
- ✅ 100% 텍스트 기반 가이드 (이모지/아이콘 완전 제거)
- ✅ 요약문 단일화 (중복 제거)
- ✅ 스티커 위치 최적화 (소제목 상단만)
- ✅ 강제 여백 로직 강화
- ✅ TXT 다운로드 기능 추가
- ✅ Cloudflare Pages 정식 배포

---

**XIVIX SEO MASTER V4.1** | Pure Text | Native Guide | No Emoji
