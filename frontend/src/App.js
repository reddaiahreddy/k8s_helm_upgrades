import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('http://backend-service:3000/')
      .then(response => response.text())
      .then(data => setMessage(data))
      .catch(err => console.error('Error fetching data:', err));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>{message || "Loading..."}</h1>
      </header>
    </div>
  );
}

export default App;
