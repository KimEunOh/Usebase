"use client"

import Link from "next/link"
import { MainLayout } from "@/components/layout/main-layout"
import { useEffect, useState } from "react"

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [])
  return (
    <MainLayout>
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            UseBase AI Platform
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Pay-per-use 종합 AI 플랫폼으로 문서 기반 RAG, 실시간 검색, OCR, 
            자동 기획서 작성 등을 제공합니다
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Link
            href="/upload"
            className="group p-6 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-lg transition-all duration-200"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                문서 관리
              </h3>
              <p className="text-sm text-gray-600">
                문서 업로드, RAG 인덱싱, 검색 기능
              </p>
            </div>
          </Link>

          <Link
            href="/search"
            className="group p-6 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-lg transition-all duration-200"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                AI 대화
              </h3>
              <p className="text-sm text-gray-600">
                실시간 AI 대화 및 문서 기반 답변
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="group p-6 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-lg transition-all duration-200"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-yellow-200 transition-colors">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                사용량 관리
              </h3>
              <p className="text-sm text-gray-600">
                사용량 기반 과금 및 비용 관리
              </p>
            </div>
          </Link>

          <Link
            href="/login"
            className="group p-6 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-lg transition-all duration-200"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                보안
              </h3>
              <p className="text-sm text-gray-600">
                조직별 데이터 격리 및 접근 제어
              </p>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
              로그인
            </Link>
            {" "}또는{" "}
            <Link href="/register" className="text-primary hover:text-primary/80 font-medium">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </MainLayout>
  )
} 