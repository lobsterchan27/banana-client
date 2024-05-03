import React, { useContext } from 'react';
import { FormContext } from '../contexts/FormContext';

const TextAreaInput = ({ name, handleChange }) => {
    const { form, setForm } = useContext(FormContext);

//   useEffect(() => {
//     const handleKeyDown = (e) => {
//       if (e.key === 'Enter' && e.shiftKey) {
//         e.preventDefault();
//         setValue((prevValue) => prevValue + '\n');
//       }
//     };

//     const textArea = textAreaRef.current;
//     textArea.addEventListener('keydown', handleKeyDown);

//     return () => {
//       textArea.removeEventListener('keydown', handleKeyDown);
//     };
//   }, []);

  return (
    <textarea
      value={form[name]['value']}
      onChange={handleChange}
      name={name}
      style={{
        minHeight: '100px',
        resize: 'none',
        overflowY: 'hidden',
        lineHeight: '1.5',
        padding: '8px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontFamily: 'inherit',
        fontSize: '16px',
      }}
    />
  );
};

export default TextAreaInput;