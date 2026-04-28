import fs from 'fs';

const apiKey = 'DUMMY_KEY';

const body = {
  contents: [{
    parts: [
      { text: "test" }
    ]
  }],
  tools: [
    { googleSearch: {} }
  ],
  generationConfig: {
    temperature: 0.1,
    responseMimeType: 'application/json'
  }
};

fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body)
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
