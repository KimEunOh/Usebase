# UseBase AI Platform

Pay-per-use 종합 AI 플랫폼 - 조직 단위로 문서 기반 RAG, 실시간 검색, OCR, 자동 기획서 작성 등을 제공하는 웹/데스크톱 하이브리드 AI 플랫폼입니다.

## 🚀 기술 스택

### Frontend
- **Next.js 15** - React 기반 풀스택 프레임워크
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 유틸리티 퍼스트 CSS 프레임워크
- **Electron** - 데스크톱 애플리케이션

### Backend
- **NestJS** - Node.js 백엔드 프레임워크
- **TypeScript** - 타입 안전성
- **RESTful API** - 표준화된 API 설계

### Database & Storage
- **Supabase** - PostgreSQL + Auth + Storage
- **pgvector** - 벡터 검색 확장
- **Redis** - 캐싱 및 세션 관리

### Infrastructure
- **Vercel** - 프론트엔드 배포
- **Fly.io** - 백엔드 배포
- **GitHub Actions** - CI/CD 파이프라인

## 📁 프로젝트 구조

```
/
├── apps/
│   └── web/                 # Next.js 웹 애플리케이션
├── services/
│   └── api/                 # NestJS 백엔드 API
├── libs/
│   └── shared/              # 공통 라이브러리
├── infra/
│   ├── terraform/           # 인프라 코드
│   └── kubernetes/          # K8s 매니페스트
└── .github/
    └── workflows/           # CI/CD 워크플로우
```

## 🛠️ 개발 환경 설정

### Prerequisites
- Node.js 18+
- pnpm 8+
- Docker (선택사항)

### 설치 및 실행

1. **의존성 설치**
   ```bash
   pnpm install
   ```

2. **환경 변수 설정**
   ```bash
   # API 서비스
   cp services/api/env.example services/api/.env.local
   
   # 웹 애플리케이션
   cp apps/web/.env.example apps/web/.env.local
   ```

3. **개발 서버 실행**
   ```bash
   # 전체 애플리케이션
   pnpm dev
   
   # 개별 서비스
   pnpm --filter=api dev
   pnpm --filter=web dev
   ```

## 🚀 배포

### 자동 배포 (GitHub Actions)
- `main` 브랜치에 푸시하면 자동으로 배포됩니다
- Vercel (웹) 및 Fly.io (API)에 배포됩니다

### 수동 배포
```bash
# 빌드
pnpm build

# 배포
pnpm --filter=web deploy
pnpm --filter=api deploy
```

## 📊 주요 기능

### 🔐 인증 및 보안
- Supabase Auth (SAML/OAuth)
- 역할 기반 접근제어 (RBAC)
- Row Level Security (RLS)
- 데이터 암호화 (AES-256/TLS1.2+)

### 📄 문서 관리
- 다중 형식 파일 업로드 (PDF, DOCX, 이미지)
- OCR 자동 텍스트 추출
- 벡터 인덱싱 (pgvector)
- 폴더 및 태그 기반 조직

### 🤖 AI 기능
- 실시간 RAG 검색
- 스트리밍 AI 응답
- 자동 기획서/보고서 생성
- 다국어 지원

### 💰 사용량 기반 과금
- 토큰 사용량 추적
- API 호출 수 모니터링
- 실시간 비용 계산
- 조직별 사용량 대시보드

## 🧪 테스트

```bash
# 전체 테스트 실행
pnpm test

# 개별 서비스 테스트
pnpm --filter=api test
pnpm --filter=web test

# E2E 테스트
pnpm test:e2e
```

## 📈 성능 목표

- **응답 시간**: p95 < 2.5초
- **동시 사용자**: 5,000+ 세션
- **가동률**: 99.9%
- **RAG 정확도**: ≥ 90%
- **OCR 정확도**: ≥ 95% (한글)

## 🔧 개발 가이드

### 코드 컨벤션
- TypeScript strict 모드 사용
- ESLint + Prettier 적용
- Conventional Commits 사용
- TDD 접근법 권장

### 보안 가이드라인
- ISMS-P 기반 보안 규칙 준수
- 입력값 검증 및 살균
- SQL Injection 방지
- XSS/CSRF 방어

## 📝 라이선스

MIT License

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 지원

- 이슈: [GitHub Issues](https://github.com/your-org/usebase-ai-platform/issues)
- 문서: [Wiki](https://github.com/your-org/usebase-ai-platform/wiki)
- 이메일: support@usebase.ai 