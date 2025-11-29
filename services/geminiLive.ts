
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { MODEL_NAME, SYSTEM_INSTRUCTION } from '../constants';
import { base64ToUint8Array, createPcmBlob, decodeAudioData } from './audioUtils';

// Tool Definition
const tools: FunctionDeclaration[] = [
  {
    name: "start_coding_challenge",
    description: "Generates a random coding problem for the interview. Returns the title, description, and function signature.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    }
  }
];

export class GeminiLiveService {
  private client: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private session: any = null;
  private audioSources = new Set<AudioBufferSourceNode>();
  
  // Callbacks
  public onConnectionUpdate: (status: string) => void = () => {};
  public onAudioActivity: (isTalking: boolean) => void = () => {};
  public onVolumeUpdate: (volume: number) => void = () => {};
  public onToolCall: (name: string, args: any) => Promise<any> = async () => ({ result: "ok" });

  private checkInterval: number | null = null;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async connect() {
    try {
      this.onConnectionUpdate('CONNECTING');
      
      // Initialize Audio Contexts
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Setup Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.sourceNode = this.inputAudioContext.createMediaStreamSource(stream);
      
      // Setup Processor for Input
      this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
      
      // Connect to Gemini
      const sessionPromise = this.client.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          tools: [{ functionDeclarations: tools }],
        },
        callbacks: {
          onopen: () => {
            this.onConnectionUpdate('CONNECTED');
            console.log("Gemini Live Connected");
            
            if (this.scriptProcessor && this.sourceNode && this.inputAudioContext) {
              this.scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createPcmBlob(inputData);
                
                // Calculate volume for visualizer
                let sum = 0;
                for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                const rms = Math.sqrt(sum / inputData.length);
                this.onVolumeUpdate(rms);

                sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              
              this.sourceNode.connect(this.scriptProcessor);
              this.scriptProcessor.connect(this.inputAudioContext.destination);
            }
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Audio
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              await this.playAudio(audioData);
            }

            // Handle Interruption (User started speaking)
            const interrupted = msg.serverContent?.interrupted;
            if (interrupted) {
              console.log("Audio Interrupted");
              this.stopAllAudio();
              this.nextStartTime = 0;
            }

            // Handle Function Calling
            const toolCall = msg.toolCall;
            if (toolCall) {
              console.log("Gemini requested tool:", toolCall);
              for (const fc of toolCall.functionCalls) {
                if (this.onToolCall) {
                   const result = await this.onToolCall(fc.name, fc.args);
                   // Send response back
                   sessionPromise.then(session => {
                     session.sendToolResponse({
                       functionResponses: [
                         {
                           id: fc.id,
                           name: fc.name,
                           response: { result: result } 
                         }
                       ]
                     });
                   });
                }
              }
            }
          },
          onclose: () => {
            this.onConnectionUpdate('DISCONNECTED');
            console.log("Gemini Live Closed");
          },
          onerror: (err) => {
            console.error("Gemini Live Error", err);
            this.onConnectionUpdate('ERROR');
          }
        }
      });
      
      this.session = await sessionPromise;
      this.startAudioCheckLoop();

    } catch (error) {
      console.error("Connection failed", error);
      this.onConnectionUpdate('ERROR');
    }
  }

  // New method to send text context (Code updates)
  sendText(text: string) {
    if (this.session) {
      // We send this as a text part. 
      // Note: In Live API, sending text usually triggers a model response.
      // We rely on system instructions to tell the model to treat this as context update.
      this.session.send({ parts: [{ text }] }, true); 
    }
  }

  async playAudio(base64Data: string) {
    if (!this.outputAudioContext) return;

    // Decode
    const rawBytes = base64ToUint8Array(base64Data);
    const audioBuffer = await decodeAudioData(rawBytes, this.outputAudioContext);

    // Schedule
    this.nextStartTime = Math.max(this.outputAudioContext.currentTime, this.nextStartTime);
    
    const source = this.outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputAudioContext.destination);
    
    source.onended = () => {
      this.audioSources.delete(source);
    };

    source.start(this.nextStartTime);
    this.audioSources.add(source);
    
    this.nextStartTime += audioBuffer.duration;
  }

  stopAllAudio() {
    for (const source of this.audioSources) {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
    }
    this.audioSources.clear();
  }

  startAudioCheckLoop() {
    if (this.checkInterval) window.clearInterval(this.checkInterval);
    
    this.checkInterval = window.setInterval(() => {
      if (!this.outputAudioContext) return;
      const isTalking = this.outputAudioContext.currentTime < (this.nextStartTime - 0.05);
      this.onAudioActivity(isTalking);
    }, 50);
  }

  async disconnect() {
    if (this.session) {
      this.session = null;
    }
    
    this.stopAllAudio();

    if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
    }
    if (this.scriptProcessor) {
        this.scriptProcessor.disconnect();
        this.scriptProcessor = null;
    }
    if (this.inputAudioContext) {
        await this.inputAudioContext.close();
        this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
        await this.outputAudioContext.close();
        this.outputAudioContext = null;
    }
    if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
    }
    this.onConnectionUpdate('DISCONNECTED');
    this.onAudioActivity(false);
  }
}
