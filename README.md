# GoalKeeperAI

A smart schedule generator built with React, Vite, and Google's Gemini AI. GoalKeeperAI helps you organize your academic classes, sports practice, and career goals into a unified calendar view.

## Features

- 📅 **Interactive Calendar**: Built with react-big-calendar for intuitive schedule visualization
- 🤖 **AI-Powered Scheduling**: Uses Google Gemini API to generate intelligent schedules
- 📚 **Multi-Category Support**: Manage academic classes, sports practice, and career goals
- 🔄 **Real-time Updates**: Calendar automatically re-renders when new events are generated
- 🎨 **Clean UI**: Simple and responsive design for optimal user experience

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yeet302/GoalKeeperAI.git
cd GoalKeeperAI
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

1. **Enter your Gemini API Key**: Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Fill in your schedule details**:
   - Academic Classes (e.g., "Math 101, Physics, Chemistry")
   - Sports Practice (e.g., "Basketball practice, Swimming")
   - Career Goals (e.g., "Software Engineering, Research")
3. **Click "Generate Schedule"**: The AI will create a weekly schedule based on your inputs
4. **View your schedule**: Navigate through different calendar views (Month, Week, Day)

## Build for Production

```bash
npm run build
```

The optimized production build will be in the `dist` directory.

## Project Structure

```
GoalKeeperAI/
├── src/
│   ├── components/
│   │   ├── Calendar.jsx       # Calendar component
│   │   ├── Calendar.css
│   │   ├── Sidebar.jsx        # Input form component
│   │   └── Sidebar.css
│   ├── utils/
│   │   └── geminiAPI.js       # Gemini API integration
│   ├── App.jsx                # Main app component
│   ├── App.css
│   ├── main.jsx               # Entry point
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```

## Technologies Used

- **React**: UI framework
- **Vite**: Build tool and dev server
- **react-big-calendar**: Calendar component library
- **moment.js**: Date manipulation
- **axios**: HTTP client for API requests
- **Google Gemini API**: AI-powered schedule generation

## Security

- API keys are only used for the current session and are never stored
- Input sanitization prevents prompt injection attacks
- API keys are sent in headers (not URL parameters) for better security
- All user inputs are validated and limited in length

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project was created for Cheesehacks.

## Acknowledgments

- Built with ❤️ using React and Vite
- Powered by Google Gemini AI
- Calendar functionality provided by react-big-calendar
