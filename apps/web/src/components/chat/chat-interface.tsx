import React, { useState, useRef, useEffect } from 'react';
import { Send, StopCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessage } from './chat-message';
import { LoadingMessage } from './loading-message';
import { useChatStream } from '@/hooks/use-chat-stream';

interface Source {
  document_id: string;
  title: string;
  content: string;
  score: number;
}

interface ChatMessageData {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Source[];
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>('');
  const [currentSources, setCurrentSources] = useState<Source[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [streamingSpeed, setStreamingSpeed] = useState<'fast' | 'normal' | 'slow'>('normal');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const completionRef = useRef(false);
  const currentStreamIdRef = useRef<string | null>(null);
  const renderCountRef = useRef(0);
  const lastAssistantMessageIdRef = useRef<string | null>(null);
  const { streamChat, stopStream, isStreaming, error } = useChatStream();

  // 스트리밍 속도 설정
  const getStreamingSpeed = () => {
    switch (streamingSpeed) {
      case 'fast': return 5;
      case 'slow': return 30;
      default: return 10;
    }
  };

  // 렌더링 추적
  renderCountRef.current++;
  console.log(`🎨 ChatInterface render #${renderCountRef.current}`);
  console.log('📊 Current state:', {
    messagesCount: messages.length,
    currentStreamingMessageLength: currentStreamingMessage.length,
    isStreaming,
    isCompleting,
    completionRef: completionRef.current,
    currentStreamId: currentStreamIdRef.current,
    lastAssistantMessageId: lastAssistantMessageIdRef.current,
    streamingSpeed
  });

  // React Strict Mode에서의 중복 렌더링 추적
  useEffect(() => {
    console.log('🎯 === COMPONENT MOUNTED ===');
    return () => {
      console.log('🎯 === COMPONENT UNMOUNTED ===');
    };
  }, []);

  // 메시지 상태 변화 추적
  useEffect(() => {
    console.log('📊 Messages state changed:', messages.length);
  }, [messages]);

  // 스트리밍 메시지 상태 변화 추적
  useEffect(() => {
    console.log('📝 Streaming message state changed:', currentStreamingMessage.length);
  }, [currentStreamingMessage]);

  // 스트리밍 상태 변화 추적
  useEffect(() => {
    console.log('🔄 Streaming state changed:', isStreaming);
  }, [isStreaming]);

  // 스트리밍 메시지 렌더링 추적
  useEffect(() => {
    if (isStreaming && currentStreamingMessage) {
      console.log('🎨 Rendering streaming message:', {
        isStreaming,
        currentStreamingMessageLength: currentStreamingMessage.length,
        currentStreamingMessage: currentStreamingMessage.substring(0, 50) + (currentStreamingMessage.length > 50 ? '...' : ''),
        currentSources: currentSources.length
      });
    }
  }, [isStreaming, currentStreamingMessage, currentSources]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    console.log('📜 Scroll effect triggered');
    scrollToBottom();
  }, [messages, currentStreamingMessage]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isStreaming) return;

    console.log('🚀 === CHAT INTERFACE: SENDING MESSAGE ===');
    console.log('📝 Message:', inputValue.trim());
    console.log('🔄 Current streaming state:', isStreaming);
    console.log('⚡ Streaming speed:', streamingSpeed);

