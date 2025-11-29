
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ConnectionStatus, CodingProblem } from './types';
import { GeminiLiveService } from './services/geminiLive';
import { CodingService } from './services/codingService';
import { Avatar } from './components/Avatar';
import { Visualizer } from './components/Visualizer';
import { CodingWorkspace } from './components/CodingWorkspace';

const App: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isTalking, setIsTalking] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [viewMode, setViewMode] = useState<'avatar' | 'coding'>('avatar');
  
  // State to hold the active problem
  const [activeProblem, setActiveProblem] = useState<CodingProblem | null>(null);
  
  // Ref to track active problem immediately inside callbacks without stale closures
  const activeProblemRef = useRef<CodingProblem | null>(null);
  
  const serviceRef = useRef<GeminiLiveService | null>(null);
  const codingService = useMemo(() => new CodingService(), []);
  
  // Debounce timer ref for code updates
  const codeUpdateTimeoutRef = useRef<number | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    activeProblemRef.current = activeProblem;
  }, [activeProblem]);

  useEffect(() => {
    // Instantiate service on mount
    const service = new GeminiLiveService();
    service.onConnectionUpdate = (s) => setStatus(s as ConnectionStatus);
    service.onAudioActivity = (talking) => setIsTalking(talking);
    service.onVolumeUpdate = (vol) => setMicVolume(vol);
    
    // Handle Tool Calls from Gemini
    service.onToolCall = async (name, args) => {
      console.log(`Tool Called: ${name}`);
      
      if (name === 'start_coding_challenge') {
        // PREVENTION: If a problem is already active, DO NOT generate a new one.
        // This prevents the AI from resetting the user's progress if it calls the tool again.
        if (activeProblemRef.current) {
          console.log("Problem already active, returning existing problem to AI.");
          return {
             status: "success",
             problem_title: activeProblemRef.current.title,
             problem_description: activeProblemRef.current.description,
             function_signature: activeProblemRef.current.functionSignature.javascript,
             message: "Challenge already started. Continue discussion."
          };
        }

        try {
          // 1. Generate the problem
          const problem = await codingService.generateProblem();
          
          // 2. Set App State
          setActiveProblem(problem);
          setViewMode('coding');
          
          // 3. Return the problem details to Gemini so it can read them
          return {
             status: "success",
             problem_title: problem.title,
             problem_description: problem.description,
             function_signature: problem.functionSignature.javascript
          };
        } catch (e) {
          console.error("Error generating problem via tool", e);
          return { status: "error", message: "Failed to generate problem" };
        }
      }
      return { result: "unknown tool" };
    };

    serviceRef.current = service;

    return () => {
      // Cleanup on unmount
      service.disconnect();
      if (codeUpdateTimeoutRef.current) {
        window.clearTimeout(codeUpdateTimeoutRef.current);
      }
    };
  }, [codingService]);

  const handleToggleConnection = async () => {
    if (status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING) {
      await serviceRef.current?.disconnect();
      setStatus(ConnectionStatus.DISCONNECTED);
      setIsTalking(false);
    } else {
      // Play talking video immediately on start (simulating greeting/connecting)
      setIsTalking(true);
      await serviceRef.current?.connect();
    }
  };

  const handleStartCoding = async () => {
    // Manual start: If no problem exists, generate one.
    if (!activeProblem) {
       const problem = await codingService.generateProblem();
       setActiveProblem(problem);
    }
    setViewMode('coding');
  };

  const handleBackToAvatar = () => {
    setViewMode('avatar');
  };

  // Handler for code changes from Workspace
  const handleCodeUpdate = (code: string) => {
    // Only send updates if we are connected
    if (status !== ConnectionStatus.CONNECTED) return;

    // Debounce: Wait 2 seconds after last keystroke
    if (codeUpdateTimeoutRef.current) {
      window.clearTimeout(codeUpdateTimeoutRef.current);
    }

    codeUpdateTimeoutRef.current = window.setTimeout(() => {
      // Send code to Gemini as system context
      const contextMessage = `SYSTEM_CODE_UPDATE:\n${code}\n[System Note: This is the user's current code. Read it silently to understand their progress. Do not explicitly reply to this message unless the user asks for help.]`;
      serviceRef.current?.sendText(contextMessage);
      console.log("Sent code update to Gemini");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full flex flex-col gap-6">
        
        {/* Header */}
        <header className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Vertex AI Interviewer
            </h1>
            <p className="text-sm text-gray-400">Powered by Gemini 3.0 Pro</p>
          </div>
          <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
             <span className="text-xs font-mono uppercase text-gray-500">{status}</span>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column: Avatar OR Coding Workspace */}
          <div className="md:col-span-2 relative group">
            {viewMode === 'avatar' ? (
              <>
                <Avatar 
                  isTalking={isTalking} 
                  isActive={status !== ConnectionStatus.DISCONNECTED} 
                />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="bg-black/50 text-[10px] text-gray-300 px-2 py-1 rounded backdrop-blur-sm">
                    Generated with Veo & Imagen
                  </span>
                </div>
              </>
            ) : (
              // Pass the activeProblem if it was generated by the AI
              <CodingWorkspace 
                onBack={handleBackToAvatar} 
                initialProblem={activeProblem}
                isTalking={isTalking}
                isActive={status !== ConnectionStatus.DISCONNECTED}
                onCodeChange={handleCodeUpdate}
              />
            )}
          </div>

          {/* Right Column: Controls */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 justify-center bg-gray-900/50 p-6 rounded-2xl border border-gray-800 h-fit">
               <div className="text-center mb-4">
                  <h2 className="text-lg font-medium text-gray-200">Session Controls</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Select your interview mode.
                  </p>
               </div>

               <div className="h-12 w-full bg-black/40 rounded-lg overflow-hidden border border-gray-800">
                 <Visualizer isConnected={status === ConnectionStatus.CONNECTED} volume={micVolume} />
               </div>

               {/* Live Audio Button */}
               <button
                  onClick={handleToggleConnection}
                  disabled={status === ConnectionStatus.CONNECTING}
                  className={`w-full py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2
                    ${status === ConnectionStatus.CONNECTED 
                      ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50' 
                      : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20'}
                    ${status === ConnectionStatus.CONNECTING ? 'opacity-50 cursor-wait' : ''}
                  `}
               >
                  {status === ConnectionStatus.CONNECTING ? (
                     <span>Connecting...</span>
                  ) : status === ConnectionStatus.CONNECTED ? (
                     <>
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                       End Call
                     </>
                  ) : (
                     <>
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                       Start Interview
                     </>
                  )}
               </button>

               {/* Coding Mode Button */}
               <button
                  onClick={handleStartCoding}
                  disabled={viewMode === 'coding'}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 border
                    ${viewMode === 'coding'
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 cursor-default'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white'}
                  `}
               >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                 Start Coding Interview
               </button>

               {/* Status Messages */}
               <div className="mt-4 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-400 min-h-[60px]">
                  <p className="font-mono mb-1 text-gray-500 uppercase tracking-widest text-[10px]">System Log</p>
                  {status === ConnectionStatus.DISCONNECTED && "Ready to connect."}
                  {status === ConnectionStatus.CONNECTING && "Establishing WebSocket handshake with Gemini..."}
                  {status === ConnectionStatus.CONNECTED && viewMode === 'avatar' && "Session Active. Listening..."}
                  {status === ConnectionStatus.CONNECTED && viewMode === 'coding' && "Coding Mode Active. AI is monitoring..."}
                  {status === ConnectionStatus.ERROR && "Connection Error. Service may be unavailable or API key invalid."}
               </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-600 pt-8 border-t border-gray-900">
           <p>Mockup Interface for Google Vertex AI Multimodal Live API.</p>
           <p className="mt-1">Replace placeholder video URLs in <code>constants.ts</code> with your own Veo assets.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
