"use client"

import { useState, useCallback } from "react"
import { Upload, File, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MainLayout } from "@/components/layout/main-layout"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  status: "uploading" | "success" | "error"
  progress: number
  error?: string
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFileUpload = useCallback(async (files: FileList) => {
    const newFiles: UploadedFile[] = Array.from(files).map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      status: "uploading" as const,
      progress: 0,
    }))

    setUploadedFiles(prev => [...prev, ...newFiles])

    // 실제 파일 업로드
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileId = newFiles[i].id
      
      try {
        console.log('=== FRONTEND UPLOAD DEBUG ===');
        console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
        
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', file.name)
        formData.append('description', `Uploaded file: ${file.name}`)
        
        console.log('FormData created, sending to API...');
        
        const response = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        })
        
        console.log('API Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Upload failed:', errorText)
          throw new Error(`Upload failed: ${response.status} ${errorText}`)
        }
        
        const result = await response.json()
        console.log('Upload successful:', result);
        
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, status: "success" as const, progress: 100 }
              : f
          )
        )
        
        console.log('=== FRONTEND UPLOAD DEBUG END ===');
      } catch (error) {
        console.error('=== FRONTEND UPLOAD ERROR ===');
        console.error('Upload error:', error);
        console.error('=== FRONTEND UPLOAD ERROR END ===');
        
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, status: "error" as const, progress: 0, error: error instanceof Error ? error.message : 'Upload failed' }
              : f
          )
        )
      }
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileUpload(e.dataTransfer.files)
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files)
    }
  }, [handleFileUpload])

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">문서 업로드</h1>
          <p className="mt-2 text-gray-600">
            PDF, DOC, TXT 파일을 업로드하여 AI 검색에 활용하세요
          </p>
        </div>

        {/* 업로드 영역 */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <p className="text-lg font-medium text-gray-900">
              파일을 드래그하여 업로드하거나
            </p>
            <p className="text-sm text-gray-500 mt-1">
              PDF, DOC, DOCX, TXT 파일 지원 (최대 10MB)
            </p>
          </div>
          <div className="mt-6">
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button asChild>
                <span>파일 선택</span>
              </Button>
            </label>
          </div>
        </div>

        {/* 업로드된 파일 목록 */}
        {uploadedFiles.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              업로드된 파일
            </h3>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    <File className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {file.status === "uploading" && (
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {file.progress}%
                        </span>
                      </div>
                    )}
                    
                    {file.status === "success" && (
                      <Check className="h-5 w-5 text-green-500" />
                    )}
                    
                    {file.status === "error" && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-red-500">
                          {file.error || 'Upload failed'}
                        </span>
                      </div>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
} 