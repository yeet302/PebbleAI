import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Calendar from './components/Calendar';
import { generateEventsFromGemini } from './utils/geminiAPI';
import './App.css';

function App() {
  const [events, setEvents] = useState([]);

  const handleGenerateEvents = async (prompt, apiKey) => {
    try {
      const generatedEvents = await generateEventsFromGemini(prompt, apiKey);
      setEvents(generatedEvents);
    } catch (error) {
      console.error('Error generating events:', error);
      throw error;
    }
  };

  return (
    <div className="app">
      <Sidebar onGenerateEvents={handleGenerateEvents} />
      <Calendar events={events} />
    </div>
  );
}

export default App;
