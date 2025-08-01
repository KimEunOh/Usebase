# UseBase AI Platform

Pay-per-use 종합 AI 플랫폼 - 조직 단위로 문서 기반 RAG, 실시간 검색, OCR, 자동 기획서 작성 등을 제공하는 웹/데스크톱 하이브리드 AI 플랫폼입니다.

## 🚀 기술 스택

### Frontend
- **Next.js 15** - React 기반 풀스택 프레임워크
- **TypeScript** - 타입 안전성
- **Tailwind CSS** - 유틸리티 퍼스트 CSS 프레임워크
- **Lucide React** - 아이콘 라이브러리
- **Class Variance Authority** - 컴포넌트 변형 관리

### Backend
- **NestJS** - Node.js 백엔드 프레임워크
- **TypeScript** - 타입 안전성
- **RESTful API** - 표준화된 API 설계
- **Swagger** - API 문서화
- **Jest** - 테스트 프레임워크

### Database & Storage
- **Supabase** - PostgreSQL + Auth + Storage
- **pgvector** - 벡터 검색 확장
- **Redis** - 캐싱 및 세션 관리
- **Kafka** - 이벤트 스트리밍 및 메시지 브로커

### AI & External Services
- **OpenAI API** - LLM 서비스
- **AWS Textract** - OCR 서비스
- **PDF Parse** - PDF 텍스트 추출

### Infrastructure & DevOps
- **Vercel** - 프론트엔드 배포
- **Fly.io** - 백엔드 배포
- **GitHub Actions** - CI/CD 파이프라인
- **Turbo** - Monorepo 빌드 시스템

## 📁 프로젝트 구조

```
/
├── apps/
│   └── web/                 # Next.js 웹 애플리케이션
│       ├── src/
│       │   ├── app/         # App Router 페이지
│       │   ├── components/  # React 컴포넌트
│       │   └── hooks/       # 커스텀 훅
│       └── public/          # 정적 파일
├── services/
│   └── api/                 # NestJS 백엔드 API
│       ├── src/
│       │   ├── auth/        # 인증 모듈
│       │   ├── billing/     # 과금 모듈
│       │   ├── chat/        # 채팅 모듈
│       │   ├── documents/   # 문서 관리
│       │   ├── embeddings/  # 벡터 임베딩
│       │   ├── indexing/    # 문서 인덱싱
│       │   ├── messaging/   # Kafka 메시징
│       │   ├── ocr/         # OCR 서비스
│       │   ├── search/      # 검색 서비스
│       │   └── users/       # 사용자 관리
│       └── test/            # 테스트 파일
├── libs/
│   └── shared/              # 공통 라이브러리
├── supabase-migrations/     # 데이터베이스 마이그레이션
├── infra/
│   ├── terraform/           # 인프라 코드
│   └── kubernetes/          # K8s 매니페스트
├── scripts/                 # 유틸리티 스크립트
└── .github/
    └── workflows/           # CI/CD 워크플로우
```

## 🛠️ 개발 환경 설정

### Prerequisites
- Node.js 18+
- pnpm 8+
- Docker (선택사항)
- Redis
- Kafka (선택사항)

### 설치 및 실행

1. **의존성 설치**
   ```bash
   pnpm install
   ```

2. **환경 변수 설정**
   ```bash
   # 루트 환경 변수
   cp env.example .env.local
   
   # API 서비스
   cp services/api/env.example services/api/.env.local
   
   # 웹 애플리케이션
   cp apps/web/env.example apps/web/.env.local
   ```

3. **데이터베이스 설정**
   ```bash
   # Supabase 마이그레이션 실행
   # supabase-migrations/ 폴더의 SQL 파일들을 Supabase에서 실행
   ```

4. **개발 서버 실행**
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
- **Supabase Auth** - SAML/OAuth 지원
- **JWT 토큰** - 세션 관리
- **역할 기반 접근제어 (RBAC)** - admin, manager, user 역할
- **Row Level Security (RLS)** - 데이터 격리
- **데이터 암호화** - AES-256/TLS1.2+

### 📄 문서 관리
- **다중 형식 파일 업로드** - PDF, DOCX, 이미지
- **OCR 자동 텍스트 추출** - AWS Textract 연동
- **벡터 인덱싱** - pgvector 기반
- **폴더 및 태그 기반 조직**
- **문서 버전 관리**

