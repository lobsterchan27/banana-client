import { useState, useEffect } from 'react';

function useLocalStorage(key, initialState) {
  const [state, setState] = useState(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      return isNaN(parsed) ? parsed : Number(parsed);
    }
    return initialState;
  });

  useEffect(() => {
    const toSave = typeof state === 'number' ? state : JSON.stringify(state);
    localStorage.setItem(key, toSave);
  }, [state, key]);

  return [state, setState];
}

export default useLocalStorage;