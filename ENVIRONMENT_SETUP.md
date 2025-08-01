# 환경 변수 설정 가이드

## 개요
UseBase AI Platform의 환경 변수 설정 방법을 안내합니다.

## 파일 구조
```
/
├── .env                    # 루트 환경 변수 (개발용)
├── .env.example           # 루트 환경 변수 예제
├── services/api/
│   ├── .env              # API 서비스 환경 변수 (개발용)
│   └── env.example       # API 서비스 환경 변수 예제
└── apps/web/
    ├── .env              # 웹 애플리케이션 환경 변수 (개발용)
    └── env.example       # 웹 애플리케이션 환경 변수 예제
```

## 환경 변수 카테고리

### 1. 애플리케이션 설정
- `PORT`: 서버 포트 (기본값: 3001)
- `NODE_ENV`: 실행 환경 (development/production)
- `FRONTEND_URL`: 프론트엔드 URL

### 2. 데이터베이스 설정
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY`: Supabase 익명 키
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase 서비스 역할 키
- `DATABASE_URL`: PostgreSQL 연결 문자열

### 3. 캐시 및 메시징
- `REDIS_URL`: Redis 연결 URL
- `KAFKA_URL`: Kafka 브로커 URL

### 4. 외부 API
- `OPENAI_API_KEY`: OpenAI API 키
- `ANTHROPIC_API_KEY`: Anthropic API 키
- `COHERE_API_KEY`: Cohere API 키

### 5. AWS 설정
- `AWS_ACCESS_KEY_ID`: AWS 액세스 키
- `AWS_SECRET_ACCESS_KEY`: AWS 시크릿 키
- `AWS_REGION`: AWS 리전
- `AWS_S3_BUCKET`: S3 버킷 이름

### 6. 보안
- `JWT_SECRET`: JWT 서명 키
- `ENCRYPTION_KEY`: 데이터 암호화 키

### 7. 모니터링
- `SENTRY_DSN`: Sentry 에러 추적
- `PROMETHEUS_PORT`: Prometheus 메트릭 포트

### 8. 기능 플래그
- `ENABLE_OCR`: OCR 기능 활성화
- `ENABLE_VECTOR_SEARCH`: 벡터 검색 활성화
- `ENABLE_AI_CHAT`: AI 채팅 활성화
- `ENABLE_BILLING`: 과금 기능 활성화

## 설정 방법

### 1. 개발 환경 설정
```bash
# 루트 환경 변수 복사
cp .env.example .env

# API 서비스 환경 변수 복사
cp services/api/env.example services/api/.env

# 웹 애플리케이션 환경 변수 복사
cp apps/web/env.example apps/web/.env
```

### 2. 실제 값으로 교체
각 `.env` 파일에서 `your_*` 값들을 실제 값으로 교체하세요:

```bash
# Supabase 설정
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI 설정
OPENAI_API_KEY=sk-...

# 보안 키 생성
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
```

### 3. 환경별 설정

#### 개발 환경
```bash
NODE_ENV=development
LOG_LEVEL=debug
```

#### 프로덕션 환경
```bash
NODE_ENV=production
LOG_LEVEL=info
```

## 보안 주의사항

### 1. 민감한 정보 보호
- `.env` 파일을 Git에 커밋하지 마세요
- `.gitignore`에 `.env` 파일이 포함되어 있는지 확인하세요
- 프로덕션 환경에서는 환경 변수 관리 서비스를 사용하세요

### 2. 키 로테이션
- 정기적으로 API 키를 교체하세요
- JWT_SECRET과 ENCRYPTION_KEY는 주기적으로 변경하세요

### 3. 접근 제어
- 프로덕션 환경 변수는 제한된 인원만 접근할 수 있도록 하세요
- 환경 변수 변경 시 감사 로그를 남기세요

## 문제 해결

### 1. 환경 변수 로드 문제
```bash
# 환경 변수 확인
echo $NODE_ENV

# 특정 서비스의 환경 변수 확인
cd services/api && npm run start:dev
```

### 2. 누락된 환경 변수
```bash
# 필수 환경 변수 체크
node -e "
const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];
const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('Missing required environment variables:', missing);
  process.exit(1);
}
console.log('All required environment variables are set');
"
```

### 3. 환경 변수 검증
```bash
# 환경 변수 유효성 검사
npm run validate:env
```

## 배포 환경 설정

### Vercel (웹 애플리케이션)
1. Vercel 대시보드에서 프로젝트 설정
2. Environment Variables 섹션에서 변수 추가
3. `NEXT_PUBLIC_*` 접두사가 있는 변수는 클라이언트에서 접근 가능

### Fly.io (API 서비스)
1. Fly.io 대시보드에서 앱 설정
2. Secrets 섹션에서 환경 변수 추가
3. `fly secrets set KEY=value` 명령어 사용

### GitHub Actions
1. GitHub 저장소 설정에서 Secrets 추가
2. 워크플로우에서 `${{ secrets.VARIABLE_NAME }}` 사용 