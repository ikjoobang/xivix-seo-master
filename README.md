# XIVIX SEO MASTER V5.2

## 프로젝트 개요
- **이름**: XIVIX SEO MASTER V5.2
- **버전**: V5.2 (SEO/AEO/C-Rank/GEO 완전 최적화)
- **목표**: 주제 입력 → **제목 + 본문 + 해시태그** 자동 생성 (네이버 블로그 SEO 최적화)
- **기술 스택**: Hono + TypeScript + TailwindCSS + Gemini API + Cloudflare Pages

## URL
- **Production (메인 페이지)**: https://xivix-seo-master.pages.dev
- **Health Check API**: https://xivix-seo-master.pages.dev/api/health
- **상태**: ✅ 배포 완료 (Active)

## 핵심 기능 (V5.2)

### 1. 주제 → 제목/본문/해시태그 자동 생성
- 주제 입력 시 **SEO 최적화 제목 자동 생성** (숫자, 감정, 클릭베이트 포함)
- **1,500자 이상** 네이버 최적화 본문 자동 생성
- **15~20개 해시태그** 자동 생성
- 예시: `겨울철 디퓨저 추천` → `향기로 5도 높이는 마법! 겨울 추위 녹이는 꿀팁 디퓨저 (내돈내산)`

### 2. 이모지 0% (100% 텍스트 기반)
- 모든 이모지/아이콘 완전 제거
- 저품질 리스크 원천 차단

### 3. 스타일 선택 (A/B/C형)
| 스타일 | 설명 | 특징 |
|--------|------|------|
| A형 | 사장님 스타일 | 전문적, 신뢰감 |
| B형 | 직원 추천 스타일 | 친근함, 공감대 |
| C형 | 솔직 후기 스타일 | 진솔함, 리뷰형 |

### 4. 복사/저장 기능
- **제목만 복사**: 제목 클립보드 복사
- **본문만 복사**: 본문 클립보드 복사
- **해시태그만 복사**: 해시태그 클립보드 복사
- **전체 복사**: 제목+본문+해시태그 일괄 복사
- **TXT 저장**: 파일 다운로드 (날짜 포함 파일명)

## API 엔드포인트

### GET /api/health
서버 상태 및 서비스 가용성 확인

**Response:**
```json
{
  "status": "ok",
  "version": "V5.2",
  "timestamp": "2025-12-23T00:00:00.000Z",
  "services": {
    "transform": "active",
    "reformat": "active",
    "generate": "active (requires GEMINI_API_KEY)"
  }
}
```

### POST /api/generate
Gemini API를 통해 **제목 + 본문 + 해시태그** 생성

**Request:**
```json
{
  "topic": "포스팅 주제",
  "style": "A",
  "enableReadability": true
}
```

**Response:**
```json
{
  "title": "SEO 최적화 제목",
  "content": "1,500자+ 본문",
  "hashtags": "#해시태그1, #해시태그2, ...",
  "rawLength": 2200,
  "style": "사장님 스타일",
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

1. **주제 입력**: 블로그 포스팅 주제 입력
2. **스타일 선택**: A/B/C형 중 선택
3. **뭉침 방지**: 체크박스 ON 권장 (모바일 가독성)
4. **블로그 글 생성**: 버튼 클릭 → 제목/본문/해시태그 자동 생성
5. **복사/저장**: 제목/본문/해시태그 각각 복사 또는 TXT 저장
6. **네이버 에디터**: 붙여넣기 후 맞춤법 검사

## API 키 관리 (보안)
- **API 키는 서버에만 저장** (Cloudflare Secrets)
- 클라이언트에서 API 키 노출 불가
- 키 교체 방법:
  1. Cloudflare Dashboard → Workers & Pages → xivix-seo-master → Settings → Variables and Secrets
  2. 또는: `npx wrangler pages secret put GEMINI_API_KEY --project-name xivix-seo-master`

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

## V5.2 업데이트 내역
- ✅ 주제 → SEO 최적화 제목 자동 생성 (클릭베이트 스타일)
- ✅ 1,500자+ 본문 자동 생성
- ✅ 15~20개 해시태그 자동 생성
- ✅ 제목/본문/해시태그 개별 복사 버튼
- ✅ API 키 보안 강화 (서버 환경변수만 사용)
- ✅ Health Check API 추가
- ✅ 이모지 0% 완전 제거

## V4.1 업데이트 내역
- ✅ 100% 텍스트 기반 가이드
- ✅ TXT 다운로드 기능
- ✅ Cloudflare Pages 정식 배포

---

**XIVIX SEO MASTER V5.2** | SEO/AEO/C-Rank/GEO | No Emoji
