import React, { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';

interface LoadingMessageProps {
  message?: string;
}

export const LoadingMessage: React.FC<LoadingMessageProps> = ({ 
  message = "응답 생성중" 
}) => {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev >= 3 ? 1 : prev + 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const renderDots = () => {
    return '.'.repeat(dots);
  };

  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start space-x-3 max-w-2xl">
        {/* 아바타 */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-gray-700">
          <Bot className="w-4 h-4" />
        </div>

        {/* 메시지 내용 */}
        <div className="flex-1">
          <div className="inline-block px-4 py-2 rounded-lg bg-gray-100 text-gray-900">
            <div className="flex items-center space-x-1">
              <span className="text-sm font-semibold">{message}</span>
              <span className="text-sm font-bold text-gray-600 animate-pulse">
                {renderDots()}
              </span>
            </div>
          </div>

          {/* 타임스탬프 */}
          <p className="text-xs text-gray-400 mt-1 font-medium">
            {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}; 