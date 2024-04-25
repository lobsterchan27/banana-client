export default function TextDisplay({ textResponse }) {
    return (
      <>
        {textResponse.map((item, index) => (
          <p key={index} className='textResponse'>{item}</p>
        ))}
      </>
    );
}
