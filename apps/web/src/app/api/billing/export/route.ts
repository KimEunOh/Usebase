import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') as 'csv' | 'pdf' || 'csv'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const includeDetails = searchParams.get('includeDetails')
    const userId = searchParams.get('userId')

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      )
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '시작일과 종료일이 필요합니다.' },
        { status: 400 }
      )
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const queryParams = new URLSearchParams({
      format,
      startDate,
      endDate,
    })
    
    if (includeDetails) queryParams.append('includeDetails', includeDetails)
    if (userId) queryParams.append('userId', userId)

    const response = await fetch(`${apiUrl}/billing/export?${queryParams}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: '내보내기에 실패했습니다.' },
        { status: response.status }
      )
    }

    const data = await response.text()
    const contentType = format === 'csv' ? 'text/csv' : 'application/pdf'
    const filename = `usage_report_${new Date().toISOString().split('T')[0]}.${format}`

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 