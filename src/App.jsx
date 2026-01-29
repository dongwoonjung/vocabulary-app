import { useState, useCallback, useEffect } from 'react';
import StudyMode from './components/StudyMode';
import ReviewMode from './components/ReviewMode';
import WordList from './components/WordList';
import AddWordModal from './components/AddWordModal';
import { useLocalStorage } from './hooks/useLocalStorage';
import { wordList, koreanMeanings } from './data/words';
import { dictionaryApi } from './services/dictionaryApi';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('study');
  const [learnedWords, setLearnedWords] = useLocalStorage('vocabulary-learned-words', []);
  const [customWords, setCustomWords] = useLocalStorage('vocabulary-custom-words', []);
  const [knownWords, setKnownWords] = useLocalStorage('vocabulary-known-words', []); // 이미 아는 단어
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // API에서 가져온 단어 데이터 캐시
  const [wordCache, setWordCache] = useLocalStorage('vocabulary-word-cache', {});
  const [loadedWords, setLoadedWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });

  // 앱 시작 시 단어 데이터 로드
  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = async () => {
    setIsLoading(true);
    const words = [];
    const newCache = { ...wordCache };
    const wordsToFetch = [];

    // 캐시에 없는 단어 확인
    wordList.forEach((word, index) => {
      if (wordCache[word]) {
        // 캐시에서 가져오기
        words.push({
          id: index + 1,
          ...wordCache[word],
          meaning: koreanMeanings[word] || wordCache[word].meaningText,
        });
      } else {
        wordsToFetch.push({ word, index });
      }
    });

    setLoadingProgress({ current: words.length, total: wordList.length });

    // 캐시에 없는 단어만 API에서 가져오기 (배치 처리)
    if (wordsToFetch.length > 0) {
      const batchSize = 5; // 동시 요청 수 제한

      for (let i = 0; i < wordsToFetch.length; i += batchSize) {
        const batch = wordsToFetch.slice(i, i + batchSize);

        const results = await Promise.all(
          batch.map(async ({ word, index }) => {
            const { data } = await dictionaryApi.getWordInfo(word);

            if (data) {
              const wordData = {
                id: index + 1,
                word: data.word,
                pronunciation: data.pronunciation,
                audioUrl: data.audioUrl,
                example: data.exampleText,
                meaningText: data.meaningText,
                meaning: koreanMeanings[word] || data.meaningText,
              };

              // 캐시에 저장
              newCache[word] = {
                word: data.word,
                pronunciation: data.pronunciation,
                audioUrl: data.audioUrl,
                example: data.exampleText,
                meaningText: data.meaningText,
              };

              return wordData;
            } else {
              // API 실패 시 기본 데이터 사용
              return {
                id: index + 1,
                word: word,
                pronunciation: '',
                audioUrl: '',
                example: '',
                meaning: koreanMeanings[word] || '',
                meaningText: '',
              };
            }
          })
        );

        words.push(...results);
        setLoadingProgress({ current: words.length, total: wordList.length });

        // API 요청 간 딜레이 (rate limiting 방지)
        if (i + batchSize < wordsToFetch.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // 캐시 업데이트
      setWordCache(newCache);
    }

    // ID 순으로 정렬
    words.sort((a, b) => a.id - b.id);
    setLoadedWords(words);
    setIsLoading(false);
  };

  // 전체 단어 목록 (기본 + 사용자 추가)
  const allWords = [...loadedWords, ...customWords];

  // 단어 암기 완료 처리
  const handleMarkAsLearned = useCallback((word) => {
    const newLearnedWord = {
      ...word,
      learnedAt: new Date().toISOString(),
      reviewLevel: 0,
      reviewCount: 0,
      nextReviewDate: new Date().toISOString(),
    };

    setLearnedWords(prev => {
      if (prev.some(w => w.id === word.id)) {
        return prev;
      }
      return [...prev, newLearnedWord];
    });
  }, [setLearnedWords]);

  // 단어 정보 업데이트 (복습 후)
  const handleUpdateWord = useCallback((updatedWord) => {
    setLearnedWords(prev =>
      prev.map(word =>
        word.id === updatedWord.id ? updatedWord : word
      )
    );
  }, [setLearnedWords]);

  // 단어 삭제
  const handleRemoveWord = useCallback((wordId) => {
    setLearnedWords(prev => prev.filter(word => word.id !== wordId));
  }, [setLearnedWords]);

  // 새 단어 추가 (Dictionary API에서 가져온)
  const handleAddWord = useCallback((wordData) => {
    const newId = Date.now(); // 고유 ID 생성
    const newWord = {
      id: newId,
      word: wordData.word,
      meaning: wordData.meaning,
      example: wordData.example || '',
      pronunciation: wordData.pronunciation || '',
      audioUrl: wordData.audioUrl || '',
      isCustom: true,
    };

    setCustomWords(prev => [...prev, newWord]);
  }, [setCustomWords]);

  // 이미 아는 단어로 표시 (복습/내 단어에 추가 안함)
  const handleMarkAsKnown = useCallback((wordId) => {
    setKnownWords(prev => {
      if (prev.includes(wordId)) return prev;
      return [...prev, wordId];
    });
  }, [setKnownWords]);

  // 직접 추가한 단어 삭제
  const handleRemoveCustomWord = useCallback((wordId) => {
    setCustomWords(prev => prev.filter(word => word.id !== wordId));
  }, [setCustomWords]);

  // 학습한 단어 ID 목록
  const learnedWordIds = learnedWords.map(w => w.id);

  // 오늘 복습할 단어 수 계산
  const dueForReviewCount = learnedWords.filter(word => {
    if (!word.nextReviewDate) return true;
    return new Date(word.nextReviewDate) <= new Date();
  }).length;

  // 로딩 화면
  if (isLoading) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>지오의 영어단어장</h1>
          <p className="subtitle">Fighting Zio!!</p>
        </header>
        <main className="main-content">
          <div className="loading-screen">
            <div className="loading-spinner">단어 데이터 로딩 중...</div>
            <div className="loading-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                />
              </div>
              <p className="progress-text">
                {loadingProgress.current} / {loadingProgress.total} 단어
              </p>
            </div>
            <p className="loading-tip">
              처음 실행 시 단어 정보를 가져옵니다.<br />
              이후에는 캐시에서 빠르게 로드됩니다.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>영어 단어장</h1>
        <p className="subtitle">고등학교 필수 영단어 학습</p>
        <button
          className="add-word-btn"
          onClick={() => setIsAddModalOpen(true)}
        >
          + 단어 추가
        </button>
      </header>

      <nav className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'study' ? 'active' : ''}`}
          onClick={() => setActiveTab('study')}
        >
          <span className="tab-icon">📚</span>
          <span className="tab-label">학습</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          <span className="tab-icon">🔄</span>
          <span className="tab-label">복습</span>
          {dueForReviewCount > 0 && (
            <span className="badge">{dueForReviewCount}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-label">내 단어</span>
          {learnedWords.length > 0 && (
            <span className="badge-secondary">{learnedWords.length}</span>
          )}
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'study' && (
          <StudyMode
            onMarkAsLearned={handleMarkAsLearned}
            onMarkAsKnown={handleMarkAsKnown}
            learnedWordIds={learnedWordIds}
            knownWordIds={knownWords}
            allWords={allWords}
          />
        )}
        {activeTab === 'review' && (
          <ReviewMode
            learnedWords={learnedWords}
            onUpdateWord={handleUpdateWord}
            onRemoveWord={handleRemoveWord}
          />
        )}
        {activeTab === 'list' && (
          <WordList
            learnedWords={learnedWords}
            customWords={customWords}
            onRemoveWord={handleRemoveWord}
            onRemoveCustomWord={handleRemoveCustomWord}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>총 {allWords.length}개 단어 | 매일 조금씩, 꾸준히 학습하세요!</p>
      </footer>

      <AddWordModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddWord={handleAddWord}
      />
    </div>
  );
}

export default App;
