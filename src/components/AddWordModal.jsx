import { useState, useEffect } from 'react';
import { dictionaryApi, playPronunciation } from '../services/dictionaryApi';
import { getFolders, addCustomWord } from '../services/supabase';

const AddWordModal = ({ isOpen, onClose, onAddWord, wordSets, onGoToWord }) => {
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wordInfo, setWordInfo] = useState(null);
  const [customMeaning, setCustomMeaning] = useState('');
  const [existingWordInfo, setExistingWordInfo] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');

  // 폴더 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadFolders();
    }
  }, [isOpen]);

  const loadFolders = async () => {
    const data = await getFolders();
    setFolders(data);
  };

  // 기본 단어 세트에서 단어 찾기
  const findWordInSets = (searchWord) => {
    const normalizedWord = searchWord.toLowerCase().trim();
    for (const [setNum, setInfo] of Object.entries(wordSets)) {
      const foundIndex = setInfo.words.findIndex(
        w => w.toLowerCase() === normalizedWord
      );
      if (foundIndex !== -1) {
        return {
          setNumber: Number(setNum),
          setName: setInfo.name,
          wordIndex: foundIndex
        };
      }
    }
    return null;
  };

  const handleSearch = async () => {
    if (!word.trim()) {
      setError('단어를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setWordInfo(null);
    setExistingWordInfo(null);

    // 먼저 기본 단어 세트에 있는지 확인
    const existing = findWordInSets(word.trim());
    if (existing) {
      setExistingWordInfo(existing);
      setLoading(false);
      return;
    }

    const { data, error: apiError } = await dictionaryApi.getWordInfo(word.trim());

    setLoading(false);

    if (apiError) {
      setError(apiError);
      return;
    }

    setWordInfo(data);
  };

  const handleAdd = async () => {
    if (!wordInfo) return;

    const newWord = {
      word: wordInfo.word,
      meaning: customMeaning || wordInfo.meaningText,
      example: wordInfo.exampleText,
      pronunciation: wordInfo.pronunciation,
      audioUrl: wordInfo.audioUrl,
    };

    // Supabase에 저장 (폴더 선택 시)
    if (selectedFolderId) {
      await addCustomWord(newWord, parseInt(selectedFolderId));
    }

    onAddWord(newWord);
    handleClose();
  };

  const handleClose = () => {
    setWord('');
    setLoading(false);
    setError('');
    setWordInfo(null);
    setCustomMeaning('');
    setExistingWordInfo(null);
    setSelectedFolderId('');
    onClose();
  };

  const handleGoToExistingWord = () => {
    if (existingWordInfo && onGoToWord) {
      onGoToWord(existingWordInfo.setNumber);
      handleClose();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>단어 추가</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="search-section">
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="영어 단어 입력..."
              className="word-input"
              autoFocus
            />
            <button
              className="search-btn"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? '검색 중...' : '검색'}
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {existingWordInfo && (
            <div className="existing-word-notice">
              <div className="notice-icon">📚</div>
              <h3>이미 있는 단어입니다!</h3>
              <p>
                <strong>"{word}"</strong>은(는)
                <strong> {existingWordInfo.setName}</strong>에 포함되어 있습니다.
              </p>
              <button
                className="go-to-word-btn"
                onClick={handleGoToExistingWord}
              >
                {existingWordInfo.setName}로 이동해서 학습하기
              </button>
            </div>
          )}

          {wordInfo && (
            <div className="word-result">
              <div className="result-header">
                <h3>{wordInfo.word}</h3>
                {wordInfo.pronunciation && (
                  <span className="pronunciation">{wordInfo.pronunciation}</span>
                )}
                {wordInfo.audioUrl && (
                  <button
                    className="audio-btn"
                    onClick={() => playPronunciation(wordInfo.audioUrl)}
                    title="발음 듣기"
                  >
                    🔊
                  </button>
                )}
              </div>

              <div className="result-meanings">
                <h4>뜻 (영어)</h4>
                {wordInfo.meanings.map((m, idx) => (
                  <p key={idx} className="meaning-item">
                    <span className="pos">({m.partOfSpeech})</span> {m.definition}
                  </p>
                ))}
              </div>

              {wordInfo.examples.length > 0 && (
                <div className="result-examples">
                  <h4>예문</h4>
                  {wordInfo.examples.map((ex, idx) => (
                    <p key={idx} className="example-item">"{ex}"</p>
                  ))}
                </div>
              )}

              <div className="custom-meaning">
                <h4>한국어 뜻 (직접 입력)</h4>
                <input
                  type="text"
                  value={customMeaning}
                  onChange={(e) => setCustomMeaning(e.target.value)}
                  placeholder="예: 버리다, 포기하다"
                  className="meaning-input"
                />
                <p className="hint">한국어 뜻을 입력하지 않으면 영어 정의가 사용됩니다.</p>
              </div>

              {folders.length > 0 && (
                <div className="folder-select">
                  <h4>폴더에 추가 (선택)</h4>
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="folder-dropdown"
                  >
                    <option value="">폴더 선택 안 함</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={handleClose}>
            취소
          </button>
          <button
            className="add-btn"
            onClick={handleAdd}
            disabled={!wordInfo}
          >
            추가하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddWordModal;
