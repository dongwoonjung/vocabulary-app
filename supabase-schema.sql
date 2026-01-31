-- 단어 세트 테이블
CREATE TABLE word_sets (
  id SERIAL PRIMARY KEY,
  set_number INTEGER UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 단어 테이블
CREATE TABLE words (
  id SERIAL PRIMARY KEY,
  word VARCHAR(100) NOT NULL,
  set_number INTEGER REFERENCES word_sets(set_number),
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 한국어 뜻 테이블
CREATE TABLE korean_meanings (
  id SERIAL PRIMARY KEY,
  word VARCHAR(100) UNIQUE NOT NULL,
  meaning TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 인덱스 생성
CREATE INDEX idx_words_set_number ON words(set_number);
CREATE INDEX idx_words_word ON words(word);
CREATE INDEX idx_korean_meanings_word ON korean_meanings(word);

-- RLS (Row Level Security) 활성화
ALTER TABLE word_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE korean_meanings ENABLE ROW LEVEL SECURITY;

-- 읽기 정책 (모든 사용자 읽기 가능)
CREATE POLICY "Enable read access for all users" ON word_sets FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON words FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON korean_meanings FOR SELECT USING (true);

-- 쓰기 정책 (모든 사용자 쓰기 가능 - 필요시 인증 추가 가능)
CREATE POLICY "Enable insert for all users" ON words FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON korean_meanings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON korean_meanings FOR UPDATE USING (true);

-- 기본 단어 세트 데이터 삽입
INSERT INTO word_sets (set_number, name, description) VALUES
(1, '세트 1', '필수 영단어 150개'),
(2, '세트 2', '필수 영단어 150개'),
(3, '세트 3', '필수 영단어 150개'),
(4, '세트 4', '필수 영단어 150개'),
(5, '수능 고난도', '고급 어휘 150개');
