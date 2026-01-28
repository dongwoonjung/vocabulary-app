import { createClient } from '@supabase/supabase-js';

// Supabase 설정
// .env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정하세요
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// 단어 관련 함수들
export const wordService = {
  // 모든 단어 가져오기
  async getAllWords() {
    if (!supabase) return { data: [], error: 'Supabase not configured' };

    const { data, error } = await supabase
      .from('words')
      .select('*')
      .order('id', { ascending: true });

    return { data: data || [], error };
  },

  // 랜덤 단어 가져오기
  async getRandomWord(excludeIds = []) {
    if (!supabase) return { data: null, error: 'Supabase not configured' };

    let query = supabase
      .from('words')
      .select('*');

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return { data: null, error };
    }

    const randomIndex = Math.floor(Math.random() * data.length);
    return { data: data[randomIndex], error: null };
  },

  // 단어 추가
  async addWord(word) {
    if (!supabase) return { data: null, error: 'Supabase not configured' };

    const { data, error } = await supabase
      .from('words')
      .insert([{
        word: word.word,
        meaning: word.meaning || null,
        example: word.example || null,
        pronunciation: word.pronunciation || null,
      }])
      .select()
      .single();

    return { data, error };
  },

  // 단어 업데이트 (뜻, 예문 등)
  async updateWord(id, updates) {
    if (!supabase) return { data: null, error: 'Supabase not configured' };

    const { data, error } = await supabase
      .from('words')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  // 단어 삭제
  async deleteWord(id) {
    if (!supabase) return { error: 'Supabase not configured' };

    const { error } = await supabase
      .from('words')
      .delete()
      .eq('id', id);

    return { error };
  },

  // 단어 검색
  async searchWords(query) {
    if (!supabase) return { data: [], error: 'Supabase not configured' };

    const { data, error } = await supabase
      .from('words')
      .select('*')
      .or(`word.ilike.%${query}%,meaning.ilike.%${query}%`);

    return { data: data || [], error };
  }
};

// 학습 기록 관련 함수들
export const learningService = {
  // 학습 기록 가져오기
  async getLearningRecords() {
    if (!supabase) return { data: [], error: 'Supabase not configured' };

    const { data, error } = await supabase
      .from('learning_records')
      .select(`
        *,
        words (*)
      `)
      .order('learned_at', { ascending: false });

    return { data: data || [], error };
  },

  // 학습 기록 추가
  async addLearningRecord(wordId) {
    if (!supabase) return { data: null, error: 'Supabase not configured' };

    const { data, error } = await supabase
      .from('learning_records')
      .insert([{
        word_id: wordId,
        learned_at: new Date().toISOString(),
        review_level: 0,
        review_count: 0,
        next_review_date: new Date().toISOString(),
      }])
      .select()
      .single();

    return { data, error };
  },

  // 학습 기록 업데이트
  async updateLearningRecord(id, updates) {
    if (!supabase) return { data: null, error: 'Supabase not configured' };

    const { data, error } = await supabase
      .from('learning_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  // 학습 기록 삭제
  async deleteLearningRecord(wordId) {
    if (!supabase) return { error: 'Supabase not configured' };

    const { error } = await supabase
      .from('learning_records')
      .delete()
      .eq('word_id', wordId);

    return { error };
  }
};

export default supabase;
