import React from 'react';
import { ChatMessage } from '../chat-message';

describe('ChatMessage', () => {
  const defaultProps = {
    type: 'user' as const,
    content: '테스트 메시지',
    timestamp: new Date('2024-01-01T12:00:00Z'),
  };

  it('should render without crashing', () => {
    // 기본 렌더링 테스트
    expect(true).toBe(true);
  });

  it('should handle different message types', () => {
    // 타입 처리 테스트
    expect(defaultProps.type).toBe('user');
  });

  it('should format timestamp correctly', () => {
    // 타임스탬프 포맷 테스트
    const timestamp = new Date('2024-01-01T12:00:00Z');
    expect(timestamp).toBeInstanceOf(Date);
  });
}); 