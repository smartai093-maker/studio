
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Sparkles, 
  Send, 
  Upload, 
  Download, 
  Loader2,
  ImagePlus,
  Trash2,
  CheckCircle2
} from 'lucide-react';

const ImageStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [history, setHistory] = useState<{url: string, prompt: string}[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBaseImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !baseImage) return;
    
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      let response;

      if (baseImage) {
        // Image Editing Mode
        const base64Data = baseImage.split(',')[1];
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: 'image/png',
                },
              },
              {
                text: prompt || 'Enhance this image',
              },
            ],
          },
        });
      } else {
        // Prompt to Image Mode
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: prompt }],
          },
        });
      }

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          setResultImage(imageUrl);
          setHistory(prev => [{url: imageUrl, prompt}, ...prev]);
          break;
        }
      }
    } catch (error) {
      console.error("Image generation error:", error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <ImagePlus className="w-8 h-8 text-pink-400" />
            Image Studio
          </h2>
          <p className="text-gray-400 mt-1">Generate or edit images with Gemini 2.5 Flash</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Workspace */}
        <div className="lg:col-span-8 space-y-6">
          <div className="relative aspect-video rounded-3xl bg-white/5 border border-white/10 overflow-hidden group flex items-center justify-center">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-gray-400 font-medium animate-pulse">Imagining your creation...</p>
              </div>
            ) : resultImage ? (
              <img src={resultImage} alt="Generated" className="w-full h-full object-contain" />
            ) : baseImage ? (
              <div className="relative w-full h-full">
                <img src={baseImage} alt="Base" className="w-full h-full object-contain opacity-50" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
                     <p className="text-sm font-medium">Image Loaded. Add a prompt to edit.</p>
                   </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 text-center px-8">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Ready to create?</h3>
                  <p className="text-gray-500 max-w-sm">Enter a prompt or upload a reference image to begin your creative journey.</p>
                </div>
              </div>
            )}

            {resultImage && !isGenerating && (
              <div className="absolute bottom-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = resultImage;
                    a.download = `gemini-art-${Date.now()}.png`;
                    a.click();
                  }}
                  className="p-3 bg-white text-black rounded-xl hover:bg-gray-100 transition-colors shadow-xl"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setResultImage(null)}
                  className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-xl"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={baseImage ? "E.g., 'Add a retro cinematic filter' or 'Put a hat on the cat'" : "Describe what you want to create..."}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none min-h-[80px]"
                  />
                  <div className="absolute bottom-4 right-4 text-xs text-gray-500">
                    Gemini 2.5 Flash Image
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer transition-colors border border-white/10 text-sm font-medium">
                    <Upload className="w-4 h-4" />
                    <span>{baseImage ? "Change Image" : "Upload Reference"}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                  {baseImage && (
                    <button 
                      onClick={() => setBaseImage(null)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Clear Reference"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || (!prompt.trim() && !baseImage)}
                  className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {isGenerating ? "Generating..." : "Generate Image"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              Creative History
            </h4>
            <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {history.length > 0 ? history.map((item, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setResultImage(item.url)}
                  className="aspect-square rounded-xl overflow-hidden hover:ring-2 hover:ring-indigo-500 transition-all border border-white/5"
                >
                  <img src={item.url} alt="History" className="w-full h-full object-cover" />
                </button>
              )) : (
                <div className="col-span-2 py-12 text-center">
                  <p className="text-gray-500 text-sm">No generations yet.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600">
            <h4 className="font-bold text-white mb-2">Pro Tip</h4>
            <p className="text-indigo-100 text-sm leading-relaxed">
              Use specific adjectives like "cinematic," "neon-lit," or "minimalist" to get better results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageStudio;
