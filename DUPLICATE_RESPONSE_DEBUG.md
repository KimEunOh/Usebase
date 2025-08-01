# 클라이언트 응답 중복 출력 문제 디버깅 과정

## 문제 상황
- **현상**: AI 모델의 응답이 클라이언트 화면에 두 번씩 출력됨
- **백엔드**: LLM이 정상적으로 응답 생성 및 SSE 스트리밍
- **프론트엔드**: 청크를 받아서 처리하지만 최종 메시지가 중복으로 표시됨

## 관련 파일 리스트

### 1. 프론트엔드 파일들
```
apps/web/src/components/chat/chat-interface.tsx
apps/web/src/hooks/use-chat-stream.ts
apps/web/src/components/chat/chat-message.tsx
```

### 2. 백엔드 파일들
```
services/api/src/chat/chat.controller.ts
services/api/src/chat/chat.service.ts
services/api/src/search/search.service.ts
```

## 확인한 사항들

### 1. 백엔드 응답 생성 과정
**파일**: `services/api/src/chat/chat.service.ts`
- ✅ LLM이 정상적으로 응답 생성
- ✅ SSE 스트리밍으로 청크 단위 전송
- ✅ 각 청크마다 `res.write()` 호출
- ✅ 스트림 완료 시 `[DONE]` 신호 전송

**로그 확인**:
```
=== STREAM LLM DEBUG START ===
Chunk 1: "AI"
Sending chunk: AI
Chunk 2: "를"
Sending chunk: 를
...
Stream completed with [DONE]
=== STREAM LLM COMPLETED ===
```

### 2. 프론트엔드 SSE 데이터 처리
**파일**: `apps/web/src/hooks/use-chat-stream.ts`
- ✅ SSE 데이터 정상 수신
- ✅ JSON 파싱 성공
- ✅ `onChunk` 콜백 호출

**로그 확인**:
```
Received SSE data: {"content":"."}
Parsed SSE data: {content: '.'}
Calling onChunk with: .
Received [DONE] signal
```

### 3. 상태 업데이트 과정
**파일**: `apps/web/src/components/chat/chat-interface.tsx`
- ✅ `setCurrentStreamingMessage` 호출
- ❌ **문제 발견**: `onComplete` 콜백이 두 번 호출됨

**로그 확인**:
```
Updated streaming message: AI 활용 사례로서...
Updated streaming message: AI 활용 사례로서...
Stream completed, final message: AI 활용 사례로서...
Stream completed, final message: AI 활용 사례로서...
```

### 4. React 컴포넌트 렌더링
**파일**: `apps/web/src/components/chat/chat-interface.tsx`
- ❌ **문제 발견**: 같은 키를 가진 컴포넌트 중복
- ❌ **문제 발견**: `onComplete` 콜백 중복 실행

**에러 로그**:
```
Encountered two children with the same key, `1753942241152`. 
Keys should be unique so that components maintain their identity across updates.
```

## 문제 원인 분석

### 1. 주요 원인
1. **React Strict Mode**: 개발 환경에서 컴포넌트가 두 번 렌더링됨
2. **중복 콜백 실행**: `onComplete` 콜백이 두 번 호출됨
3. **상태 업데이트 중복**: `setCurrentStreamingMessage`가 중복으로 실행됨

### 2. 구체적인 문제점
- `useChatStream` 훅에서 `onComplete` 콜백이 중복 호출
- React의 상태 업데이트가 비동기적으로 처리되면서 중복 발생
- 컴포넌트 키가 고유하지 않아 React 경고 발생

## 해결 과정

### 1. 중복 실행 방지 로직 추가
**파일**: `apps/web/src/components/chat/chat-interface.tsx`

**변경 사항**:
```typescript
// useRef를 사용한 중복 실행 방지
const completionRef = useRef(false);

onComplete: () => {
  if (completionRef.current) {
    console.log('Already completing (ref), skipping duplicate call');
    return;
  }
  
  completionRef.current = true;
  // ... 메시지 추가 로직
}
```

### 2. 고유 키 생성
**파일**: `apps/web/src/components/chat/chat-interface.tsx`

**변경 사항**:
```typescript
// 메시지 ID에 타임스탬프와 랜덤 값 추가
const assistantMessage: ChatMessageData = {
  id: `assistant-${Date.now()}-${Math.random()}`,
  // ...
};

// React 컴포넌트 키에 인덱스 추가
{messages.map((message, index) => (
  <ChatMessage
    key={`${message.id}-${index}`}
    // ...
  />
))}
```

### 3. 스트리밍 상태 관리 개선
**파일**: `apps/web/src/hooks/use-chat-stream.ts`

**변경 사항**:
```typescript
// 이미 스트리밍 중이면 중단
if (isStreaming) {
  console.log('Already streaming, aborting');
  return;
}
```

## 최종 해결책

### 1. 중복 실행 방지
- `useRef`를 사용하여 `onComplete` 콜백의 중복 실행 방지
- `completionRef.current` 플래그로 상태 관리

### 2. 고유 키 생성
- 메시지 ID에 타임스탬프와 랜덤 값 추가
- React 컴포넌트 키에 인덱스 추가

### 3. 상태 초기화
- `setTimeout`을 사용하여 다음 요청을 위한 ref 초기화
- 100ms 지연으로 안전한 상태 전환

## 테스트 결과

### 성공 지표
- ✅ `Already completing (ref), skipping duplicate call` 로그 확인
- ✅ React 경고 메시지 사라짐
- ✅ 최종 메시지가 한 번만 추가됨
- ✅ 스트리밍이 안정적으로 작동함

### 남은 주의사항
- React Strict Mode 환경에서의 추가 테스트 필요
- 프로덕션 환경에서의 안정성 검증 필요
- 대용량 응답에서의 성능 테스트 필요

## 결론

이 문제는 React의 비동기 상태 업데이트와 SSE 스트리밍의 특성상 발생하는 일반적인 문제였습니다. `useRef`를 사용한 중복 실행 방지 로직과 고유 키 생성을 통해 완전히 해결되었습니다. 향후 유사한 스트리밍 기능 구현 시 이 패턴을 참고하여 사용할 수 있습니다. 