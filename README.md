# Vertex AI Interviewer (Gemini Avatar Interface)

A real-time, multimodal technical interview simulation built with React and Google's Gemini Multimodal Live API. This application features an AI avatar that acts as a Senior Google Staff Engineer to conduct a live coding interview, capable of speaking, listening, and "reading" the code you write in real-time.

## Features

- **Multimodal Live Interaction**: Uses `gemini-2.0-flash-exp` via WebSockets for low-latency, real-time voice conversations.
- **AI Avatar**: Visual representation with "Listening" and "Talking" states, synchronized with audio activity.
- **Integrated Coding Environment**: 
  - Supports **JavaScript** and **Python**.
  - Syntax highlighting via PrismJS.
  - Custom lightweight code editor implementation.
- **Real-time Context Awareness**: The AI "watches" you type. Code changes are debounced and sent to the model as context, allowing the AI to give specific hints about your implementation.
- **Remote Code Execution**: 
  - Integrates with **Judge0** (via RapidAPI) to compile and run code securely.
  - Automated test case validation with pass/fail reporting.
- **Tool Use (Function Calling)**: The AI autonomously decides when to transition from the introduction phase to the technical challenge using server-side tool definitions.

## Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **AI/ML**: Google GenAI SDK (`@google/genai`)
- **Code Execution**: Judge0 CE API
- **Audio**: Web Audio API (Raw PCM processing, AudioContext)

## Prerequisites

- **Node.js** (v16 or higher)
- **Google Gemini API Key**: You need a paid or free tier key from [Google AI Studio](https://aistudiocdn.com).
- **Judge0 API Key**: (Optional if replacing the hardcoded key) A key from RapidAPI for Judge0.

## Installation

1. **Clone the repository** (or copy the files):
   ```bash
   git clone <repository-url>
   cd vertex-ai-interviewer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your Google API key:
   ```env
   API_KEY=your_google_gemini_api_key_here
   ```
   *Note: The application expects `process.env.API_KEY` to be available. Depending on your bundler (Vite/Webpack), you might need to prefix this with `VITE_` or configure your bundler to expose it.*

## Usage

1. **Start the development server**:
   ```bash
   npm start
   # or
   npm run dev
   ```

2. **Start the Interview**:
   - Open the app in your browser.
   - Click **"Start Interview"**.
   - **Phase 1**: The AI will greet you and ask for a self-introduction. Speak clearly into your microphone.
   - **Phase 2**: After your introduction, the AI will trigger the coding workspace.
   - **Phase 3**: Solve the "Maximum Score after Split" problem in the editor.
   - **Run Code**: Click the "Run Code" button to execute your solution against the test cases.
   - **Discuss**: Talk to the AI while you code. It sees what you write and can answer questions or provide hints.

## Project Structure

- **`App.tsx`**: Main application logic, state management, and view switching.
- **`services/geminiLive.ts`**: Handles the WebSocket connection with Google Gemini, audio streaming, and tool execution.
- **`services/codingService.ts`**: Manages the coding problem definition (currently hardcoded for stability) and interfaces with the Judge0 API for code execution.
- **`components/CodingWorkspace.tsx`**: The IDE interface, containing the editor, language selector, and test runner output.
- **`components/Avatar.tsx`**: Handles video playback for the avatar states.
- **`constants.ts`**: System instructions for the AI persona and asset configurations.

## Customization

- **Changing the Problem**: Modify `services/codingService.ts` to fetch random problems or define new ones.
- **Changing the Persona**: Edit `SYSTEM_INSTRUCTION` in `constants.ts` to change how the AI behaves.
- **Video Assets**: Replace the URLs in `VIDEO_ASSETS` in `constants.ts` with your own hosted MP4 files for the avatar.

## License

MIT
