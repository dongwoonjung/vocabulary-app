// OpenAI API 서비스
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// API 키는 환경변수 또는 로컬스토리지에서 가져옴
const getApiKey = () => {
  // 환경변수 우선
  if (import.meta.env.VITE_OPENAI_API_KEY) {
    return import.meta.env.VITE_OPENAI_API_KEY;
  }
  // 로컬스토리지에서 사용자가 입력한 키
  return localStorage.getItem('openai-api-key') || '';
};

// API 키 저장
export const saveApiKey = (key) => {
  localStorage.setItem('openai-api-key', key);
};

// API 키 확인
export const hasApiKey = () => {
  return !!getApiKey();
};

// 단어 관련 질문에 대한 GPT 응답 생성
export const askAboutWord = async (word, question, chatHistory = []) => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('API 키가 설정되지 않았습니다.');
  }

  const systemPrompt = `당신은 영어 학습을 도와주는 친절한 선생님입니다.
현재 학습 중인 단어: "${word.word}" (뜻: ${word.meaning})
${word.example ? `예문: "${word.example}"` : ''}

학생의 질문에 대해 친절하고 이해하기 쉽게 설명해주세요.
- 한국어로 답변해주세요
- 추가 예문이나 관련 표현도 알려주세요
- 너무 길지 않게 핵심만 설명해주세요 (최대 3-4문장)
- 고등학생 수준에 맞게 설명해주세요`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: question }
  ];

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('API 키가 유효하지 않습니다. 설정에서 키를 확인해주세요.');
      }
      if (response.status === 429) {
        throw new Error('API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
      }
      throw new Error(errorData.error?.message || 'API 요청에 실패했습니다.');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '응답을 받지 못했습니다.';
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
    }
    throw error;
  }
};

// 추천 질문 목록
export const getSuggestedQuestions = (word) => {
  return [
    `"${word.word}"의 동의어나 반의어가 있나요?`,
    `"${word.word}"를 사용한 다른 예문을 알려주세요`,
    `"${word.word}"의 어원이 뭔가요?`,
    `비슷한 단어와 차이점이 뭔가요?`
  ];
};
