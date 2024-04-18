import React from "react";
import foobar from "../utils/foobar";

const Form = (props) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    foobar();
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit">Submit</button>
    </form>
  );
};

export default Form;
