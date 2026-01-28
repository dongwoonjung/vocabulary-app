import { useState, useEffect } from 'react';

// LocalStorage를 사용한 데이터 영속성 Hook
export function useLocalStorage(key, initialValue) {
  // 초기 상태 설정
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('LocalStorage 읽기 오류:', error);
      return initialValue;
    }
  });

  // 값이 변경될 때 LocalStorage 업데이트
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error('LocalStorage 쓰기 오류:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export default useLocalStorage;
