
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Settings, 
  Loader2, 
  Waveform,
  History,
  Info,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { decode, encode, decodeAudioData } from '../audio-utils';

const VoiceAssistant: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<{role: string, text: string}[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    
    setIsActive(false);
    setIsConnecting(false);
  }, []);

  const startSession = async () => {
    setError(null);
    setIsConnecting(true);
    setTranscription([]);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser does not support audio recording.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(err => {
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          throw new Error("No microphone detected. Please plug in a microphone and try again.");
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw new Error("Microphone access denied. Please enable microphone permissions in your browser settings.");
        } else {
          throw new Error(`Microphone error: ${err.message}`);
        }
      });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: any) => {
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              currentInputTranscription.current += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const uTrans = currentInputTranscription.current;
              const mTrans = currentOutputTranscription.current;
              if (uTrans || mTrans) {
                setTranscription(prev => [...prev, 
                  ...(uTrans ? [{role: 'user', text: uTrans}] : []),
                  ...(mTrans ? [{role: 'model', text: mTrans}] : [])
                ]);
              }
              currentInputTranscription.current = '';
              currentOutputTranscription.current = '';
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (base64Audio) {
              const outCtx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              
              const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outCtx.destination);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Live API Error:", e);
            setError("Connection lost. Please try again.");
            stopSession();
          },
          onclose: () => {
            console.log("Live API Closed");
            stopSession();
          }
        },
        config: {
          responseModalities: ['AUDIO' as any],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: 'You are a helpful, friendly AI multimedia specialist. You assist users in navigating the studio and provide creative inspiration for images and videos.',
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      });
      
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error("Voice initialization failed:", err);
      setIsConnecting(false);
      setError(err.message || "Failed to start voice assistant.");
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Volume2 className="w-8 h-8 text-blue-400" />
            Voice AI
          </h2>
          <p className="text-gray-400 mt-1">Real-time low-latency conversations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8 flex flex-col gap-6">
          <div className="relative aspect-square md:aspect-video rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center overflow-hidden shadow-2xl">
            <div className={`absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
            
            <div className="relative z-10 flex flex-col items-center gap-8 px-6 w-full max-w-md">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-[0_0_50px_rgba(37,99,235,0.2)] ${
                isActive ? 'bg-blue-600 scale-110 shadow-[0_0_100px_rgba(37,99,235,0.4)]' : 
                error ? 'bg-red-500/20 ring-2 ring-red-500' : 'bg-white/10'
              }`}>
                {isConnecting ? (
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                ) : isActive ? (
                  <div className="flex items-end gap-1.5 h-12">
                     <div className="w-1.5 bg-white animate-voice-1 rounded-full" />
                     <div className="w-1.5 bg-white animate-voice-2 rounded-full" />
                     <div className="w-1.5 bg-white animate-voice-3 rounded-full" />
                     <div className="w-1.5 bg-white animate-voice-2 rounded-full" />
                     <div className="w-1.5 bg-white animate-voice-1 rounded-full" />
                  </div>
                ) : error ? (
                  <AlertCircle className="w-12 h-12 text-red-500" />
                ) : (
                  <MicOff className="w-12 h-12 text-gray-500" />
                )}
              </div>

              <div className="text-center w-full">
                {error ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <h3 className="text-xl font-bold mb-2 text-red-400">Microphone Issue</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                      {error}
                    </p>
                    <button 
                      onClick={startSession}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all font-semibold"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-2xl font-bold mb-2">
                      {isConnecting ? "Connecting..." : isActive ? "Gemini is listening" : "Ready to talk?"}
                    </h3>
                    <p className="text-gray-400">
                      {isActive ? "Go ahead, ask me anything about the studio" : "Tap the button below to start a conversation"}
                    </p>
                  </>
                )}
              </div>

              {!error && (
                <button
                  onClick={isActive ? stopSession : startSession}
                  disabled={isConnecting}
                  className={`mt-4 px-10 py-4 rounded-full font-bold text-lg transition-all active:scale-95 shadow-2xl ${
                    isActive 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
                    : 'bg-white text-black hover:bg-gray-100 shadow-white/10'
                  }`}
                >
                  {isActive ? "End Conversation" : "Start Conversation"}
                </button>
              )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes voice-1 { 0%, 100% { height: 40%; } 50% { height: 100%; } }
              @keyframes voice-2 { 0%, 100% { height: 60%; } 50% { height: 80%; } }
              @keyframes voice-3 { 0%, 100% { height: 30%; } 50% { height: 90%; } }
              .animate-voice-1 { animation: voice-1 0.6s ease-in-out infinite; }
              .animate-voice-2 { animation: voice-2 0.8s ease-in-out infinite; }
              .animate-voice-3 { animation: voice-3 0.7s ease-in-out infinite; }
            `}} />
          </div>

          <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-3xl flex items-start gap-4">
            <Info className="w-6 h-6 text-blue-400 flex-shrink-0" />
            <p className="text-sm text-gray-400">
              The Live API requires a working microphone. Ensure your device is connected and permissions are granted in the browser.
            </p>
          </div>
        </div>

        <div className="md:col-span-4 flex flex-col gap-6 h-full">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex-1 flex flex-col min-h-[400px]">
            <h4 className="font-bold mb-4 flex items-center gap-2 border-b border-white/5 pb-4">
              <History className="w-4 h-4 text-gray-400" />
              Live Transcript
            </h4>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {transcription.length > 0 ? transcription.map((item, idx) => (
                <div key={idx} className={`flex flex-col ${item.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] font-bold uppercase text-gray-500 mb-1">{item.role}</span>
                  <div className={`p-3 rounded-2xl text-sm max-w-[90%] ${item.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none'}`}>
                    {item.text}
                  </div>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                  <Mic className="w-8 h-8 mb-2" />
                  <p className="text-xs">Dialogue history will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;
