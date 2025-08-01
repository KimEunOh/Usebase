import { useState, useEffect, useRef } from 'react';

interface UseTypingAnimationOptions {
  speed?: number; // 타이핑 속도 (ms)
  delay?: number; // 시작 전 지연 시간 (ms)
  enabled?: boolean; // 애니메이션 활성화 여부
}

export const useTypingAnimation = (
  text: string,
  options: UseTypingAnimationOptions = {}
) => {
  const { speed = 30, delay = 0, enabled = true } = options;
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef(0);

  // 디버깅: 훅 상태 추적
  console.log('🎬 useTypingAnimation:', {
    text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
    textLength: text.length,
    displayedText: displayedText.substring(0, 50) + (displayedText.length > 50 ? '...' : ''),
    displayedTextLength: displayedText.length,
    isTyping,
    enabled,
    speed,
    delay
  });

  useEffect(() => {
    if (!enabled || text.length === 0) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    // 스트리밍 완료 후 애니메이션 비활성화
    if (enabled && text.length > 0 && displayedText.length === 0) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (currentIndexRef.current < text.length) {
      const nextChar = text[currentIndexRef.current];
      setDisplayedText(prev => prev + nextChar);
      currentIndexRef.current++;
      
      timeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, speed);
    } else {
      setIsTyping(false);
    }
  }, [text, enabled, speed]);

  // 스트리밍 중일 때는 즉시 전체 텍스트 표시
  if (enabled && text.length > 0 && displayedText.length === 0) {
    console.log('🎬 Streaming mode - showing full text immediately');
    return {
      displayedText: text,
      isTyping: true,
    };
  }

  return {
    displayedText,
    isTyping,
  };
}; 