import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, User, Bot } from 'lucide-react';
import { useTypingAnimation } from '@/hooks/use-typing-animation';

interface Source {
  document_id: string;
  title: string;
  content: string;
  score: number;
}

interface ChatMessageProps {
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Source[];
  isStreaming?: boolean;
  streamingSpeed?: 'fast' | 'normal' | 'slow';
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  type,
  content,
  timestamp,
  sources,
  isStreaming = false,
  streamingSpeed = 'normal',
}) => {
  const [showCursor, setShowCursor] = useState(false);
  const cursorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<HTMLParagraphElement>(null);

  // 스트리밍 속도에 따른 타이핑 속도 계산
  const getTypingSpeed = () => {
    switch (streamingSpeed) {
      case 'fast': return 5;
      case 'slow': return 30;
      default: return 10;
    }
  };

  // 타이핑 애니메이션 (assistant 메시지에만 적용, 스트리밍 중에는 비활성화)
  const { displayedText, isTyping } = useTypingAnimation(content, {
    enabled: type === 'assistant' && !isStreaming && content.length > 0, // 스트리밍 완료 후에도 비활성화
    speed: getTypingSpeed(),
    delay: 0,
  });

  // 디버깅: 타이핑 애니메이션 상태 추적
  useEffect(() => {
    if (type === 'assistant') {
      console.log('🎨 ChatMessage render - Assistant message');
      console.log('📝 Content:', content);
      console.log('📝 Displayed text:', displayedText);
      console.log('📝 Is typing:', isTyping);
      console.log('📝 Is streaming:', isStreaming);
      console.log('📝 Content length:', content.length);
      console.log('📝 Displayed text length:', displayedText.length);
      console.log('📝 Animation enabled:', type === 'assistant' && !isStreaming && content.length > 0);
    }
  }, [content, displayedText, isTyping, type, isStreaming]);

  // 커서 깜빡임 효과
  useEffect(() => {
    if (isStreaming && type === 'assistant') {
      setShowCursor(true);
      cursorIntervalRef.current = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 500);
    } else {
      setShowCursor(false);
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
        cursorIntervalRef.current = null;
      }
    }

    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
    };
  }, [isStreaming, type]);

  // 자동 스크롤
  useEffect(() => {
    if (contentRef.current && isStreaming && type === 'assistant') {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [displayedText, isStreaming, type]);

  // 표시할 텍스트 결정 - 스트리밍 중일 때는 즉시 표시, 완료 후에는 최종 메시지 표시
  const displayContent = type === 'assistant' && isStreaming ? content : (type === 'assistant' ? content : content);

  // 스트리밍 중일 때 즉시 렌더링을 위한 강제 업데이트
  useEffect(() => {
    if (type === 'assistant' && isStreaming && content) {
      console.log('⚡ Streaming content length:', content.length);
    }
  }, [content, type, isStreaming]);

  return (
    <div className={`flex ${type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex items-start space-x-3 max-w-2xl ${type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* 아바타 */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          type === 'user' 
            ? 'bg-gray-200 text-gray-700' 
            : 'bg-gray-200 text-gray-700'
        }`}>
          {type === 'user' ? (
            <User className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </div>

        {/* 메시지 내용 */}
        <div className={`flex-1 ${type === 'user' ? 'text-right' : ''}`}>
          <div className={`inline-block px-4 py-2 rounded-lg ${
            type === 'user'
              ? 'bg-gray-100 text-gray-900'
              : 'bg-gray-100 text-gray-900'
          }`}>
            <div className="relative">
              <p 
                ref={contentRef}
                className={`text-sm whitespace-pre-wrap leading-relaxed ${
                  type === 'user' ? 'user-message-text' : 'ai-message-text'
                }`}
                style={{ 
                  fontFamily: 'inherit',
                  lineHeight: '1.7',
                  fontWeight: '500'
                }}
              >
                {displayContent}
                {isStreaming && showCursor && type === 'assistant' && (
                  <span 
                    className="inline-block w-0.5 h-4 bg-gray-600 ml-1 animate-pulse"
                    style={{ animationDuration: '1s' }}
                  />
                )}
              </p>
            </div>
            
            {/* 스트리밍 중 로딩 인디케이터 */}
            {isStreaming && type === 'assistant' && (
              <div className="flex items-center space-x-1 mt-2">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500 ml-2 font-medium">AI가 응답을 생성하고 있습니다...</span>
              </div>
            )}
          </div>

          {/* 출처 정보 */}
          {type === 'assistant' && sources && sources.length > 0 && !isStreaming && (
            <div className="mt-2 text-xs text-gray-500">
              <p className="mb-1">참고 문서:</p>
              <div className="space-y-1">
                {sources.map((source, index) => (
                  <div key={source.document_id} className="flex items-center space-x-2">
                    <span className="text-gray-400">•</span>
                    <span className="truncate">{source.title}</span>
                    <span className="text-gray-400">
                      ({Math.round(source.score * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 타임스탬프 */}
          <p className={`text-xs text-gray-400 mt-1 ${type === 'user' ? 'text-right' : ''}`}>
            {timestamp.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}; 