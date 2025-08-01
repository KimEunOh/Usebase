export const API_ENDPOINTS = {
  HEALTH: '/health',
  AUTH: '/auth',
  DOCUMENTS: '/documents',
  CHAT: '/chat',
  USAGE: '/usage',
} as const;

export const FILE_TYPES = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  TXT: 'text/plain',
  IMAGE: 'image/*',
} as const;

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'zh'] as const;

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    limits: {
      documents: 10,
      storage: 100 * 1024 * 1024, // 100MB
      apiCalls: 1000,
    },
  },
  PRO: {
    name: 'Pro',
    price: 29,
    limits: {
      documents: 1000,
      storage: 10 * 1024 * 1024 * 1024, // 10GB
      apiCalls: 100000,
    },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 99,
    limits: {
      documents: -1, // unlimited
      storage: -1, // unlimited
      apiCalls: -1, // unlimited
    },
  },
} as const; 