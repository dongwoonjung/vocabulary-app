import { useState, useMemo, useCallback } from 'react';

// 간격 반복(Spaced Repetition) 간격 설정 (일 단위)
const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60]; // 1일, 3일, 7일, 14일, 30일, 60일

const ReviewMode = ({ learnedWords, onUpdateWord, onRemoveWord }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [filter, setFilter] = useState('due'); // 'due', 'all', 'today'

  // 오늘 복습할 단어들 필터링
  const wordsToReview = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (filter === 'all') {
      return learnedWords;
    }

    if (filter === 'today') {
      return learnedWords.filter(word => {
        const learnedDate = new Date(word.learnedAt);
        const learnedDay = new Date(learnedDate.getFullYear(), learnedDate.getMonth(), learnedDate.getDate()).getTime();
        return learnedDay === today;
      });
    }

    // 'due' - 복습 예정인 단어들
    return learnedWords.filter(word => {
      if (!word.nextReviewDate) return true;
      return new Date(word.nextReviewDate).getTime() <= now.getTime();
    });
  }, [learnedWords, filter]);

  const currentWord = wordsToReview[currentIndex];

  const handleNext = useCallback(() => {
    setShowMeaning(false);
    setShowExample(false);
    if (currentIndex < wordsToReview.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  }, [currentIndex, wordsToReview.length]);

  const handlePrevious = () => {
    setShowMeaning(false);
    setShowExample(false);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(wordsToReview.length - 1);
    }
  };

  // 기억함 - 다음 복습 간격으로 이동
  const handleRemembered = () => {
    if (!currentWord) return;

    const currentLevel = currentWord.reviewLevel || 0;
    const nextLevel = Math.min(currentLevel + 1, REVIEW_INTERVALS.length - 1);
    const daysUntilNext = REVIEW_INTERVALS[nextLevel];

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + daysUntilNext);

    onUpdateWord({
      ...currentWord,
      reviewLevel: nextLevel,
      nextReviewDate: nextReviewDate.toISOString(),
      lastReviewedAt: new Date().toISOString(),
      reviewCount: (currentWord.reviewCount || 0) + 1,
    });

    handleNext();
  };

  // 기억 안 남 - 복습 간격 초기화
  const handleForgotten = () => {
    if (!currentWord) return;

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + 1);

    onUpdateWord({
      ...currentWord,
      reviewLevel: 0,
      nextReviewDate: nextReviewDate.toISOString(),
      lastReviewedAt: new Date().toISOString(),
      reviewCount: (currentWord.reviewCount || 0) + 1,
    });

    handleNext();
  };

  // 암기 목록에서 제거
  const handleRemove = () => {
    if (!currentWord) return;
    if (window.confirm('이 단어를 암기 목록에서 제거하시겠습니까?')) {
      onRemoveWord(currentWord.id);
      if (currentIndex >= wordsToReview.length - 1) {
        setCurrentIndex(Math.max(0, wordsToReview.length - 2));
      }
    }
  };

  const getReviewStatus = (word) => {
    if (!word.reviewLevel) return '새 단어';
    const level = word.reviewLevel;
    const interval = REVIEW_INTERVALS[level];
    return `${interval}일 후 복습`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  if (learnedWords.length === 0) {
    return (
      <div className="review-container">
        <div className="empty-state">
          <h3>아직 암기한 단어가 없습니다</h3>
          <p>학습 모드에서 단어를 암기해보세요!</p>
        </div>
      </div>
    );
  }

  if (wordsToReview.length === 0) {
    return (
      <div className="review-container">
        <div className="review-header">
          <h2>복습 모드</h2>
          <div className="filter-buttons">
            <button
              className={filter === 'due' ? 'active' : ''}
              onClick={() => setFilter('due')}
            >
              복습 예정
            </button>
            <button
              className={filter === 'today' ? 'active' : ''}
              onClick={() => setFilter('today')}
            >
              오늘 학습
            </button>
            <button
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              전체
            </button>
          </div>
        </div>
        <div className="empty-state success">
          <h3>오늘 복습할 단어가 없습니다!</h3>
          <p>잘하셨어요! 전체 단어를 보려면 '전체' 버튼을 눌러주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="review-container">
      <div className="review-header">
        <h2>복습 모드</h2>
        <div className="filter-buttons">
          <button
            className={filter === 'due' ? 'active' : ''}
            onClick={() => { setFilter('due'); setCurrentIndex(0); }}
          >
            복습 예정 ({learnedWords.filter(w => !w.nextReviewDate || new Date(w.nextReviewDate) <= new Date()).length})
          </button>
          <button
            className={filter === 'today' ? 'active' : ''}
            onClick={() => { setFilter('today'); setCurrentIndex(0); }}
          >
            오늘 학습
          </button>
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => { setFilter('all'); setCurrentIndex(0); }}
          >
            전체 ({learnedWords.length})
          </button>
        </div>
      </div>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${((currentIndex + 1) / wordsToReview.length) * 100}%` }}
        />
      </div>
      <p className="progress-text">
        {currentIndex + 1} / {wordsToReview.length}
      </p>

      <div className="word-card review-card">
        <div className="word-status">
          <span className="status-badge">{getReviewStatus(currentWord)}</span>
          <span className="review-count">복습 {currentWord.reviewCount || 0}회</span>
        </div>

        <div className="word-main">
          <h1 className="word-text">{currentWord.word}</h1>
          <p className="word-pronunciation">{currentWord.pronunciation}</p>
        </div>

        <div className="word-dates">
          <span>학습일: {formatDate(currentWord.learnedAt)}</span>
          {currentWord.nextReviewDate && (
            <span>다음 복습: {formatDate(currentWord.nextReviewDate)}</span>
          )}
        </div>

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
              {currentWord.examples && currentWord.examples.length > 0 ? (
                currentWord.examples.map((example, idx) => (
                  <p key={idx} className="example-text">
                    {idx + 1}. "{example}"
                  </p>
                ))
              ) : (
                <p className="no-example">예문이 없습니다.</p>
              )}
            </div>
          )}
        </div>

        <div className="review-actions">
          <button className="btn-forgot" onClick={handleForgotten}>
            모르겠어요
          </button>
          <button className="btn-remembered" onClick={handleRemembered}>
            알고 있어요
          </button>
        </div>

        <div className="navigation-buttons">
          <button className="btn-nav" onClick={handlePrevious}>
            ← 이전
          </button>
          <button className="btn-remove" onClick={handleRemove}>
            목록에서 제거
          </button>
          <button className="btn-nav" onClick={handleNext}>
            다음 →
          </button>
        </div>
      </div>

      <div className="review-info">
        <h4>간격 반복 학습법</h4>
        <p>
          '알고 있어요'를 누르면 복습 간격이 늘어납니다: 1일 → 3일 → 7일 → 14일 → 30일 → 60일
        </p>
        <p>
          '모르겠어요'를 누르면 내일 다시 복습합니다.
        </p>
      </div>
    </div>
  );
};

export default ReviewMode;
