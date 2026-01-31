import { useState, useEffect } from 'react';
import { getFolders, createFolder, deleteFolder, getWordsByFolder, getCustomWords, deleteCustomWord } from '../services/supabase';
import { dictionaryApi, playPronunciation } from '../services/dictionaryApi';

const FolderStudyMode = ({ koreanMeanings, wordCache, onUpdateCache }) => {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderWords, setFolderWords] = useState([]);
  const [customWords, setCustomWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);

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

  // 폴더 선택 시 해당 폴더의 단어 로드
  const handleSelectFolder = async (folder) => {
    setSelectedFolder(folder);
    setStudyMode(false);
    setIsLoading(true);

    const wordIds = await getWordsByFolder(folder.id);
    const wordsInFolder = customWords.filter(w => wordIds.includes(w.id));

    // 단어 정보 로드
    const loadedWords = await Promise.all(
      wordsInFolder.map(async (w) => {
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
      })
    );

    setFolderWords(loadedWords);
    setIsLoading(false);
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
    setStudyMode(true);
    setCurrentWordIndex(0);
    setShowMeaning(false);
  };

  // 다음 단어
  const nextWord = () => {
    setShowMeaning(false);
    if (currentWordIndex < folderWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      alert('모든 단어를 학습했습니다!');
      setStudyMode(false);
    }
  };

  // 이전 단어
  const prevWord = () => {
    setShowMeaning(false);
    if (currentWordIndex > 0) {
      setCurrentWordIndex(currentWordIndex - 1);
    }
  };

  if (isLoading && folders.length === 0) {
    return <div className="loading">로딩 중...</div>;
  }

  // 학습 모드 UI
  if (studyMode && folderWords.length > 0) {
    const currentWord = folderWords[currentWordIndex];

    return (
      <div className="folder-study-mode">
        <div className="study-header">
          <button className="back-btn" onClick={() => setStudyMode(false)}>
            ← 목록으로
          </button>
          <h2>{selectedFolder.name}</h2>
          <span className="progress">
            {currentWordIndex + 1} / {folderWords.length}
          </span>
        </div>

        <div className="flashcard">
          <div className="word-display">
            <h1>{currentWord.word}</h1>
            {currentWord.pronunciation && (
              <p className="pronunciation">{currentWord.pronunciation}</p>
            )}
            {currentWord.audioUrl && (
              <button
                className="audio-btn"
                onClick={() => playPronunciation(currentWord.audioUrl)}
              >
                🔊 발음 듣기
              </button>
            )}
          </div>

          <button
            className="reveal-btn"
            onClick={() => setShowMeaning(!showMeaning)}
          >
            {showMeaning ? '뜻 숨기기' : '뜻 보기'}
          </button>

          {showMeaning && (
            <div className="meaning-display">
              <p className="meaning">{currentWord.meaning}</p>
              {currentWord.examples && currentWord.examples.length > 0 && (
                <div className="examples">
                  <h4>예문</h4>
                  {currentWord.examples.slice(0, 2).map((ex, idx) => (
                    <p key={idx}>"{ex}"</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="study-controls">
          <button
            className="nav-btn"
            onClick={prevWord}
            disabled={currentWordIndex === 0}
          >
            ← 이전
          </button>
          <button className="nav-btn next" onClick={nextWord}>
            {currentWordIndex === folderWords.length - 1 ? '완료' : '다음 →'}
          </button>
        </div>
      </div>
    );
  }

  // 폴더 목록 UI
  return (
    <div className="folder-study-mode">
      <div className="folder-header">
        <h2>내 단어장</h2>
        <button
          className="create-folder-btn"
          onClick={() => setShowCreateFolder(!showCreateFolder)}
        >
          {showCreateFolder ? '취소' : '+ 폴더 만들기'}
        </button>
      </div>

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
              className={`folder-item ${selectedFolder?.id === folder.id ? 'selected' : ''}`}
              onClick={() => handleSelectFolder(folder)}
            >
              <span className="folder-icon">📁</span>
              <span className="folder-name">{folder.name}</span>
              <button
                className="delete-folder-btn"
                onClick={(e) => handleDeleteFolder(folder.id, e)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedFolder && (
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
