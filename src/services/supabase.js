import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 단어 세트 가져오기
export const getWordSets = async () => {
  const { data, error } = await supabase
    .from('word_sets')
    .select('*')
    .order('set_number');

  if (error) {
    console.error('Error fetching word sets:', error);
    return null;
  }
  return data;
};

// 특정 세트의 단어 목록 가져오기
export const getWordsBySet = async (setNumber) => {
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('set_number', setNumber)
    .order('id');

  if (error) {
    console.error('Error fetching words:', error);
    return null;
  }
  return data;
};

// 모든 단어 가져오기
export const getAllWords = async () => {
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .order('set_number, id');

  if (error) {
    console.error('Error fetching all words:', error);
    return null;
  }
  return data;
};

// 한국어 뜻 가져오기
export const getKoreanMeanings = async () => {
  const { data, error } = await supabase
    .from('korean_meanings')
    .select('*');

  if (error) {
    console.error('Error fetching korean meanings:', error);
    return null;
  }

  // 객체 형태로 변환 { word: meaning }
  const meanings = {};
  data?.forEach(item => {
    meanings[item.word] = item.meaning;
  });
  return meanings;
};

// 단어 추가
export const addWord = async (word, setNumber = null) => {
  const { data, error } = await supabase
    .from('words')
    .insert([{
      word: word.word,
      set_number: setNumber,
      is_custom: true
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding word:', error);
    return null;
  }
  return data;
};

// 한국어 뜻 추가/수정
export const upsertKoreanMeaning = async (word, meaning) => {
  const { data, error } = await supabase
    .from('korean_meanings')
    .upsert([{ word, meaning }], { onConflict: 'word' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting korean meaning:', error);
    return null;
  }
  return data;
};

export default supabase;
