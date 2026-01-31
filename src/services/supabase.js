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

// ===== 폴더 관련 함수 =====

// 모든 폴더 가져오기
export const getFolders = async () => {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching folders:', error);
    return [];
  }
  return data;
};

// 폴더 생성
export const createFolder = async (name) => {
  const { data, error } = await supabase
    .from('folders')
    .insert([{ name }])
    .select()
    .single();

  if (error) {
    console.error('Error creating folder:', error);
    return null;
  }
  return data;
};

// 폴더 삭제
export const deleteFolder = async (folderId) => {
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId);

  if (error) {
    console.error('Error deleting folder:', error);
    return false;
  }
  return true;
};

// 폴더에 단어 추가
export const addWordToFolder = async (wordId, folderId) => {
  const { data, error } = await supabase
    .from('word_folders')
    .insert([{ word_id: wordId, folder_id: folderId }])
    .select()
    .single();

  if (error) {
    console.error('Error adding word to folder:', error);
    return null;
  }
  return data;
};

// 폴더에서 단어 제거
export const removeWordFromFolder = async (wordId, folderId) => {
  const { error } = await supabase
    .from('word_folders')
    .delete()
    .eq('word_id', wordId)
    .eq('folder_id', folderId);

  if (error) {
    console.error('Error removing word from folder:', error);
    return false;
  }
  return true;
};

// 폴더의 단어 목록 가져오기
export const getWordsByFolder = async (folderId) => {
  const { data, error } = await supabase
    .from('word_folders')
    .select('word_id')
    .eq('folder_id', folderId);

  if (error) {
    console.error('Error fetching folder words:', error);
    return [];
  }
  return data.map(item => item.word_id);
};

// 커스텀 단어 추가 (폴더와 함께)
export const addCustomWord = async (wordData, folderId = null) => {
  // 1. 단어 추가
  const { data: wordResult, error: wordError } = await supabase
    .from('words')
    .insert([{
      word: wordData.word,
      set_number: null,
      is_custom: true
    }])
    .select()
    .single();

  if (wordError) {
    console.error('Error adding custom word:', wordError);
    return null;
  }

  // 2. 한국어 뜻 추가
  if (wordData.meaning) {
    await upsertKoreanMeaning(wordData.word, wordData.meaning);
  }

  // 3. 폴더에 추가
  if (folderId && wordResult) {
    await addWordToFolder(wordResult.id, folderId);
  }

  return wordResult;
};

// 커스텀 단어 목록 가져오기
export const getCustomWords = async () => {
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('is_custom', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching custom words:', error);
    return [];
  }
  return data;
};

// 커스텀 단어 삭제
export const deleteCustomWord = async (wordId) => {
  const { error } = await supabase
    .from('words')
    .delete()
    .eq('id', wordId)
    .eq('is_custom', true);

  if (error) {
    console.error('Error deleting custom word:', error);
    return false;
  }
  return true;
};

export default supabase;