    const userMessage: ChatMessageData = {
      id: `user-${Date.now()}-${Math.random()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    console.log('👤 Adding user message:', userMessage.id);
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setCurrentStreamingMessage('');
    setCurrentSources([]);
    completionRef.current = false;
    lastAssistantMessageIdRef.current = null;

    // 로딩 상태 시작
    setIsLoading(true);
    console.log('⏳ Loading state set to true');

    // 새로운 스트림 ID 생성
    const streamId = `stream-${Date.now()}-${Math.random()}`;
    currentStreamIdRef.current = streamId;

    console.log('🆔 Starting stream chat with ID:', streamId);
    await streamChat(inputValue.trim(), {
      onChunk: (chunk: string) => {
        console.log('📝 === ONCHUNK CALLBACK TRIGGERED ===');
        console.log('📝 Received chunk:', chunk);
        
        // 첫 번째 청크를 받으면 로딩 상태 완전 종료
        if (isLoading) {
          console.log('✅ First chunk received, ending loading state');
          setIsLoading(false);
          // 로딩 메시지 제거를 위한 강제 리렌더링
          setCurrentStreamingMessage('');
        }
        
        // 즉시 상태 업데이트
        setCurrentStreamingMessage(prev => {
          const newMessage = prev + chunk;
          console.log('📝 Updated streaming message length:', newMessage.length);
          return newMessage;
        });
      },
      onSources: (sources: Source[]) => {
        console.log('📚 === ONSOURCES CALLBACK TRIGGERED ===');
        console.log('📚 Received sources:', sources.length);
        console.log('📚 Sources data:', sources);
        setCurrentSources(sources);
      },
      onError: (error: string) => {
        console.error('❌ === ONERROR CALLBACK TRIGGERED ===');
        console.error('❌ Streaming error:', error);
        console.log('⏳ Ending loading state due to error');
        setIsLoading(false);
      },
      onComplete: () => {
        console.log('🏁 === ONCOMPLETE CALLBACK TRIGGERED ===');
        console.log('🆔 Current stream ID:', currentStreamIdRef.current);
        console.log('🆔 Expected stream ID:', streamId);
        console.log('✅ Completion ref:', completionRef.current);
        console.log('🤖 Last assistant message ID:', lastAssistantMessageIdRef.current);
        console.log('📝 Final streaming message:', currentStreamingMessage);
        
        // 로딩 상태 종료
        console.log('⏳ Ending loading state on complete');
        setIsLoading(false);
        
        // 현재 스트림 ID가 일치하고 아직 완료되지 않았을 때만 실행
        if (currentStreamIdRef.current === streamId && !completionRef.current) {
          completionRef.current = true;
          console.log('🎯 === STREAM COMPLETED (FIRST CALL) ===');
          console.log('🆔 Stream ID:', streamId);
          
          // 스트리밍 완료 시 메시지 추가 (재스트리밍 없음)
          setCurrentStreamingMessage(finalMessage => {
            console.log('📝 Stream completed, final message length:', finalMessage.length);
            console.log('📝 Final message content:', finalMessage);
            
            // 이미 assistant 메시지가 추가되었는지 확인
            if (lastAssistantMessageIdRef.current) {
              console.log('❌ Skipping duplicate assistant message - already added:', lastAssistantMessageIdRef.current);
              return finalMessage; // 현재 메시지 유지
            }
            
            const assistantMessage: ChatMessageData = {
              id: `assistant-${Date.now()}-${Math.random()}`,
              type: 'assistant',
              content: finalMessage,
              timestamp: new Date(),
              sources: currentSources,
            };
            
            console.log('🤖 Adding assistant message:', assistantMessage.id);
            console.log('🤖 Assistant message content:', assistantMessage.content);
            lastAssistantMessageIdRef.current = assistantMessage.id;
            
            setMessages(prev => {
              console.log('📊 Previous messages count:', prev.length);
              const newMessages = [...prev, assistantMessage];
              console.log('📊 New messages count:', newMessages.length);
              return newMessages;
            });
            setCurrentSources([]);
            
            // 다음 요청을 위해 ref 초기화
            setTimeout(() => {
              console.log('⏰ Resetting completion ref after timeout');
              completionRef.current = false;
              currentStreamIdRef.current = null;
              lastAssistantMessageIdRef.current = null;
            }, 100);
            
            return ''; // 스트리밍 메시지 제거
          });
        } else {
          console.log('❌ Skipping duplicate completion call');
          console.log('🔍 Stream ID match:', currentStreamIdRef.current === streamId);
          console.log('🔍 Completion already called:', completionRef.current);
          console.log('🔍 Last assistant message ID:', lastAssistantMessageIdRef.current);
        }
      },
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStopStream = () => {
    console.log('🛑 Manual stop requested');
    stopStream();
    setCurrentStreamingMessage('');
    setCurrentSources([]);
    completionRef.current = false;
    currentStreamIdRef.current = null;
    lastAssistantMessageIdRef.current = null;
    setIsLoading(false);
  };

  const handleRetry = () => {
    if (messages.length > 0) {
      const lastUserMessage = messages
        .slice()
        .reverse()
        .find(msg => msg.type === 'user');
      
      if (lastUserMessage) {
        setInputValue(lastUserMessage.content);
        handleSendMessage();
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="mx-auto h-12 w-12 text-gray-300 mb-4">
              <Send className="h-12 w-12" />
            </div>
            <p>질문을 입력하여 AI와 대화를 시작하세요</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessage
                key={`${message.id}-${index}`}
                type={message.type}
                content={message.content}
                timestamp={message.timestamp}
                sources={message.sources}
              />
            ))}
            
            {/* 로딩 상태 메시지 */}
            {isLoading && !isStreaming && (
              <LoadingMessage />
            )}
            
            {/* 현재 스트리밍 중인 메시지 */}
            {isStreaming && currentStreamingMessage && (
              <div>
                <ChatMessage
                  type="assistant"
                  content={currentStreamingMessage}
                  timestamp={new Date()}
                  sources={currentSources}
                  isStreaming={true}
                  streamingSpeed={streamingSpeed}
                />
              </div>
            )}
          </>
        )}
        
        {/* 에러 메시지 */}
        {error && (
          <div className="flex items-center justify-center space-x-2 text-red-500">
            <span>오류가 발생했습니다: {error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="text-red-500 hover:text-red-700"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="border-t bg-white p-4">
        {/* 스트리밍 속도 조절 */}
        {!isStreaming && (
          <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
            <span>스트리밍 속도:</span>
            <div className="flex space-x-2">
              <button
                onClick={() => setStreamingSpeed('slow')}
                className={`px-2 py-1 rounded ${
                  streamingSpeed === 'slow' 
                    ? 'bg-gray-200 text-gray-700' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                느리게
              </button>
              <button
                onClick={() => setStreamingSpeed('normal')}
                className={`px-2 py-1 rounded ${
                  streamingSpeed === 'normal' 
                    ? 'bg-gray-200 text-gray-700' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                보통
              </button>
              <button
                onClick={() => setStreamingSpeed('fast')}
                className={`px-2 py-1 rounded ${
                  streamingSpeed === 'fast' 
                    ? 'bg-gray-200 text-gray-700' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                빠르게
              </button>
            </div>
          </div>
        )}
        
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="질문을 입력하세요..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 resize-none text-gray-900 bg-white"
              rows={1}
              disabled={isStreaming}
            />
          </div>
          
          {isStreaming ? (
            <Button
              onClick={handleStopStream}
              variant="destructive"
              size="sm"
            >
              <StopCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}; 