import React, { useState } from 'react';
import './Sidebar.css';

const Sidebar = ({ onGenerateEvents }) => {
  const [apiKey, setApiKey] = useState('');
  const [academicClasses, setAcademicClasses] = useState('');
  const [sportsPractice, setSportsPractice] = useState('');
  const [careerGoals, setCareerGoals] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!apiKey.trim()) {
      setError('Please enter your Gemini API key');
      return;
    }

    if (!academicClasses.trim() && !sportsPractice.trim() && !careerGoals.trim()) {
      setError('Please enter at least one input');
      return;
    }

    setIsLoading(true);
    
    // Sanitize inputs by trimming and limiting length
    const sanitizeInput = (input) => input.trim().substring(0, 500);
    
    const prompt = `Create a weekly schedule based on the following information:
${academicClasses ? `Academic Classes: ${sanitizeInput(academicClasses)}` : ''}
${sportsPractice ? `Sports Practice: ${sanitizeInput(sportsPractice)}` : ''}
${careerGoals ? `Career Goals: ${sanitizeInput(careerGoals)}` : ''}

Generate a realistic weekly schedule with specific dates and times for the next 7 days starting from today.`;

    try {
      await onGenerateEvents(prompt, apiKey);
    } catch (err) {
      setError(err.message || 'Failed to generate events');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sidebar">
      <h2>GoalkeeperAI</h2>
      <p className="subtitle">Smart Schedule Generator</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="apiKey">Gemini API Key:</label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key"
          />
          <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            Your API key is only used for this session and never stored
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="academicClasses">Academic Classes:</label>
          <textarea
            id="academicClasses"
            value={academicClasses}
            onChange={(e) => setAcademicClasses(e.target.value)}
            placeholder="e.g., Math 101, Physics, Chemistry..."
            rows="3"
            maxLength="500"
          />
        </div>

        <div className="form-group">
          <label htmlFor="sportsPractice">Sports Practice:</label>
          <textarea
            id="sportsPractice"
            value={sportsPractice}
            onChange={(e) => setSportsPractice(e.target.value)}
            placeholder="e.g., Basketball practice, Swimming..."
            rows="3"
            maxLength="500"
          />
        </div>

        <div className="form-group">
          <label htmlFor="careerGoals">Career Goals:</label>
          <textarea
            id="careerGoals"
            value={careerGoals}
            onChange={(e) => setCareerGoals(e.target.value)}
            placeholder="e.g., Software Engineering, Research..."
            rows="3"
            maxLength="500"
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Schedule'}
        </button>
      </form>
    </div>
  );
};

export default Sidebar;