### 🤖 AI 기능
- **실시간 RAG 검색** - 스트리밍 응답
- **스트리밍 AI 응답** - Server-Sent Events (SSE)
- **자동 기획서/보고서 생성**
- **다국어 지원** - 한국어 최적화
- **벡터 검색** - BM25 + pgvector 하이브리드

### 💰 사용량 기반 과금
- **토큰 사용량 추적** - OpenAI API 호출 모니터링
- **API 호출 수 모니터링** - 실시간 통계
- **실시간 비용 계산** - 조직별 사용량
- **CSV/PDF 내보내기** - 사용량 리포트
- **Kafka 이벤트 처리** - 비동기 과금 처리

### 🔍 검색 및 인덱싱
- **한국어 텍스트 검색** - 전문 검색 인덱스
- **벡터 유사도 검색** - pgvector IVFFLAT 인덱스
- **하이브리드 검색** - BM25 + 벡터 검색
- **실시간 인덱싱** - 문서 업로드 시 자동 처리

## 🧪 테스트

```bash
# 전체 테스트 실행
pnpm test

# 개별 서비스 테스트
pnpm --filter=api test
pnpm --filter=web test

# 테스트 커버리지
pnpm --filter=api test:cov

# E2E 테스트
pnpm test:e2e
```

## 📈 성능 목표

- **응답 시간**: p95 < 2.5초
- **동시 사용자**: 5,000+ 세션
- **가동률**: 99.9%
- **RAG 정확도**: ≥ 90%
- **OCR 정확도**: ≥ 95% (한글)
- **스트리밍 지연**: < 1초 첫 토큰

## 🔧 개발 가이드

### 코드 컨벤션
- **TypeScript strict 모드** 사용
- **ESLint + Prettier** 적용
- **Conventional Commits** 사용
- **TDD 접근법** 권장
- **Clean Code 원칙** 준수

### 보안 가이드라인
- **ISMS-P 기반** 보안 규칙 준수
- **입력값 검증** 및 살균
- **SQL Injection 방지** - Parameterized Queries
- **XSS/CSRF 방어**
- **RBAC + RLS** 적용

### 아키텍처 패턴
- **Layered Architecture** - Presentation, Application, Domain, Infrastructure
- **AOP 미들웨어** - 로깅, 트랜잭션, 보안
- **Event-Driven Architecture** - Kafka 기반
- **CQRS 패턴** - 명령과 조회 분리

## 📝 데이터베이스 스키마

### 주요 테이블
- `documents` - 문서 메타데이터
- `document_chunks` - 문서 청크 및 벡터
- `usage_metrics` - 사용량 통계
- `indexing_status` - 인덱싱 진행 상태
- `users` - 사용자 정보
- `organizations` - 조직 정보

### 마이그레이션
- 13개의 Supabase 마이그레이션 파일
- 벡터 검색 함수 및 인덱스
- 한국어 전문 검색 설정
- 사용량 메트릭 테이블

## 🚀 최신 기능

### 실시간 스트리밍 채팅
- **Server-Sent Events (SSE)** 구현
- **실시간 토큰 스트리밍** - OpenAI API 연동
- **소스 문서 표시** - RAG 검색 결과
- **에러 핸들링** - 네트워크 오류 대응

### 고급 과금 시스템
- **실시간 사용량 추적** - 토큰, API 호출 수
- **조직별 비용 계산** - 월별 통계
- **CSV/PDF 내보내기** - 상세 리포트
- **Kafka 이벤트 처리** - 비동기 과금

### 문서 처리 파이프라인
- **PDF 텍스트 추출** - pdf-parse 라이브러리
- **OCR 통합** - AWS Textract 준비
- **텍스트 전처리** - 문단 분할, 정제
- **벡터 임베딩** - OpenAI Embeddings API

## 📞 지원

- **이슈**: [GitHub Issues](https://github.com/KimEunOh/Usebase/issues)
- **문서**: [Wiki](https://github.com/KimEunOh/Usebase/wiki)
- **이메일**: support@usebase.ai

## 📄 라이선스

MIT License

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**UseBase AI Platform** - 조직을 위한 지능형 문서 관리 및 AI 협업 플랫폼 