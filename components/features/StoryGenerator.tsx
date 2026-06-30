
import React, { useState, useEffect } from 'react';
import { Feature, Session, StoryGeneratorParams } from '../../types';
import FeatureContainer from './FeatureContainer';
import ImageUploader from '../ImageUploader';
import ModelSelector from '../ModelSelector';
import { analyzeStory, generateStoryImage } from '../../services/geminiService';

interface StoryGeneratorProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null;
  onSendImage: (image: string, featureId: Feature) => void;
}

const StoryGenerator: React.FC<StoryGeneratorProps> = ({ sessionToLoad, onSaveSession, imageToLoad, onSendImage }) => {
  const [story, setStory] = useState('');
  const [referenceImages, setReferenceImages] = useState<{ image: string; name: string }[]>([
    { image: '', name: 'Nhân vật chính' },
    { image: '', name: '' },
    { image: '', name: '' },
    { image: '', name: '' },
  ]);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [quality, setQuality] = useState<'Standard' | 'High'>('Standard');
  const [modelType, setModelType] = useState<'flash' | 'pro'>('flash');
  const [isLoading, setIsLoading] = useState(false);
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [scenes, setScenes] = useState<string[]>([]);
  const [characterDescription, setCharacterDescription] = useState('');
  const [currentStep, setCurrentStep] = useState<'input' | 'processing' | 'result'>('input');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionToLoad && sessionToLoad.featureId === Feature.GenerateStoryImages) {
      const params = sessionToLoad.parameters as StoryGeneratorParams;
      setStory(params.story);
      // Ensure we have 4 slots even if session has fewer
      const loadedRefs = [...params.referenceImages];
      while (loadedRefs.length < 4) {
        loadedRefs.push({ image: '', name: '' });
      }
      setReferenceImages(loadedRefs);
      setAspectRatio(params.aspectRatio);
      setQuality(params.quality);
      setModelType(params.modelType || 'flash');
      setResultImages(sessionToLoad.resultImages);
      setCurrentStep('result');
    }
  }, [sessionToLoad]);

  const handleSubmit = async () => {
    if (!story.trim()) return;
    setIsLoading(true);
    setCurrentStep('processing');
    setResultImages([]);
    setError(null);
    
    try {
      // Filter out empty reference images
      const activeRefs = referenceImages.filter(ref => ref.image && ref.name.trim());

      // Step 1: Analyze Story
      const analysis = await analyzeStory(story);
      
      if (!analysis.scenes || analysis.scenes.length === 0) {
        throw new Error("Không tìm thấy phân cảnh nào trong câu chuyện.");
      }

      setScenes(analysis.scenes);
      setCharacterDescription(analysis.characterDescription);
      setProgress({ current: 0, total: analysis.scenes.length });

      // Step 2: Generate Images for each scene
      const generatedImages: string[] = [];
      for (let i = 0; i < analysis.scenes.length; i++) {
        setProgress(prev => ({ ...prev, current: i + 1 }));
        
        // Add a small delay between requests to avoid rate limits
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 1000));

        const img = await generateStoryImage(
          analysis.scenes[i],
          analysis.characterDescription,
          activeRefs,
          aspectRatio,
          modelType
        );
        generatedImages.push(img);
      }

      setResultImages(generatedImages);
      setCurrentStep('result');
      
      onSaveSession({
        originalImage: activeRefs.map(r => r.image),
        resultImages: generatedImages,
        parameters: {
          story,
          referenceImages: activeRefs,
          aspectRatio,
          quality,
          modelType
        }
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Có lỗi xảy ra trong quá trình tạo ảnh. Vui lòng thử lại.");
      setCurrentStep('input');
    } finally {
      setIsLoading(false);
    }
  };

  const updateReferenceImage = (index: number, image: string) => {
    const newRefs = [...referenceImages];
    newRefs[index] = { ...newRefs[index], image };
    setReferenceImages(newRefs);
  };

  const updateReferenceName = (index: number, name: string) => {
    const newRefs = [...referenceImages];
    newRefs[index] = { ...newRefs[index], name };
    setReferenceImages(newRefs);
  };

  if (currentStep === 'processing') {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="mb-8">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">Đang xử lý câu chuyện...</h2>
        <p className="text-gray-400 mb-2">Đang tạo ảnh cho phân cảnh {progress.current} / {progress.total}</p>
        <div className="w-full bg-slate-700 rounded-full h-4 max-w-md mx-auto overflow-hidden">
          <div 
            className="bg-purple-600 h-full transition-all duration-500" 
            style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
          ></div>
        </div>
      </div>
    );
  }

  if (currentStep === 'result') {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Kết quả câu chuyện</h2>
          <button 
            onClick={() => setCurrentStep('input')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
          >
            Tạo truyện mới
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {resultImages.map((img, idx) => (
            <div key={idx} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-lg group">
              <div className="relative aspect-video overflow-hidden">
                <img src={img} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute top-4 left-4 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded shadow-md">
                  CẢNH {idx + 1}
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-300 leading-relaxed italic">"{scenes[idx] || "Mô tả phân cảnh"}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <FeatureContainer
      title="Tạo ảnh theo câu chuyện"
      description="Biến câu chuyện của bạn thành bộ ảnh minh họa đồng nhất về nhân vật và bối cảnh."
      onSubmit={handleSubmit}
      isLoading={isLoading}
      canSubmit={story.trim().length > 0}
    >
      <div className="space-y-8">
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">Nội dung câu chuyện</label>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Nhập câu chuyện của bạn ở đây. AI sẽ tự động phân tích thành các phân cảnh và tạo ảnh minh họa..."
            className="w-full h-48 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none transition-all"
          />
          <p className="text-xs text-gray-500 mt-2 italic">* Gợi ý: Hãy mô tả rõ ràng các hành động và bối cảnh để AI phân tích tốt nhất.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-300">Ảnh tham chiếu (Nhân vật & Đồ vật)</label>
            <div className="grid grid-cols-2 gap-4">
              {referenceImages.map((ref, idx) => (
                <div key={idx} className="space-y-2">
                  <ImageUploader 
                    id={`ref-img-${idx}`}
                    title=""
                    value={ref.image}
                    onImageUpload={(img) => updateReferenceImage(idx, img)}
                    className="h-32"
                  />
                  <input
                    type="text"
                    value={ref.name}
                    onChange={(e) => updateReferenceName(idx, e.target.value)}
                    placeholder={`Tên đối tượng ${idx + 1}`}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-1 focus:ring-purple-500 outline-none"
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 italic">* Tải ảnh và đặt tên để AI nhận diện nhân vật/đồ vật đồng nhất.</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Tỷ lệ khung hình</label>
              <div className="grid grid-cols-3 gap-3">
                {(['1:1', '16:9', '9:16'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      aspectRatio === ratio
                        ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20'
                        : 'bg-slate-900 border-slate-700 text-gray-400 hover:border-slate-500'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Chất lượng</label>
              <div className="grid grid-cols-2 gap-3">
                {(['Standard', 'High'] as const).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuality(q)}
                    className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      quality === q
                        ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20'
                        : 'bg-slate-900 border-slate-700 text-gray-400 hover:border-slate-500'
                    }`}
                  >
                    {q === 'Standard' ? 'Tiêu chuẩn' : 'Cao cấp'}
                  </button>
                ))}
              </div>
            </div>

            <ModelSelector selectedModel={modelType} onModelChange={setModelType} />
          </div>
        </div>
        
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <p className="text-xs text-purple-300 leading-relaxed">
            <span className="font-bold">Lưu ý:</span> Nếu bạn tải lên ảnh tham chiếu, AI sẽ cố gắng sử dụng chúng để đảm bảo nhân vật và đồ vật xuất hiện đồng nhất trong tất cả các phân cảnh.
          </p>
        </div>
      </div>
    </FeatureContainer>
  );
};

export default StoryGenerator;
