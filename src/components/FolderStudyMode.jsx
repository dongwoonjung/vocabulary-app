import { useState, useEffect, useCallback } from 'react';
import { getFolders, createFolder, deleteFolder, getWordsByFolder, getCustomWords, deleteCustomWord } from '../services/supabase';
import { dictionaryApi, playPronunciation } from '../services/dictionaryApi';
import ChatBot from './ChatBot';

const FolderStudyMode = ({ koreanMeanings, wordCache, onUpdateCache, onMarkAsLearned, learnedWordIds = [], onMarkAsKnown, knownWordIds = [] }) => {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedFolderIds, setSelectedFolderIds] = useState([]); // 다중 선택
  const [folderWords, setFolderWords] = useState([]);
  const [customWords, setCustomWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [studyTitle, setStudyTitle] = useState('');
  const [wordHistory, setWordHistory] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // 폴더 목록 로드
  useEffect(() => {
    loadFolders();
    loadCustomWords();
  }, []);

  const loadFolders = async () => {
    const data = await getFolders();
    setFolders(data);
    setIsLoading(false);
  };

  const loadCustomWords = async () => {
    const data = await getCustomWords();
    setCustomWords(data);
  };

  // Fisher-Yates 셔플 알고리즘
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // 단어 정보 로드 헬퍼 함수
  const loadWordInfo = async (w) => {
    if (wordCache[w.word]) {
      return {
        ...w,
        ...wordCache[w.word],
        meaning: koreanMeanings[w.word] || wordCache[w.word]?.meaningText || ''
      };
    }

    const { data } = await dictionaryApi.getWordInfo(w.word);
    if (data) {
      onUpdateCache(w.word, data);
      return {
        ...w,
        ...data,
        meaning: koreanMeanings[w.word] || data.meaningText || ''
      };
    }
    return {
      ...w,
      meaning: koreanMeanings[w.word] || ''
    };
  };

  // 폴더 선택 시 해당 폴더의 단어 로드
  const handleSelectFolder = async (folder) => {
    if (multiSelectMode) {
      // 다중 선택 모드
      toggleFolderSelection(folder.id);
      return;
    }

    setSelectedFolder(folder);
    setStudyMode(false);
    setIsLoading(true);

    const wordIds = await getWordsByFolder(folder.id);
    const wordsInFolder = customWords.filter(w => wordIds.includes(w.id));

    const loadedWords = await Promise.all(wordsInFolder.map(loadWordInfo));

    setFolderWords(loadedWords);
    setIsLoading(false);
  };

  // 폴더 다중 선택 토글
  const toggleFolderSelection = (folderId) => {
    setSelectedFolderIds(prev => {
      if (prev.includes(folderId)) {
        return prev.filter(id => id !== folderId);
      } else {
        return [...prev, folderId];
      }
    });
  };

  // 다중 선택 모드 토글
  const toggleMultiSelectMode = () => {
    setMultiSelectMode(!multiSelectMode);
    if (multiSelectMode) {
      setSelectedFolderIds([]);
    }
  };

  // 선택된 폴더들로 학습 시작
  const startMultiFolderStudy = async () => {
    if (selectedFolderIds.length === 0) {
      alert('학습할 폴더를 선택해주세요.');
      return;
    }

    setIsLoading(true);

    // 선택된 모든 폴더에서 단어 ID 수집
    const allWordIds = [];
    for (const folderId of selectedFolderIds) {
      const wordIds = await getWordsByFolder(folderId);
      allWordIds.push(...wordIds);
    }

    // 중복 제거
    const uniqueWordIds = [...new Set(allWordIds)];
    const wordsToStudy = customWords.filter(w => uniqueWordIds.includes(w.id));

    if (wordsToStudy.length === 0) {
      alert('선택한 폴더에 학습할 단어가 없습니다.');
      setIsLoading(false);
      return;
    }

    // 단어 정보 로드
    const loadedWords = await Promise.all(wordsToStudy.map(loadWordInfo));

    // 단어 순서 랜덤 섞기
    const shuffledWords = shuffleArray(loadedWords);

    // 선택된 폴더 이름들
    const selectedFolderNames = folders
      .filter(f => selectedFolderIds.includes(f.id))
      .map(f => f.name)
      .join(', ');

    setStudyTitle(selectedFolderNames);
    setFolderWords(shuffledWords);
    setIsLoading(false);
    setStudyMode(true);
    setCurrentWordIndex(0);
    setShowMeaning(false);
    setShowExample(false);
    setWordHistory([]);
  };

  // 폴더 생성
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const newFolder = await createFolder(newFolderName.trim());
    if (newFolder) {
      setFolders([newFolder, ...folders]);
      setNewFolderName('');
      setShowCreateFolder(false);
    }
  };

  // 폴더 삭제
  const handleDeleteFolder = async (folderId, e) => {
    e.stopPropagation();
    if (!confirm('이 폴더를 삭제하시겠습니까?')) return;

    const success = await deleteFolder(folderId);
    if (success) {
      setFolders(folders.filter(f => f.id !== folderId));
      setSelectedFolderIds(prev => prev.filter(id => id !== folderId));
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
        setFolderWords([]);
      }
    }
  };

  // 단어 삭제
  const handleDeleteWord = async (wordId) => {
    if (!confirm('이 단어를 삭제하시겠습니까?')) return;

    const success = await deleteCustomWord(wordId);
    if (success) {
      setFolderWords(folderWords.filter(w => w.id !== wordId));
      setCustomWords(customWords.filter(w => w.id !== wordId));
    }
  };

  // 학습 모드 시작
  const startStudy = () => {
    if (folderWords.length === 0) {
      alert('학습할 단어가 없습니다.');
      return;
    }
    setStudyTitle(selectedFolder.name);
    setStudyMode(true);
    setCurrentWordIndex(0);
    setShowMeaning(false);
    setShowExample(false);
    setWordHistory([]);
  };

  // 폴더에서 바로 학습 시작
  const startStudyFromFolder = async (folder, e) => {
    e.stopPropagation();
    setSelectedFolder(folder);
    setIsLoading(true);

    const wordIds = await getWordsByFolder(folder.id);
    const wordsInFolder = customWords.filter(w => wordIds.includes(w.id));

    if (wordsInFolder.length === 0) {
      alert('이 폴더에 학습할 단어가 없습니다.');
      setIsLoading(false);
      return;
    }

    const loadedWords = await Promise.all(wordsInFolder.map(loadWordInfo));

    setStudyTitle(folder.name);
    setFolderWords(loadedWords);
    setIsLoading(false);
    setStudyMode(true);
    setCurrentWordIndex(0);
    setShowMeaning(false);
    setShowExample(false);
    setWordHistory([]);
  };

  // 다음 단어
  const nextWord = useCallback(() => {
    if (folderWords[currentWordIndex]) {
      setWordHistory(prev => [...prev, currentWordIndex]);
    }
    setShowMeaning(false);
    setShowExample(false);
    if (currentWordIndex < folderWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      alert('모든 단어를 학습했습니다!');
      setStudyMode(false);
      setMultiSelectMode(false);
      setSelectedFolderIds([]);
    }
  }, [currentWordIndex, folderWords]);

  // 이전 단어
  const prevWord = useCallback(() => {
    if (wordHistory.length > 0) {
      const prevIndex = wordHistory[wordHistory.length - 1];
      setWordHistory(prev => prev.slice(0, -1));
      setCurrentWordIndex(prevIndex);
      setShowMeaning(false);
      setShowExample(false);
    }
  }, [wordHistory]);

  // 암기 완료 처리
  const handleMarkAsLearnedClick = () => {
    const currentWord = folderWords[currentWordIndex];
    if (currentWord && onMarkAsLearned && !learnedWordIds.includes(currentWord.id)) {
      onMarkAsLearned(currentWord);
    }
    nextWord();
  };

  // 이미 알아요 처리
  const handleMarkAsKnownClick = () => {
    const currentWord = folderWords[currentWordIndex];
    if (currentWord && onMarkAsKnown) {
      onMarkAsKnown(currentWord.id);
    }
    // 현재 단어를 목록에서 제거하고 다음으로
    const newWords = folderWords.filter((_, idx) => idx !== currentWordIndex);
    setFolderWords(newWords);
    if (newWords.length === 0) {
      alert('모든 단어를 학습했습니다!');
      setStudyMode(false);
    } else if (currentWordIndex >= newWords.length) {
      setCurrentWordIndex(newWords.length - 1);
    }
    setShowMeaning(false);
    setShowExample(false);
  };

  // 발음 재생
  const handlePlayAudio = () => {
    const currentWord = folderWords[currentWordIndex];
    if (currentWord?.audioUrl) {
      playPronunciation(currentWord.audioUrl);
    }
  };

  // 학습 모드 종료
  const exitStudyMode = () => {
    setStudyMode(false);
    setMultiSelectMode(false);
    setSelectedFolderIds([]);
    setWordHistory([]);
  };

  if (isLoading && folders.length === 0) {
    return <div className="loading">로딩 중...</div>;
  }

  // 학습 모드 UI
  if (studyMode && folderWords.length > 0) {
    const currentWord = folderWords[currentWordIndex];
    const isAlreadyLearned = currentWord && learnedWordIds.includes(currentWord.id);

    return (
      <div className="study-container folder-study-active">
        <div className="study-header">
          <button className="back-btn" onClick={exitStudyMode}>
            ← 목록으로
          </button>
          <h2 className="study-title">{studyTitle}</h2>
          <div className="study-stats">
            <span>{currentWordIndex + 1} / {folderWords.length}</span>
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

            {/* 외부 사전 링크 */}
            <div className="dictionary-links">
              <a
                href={`https://search.naver.com/search.naver?where=image&query=${encodeURIComponent(currentWord.word)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="dict-link naver"
              >
                네이버 사진
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
              onClick={prevWord}
              disabled={wordHistory.length === 0}
            >
              ← 이전
            </button>
            <button
              className={`btn-learned ${isAlreadyLearned ? 'disabled' : ''}`}
              onClick={handleMarkAsLearnedClick}
              disabled={isAlreadyLearned}
            >
              {isAlreadyLearned ? '이미 암기함' : '암기 완료'}
            </button>
            <button
              className="btn-skip"
              onClick={nextWord}
            >
              다음 →
            </button>
          </div>

          <div className="secondary-actions">
            <button
              className="btn-known"
              onClick={handleMarkAsKnownClick}
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
  }

  // 폴더 목록 UI
  return (
    <div className="folder-study-mode">
      <div className="folder-header">
        <h2>내 단어장</h2>
        <div className="folder-header-actions">
          {folders.length > 0 && (
            <button
              className={`multi-select-btn ${multiSelectMode ? 'active' : ''}`}
              onClick={toggleMultiSelectMode}
            >
              {multiSelectMode ? '취소' : '다중 선택'}
            </button>
          )}
          <button
            className="create-folder-btn"
            onClick={() => setShowCreateFolder(!showCreateFolder)}
          >
            {showCreateFolder ? '취소' : '+ 폴더 만들기'}
          </button>
        </div>
      </div>

      {multiSelectMode && selectedFolderIds.length > 0 && (
        <div className="multi-select-bar">
          <span>{selectedFolderIds.length}개 폴더 선택됨</span>
          <button className="start-multi-study-btn" onClick={startMultiFolderStudy}>
            선택한 폴더로 학습하기
          </button>
        </div>
      )}

      {showCreateFolder && (
        <div className="create-folder-form">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="폴더 이름 입력..."
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <button onClick={handleCreateFolder}>만들기</button>
        </div>
      )}

      {folders.length === 0 ? (
        <div className="empty-state">
          <p>아직 폴더가 없습니다.</p>
          <p>폴더를 만들고 단어를 추가해보세요!</p>
        </div>
      ) : (
        <div className="folder-list">
          {folders.map(folder => (
            <div
              key={folder.id}
              className={`folder-item ${selectedFolder?.id === folder.id ? 'selected' : ''} ${selectedFolderIds.includes(folder.id) ? 'multi-selected' : ''}`}
              onClick={() => handleSelectFolder(folder)}
            >
              {multiSelectMode && (
                <input
                  type="checkbox"
                  className="folder-checkbox"
                  checked={selectedFolderIds.includes(folder.id)}
                  onChange={() => toggleFolderSelection(folder.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <span className="folder-icon">📁</span>
              <span className="folder-name">{folder.name}</span>
              {!multiSelectMode && (
                <div className="folder-actions">
                  <button
                    className="folder-study-btn"
                    onClick={(e) => startStudyFromFolder(folder, e)}
                    title="학습하기"
                  >
                    📖
                  </button>
                  <button
                    className="delete-folder-btn"
                    onClick={(e) => handleDeleteFolder(folder.id, e)}
                    title="삭제"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedFolder && !multiSelectMode && (
        <div className="folder-content">
          <div className="folder-content-header">
            <h3>{selectedFolder.name}</h3>
            {folderWords.length > 0 && (
              <button className="start-study-btn" onClick={startStudy}>
                학습 시작
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="loading">단어 로딩 중...</div>
          ) : folderWords.length === 0 ? (
            <div className="empty-folder">
              <p>이 폴더에 단어가 없습니다.</p>
              <p>단어 추가에서 이 폴더에 단어를 추가해보세요.</p>
            </div>
          ) : (
            <div className="folder-words">
              {folderWords.map(word => (
                <div key={word.id} className="folder-word-item">
                  <div className="word-info">
                    <span className="word">{word.word}</span>
                    <span className="meaning">{word.meaning}</span>
                  </div>
                  <button
                    className="delete-word-btn"
                    onClick={() => handleDeleteWord(word.id)}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FolderStudyMode;
