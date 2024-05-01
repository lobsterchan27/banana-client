
export default async function fetchStitch() {
    const response = await fetch('http://127.0.0.1:5000/audio/silence-stitch', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    return data;
}