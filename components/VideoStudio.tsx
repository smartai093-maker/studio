
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Film, 
  Play, 
  Upload, 
  Loader2, 
  Plus, 
  CheckCircle2, 
  AlertTriangle,
  Clapperboard,
  LayoutGrid,
  ChevronRight,
  Monitor,
  Smartphone
} from 'lucide-react';

interface VideoStudioProps {
  isKeySelected: boolean;
  onOpenKeySelector: () => void;
}

const VideoStudio: React.FC<VideoStudioProps> = ({ isKeySelected, onOpenKeySelector }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const [firstFrame, setFirstFrame] = useState<string | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [refImages, setRefImages] = useState<string[]>([]);

  const handleFile = (setter: (val: string | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setter(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddRefImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && refImages.length < 3) {
      const reader = new FileReader();
      reader.onload = (event) => setRefImages(prev => [...prev, event.target?.result as string]);
      reader.readAsDataURL(file);
    }
  };

  const generateVideo = async () => {
    if (!isKeySelected) {
      onOpenKeySelector();
      return;
    }

    setIsGenerating(true);
    setVideoUrl(null);
    setStatus('Initializing generation...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      let operation;

      const loadingMessages = [
        "Analyzing scene dynamics...",
        "Simulating physics and motion...",
        "Rendering cinematic frames...",
        "Synchronizing temporal consistency...",
        "Applying final artistic touches..."
      ];

      let msgIdx = 0;
      const statusInterval = setInterval(() => {
        setStatus(loadingMessages[msgIdx % loadingMessages.length]);
        msgIdx++;
      }, 5000);

      if (refImages.length > 0) {
        // Multi-reference mode
        const referenceImagesPayload = refImages.map(img => ({
          image: {
            imageBytes: img.split(',')[1],
            mimeType: 'image/png',
          },
          referenceType: 'ASSET' as any,
        }));

        operation = await ai.models.generateVideos({
          model: 'veo-3.1-generate-preview',
          prompt: prompt || 'An atmospheric cinematic sequence',
          config: {
            numberOfVideos: 1,
            referenceImages: referenceImagesPayload as any,
            resolution: '720p',
            aspectRatio: '16:9'
          }
        });
      } else {
        // Standard / Frame-to-Frame mode
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: prompt || 'A cinematic masterpiece in motion',
          image: firstFrame ? {
            imageBytes: firstFrame.split(',')[1],
            mimeType: 'image/png'
          } : undefined,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio,
            lastFrame: lastFrame ? {
              imageBytes: lastFrame.split(',')[1],
              mimeType: 'image/png'
            } : undefined,
          }
        });
      }

      // Polling
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      clearInterval(statusInterval);
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      
      if (downloadLink) {
        setStatus('Downloading video...');
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
      } else {
        throw new Error("No video URI returned");
      }
    } catch (error: any) {
      console.error("Video generation error:", error);
      if (error.message?.includes("Requested entity was not found")) {
        alert("Session expired. Please re-select your API key.");
        onOpenKeySelector();
      } else {
        alert("Failed to generate video. Ensure your API key has billing enabled.");
      }
    } finally {
      setIsGenerating(false);
      setStatus('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Clapperboard className="w-8 h-8 text-purple-400" />
            Video Studio
          </h2>
          <p className="text-gray-400 mt-1">Create cinematic masterpieces with Veo 3.1</p>
        </div>
        
        {!isKeySelected && (
          <button 
            onClick={onOpenKeySelector}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl hover:bg-amber-500/20 transition-all text-sm font-semibold"
          >
            <AlertTriangle className="w-4 h-4" />
            Select API Key Required
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Preview Area */}
        <div className="lg:col-span-8 space-y-6">
          <div className="relative aspect-video rounded-3xl bg-black border border-white/10 overflow-hidden flex items-center justify-center shadow-2xl">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-4 text-center p-8">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                  <Film className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">Generating Cinema</h3>
                  <p className="text-indigo-400 font-medium animate-pulse">{status}</p>
                  <p className="text-xs text-gray-500 mt-4 italic max-w-xs">
                    Veo generation usually takes 1-3 minutes. Please stay on this page.
                  </p>
                </div>
              </div>
            ) : videoUrl ? (
              <video 
                src={videoUrl} 
                controls 
                autoPlay 
                loop 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-center text-gray-600">
                <Play className="w-16 h-16 opacity-20" />
                <p>Your cinematic video will appear here</p>
              </div>
            )}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the scene motion, atmosphere, and characters..."
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-purple-500 outline-none resize-none min-h-[100px] mb-4"
            />

            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                  <button 
                    onClick={() => setAspectRatio('16:9')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${aspectRatio === '16:9' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-300'}`}
                  >
                    <Monitor className="w-4 h-4" />
                    Landscape
                  </button>
                  <button 
                    onClick={() => setAspectRatio('9:16')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${aspectRatio === '9:16' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-300'}`}
                  >
                    <Smartphone className="w-4 h-4" />
                    Portrait
                  </button>
                </div>
              </div>

              <button
                onClick={generateVideo}
                disabled={isGenerating}
                className="flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all shadow-xl shadow-purple-600/20"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                {isGenerating ? "Processing..." : "Generate Movie"}
              </button>
            </div>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* Reference Frames */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <h4 className="font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-400">
              <LayoutGrid className="w-4 h-4" />
              Reference Inputs
            </h4>
            
            <div className="space-y-4">
              <div>
                <span className="text-xs font-medium text-gray-500 mb-2 block">Starting Frame</span>
                <FrameSlot 
                  image={firstFrame} 
                  onUpload={handleFile(setFirstFrame)} 
                  onClear={() => setFirstFrame(null)} 
                  label="Start"
                />
              </div>

              <div>
                <span className="text-xs font-medium text-gray-500 mb-2 block">Ending Frame</span>
                <FrameSlot 
                  image={lastFrame} 
                  onUpload={handleFile(setLastFrame)} 
                  onClear={() => setLastFrame(null)} 
                  label="End"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">Asset References (Max 3)</span>
                  <span className="text-xs text-indigo-400">{refImages.length}/3</span>
                </div>
                <div className="flex gap-2">
                  {refImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 group">
                      <img src={img} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setRefImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Plus className="w-4 h-4 rotate-45" />
                      </button>
                    </div>
                  ))}
                  {refImages.length < 3 && (
                    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-white/10 hover:border-indigo-500/50 flex items-center justify-center cursor-pointer transition-colors bg-white/5">
                      <Plus className="w-5 h-5 text-gray-500" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAddRefImage} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-6">
            <h4 className="font-bold text-indigo-300 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Veo 3.1 Capabilities
            </h4>
            <ul className="text-sm text-gray-400 space-y-2">
              <li className="flex gap-2"><ChevronRight className="w-3 h-3 mt-1 text-indigo-500" /> Image to video flow</li>
              <li className="flex gap-2"><ChevronRight className="w-3 h-3 mt-1 text-indigo-500" /> Start/End frame interpolation</li>
              <li className="flex gap-2"><ChevronRight className="w-3 h-3 mt-1 text-indigo-500" /> Character & style reference</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FrameSlotProps {
  image: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  label: string;
}

const FrameSlot: React.FC<FrameSlotProps> = ({ image, onUpload, onClear, label }) => (
  <div className="relative group">
    {image ? (
      <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-white/10">
        <img src={image} className="w-full h-full object-cover" />
        <button 
          onClick={onClear}
          className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Plus className="w-4 h-4 rotate-45" />
        </button>
        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-indigo-600 text-[10px] font-bold uppercase rounded text-white">
          {label}
        </div>
      </div>
    ) : (
      <label className="flex flex-col items-center justify-center aspect-[16/9] rounded-2xl border-2 border-dashed border-white/10 hover:border-indigo-500/50 bg-white/5 cursor-pointer transition-all group">
        <Upload className="w-6 h-6 text-gray-500 group-hover:text-indigo-400 transition-colors" />
        <span className="text-xs text-gray-500 mt-2 font-medium">Upload {label}</span>
        <input type="file" className="hidden" accept="image/*" onChange={onUpload} />
      </label>
    )}
  </div>
);

export default VideoStudio;
