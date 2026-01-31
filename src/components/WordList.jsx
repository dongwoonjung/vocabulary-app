import { useState, useMemo, useEffect } from 'react';
import { getFolders, createFolder, addWordToFolder, getCustomWords, addCustomWord } from '../services/supabase';

const WordList = ({ learnedWords, customWords = [], onRemoveWord, onRemoveCustomWord }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [activeFilter, setActiveFilter] = useState('learned'); // 'learned', 'custom'

  // 폴더 관련 상태
  const [folders, setFolders] = useState([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [supabaseCustomWords, setSupabaseCustomWords] = useState([]);

  // 폴더 및 Supabase 단어 로드
  useEffect(() => {
    loadFolders();
    loadSupabaseCustomWords();
  }, []);

  const loadFolders = async () => {
    const data = await getFolders();
    setFolders(data);
  };

  const loadSupabaseCustomWords = async () => {
    const data = await getCustomWords();
    setSupabaseCustomWords(data);
  };

  // 폴더에 추가 버튼 클릭
  const handleAddToFolder = (word) => {
    // Supabase에서 해당 단어의 ID 찾기
    const supabaseWord = supabaseCustomWords.find(w => w.word === word.word);
    if (supabaseWord) {
      setSelectedWord({ ...word, supabaseId: supabaseWord.id });
    } else {
      setSelectedWord(word);
    }
    setShowFolderModal(true);
  };

  // 폴더 생성
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const newFolder = await createFolder(newFolderName.trim());
    if (newFolder) {
      setFolders([newFolder, ...folders]);
      setNewFolderName('');
      setSelectedFolderId(newFolder.id.toString());
    }
  };

  // 폴더에 단어 저장
  const handleSaveToFolder = async () => {
    if (!selectedFolderId || !selectedWord) return;

    try {
      if (selectedWord.supabaseId) {
        // 이미 Supabase에 있는 단어
        await addWordToFolder(selectedWord.supabaseId, parseInt(selectedFolderId));
      } else {
        // Supabase에 없는 단어 - 먼저 저장 후 폴더에 추가
        const wordData = {
          word: selectedWord.word,
          meaning: selectedWord.meaning || '',
        };
        const savedWord = await addCustomWord(wordData, parseInt(selectedFolderId));
        if (savedWord) {
          // supabaseCustomWords 업데이트
          setSupabaseCustomWords(prev => [savedWord, ...prev]);
        }
      }
      alert(`"${selectedWord.word}"가 폴더에 추가되었습니다.`);
    } catch (error) {
      console.error('폴더에 추가 실패:', error);
      alert('폴더에 추가하는 중 오류가 발생했습니다.');
    }

    setShowFolderModal(false);
    setSelectedWord(null);
    setSelectedFolderId('');
  };

  const closeFolderModal = () => {
    setShowFolderModal(false);
    setSelectedWord(null);
    setSelectedFolderId('');
    setNewFolderName('');
  };

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
                <>
                  <span className="col-example">예문</span>
                  <span className="col-folder">폴더</span>
                </>
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
                    <>
                      <span className="col-example" title={word.examples?.join(' / ') || ''}>
                        {word.examples && word.examples.length > 0
                          ? (word.examples[0].length > 30 ? word.examples[0].slice(0, 30) + '...' : word.examples[0])
                          : '-'}
                      </span>
                      <button
                        className="col-folder btn-folder"
                        onClick={() => handleAddToFolder(word)}
                      >
                        📁
                      </button>
                    </>
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

      {/* 폴더 추가 모달 */}
      {showFolderModal && (
        <div className="folder-modal-overlay" onClick={closeFolderModal}>
          <div className="folder-modal" onClick={(e) => e.stopPropagation()}>
            <div className="folder-modal-header">
              <h3>폴더에 추가</h3>
              <button className="close-btn" onClick={closeFolderModal}>×</button>
            </div>
            <div className="folder-modal-body">
              <p className="selected-word">"{selectedWord?.word}"</p>

              {folders.length > 0 && (
                <div className="folder-select-section">
                  <label>기존 폴더 선택</label>
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                  >
                    <option value="">폴더 선택...</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="folder-create-section">
                <label>새 폴더 만들기</label>
                <div className="create-folder-row">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="폴더 이름..."
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                  <button onClick={handleCreateFolder}>만들기</button>
                </div>
              </div>
            </div>
            <div className="folder-modal-footer">
              <button className="cancel-btn" onClick={closeFolderModal}>취소</button>
              <button
                className="save-btn"
                onClick={handleSaveToFolder}
                disabled={!selectedFolderId}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordList;
