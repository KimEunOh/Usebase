"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { ChatInterface } from "@/components/chat/chat-interface"

export default function SearchPage() {
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI 대화형 검색</h1>
          <p className="mt-2 text-gray-600">
            업로드된 문서를 기반으로 AI가 실시간으로 질문에 답변합니다
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 h-[600px]">
          <ChatInterface />
        </div>
      </div>
    </MainLayout>
  )
} 