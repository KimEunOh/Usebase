"use client"

import { useState, useEffect } from "react"
import { TrendingUp, FileText, MessageSquare, DollarSign, Users, Activity, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MainLayout } from "@/components/layout/main-layout"

interface UsageStats {
  totalTokens: number
  totalCost: number
  totalApiCalls: number
  monthlyUsage: {
    date: string
    tokens: number
    cost: number
    apiCalls: number
  }[]
  organizationId: string
  userId?: string
}

interface UsageSummary {
  currentMonth: {
    tokens: number
    cost: number
    apiCalls: number
  }
  lastMonth: {
    tokens: number
    cost: number
    apiCalls: number
  }
  change: {
    tokens: number
    cost: number
    apiCalls: number
  }
}

export default function DashboardPage() {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsageData()
  }, [])

  const fetchUsageData = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('로그인이 필요합니다.')
        // 로그인 페이지로 리다이렉트
        window.location.href = '/login'
        return
      }

      const [statsResponse, summaryResponse] = await Promise.all([
        fetch('/api/billing/usage', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch('/api/billing/summary', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
      ])

      if (!statsResponse.ok || !summaryResponse.ok) {
        throw new Error('사용량 데이터를 가져오는데 실패했습니다.')
      }

      const [stats, summary] = await Promise.all([
        statsResponse.json(),
        summaryResponse.json(),
      ])

      setUsageStats(stats)
      setUsageSummary(summary)
    } catch (err) {
      console.error('Dashboard data fetch error:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 6)
      
      const response = await fetch(
        `/api/billing/export?format=${format}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${new Date().toISOString().split('T')[0]}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('내보내기에 실패했습니다.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `usage_report_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export failed:', err)
      alert('내보내기에 실패했습니다.')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("ko-KR").format(num)
  }

  const formatPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%'
    const change = ((current - previous) / previous) * 100
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <Button 
              onClick={fetchUsageData}
              className="mt-2"
            >
              다시 시도
            </Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!usageStats) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto">
          <p>사용량 데이터를 불러올 수 없습니다.</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
          <p className="mt-2 text-gray-600">
            사용량 및 과금 현황을 확인하세요
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 토큰</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(usageStats.totalTokens)}
                </p>
                {usageSummary && (
                  <p className="text-xs text-gray-500">
                    {formatPercentage(usageSummary.currentMonth.tokens, usageSummary.lastMonth.tokens)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 비용</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(usageStats.totalCost)}
                </p>
                {usageSummary && (
                  <p className="text-xs text-gray-500">
                    {formatPercentage(usageSummary.currentMonth.cost, usageSummary.lastMonth.cost)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">API 호출</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(usageStats.totalApiCalls)}
                </p>
                {usageSummary && (
                  <p className="text-xs text-gray-500">
                    {formatPercentage(usageSummary.currentMonth.apiCalls, usageSummary.lastMonth.apiCalls)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">이번 달</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(usageStats.monthlyUsage[0]?.cost || 0)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatNumber(usageStats.monthlyUsage[0]?.tokens || 0)} 토큰
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 사용량 차트 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              월별 토큰 사용량
            </h3>
            <div className="space-y-3">
              {usageStats.monthlyUsage.map((usage, index) => (
                <div key={usage.date} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{usage.date}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-900">
                      {formatNumber(usage.tokens)} 토큰
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatCurrency(usage.cost)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              최근 활동
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    문서 업로드 완료
                  </p>
                  <p className="text-xs text-gray-500">project-proposal.pdf</p>
                </div>
                <span className="text-xs text-gray-400">2분 전</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    AI 검색 실행
                  </p>
                  <p className="text-xs text-gray-500">"예산 계획" 검색</p>
                </div>
                <span className="text-xs text-gray-400">5분 전</span>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    문서 인덱싱 완료
                  </p>
                  <p className="text-xs text-gray-500">budget-2024.pdf</p>
                </div>
                <span className="text-xs text-gray-400">10분 전</span>
              </div>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            문서 업로드
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            CSV 내보내기
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            PDF 내보내기
          </Button>
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            팀 관리
          </Button>
        </div>
      </div>
    </MainLayout>
  )
} 