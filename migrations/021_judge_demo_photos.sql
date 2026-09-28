-- Public sample-photo catalog. JPEG assets contain synthetic capture times and no GPS.
-- These are illustrative images, never evidence of an actual visit or facility.
CREATE TABLE IF NOT EXISTS judge_demo_photos (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL UNIQUE,
  caption TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  CHECK (file_name ~ '^sample-[a-z]+[.]jpg$')
);
-- migrate:split
INSERT INTO judge_demo_photos (id, file_name, caption, sort_order) VALUES
('coast', 'sample-coast.jpg', '첫째 날 오전, 바닷길 예시', 1),
('garden', 'sample-garden.jpg', '첫째 날 오후, 정원 예시', 2),
('riverside', 'sample-riverside.jpg', '둘째 날 오전, 강변 예시', 3)
ON CONFLICT (id) DO NOTHING;
