# XIVIX Naver Post Master

## 프로젝트 개요
- **이름**: XIVIX Naver Post Master
- **목표**: AI 생성 원문을 네이버 블로그 최적화 형식으로 자동 변환하여 저품질 방지
- **기술 스택**: Hono + TypeScript + TailwindCSS + Cloudflare Pages

## URL
- **미리보기**: https://3000-i0w1zx7q2xd8pqxy7ilgn-de59bda9.sandbox.novita.ai
- **Production**: (Cloudflare Pages 배포 후 업데이트)

## 주요 기능

### ✅ 완료된 기능
❶ **4가지 스타일 변환 (A~D형)**
   - A형: 비즈니스형 (~습니다)
   - B형: 친근한 소통형 (~해요)
   - C형: 실용 정보형 (~요약체)
   - D형: 스토리텔링형 (~혼합체)

❷ **네이버 네이티브 최적화**
   - 이모지 제거 (저품질 방지)
   - 네이버 스티커 삽입 가이드 자동 생성
   - 동영상/이미지 배치 위치 자동 설정

❸ **자동 구조화**
   - 3줄 요약 인용구 상단 배치
   - 소제목 강조 처리
   - 마무리 멘트 자동 삽입

❹ **편의 기능**
   - 원클릭 클립보드 복사
   - 실시간 미리보기
   - 모바일 반응형 UI

## API 엔드포인트

### POST /api/transform
AI 원문을 네이버 최적화 형식으로 변환

**Request:**
```json
{
  "text": "변환할 원문",
  "style": "A" // A, B, C, D 중 선택
}
```

**Response:**
```json
{
  "result": "변환된 텍스트",
  "style": "비즈니스형"
}
```

### GET /api/styles
사용 가능한 스타일 설정 조회

## 저품질 방지 전략

| 전략 | 설명 |
|------|------|
| **어미 가변화** | 매일 다른 스타일(A~D) 사용으로 봇 패턴 회피 |
| **네이버 스티커** | 외부 이모지 대신 OGQ 스티커 활용 |
| **동영상 필수** | 체류시간 증대를 위한 15초 영상 삽입 |
| **이미지 링크** | 텍스트 링크 대비 3배 높은 클릭률 |

## 사용 가이드

1. **원문 입력**: AI가 생성한 글을 왼쪽 입력란에 붙여넣기
2. **스타일 선택**: A~D형 버튼 중 하나 클릭 (매일 다르게!)
3. **변환 확인**: 오른쪽에서 네이버 최적화 결과 확인
4. **복사하기**: "전체 복사하기" 버튼 클릭
5. **네이버 에디터**: 스마트에디터에 붙여넣기
6. **가이드 적용**: [스티커], [동영상], [이미지] 자리에 실제 기능 삽입

## 배포

### Cloudflare Pages 배포
```bash
# 빌드
npm run build

# 배포
npx wrangler pages deploy dist --project-name xivix-naver-master
```

## 프로젝트 구조
```
webapp/
├── src/
│   └── index.tsx      # Hono 서버 + HTML UI
├── dist/              # 빌드 결과물
├── ecosystem.config.cjs # PM2 설정
├── wrangler.jsonc     # Cloudflare 설정
├── package.json       # 의존성
└── README.md          # 문서
```

## 다음 개발 단계
- [ ] Cloudflare Pages 정식 배포
- [ ] 사용자 템플릿 저장 기능
- [ ] 글 히스토리 관리 (KV Storage)
- [ ] 커스텀 스티커 위치 설정

---

**XIVIX Naver Post Master v1.0** | 방대표님 전용 네이티브 최적화 에디터
