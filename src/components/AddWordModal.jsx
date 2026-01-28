import { useState } from 'react';
import { dictionaryApi, playPronunciation } from '../services/dictionaryApi';

const AddWordModal = ({ isOpen, onClose, onAddWord }) => {
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wordInfo, setWordInfo] = useState(null);
  const [customMeaning, setCustomMeaning] = useState('');

  const handleSearch = async () => {
    if (!word.trim()) {
      setError('단어를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setWordInfo(null);

    const { data, error: apiError } = await dictionaryApi.getWordInfo(word.trim());

    setLoading(false);

    if (apiError) {
      setError(apiError);
      return;
    }

    setWordInfo(data);
  };

  const handleAdd = () => {
    if (!wordInfo) return;

    const newWord = {
      word: wordInfo.word,
      meaning: customMeaning || wordInfo.meaningText,
      example: wordInfo.exampleText,
      pronunciation: wordInfo.pronunciation,
      audioUrl: wordInfo.audioUrl,
    };

    onAddWord(newWord);
    handleClose();
  };

  const handleClose = () => {
    setWord('');
    setLoading(false);
    setError('');
    setWordInfo(null);
    setCustomMeaning('');
    onClose();
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
              onKeyPress={handleKeyPress}
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
