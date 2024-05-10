import React, { useContext, useRef, useLayoutEffect } from 'react';
import { FormContext } from '../contexts/FormContext';
import './css/textAreaInput.css';

const TextAreaInput = ({ name }) => {
    const { form, setForm } = useContext(FormContext);
    const textAreaRef = useRef(null);
    const value = form[name];

    const handleChange = (e) => {
        setForm({
            ...form,
            [name]: e.target.value,
        });
    };

    const handleInput = (e) => {
        textAreaRef.current.style.height = "5px";
        textAreaRef.current.style.height = (textAreaRef.current.scrollHeight)+"px";
    };

    useLayoutEffect(() => {
        handleInput();
    }, [form]);

    return (
        <textarea
            ref={textAreaRef}
            className="textAreaInput"
            value={value}
            onChange={handleChange}
            onInput={handleInput}
            name={name}
        />
    );
};

export default TextAreaInput;