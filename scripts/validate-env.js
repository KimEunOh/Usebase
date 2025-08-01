#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 필수 환경 변수 정의
const requiredEnvVars = {
  root: [
    'NODE_ENV',
    'DATABASE_URL',
    'REDIS_URL',
    'KAFKA_URL',
  ],
  api: [
    'PORT',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
  ],
  web: [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ],
};

// 선택적 환경 변수 정의
const optionalEnvVars = {
  root: [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'COHERE_API_KEY',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'SENTRY_DSN',
  ],
  api: [
    'OPENAI_API_KEY',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'LOG_LEVEL',
    'RATE_LIMIT_TTL',
    'RATE_LIMIT_LIMIT',
  ],
  web: [
    'NEXT_PUBLIC_OPENAI_API_KEY',
    'NEXTAUTH_SECRET',
    'NEXT_PUBLIC_GA_ID',
  ],
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key] = valueParts.join('=');
      }
    }
  });

  return env;
}

function validateEnvVars(env, required, optional, context) {
  const missing = [];
  const warnings = [];

  // 필수 환경 변수 검증
  required.forEach(key => {
    if (!env[key] || env[key] === `your_${key.toLowerCase()}`) {
      missing.push(key);
    }
  });

  // 선택적 환경 변수 검증
  optional.forEach(key => {
    if (!env[key] || env[key] === `your_${key.toLowerCase()}`) {
      warnings.push(key);
    }
  });

  return { missing, warnings, context };
}

function main() {
  console.log('🔍 환경 변수 검증 중...\n');

  const results = [];

  // 루트 환경 변수 검증
  const rootEnv = loadEnvFile('.env');
  results.push(validateEnvVars(rootEnv, requiredEnvVars.root, optionalEnvVars.root, 'Root'));

  // API 서비스 환경 변수 검증
  const apiEnv = loadEnvFile('services/api/.env');
  results.push(validateEnvVars(apiEnv, requiredEnvVars.api, optionalEnvVars.api, 'API Service'));

  // 웹 애플리케이션 환경 변수 검증
  const webEnv = loadEnvFile('apps/web/.env');
  results.push(validateEnvVars(webEnv, requiredEnvVars.web, optionalEnvVars.web, 'Web App'));

  let hasErrors = false;
  let hasWarnings = false;

  results.forEach(({ missing, warnings, context }) => {
    if (missing.length > 0) {
      console.log(`❌ ${context} - 누락된 필수 환경 변수:`);
      missing.forEach(key => console.log(`   - ${key}`));
      hasErrors = true;
    }

    if (warnings.length > 0) {
      console.log(`⚠️  ${context} - 누락된 선택적 환경 변수:`);
      warnings.forEach(key => console.log(`   - ${key}`));
      hasWarnings = true;
    }

    if (missing.length === 0 && warnings.length === 0) {
      console.log(`✅ ${context} - 모든 환경 변수가 설정됨`);
    }

    console.log('');
  });

  if (hasErrors) {
    console.log('🚨 필수 환경 변수가 누락되었습니다. 애플리케이션이 정상적으로 작동하지 않을 수 있습니다.');
    process.exit(1);
  }

  if (hasWarnings) {
    console.log('⚠️  일부 선택적 환경 변수가 누락되었습니다. 일부 기능이 제한될 수 있습니다.');
  }

  if (!hasErrors && !hasWarnings) {
    console.log('🎉 모든 환경 변수가 올바르게 설정되었습니다!');
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateEnvVars, loadEnvFile }; 