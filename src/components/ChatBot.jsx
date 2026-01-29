import { useState, useRef, useEffect } from 'react';
import { askAboutWord, getSuggestedQuestions, hasApiKey, saveApiKey } from '../services/openaiApi';

const ChatBot = ({ word, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 채팅창이 열릴 때 초기화
  useEffect(() => {
    if (isOpen && word) {
      // API 키가 없으면 입력 화면 표시
      if (!hasApiKey()) {
        setShowApiKeyInput(true);
      } else {
        setShowApiKeyInput(false);
        // 새 단어면 대화 초기화
        setMessages([{
          role: 'assistant',
          content: `"${word.word}" 단어에 대해 궁금한 것을 물어보세요! 예문, 동의어, 어원 등 무엇이든 질문해 주세요.`
        }]);
      }
      // 입력창에 포커스
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, word?.id]);

  // 메시지가 추가되면 스크롤 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // API 키 저장
  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      saveApiKey(apiKeyInput.trim());
      setShowApiKeyInput(false);
      setApiKeyInput('');
      setMessages([{
        role: 'assistant',
        content: `API 키가 저장되었습니다! "${word.word}" 단어에 대해 궁금한 것을 물어보세요.`
      }]);
    }
  };

  // 질문 전송
  const handleSend = async (questionText = inputText) => {
    if (!questionText.trim() || isLoading) return;

    const userMessage = { role: 'user', content: questionText };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // 최근 대화 기록만 전송 (토큰 절약)
      const recentHistory = messages.slice(-6);
      const response = await askAboutWord(word, questionText, recentHistory);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `오류가 발생했습니다: ${error.message}`,
        isError: true
      }]);

      // API 키 오류면 입력 화면으로
      if (error.message.includes('API 키')) {
        setShowApiKeyInput(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 추천 질문 클릭
  const handleSuggestedQuestion = (question) => {
    handleSend(question);
  };

  // Enter 키로 전송
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  const suggestedQuestions = word ? getSuggestedQuestions(word) : [];

  return (
    <div className="chatbot-overlay" onClick={onClose}>
      <div className="chatbot-container" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="chatbot-header">
          <div className="chatbot-title">
            <span className="chatbot-icon">💬</span>
            <span>AI 단어 도우미</span>
          </div>
          <button className="chatbot-close" onClick={onClose}>×</button>
        </div>

        {/* 현재 단어 정보 */}
        {word && (
          <div className="chatbot-word-info">
            <span className="word-label">{word.word}</span>
            <span className="word-meaning">{word.meaning}</span>
          </div>
        )}

        {/* API 키 입력 화면 */}
        {showApiKeyInput ? (
          <div className="chatbot-apikey-setup">
            <div className="apikey-info">
              <h4>OpenAI API 키 설정</h4>
              <p>AI 단어 도우미를 사용하려면 OpenAI API 키가 필요합니다.</p>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="apikey-link"
              >
                API 키 발급받기 →
              </a>
            </div>
            <div className="apikey-input-group">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-..."
                className="apikey-input"
              />
              <button
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim()}
                className="apikey-save-btn"
              >
                저장
              </button>
            </div>
            <p className="apikey-note">
              * API 키는 브라우저에 안전하게 저장됩니다.
            </p>
          </div>
        ) : (
          <>
            {/* 메시지 영역 */}
            <div className="chatbot-messages">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`chat-message ${msg.role} ${msg.isError ? 'error' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <span className="message-avatar">🤖</span>
                  )}
                  <div className="message-content">{msg.content}</div>
                </div>
              ))}
              {isLoading && (
                <div className="chat-message assistant loading">
                  <span className="message-avatar">🤖</span>
                  <div className="message-content">
                    <span className="typing-indicator">
                      <span></span><span></span><span></span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 추천 질문 */}
            {messages.length <= 1 && (
              <div className="suggested-questions">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    className="suggested-btn"
                    onClick={() => handleSuggestedQuestion(q)}
                    disabled={isLoading}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* 입력 영역 */}
            <div className="chatbot-input-area">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="질문을 입력하세요..."
                disabled={isLoading}
                className="chatbot-input"
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isLoading}
                className="chatbot-send-btn"
              >
                전송
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatBot;
