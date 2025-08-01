-- 사용량 메트릭 테이블 생성
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  api_calls INTEGER NOT NULL DEFAULT 0,
  cost DECIMAL(10, 4) NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_usage_metrics_organization_date 
ON usage_metrics(organization_id, date);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_date 
ON usage_metrics(user_id, date);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_date 
ON usage_metrics(date);

-- RLS 정책 (개발 환경에서는 비활성화)
-- ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- 사용량 메트릭 조회 함수
CREATE OR REPLACE FUNCTION get_usage_summary(
  p_organization_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_tokens BIGINT,
  total_cost DECIMAL(10, 4),
  total_api_calls BIGINT,
  avg_daily_tokens DECIMAL(10, 2),
  avg_daily_cost DECIMAL(10, 4)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(tokens_used), 0) as total_tokens,
    COALESCE(SUM(cost), 0) as total_cost,
    COALESCE(SUM(api_calls), 0) as total_api_calls,
    COALESCE(AVG(tokens_used), 0) as avg_daily_tokens,
    COALESCE(AVG(cost), 0) as avg_daily_cost
  FROM usage_metrics 
  WHERE organization_id = p_organization_id
    AND (p_start_date IS NULL OR date >= p_start_date)
    AND (p_end_date IS NULL OR date <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- 월별 사용량 집계 함수
CREATE OR REPLACE FUNCTION get_monthly_usage(
  p_organization_id UUID,
  p_months INTEGER DEFAULT 12
)
RETURNS TABLE (
  month DATE,
  total_tokens BIGINT,
  total_cost DECIMAL(10, 4),
  total_api_calls BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', date) as month,
    COALESCE(SUM(tokens_used), 0) as total_tokens,
    COALESCE(SUM(cost), 0) as total_cost,
    COALESCE(SUM(api_calls), 0) as total_api_calls
  FROM usage_metrics 
  WHERE organization_id = p_organization_id
    AND date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * p_months)
  GROUP BY DATE_TRUNC('month', date)
  ORDER BY month DESC;
END;
$$ LANGUAGE plpgsql; 