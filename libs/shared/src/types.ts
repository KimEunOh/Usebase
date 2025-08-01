export interface User {
  id: string;
  email: string;
  name: string;
  organization_id: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  content?: string;
  file_path: string;
  file_type: string;
  file_size: number;
  organization_id: string;
  user_id: string;
  uploaded_by: string;
  folder_id?: string;
  tags?: string[];
  version: number;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  user_id: string;
  organization_id: string;
  created_at: string;
}

export interface UsageMetrics {
  user_id: string;
  organization_id: string;
  tokens_used: number;
  api_calls: number;
  cost: number;
  date: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  embedding: number[];
  metadata: {
    page_number?: number;
    section?: string;
    paragraph_index: number;
  };
  organization_id: string;
  created_at: string;
}

export interface SearchResult {
  id: string;
  document_id: string;
  title: string;
  content: string;
  score: number;
  metadata: {
    page_number?: number;
    section?: string;
    paragraph_index: number;
  };
  created_at: string;
}

export interface SearchQuery {
  query: string;
  organization_id: string;
  limit?: number;
  offset?: number;
  filters?: {
    document_ids?: string[];
    date_range?: {
      start: string;
      end: string;
    };
  };
}

export interface IndexingStatus {
  document_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total_chunks: number;
  processed_chunks: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
} 