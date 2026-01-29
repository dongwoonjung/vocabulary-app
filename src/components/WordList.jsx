import { useState, useMemo } from 'react';

const WordList = ({ learnedWords, customWords = [], onRemoveWord, onRemoveCustomWord }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [activeFilter, setActiveFilter] = useState('learned'); // 'learned', 'custom'

  const filteredAndSortedWords = useMemo(() => {
    // 활성 필터에 따라 단어 목록 선택
    let words = activeFilter === 'learned' ? [...learnedWords] : [...customWords];

    // 검색 필터
    if (searchTerm) {
      words = words.filter(word =>
        word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.meaning.includes(searchTerm)
      );
    }

    // 정렬
    switch (sortBy) {
      case 'alphabetical':
        words.sort((a, b) => a.word.localeCompare(b.word));
        break;
      case 'reviewLevel':
        if (activeFilter === 'learned') {
          words.sort((a, b) => (b.reviewLevel || 0) - (a.reviewLevel || 0));
        }
        break;
      case 'recent':
      default:
        if (activeFilter === 'learned') {
          words.sort((a, b) => new Date(b.learnedAt) - new Date(a.learnedAt));
        }
    }

    return words;
  }, [learnedWords, customWords, searchTerm, sortBy, activeFilter]);

  const getReviewLevelText = (level) => {
    const levels = ['새 단어', '1일 후', '3일 후', '7일 후', '14일 후', '30일 후', '완료'];
    return levels[level] || levels[0];
  };

  const getReviewLevelClass = (level) => {
    if (!level || level === 0) return 'level-new';
    if (level < 3) return 'level-learning';
    if (level < 5) return 'level-familiar';
    return 'level-mastered';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
  };

  const handleDelete = (word) => {
    const message = activeFilter === 'learned'
      ? `"${word.word}"를 암기 목록에서 삭제하시겠습니까?`
      : `"${word.word}"를 직접 추가한 단어에서 삭제하시겠습니까?\n(학습 목록에서도 제외됩니다)`;

    if (window.confirm(message)) {
      if (activeFilter === 'learned') {
        onRemoveWord(word.id);
      } else {
        onRemoveCustomWord(word.id);
      }
    }
  };

  const currentCount = activeFilter === 'learned' ? learnedWords.length : customWords.length;
  const isEmpty = currentCount === 0;

  return (
    <div className="wordlist-container">
      <div className="wordlist-header">
        <h2>내 단어</h2>
      </div>

      {/* 필터 탭 */}
      <div className="wordlist-tabs">
        <button
          className={`tab-filter ${activeFilter === 'learned' ? 'active' : ''}`}
          onClick={() => setActiveFilter('learned')}
        >
          암기 완료 ({learnedWords.length})
        </button>
        <button
          className={`tab-filter ${activeFilter === 'custom' ? 'active' : ''}`}
          onClick={() => setActiveFilter('custom')}
        >
          직접 추가 ({customWords.length})
        </button>
      </div>

      {isEmpty ? (
        <div className="empty-state">
          <h3>
            {activeFilter === 'learned' ? '암기 목록이 비어있습니다' : '직접 추가한 단어가 없습니다'}
          </h3>
          <p>
            {activeFilter === 'learned'
              ? '학습 모드에서 단어를 암기해보세요!'
              : '상단의 "+ 단어 추가" 버튼으로 단어를 추가해보세요!'}
          </p>
        </div>
      ) : (
        <>
          <div className="wordlist-controls">
            <input
              type="text"
              placeholder="단어 또는 뜻 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="recent">최근 추가순</option>
              <option value="alphabetical">알파벳순</option>
              {activeFilter === 'learned' && (
                <option value="reviewLevel">숙련도순</option>
              )}
            </select>
          </div>

          {/* 암기 단어 통계 (암기 목록일 때만) */}
          {activeFilter === 'learned' && (
            <div className="wordlist-stats">
              <div className="stat-item">
                <span className="stat-label">새 단어</span>
                <span className="stat-value">
                  {learnedWords.filter(w => !w.reviewLevel || w.reviewLevel === 0).length}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">학습 중</span>
                <span className="stat-value">
                  {learnedWords.filter(w => w.reviewLevel > 0 && w.reviewLevel < 3).length}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">익숙함</span>
                <span className="stat-value">
                  {learnedWords.filter(w => w.reviewLevel >= 3 && w.reviewLevel < 5).length}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">완전 암기</span>
                <span className="stat-value">
                  {learnedWords.filter(w => w.reviewLevel >= 5).length}
                </span>
              </div>
            </div>
          )}

          <div className={`wordlist-table ${activeFilter === 'custom' ? 'custom-table' : ''}`}>
            <div className="table-header">
              <span className="col-word">단어</span>
              <span className="col-meaning">뜻</span>
              {activeFilter === 'learned' ? (
                <>
                  <span className="col-level">숙련도</span>
                  <span className="col-date">학습일</span>
                </>
              ) : (
                <span className="col-example">예문</span>
              )}
              <span className="col-action">삭제</span>
            </div>

            <div className="table-body">
              {filteredAndSortedWords.map((word) => (
                <div key={word.id} className="table-row">
                  <div className="col-word">
                    <span className="word-text">{word.word}</span>
                    <span className="word-pronunciation">{word.pronunciation}</span>
                  </div>
                  <span className="col-meaning">{word.meaning}</span>
                  {activeFilter === 'learned' ? (
                    <>
                      <span className={`col-level ${getReviewLevelClass(word.reviewLevel)}`}>
                        {getReviewLevelText(word.reviewLevel)}
                      </span>
                      <span className="col-date">{formatDate(word.learnedAt)}</span>
                    </>
                  ) : (
                    <span className="col-example" title={word.examples?.join(' / ') || ''}>
                      {word.examples && word.examples.length > 0
                        ? (word.examples[0].length > 30 ? word.examples[0].slice(0, 30) + '...' : word.examples[0])
                        : '-'}
                    </span>
                  )}
                  <button
                    className="col-action btn-delete"
                    onClick={() => handleDelete(word)}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>

          {filteredAndSortedWords.length === 0 && searchTerm && (
            <div className="no-results">
              <p>"{searchTerm}"에 대한 검색 결과가 없습니다.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WordList;
