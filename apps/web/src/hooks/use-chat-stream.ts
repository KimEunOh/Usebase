import { useState, useCallback, useRef } from 'react';

interface Source {
  document_id: string;
  title: string;
  content: string;
  score: number;
}

interface ChatStreamOptions {
  onChunk?: (chunk: string) => void;
  onSources?: (sources: Source[]) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

export const useChatStream = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamIdRef = useRef<string | null>(null);
  const completionCalledRef = useRef(false);
  const chunkCountRef = useRef(0);
  const sseDataCountRef = useRef(0);
  const doneSignalReceivedRef = useRef(false);

  const streamChat = useCallback(async (
    query: string,
    options: ChatStreamOptions = {}
  ) => {
    if (!query.trim()) return;

    console.log('🔍 === CLIENT STREAM DEBUG START ===');
    console.log('📝 Query:', query);
    console.log('🔄 Current isStreaming state:', isStreaming);
    console.log('🆔 Previous stream ID:', streamIdRef.current);
    console.log('✅ Previous completion called:', completionCalledRef.current);
    console.log('🏁 Previous done signal received:', doneSignalReceivedRef.current);

    // 이미 스트리밍 중이면 중단
    if (isStreaming) {
      console.log('⚠️ Already streaming, aborting');
      return;
    }

    // 새로운 스트림 ID 생성
    const newStreamId = `stream-${Date.now()}-${Math.random()}`;
    streamIdRef.current = newStreamId;
    completionCalledRef.current = false;
    doneSignalReceivedRef.current = false;
    chunkCountRef.current = 0;
    sseDataCountRef.current = 0;

    console.log('🆔 New stream ID:', newStreamId);

    setIsStreaming(true);
    setError(null);

    // 이전 스트림이 있다면 중단
    if (abortControllerRef.current) {
      console.log('🛑 Aborting previous stream');
      abortControllerRef.current.abort();
    }

    // 새로운 AbortController 생성
    abortControllerRef.current = new AbortController();

    try {
      console.log('🌐 Making fetch request to /api/chat/stream');
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'dev-token'}`,
        },
        body: JSON.stringify({ query }),
        signal: abortControllerRef.current.signal,
      });

      console.log('📊 Response status:', response.status);
      console.log('✅ Response ok:', response.ok);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is null');
      }

      console.log('📖 Starting to read SSE stream');
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('📖 SSE stream reading completed');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            sseDataCountRef.current++;
            console.log(`📨 SSE Data #${sseDataCountRef.current}:`, data);
            
            if (data === '[DONE]') {
              console.log('🏁 Received [DONE] signal');
              
              // 이미 [DONE] 신호를 받았거나 완료 콜백이 호출된 경우 스킵
              if (doneSignalReceivedRef.current || completionCalledRef.current) {
                console.log('❌ Skipping duplicate [DONE] processing');
                break;
              }
              
              // 스트림 ID가 일치하는 경우에만 처리
              if (streamIdRef.current === newStreamId) {
                doneSignalReceivedRef.current = true;
                completionCalledRef.current = true;
                console.log('🎯 Calling onComplete for stream:', newStreamId);
                options.onComplete?.();
              } else {
                console.log('❌ Skipping [DONE] - stream ID mismatch');
              }
              break;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.content) {
                chunkCountRef.current++;
                console.log(`📝 Chunk #${chunkCountRef.current}:`, parsed.content);
                // 즉시 콜백 호출
                options.onChunk?.(parsed.content);
              }
              
              if (parsed.sources) {
                console.log('📚 Sources received:', parsed.sources.length, 'sources');
                options.onSources?.(parsed.sources);
              }
              
              if (parsed.error) {
                console.error('❌ Error received:', parsed.error);
                options.onError?.(parsed.error);
                setError(parsed.error);
              }
            } catch (e) {
              console.error('❌ Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('🛑 Stream aborted by user');
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Stream error:', errorMessage);
      setError(errorMessage);
      options.onError?.(errorMessage);
    } finally {
      console.log('🏁 === CLIENT STREAM DEBUG END ===');
      console.log('🆔 Final stream ID:', streamIdRef.current);
      console.log('📊 Total chunks processed:', chunkCountRef.current);
      console.log('📊 Total SSE data received:', sseDataCountRef.current);
      console.log('🏁 Done signal received:', doneSignalReceivedRef.current);
      console.log('✅ Completion called:', completionCalledRef.current);
      
      // 현재 스트림이 완료된 경우에만 상태 초기화
      if (streamIdRef.current === newStreamId) {
        console.log('✅ Resetting streaming state for current stream');
        setIsStreaming(false);
        streamIdRef.current = null;
        completionCalledRef.current = false;
        doneSignalReceivedRef.current = false;
      } else {
        console.log('⚠️ Not resetting state - different stream active');
      }
      abortControllerRef.current = null;
    }
  }, [isStreaming]);

  const stopStream = useCallback(() => {
    console.log('🛑 Manual stream stop requested');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    streamIdRef.current = null;
    completionCalledRef.current = false;
    doneSignalReceivedRef.current = false;
  }, []);

  return {
    streamChat,
    stopStream,
    isStreaming,
    error,
  };
}; 