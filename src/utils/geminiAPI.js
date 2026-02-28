import axios from 'axios';

/**
 * Sends a prompt to the Gemini API and expects a JSON array of events
 * @param {string} prompt - The prompt to send to Gemini
 * @param {string} apiKey - The Gemini API key
 * @returns {Promise<Array>} - Array of events with title, start, and end properties
 */
export const generateEventsFromGemini = async (prompt, apiKey) => {
  if (!apiKey) {
    throw new Error('Gemini API key is required');
  }

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      {
        contents: [{
          parts: [{
            text: prompt + '\n\nPlease respond with ONLY a valid JSON array of events. Each event should have "title", "start", and "end" properties. The start and end should be ISO 8601 datetime strings. Example: [{"title":"Math Class","start":"2024-01-15T10:00:00","end":"2024-01-15T11:00:00"}]'
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        }
      }
    );

    // Validate response structure
    if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response structure from Gemini API');
    }

    const text = response.data.candidates[0].content.parts[0].text;
    
    // Extract JSON from the response (in case it's wrapped in markdown code blocks)
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    
    const events = JSON.parse(jsonText);
    
    // Validate events array structure
    if (!Array.isArray(events)) {
      throw new Error('Response is not an array');
    }
    
    // Convert string dates to Date objects
    return events.map(event => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end)
    }));
  } catch (error) {
    console.error('Error generating events from Gemini:', error);
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse JSON response from Gemini API: ' + error.message);
    }
    throw error.message ? error : new Error('Failed to generate events from Gemini API');
  }
};
