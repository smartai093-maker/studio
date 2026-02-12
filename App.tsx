
import React, { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Mic as MicIcon, 
  Home as HomeIcon,
  Sparkles,
  Info,
  AlertCircle
} from 'lucide-react';
import { StudioMode } from './types';
import ImageStudio from './components/ImageStudio';
import VideoStudio from './components/VideoStudio';
import VoiceAssistant from './components/VoiceAssistant';

const App: React.FC = () => {
  const [mode, setMode] = useState<StudioMode>(StudioMode.HOME);
  const [isKeySelected, setIsKeySelected] = useState<boolean>(false);

  useEffect(() => {
    const checkKey = async () => {
      if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeySelected(hasKey);
      } else {
        // Fallback for environments where aistudio helper is not present
        setIsKeySelected(true);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (typeof window.aistudio?.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setIsKeySelected(true); // Proceed as per instruction
    }
  };

  const renderContent = () => {
    switch (mode) {
      case StudioMode.IMAGE:
        return <ImageStudio />;
      case StudioMode.VIDEO:
        return <VideoStudio isKeySelected={isKeySelected} onOpenKeySelector={handleOpenKeySelector} />;
      case StudioMode.VOICE:
        return <VoiceAssistant />;
      case StudioMode.HOME:
      default:
        return (
          <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-in">
            <header className="text-center mb-16">
              <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-6 ring-1 ring-indigo-500/20">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <h1 className="text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                Gemini Multimedia Studio
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                Experience the next generation of creative AI. Generate stunning visuals, 
                cinematic videos, and converse naturally in real-time.
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StudioCard 
                title="Image Studio" 
                desc="Generate and edit images using Gemini 2.5 Flash Image. Add filters, objects, and more with natural language."
                icon={<ImageIcon className="w-6 h-6 text-pink-400" />}
                onClick={() => setMode(StudioMode.IMAGE)}
                bgColor="bg-pink-500/5 hover:bg-pink-500/10"
                borderColor="border-pink-500/20"
              />
              <StudioCard 
                title="Video Studio" 
                desc="Powered by Veo. Transform text and images into cinematic video clips with multiple reference modes."
                icon={<VideoIcon className="w-6 h-6 text-purple-400" />}
                onClick={() => setMode(StudioMode.VIDEO)}
                bgColor="bg-purple-500/5 hover:bg-purple-500/10"
                borderColor="border-purple-500/20"
              />
              <StudioCard 
                title="Voice AI" 
                desc="Real-time conversational intelligence with the Gemini Live API. Speak naturally and get instant audio responses."
                icon={<MicIcon className="w-6 h-6 text-blue-400" />}
                onClick={() => setMode(StudioMode.VOICE)}
                bgColor="bg-blue-500/5 hover:bg-blue-500/10"
                borderColor="border-blue-500/20"
              />
            </div>

            {!isKeySelected && (
              <div className="mt-16 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-4">
                <Info className="w-6 h-6 text-amber-400 flex-shrink-0" />
                <div>
                  <h3 className="text-amber-400 font-semibold mb-1">Advanced Features Required</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    To use high-quality video generation (Veo) and pro-grade images, you must select an API key from a paid GCP project.
                  </p>
                  <button 
                    onClick={handleOpenKeySelector}
                    className="px-4 py-2 bg-amber-500 text-black rounded-lg font-medium text-sm hover:bg-amber-400 transition-colors"
                  >
                    Select API Key
                  </button>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => setMode(StudioMode.HOME)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Gemini Studio</span>
          </button>
          
          <div className="flex items-center gap-1 md:gap-4 bg-white/5 p-1 rounded-xl">
            <NavButton 
              active={mode === StudioMode.HOME} 
              onClick={() => setMode(StudioMode.HOME)} 
              icon={<HomeIcon className="w-4 h-4" />}
              label="Home"
            />
            <NavButton 
              active={mode === StudioMode.IMAGE} 
              onClick={() => setMode(StudioMode.IMAGE)} 
              icon={<ImageIcon className="w-4 h-4" />}
              label="Images"
            />
            <NavButton 
              active={mode === StudioMode.VIDEO} 
              onClick={() => setMode(StudioMode.VIDEO)} 
              icon={<VideoIcon className="w-4 h-4" />}
              label="Videos"
            />
            <NavButton 
              active={mode === StudioMode.VOICE} 
              onClick={() => setMode(StudioMode.VOICE)} 
              icon={<MicIcon className="w-4 h-4" />}
              label="Voice"
            />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>

      {/* Global Toast Placeholder (optional) */}
    </div>
  );
};

interface StudioCardProps {
  title: string;
  desc: string;
  icon: React.ReactNode;
  onClick: () => void;
  bgColor: string;
  borderColor: string;
}

const StudioCard: React.FC<StudioCardProps> = ({ title, desc, icon, onClick, bgColor, borderColor }) => (
  <button 
    onClick={onClick}
    className={`p-8 rounded-3xl border ${borderColor} ${bgColor} transition-all duration-300 group hover:scale-[1.02] flex flex-col items-start text-left`}
  >
    <div className="p-3 bg-white/5 rounded-2xl mb-6 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-2xl font-bold mb-3">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{desc}</p>
    <div className="mt-8 flex items-center text-sm font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
      Get Started &rarr;
    </div>
  </button>
);

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export default App;
