"use client"

import { useState, useEffect } from "react"
import { Trash2, File, Download, Calendar, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MainLayout } from "@/components/layout/main-layout"
import { Document } from "@shared/types"

interface DocumentListProps {
  documents: Document[]
  onDelete: (id: string) => void
  isLoading: boolean
}

function DocumentList({ documents, onDelete, isLoading }: DocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm("정말로 이 문서를 삭제하시겠습니까?")) {
      return
    }

    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <File className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">문서가 없습니다</h3>
        <p className="mt-1 text-sm text-gray-500">
          문서를 업로드하면 여기에 표시됩니다.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {documents.map((document) => (
        <div
          key={document.id}
          className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <File className="h-8 w-8 text-gray-400" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">
                {document.title}
              </h3>
              {document.description && (
                <p className="text-xs text-gray-500 mt-1">
                  {document.description}
                </p>
              )}
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span>{formatFileSize(document.file_size)}</span>
                <span>•</span>
                <span className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(document.created_at)}
                </span>
                <span>•</span>
                <span className="flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  {document.uploaded_by}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(document.id)}
              disabled={deletingId === document.id}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              {deletingId === document.id ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log('Fetching documents from API...')
      const response = await fetch('/api/documents')
      console.log('API Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', errorText)
        throw new Error(`문서 목록을 불러오는데 실패했습니다: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Documents fetched:', data)
      setDocuments(data)
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      console.log('Deleting document:', id)
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      })
      
      console.log('Delete response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Delete error:', errorText)
        throw new Error(`문서 삭제에 실패했습니다: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('Delete result:', result)
      
      // 삭제된 문서를 목록에서 제거
      setDocuments(prev => prev.filter(doc => doc.id !== id))
    } catch (err) {
      console.error('Delete error:', err)
      alert(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다')
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">문서 관리</h1>
          <p className="mt-2 text-gray-600">
            업로드된 문서들을 확인하고 관리하세요
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDocuments}
              className="mt-2"
            >
              다시 시도
            </Button>
          </div>
        )}

        <DocumentList
          documents={documents}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </div>
    </MainLayout>
  )
} 