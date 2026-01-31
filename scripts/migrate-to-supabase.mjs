// Supabase 마이그레이션 스크립트
// 실행: node scripts/migrate-to-supabase.mjs

import { createClient } from '@supabase/supabase-js';
import { wordSet1, wordSet2, wordSet3, wordSet4, wordSet5, koreanMeanings } from '../src/data/words.js';

const supabaseUrl = 'https://folexxqufacvnyrhpfjq.supabase.co';
const supabaseKey = 'sb_publishable_Q7sbTi3fwH6RB5xd0oEhkA_YeHp9nQc';

const supabase = createClient(supabaseUrl, supabaseKey);

const wordSets = [
  { setNumber: 1, words: wordSet1 },
  { setNumber: 2, words: wordSet2 },
  { setNumber: 3, words: wordSet3 },
  { setNumber: 4, words: wordSet4 },
  { setNumber: 5, words: wordSet5 },
];

async function migrateWords() {
  console.log('단어 마이그레이션 시작...');

  for (const set of wordSets) {
    console.log('세트 ' + set.setNumber + ' 마이그레이션 중...');
    
    const wordsToInsert = set.words.map(word => ({
      word,
      set_number: set.setNumber,
      is_custom: false
    }));

    const { data, error } = await supabase
      .from('words')
      .insert(wordsToInsert);

    if (error) {
      console.error('세트 ' + set.setNumber + ' 에러:', error.message);
    } else {
      console.log('세트 ' + set.setNumber + ': ' + set.words.length + '개 단어 삽입 완료');
    }
  }
}

async function migrateKoreanMeanings() {
  console.log('\n한국어 뜻 마이그레이션 시작...');

  const meaningsToInsert = Object.entries(koreanMeanings).map(([word, meaning]) => ({
    word,
    meaning
  }));

  // 배치로 나눠서 삽입 (100개씩)
  const batchSize = 100;
  for (let i = 0; i < meaningsToInsert.length; i += batchSize) {
    const batch = meaningsToInsert.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('korean_meanings')
      .insert(batch);

    if (error) {
      console.error('한국어 뜻 에러:', error.message);
    } else {
      console.log('한국어 뜻: ' + (i + batch.length) + '/' + meaningsToInsert.length + ' 삽입 완료');
    }
  }
}

async function main() {
  try {
    await migrateWords();
    await migrateKoreanMeanings();
    console.log('\n마이그레이션 완료!');
  } catch (error) {
    console.error('마이그레이션 실패:', error);
  }
}

main();
