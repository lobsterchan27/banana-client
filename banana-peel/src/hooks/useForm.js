import { useState, useEffect } from 'react';

function useForm(initialState, key) {
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initialState;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(form));
  }, [form, key]);

  return [form, setForm];

}

export default useForm;