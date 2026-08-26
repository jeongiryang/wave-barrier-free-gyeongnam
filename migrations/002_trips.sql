-- 공유 여행과 접근성 제보. 런타임 DDL(server/trips/database.ts)과 같은 내용이며
-- 이 파일이 스키마의 기준이다.

CREATE TABLE IF NOT EXISTS itineraries (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS place_feedback (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL,
  place_name TEXT NOT NULL,
  field TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  created_at BIGINT NOT NULL
);

-- expires_at: 보관 기간이 지난 행을 지우는 정리 질의용
-- created_at: 익명 쓰기 예산을 세는 질의용
CREATE INDEX IF NOT EXISTS itineraries_expires_idx ON itineraries (expires_at);
CREATE INDEX IF NOT EXISTS itineraries_created_idx ON itineraries (created_at);
CREATE INDEX IF NOT EXISTS place_feedback_created_idx ON place_feedback (created_at);
