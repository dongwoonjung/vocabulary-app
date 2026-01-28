// Free Dictionary API 서비스
// https://dictionaryapi.dev/ - 무료, API 키 불필요

const BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export const dictionaryApi = {
  // 단어 정보 가져오기 (뜻, 예문, 발음 등)
  async getWordInfo(word) {
    try {
      const response = await fetch(`${BASE_URL}/${encodeURIComponent(word)}`);

      if (!response.ok) {
        if (response.status === 404) {
          return { data: null, error: '단어를 찾을 수 없습니다.' };
        }
        return { data: null, error: '사전 API 오류가 발생했습니다.' };
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        return { data: null, error: '단어 정보가 없습니다.' };
      }

      // 첫 번째 결과 파싱
      const entry = data[0];
      const parsed = parseWordEntry(entry);

      return { data: parsed, error: null };
    } catch (error) {
      console.error('Dictionary API Error:', error);
      return { data: null, error: '네트워크 오류가 발생했습니다.' };
    }
  },

  // 여러 단어 정보 한번에 가져오기
  async getMultipleWords(words) {
    const results = await Promise.all(
      words.map(word => this.getWordInfo(word))
    );
    return results;
  }
};

// API 응답을 우리 앱 형식으로 변환
function parseWordEntry(entry) {
  const word = entry.word;

  // 발음 가져오기
  let pronunciation = '';
  if (entry.phonetic) {
    pronunciation = entry.phonetic;
  } else if (entry.phonetics && entry.phonetics.length > 0) {
    const phonetic = entry.phonetics.find(p => p.text) || entry.phonetics[0];
    pronunciation = phonetic.text || '';
  }

  // 발음 오디오 URL
  let audioUrl = '';
  if (entry.phonetics && entry.phonetics.length > 0) {
    const withAudio = entry.phonetics.find(p => p.audio && p.audio.length > 0);
    if (withAudio) {
      audioUrl = withAudio.audio;
    }
  }

  // 의미들 파싱
  const meanings = [];
  const examples = [];

  if (entry.meanings) {
    entry.meanings.forEach(meaning => {
      const partOfSpeech = meaning.partOfSpeech; // 품사 (noun, verb, etc.)

      if (meaning.definitions) {
        meaning.definitions.forEach((def, index) => {
          // 주요 의미만 수집 (최대 3개)
          if (meanings.length < 3) {
            meanings.push({
              partOfSpeech,
              definition: def.definition,
            });
          }

          // 예문 수집 (최대 2개)
          if (def.example && examples.length < 2) {
            examples.push(def.example);
          }
        });
      }
    });
  }

  // 한국어 뜻은 없으므로 영어 정의를 사용
  // 나중에 번역 API를 추가하면 한국어로 변환 가능
  const meaningText = meanings
    .map(m => `(${m.partOfSpeech}) ${m.definition}`)
    .join(' / ');

  const exampleText = examples.length > 0 ? examples[0] : '';

  return {
    word,
    pronunciation,
    audioUrl,
    meanings, // 상세 의미 배열
    meaningText, // 간단한 텍스트 형태
    examples, // 예문 배열
    exampleText, // 첫 번째 예문
    raw: entry, // 원본 데이터
  };
}

// 발음 재생 함수
export function playPronunciation(audioUrl) {
  if (!audioUrl) {
    console.warn('No audio URL provided');
    return;
  }

  const audio = new Audio(audioUrl);
  audio.play().catch(err => {
    console.error('Error playing audio:', err);
  });
}

export default dictionaryApi;
