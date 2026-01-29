import { useState, useCallback } from 'react';
import { playPronunciation } from '../services/dictionaryApi';
import ChatBot from './ChatBot';

// 단어 배열에서 랜덤 단어 선택
const getRandomWordFromList = (words, excludeIds = []) => {
  const availableWords = words.filter(w => !excludeIds.includes(w.id));
  if (availableWords.length === 0) return null;
  return availableWords[Math.floor(Math.random() * availableWords.length)];
};

const StudyMode = ({
  onMarkAsLearned,
  onMarkAsKnown,
  learnedWordIds,
  knownWordIds = [],
  allWords,
  selectedWordSet,
  setSelectedWordSet,
  wordSets
}) => {
  // 이미 아는 단어는 제외한 학습 대상 단어
  const studyWords = allWords.filter(w => !knownWordIds.includes(w.id));

  const [currentWord, setCurrentWord] = useState(() => getRandomWordFromList(studyWords));
  const [showMeaning, setShowMeaning] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [wordHistory, setWordHistory] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleNextWord = useCallback(() => {
    if (currentWord) {
      setWordHistory(prev => [...prev, currentWord]);
    }
    const nextWord = getRandomWordFromList(studyWords, [currentWord?.id]);
    setCurrentWord(nextWord);
    setShowMeaning(false);
    setShowExample(false);
  }, [currentWord, studyWords]);

  const handlePrevWord = useCallback(() => {
    if (wordHistory.length > 0) {
      const prevWord = wordHistory[wordHistory.length - 1];
      setWordHistory(prev => prev.slice(0, -1));
      setCurrentWord(prevWord);
      setShowMeaning(false);
      setShowExample(false);
    }
  }, [wordHistory]);

  const handleMarkAsLearned = () => {
    if (currentWord && !learnedWordIds.includes(currentWord.id)) {
      onMarkAsLearned(currentWord);
    }
    handleNextWord();
  };

  // 이미 알고 있는 단어로 표시 (복습/내 단어에 추가 안함)
  const handleMarkAsKnown = () => {
    if (currentWord) {
      onMarkAsKnown(currentWord.id);
      // 다음 단어로 이동 (히스토리에 추가하지 않음)
      const nextWord = getRandomWordFromList(
        studyWords.filter(w => w.id !== currentWord.id),
        []
      );
      setCurrentWord(nextWord);
      setShowMeaning(false);
      setShowExample(false);
    }
  };

  const handlePlayAudio = () => {
    if (currentWord?.audioUrl) {
      playPronunciation(currentWord.audioUrl);
    }
  };

  const isAlreadyLearned = currentWord && learnedWordIds.includes(currentWord.id);

  // 단어 세트 변경 핸들러
  const handleWordSetChange = (setNumber) => {
    setSelectedWordSet(setNumber);
    setCurrentWord(null);
    setWordHistory([]);
    setShowMeaning(false);
    setShowExample(false);
  };

  if (!currentWord || studyWords.length === 0) {
    return (
      <div className="study-container">
        {/* 단어 세트 선택 */}
        <div className="word-set-selector">
          <h3>단어 세트 선택</h3>
          <div className="word-set-buttons">
            {Object.entries(wordSets).map(([setNum, setInfo]) => (
              <button
                key={setNum}
                className={`word-set-btn ${selectedWordSet === Number(setNum) ? 'active' : ''}`}
                onClick={() => handleWordSetChange(Number(setNum))}
              >
                <span className="set-name">{setInfo.name}</span>
                <span className="set-description">{setInfo.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="empty-state success">
          <h3>학습 완료!</h3>
          <p>이 세트의 모든 단어를 학습했습니다.</p>
          <p className="stats-summary">
            암기 완료: {learnedWordIds.length}개 | 이미 아는 단어: {knownWordIds.length}개
          </p>
          <p className="next-set-tip">다른 단어 세트를 선택해서 학습을 계속하세요!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="study-container">
      {/* 단어 세트 선택 */}
      <div className="word-set-selector compact">
        <div className="word-set-buttons">
          {Object.entries(wordSets).map(([setNum, setInfo]) => (
            <button
              key={setNum}
              className={`word-set-btn ${selectedWordSet === Number(setNum) ? 'active' : ''}`}
              onClick={() => handleWordSetChange(Number(setNum))}
            >
              <span className="set-name">{setInfo.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="study-header">
        <h2>학습 모드</h2>
        <div className="study-stats">
          <span>남은 단어: {studyWords.length}개</span>
          <span>암기: {learnedWordIds.length}개</span>
        </div>
      </div>

      <div className="word-card">
        <div className="word-main">
          <h1 className="word-text">{currentWord.word}</h1>
          <div className="pronunciation-row">
            <p className="word-pronunciation">{currentWord.pronunciation}</p>
            {currentWord.audioUrl && (
              <button className="audio-btn" onClick={handlePlayAudio} title="발음 듣기">
                🔊
              </button>
            )}
          </div>
          {currentWord.isCustom && (
            <span className="custom-badge">직접 추가</span>
          )}
        </div>

        {isAlreadyLearned && (
          <div className="already-learned-badge">
            이미 암기한 단어입니다
          </div>
        )}

        <div className="word-details">
          <button
            className={`reveal-btn ${showMeaning ? 'revealed' : ''}`}
            onClick={() => setShowMeaning(!showMeaning)}
          >
            {showMeaning ? '뜻 숨기기' : '뜻 보기'}
          </button>

          {showMeaning && (
            <div className="meaning-box">
              <p className="meaning-text">{currentWord.meaning}</p>
            </div>
          )}

          <button
            className={`reveal-btn example-btn ${showExample ? 'revealed' : ''}`}
            onClick={() => setShowExample(!showExample)}
          >
            {showExample ? '예문 숨기기' : '예문 보기'}
          </button>

          {showExample && (
            <div className="example-box">
              {currentWord.example ? (
                <p className="example-text">"{currentWord.example}"</p>
              ) : (
                <p className="no-example">예문이 없습니다.</p>
              )}
            </div>
          )}

          {/* 외부 사전 링크 */}
          <div className="dictionary-links">
            <a
              href={`https://en.dict.naver.com/#/search?query=${encodeURIComponent(currentWord.word)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="dict-link naver"
            >
              네이버 사전
            </a>
            <a
              href={`https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(currentWord.word)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="dict-link oxford"
            >
              Oxford 사전
            </a>
            <button
              className="dict-link ai-chat"
              onClick={() => setIsChatOpen(true)}
            >
              💬 AI에게 질문
            </button>
          </div>
        </div>

        <div className="action-buttons">
          <button
            className="btn-prev"
            onClick={handlePrevWord}
            disabled={wordHistory.length === 0}
          >
            ← 이전
          </button>
          <button
            className={`btn-learned ${isAlreadyLearned ? 'disabled' : ''}`}
            onClick={handleMarkAsLearned}
            disabled={isAlreadyLearned}
          >
            {isAlreadyLearned ? '이미 암기함' : '암기 완료'}
          </button>
          <button
            className="btn-skip"
            onClick={handleNextWord}
          >
            다음 →
          </button>
        </div>

        <div className="secondary-actions">
          <button
            className="btn-known"
            onClick={handleMarkAsKnown}
          >
            이미 알아요 (다시 안 볼래요)
          </button>
        </div>
      </div>

      <div className="study-tip">
        <p>Tip: 단어를 보고 뜻을 먼저 떠올려 본 후 확인해보세요!</p>
      </div>

      {/* AI 챗봇 */}
      <ChatBot
        word={currentWord}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
};

export default StudyMode;
