# Polint Stack (Spring Boot + Python Agent + Web) — Minimal Working MVP

## 실행 (Docker Compose)
```bash
export OPENAI_API_KEY=...
export ANTHROPIC_API_KEY=...
export GEMINI_API_KEY=...

docker compose up --build
```

- Web UI: http://localhost
- Spring API: http://localhost:8080
- Agent API: http://localhost:8000 (direct access not usually needed)

## 프론트엔드 로컬 개발 (Vite)
```bash
cd web
npm install
npm run dev
```

Vite dev 서버는 `/api/...`를 자동으로 `http://localhost:8080/...`로 프록시합니다.

## API 테스트
### 1) 정책 등록
```bash
curl -s http://localhost:8080/v1/policies \
  -H "Content-Type: application/json" \
  -d '{
    "regulationText": "1. 문서에는 반드시 제출자 이름: 값 형태의 필드를 포함해야 한다.\n2. 문서에는 \'대충\'이라는 표현을 사용하면 안 된다."
  }'
```

### 2) 빌드(룰셋 생성)
```bash
curl -s http://localhost:8080/v1/policies/<policyId>/build \
  -H "Content-Type: application/json" \
  -d '{
    "knowledgeDocs": [
      {"title":"kb-1","content":"문서 템플릿: 제출자 이름: (필수)\n작성일: YYYY-MM-DD"}
    ]
  }'
```

### 3) 린트
```bash
curl -s http://localhost:8080/v1/lint \
  -H "Content-Type: application/json" \
  -d '{
    "rulesetId": "RS-REPLACE",
    "docs": [
      {"title":"doc1","content":"제목: 테스트\n대충 하면 됩니다\n"},
      {"title":"doc2","content":"제출자 이름: 홍길동\n작성일: 2026-02-07\n"},
      {"title":"doc3","content":"작성일: 2026/02/07\n"}
    ]
  }'
```

### 4) 실행결과 조회
```bash
curl -s http://localhost:8080/v1/runs/RUN-REPLACE
```


### Gemini key env
- This agent supports both `GEMINI_API_KEY` and `GOOGLE_API_KEY`.
- In docker-compose, `GOOGLE_API_KEY` is auto-mapped from `GEMINI_API_KEY` if not provided.
# polint
