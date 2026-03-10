import React, { useState, useEffect } from 'react';
import ImageUploader from '../ImageUploader';
import LoadingSpinner from '../LoadingSpinner';
import FeatureContainer from './FeatureContainer';
import SendToFeature from '../SendToFeature';
import UndoRedoControls from '../UndoRedoControls';
import ResultEditor from '../ResultEditor';
import ModelSelector from '../ModelSelector';
import { generatePoster, editImageWithPrompt, suggestSlogans } from '../../services/geminiService';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { Session, PosterGeneratorParams } from '../../types';
import { Feature } from '../../types';

interface PosterGeneratorProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null;
  onSendImage: (image: string, featureId: Feature) => void;
}

const PosterGenerator: React.FC<PosterGeneratorProps> = ({ sessionToLoad, onSaveSession, imageToLoad, onSendImage }) => {
  const [topic, setTopic] = useState('');
  const [slogan, setSlogan] = useState('');
  const [posterType, setPosterType] = useState<'Giáo dục' | 'Điện ảnh' | 'Tiếp thị'>('Tiếp thị');
  const [style, setStyle] = useState<PosterGeneratorParams['style']>('Hiện đại');
  const [styleImage, setStyleImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '3:4' | '9:16' | '16:9'>('1:1');
  const [images, setImages] = useState<string[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState<number>(0);
  const [numberOfImages, setNumberOfImages] = useState<number>(1);
  const [modelType, setModelType] = useState<'flash' | 'pro'>('flash');
  
  const {
    state: resultImages,
    setState: setResultImages,
    resetState: resetResultImages,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoRedo<string[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [sloganSuggestions, setSloganSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleImageUpload = (image: string) => {
    if (images.length < 4) {
      setImages(prev => [...prev, image]);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
    if (mainImageIndex === indexToRemove) {
      setMainImageIndex(0); // Reset to first image if main is removed
    } else if (mainImageIndex > indexToRemove) {
      setMainImageIndex(prev => prev - 1); // Adjust index if an image before main is removed
    }
  };
  
  const handleSetMainImage = (index: number) => {
    setMainImageIndex(index);
  };


  useEffect(() => {
    if (imageToLoad) {
       handleImageUpload(imageToLoad);
       resetResultImages([]);
    }
  }, [imageToLoad]);

  useEffect(() => {
    if (sessionToLoad && sessionToLoad.featureId === Feature.GeneratePoster) {
      resetResultImages(sessionToLoad.resultImages);
      const params = sessionToLoad.parameters as PosterGeneratorParams;
      setTopic(params.topic || '');
      setSlogan(params.slogan || '');
      setPosterType(params.posterType);
      setStyle(params.style);
      setStyleImage(params.styleImage || null);
      setAspectRatio(params.aspectRatio || '1:1');
      setImages(params.images || []);
      setMainImageIndex(params.mainImageIndex || 0);
      setNumberOfImages(params.numberOfImages);
      setModelType(params.modelType || 'flash');
    }
  }, [sessionToLoad]);

  const handleSloganSuggest = async () => {
    if (!topic.trim()) {
        setError("Vui lòng nhập chủ đề để gợi ý khẩu hiệu.");
        return;
    }
    setIsSuggesting(true);
    setError(null);
    try {
        const suggestions = await suggestSlogans(topic);
        setSloganSuggestions(suggestions);
    } catch (e) {
        setError(`Lỗi khi gợi ý khẩu hiệu: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
        setIsSuggesting(false);
    }
  };

  const checkApiKeyAndSelect = async (): Promise<boolean> => {
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
          // @ts-ignore
          await window.aistudio.openSelectKey();
          return true;
      }
      return true;
  };

  const handleSubmit = async () => {
    if (!topic.trim() && !slogan.trim() && images.length === 0) {
      setError('Vui lòng nhập chủ đề/khẩu hiệu hoặc tải lên ít nhất một ảnh.');
      return;
    }
    if (style === 'Ảnh mẫu' && !styleImage) {
        setError('Vui lòng tải lên ảnh mẫu phong cách.');
        return;
    }

    setIsLoading(true);
    setError(null);

    if (modelType === 'pro') {
        try {
            await checkApiKeyAndSelect();
        } catch (e) {
            setError("Cần chọn API Key để sử dụng mô hình Pro.");
            setIsLoading(false);
            return;
        }
    }
    
    const results: string[] = [];
    try {
      for (let i = 0; i < numberOfImages; i++) {
        setLoadingMessage(`Đang tạo ảnh ${i + 1} trên ${numberOfImages}...`);
        const newImage = await generatePoster(topic, slogan, posterType, style, aspectRatio, images, mainImageIndex, styleImage, modelType);
        results.push(newImage);
      }
      setResultImages(results);
      onSaveSession({
        originalImage: images[mainImageIndex] || styleImage || '',
        resultImages: results,
        parameters: { topic, slogan, posterType, style, styleImage, aspectRatio, images, mainImageIndex, numberOfImages, modelType },
      });
    } catch (e: any) {
        if (e.message && e.message.includes("Requested entity was not found.")) {
             setError("Lỗi xác thực API Key. Vui lòng chọn lại khóa.");
             // @ts-ignore
             window.aistudio.openSelectKey();
        } else {
             setError(`Đã xảy ra lỗi: ${e instanceof Error ? e.message : String(e)}`);
        }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleEditImage = async (editPrompt: string, index: number) => {
    if (editingIndex !== null) return;
    setEditingIndex(index);
    setError(null);
    try {
        const imageToEdit = resultImages[index];
        const newImage = await editImageWithPrompt(imageToEdit, editPrompt);
        
        const updatedResultImages = [...resultImages];
        updatedResultImages[index] = newImage;
        
        setResultImages(updatedResultImages);
    } catch (e) {
        setError(`Lỗi khi chỉnh sửa ảnh: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
        setEditingIndex(null);
    }
  };

  const canSubmit = (!!topic.trim() || !!slogan.trim() || images.length > 0) && (style !== 'Ảnh mẫu' || !!styleImage);

  return (
    <>
      <FeatureContainer
        title="Tạo Poster"
        description="Thiết kế poster tự động cho giáo dục, điện ảnh, hoặc tiếp thị chỉ với vài thao tác."
        onSubmit={handleSubmit}
        isLoading={isLoading}
        canSubmit={canSubmit}
      >
        <div className="space-y-6">
            <div>
                <label htmlFor="poster-topic" className="block text-sm font-medium text-gray-300 mb-2">1. Nhập chủ đề (tùy chọn)</label>
                <textarea
                    id="poster-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ví dụ: Ngày hội đọc sách"
                    rows={2}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-purple-500 focus:border-purple-500"
                />
            </div>
             <div>
                <label htmlFor="poster-slogan" className="block text-sm font-medium text-gray-300 mb-2">2. Nhập khẩu hiệu (tùy chọn)</label>
                <div className="relative">
                    <textarea
                        id="poster-slogan"
                        value={slogan}
                        onChange={(e) => setSlogan(e.target.value)}
                        placeholder="Ví dụ: Mở trang sách, sáng tương lai"
                        rows={2}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-purple-500 focus:border-purple-500"
                    />
                    <button onClick={handleSloganSuggest} disabled={isSuggesting || !topic.trim()} className="absolute bottom-2 right-2 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1 px-3 rounded-md disabled:bg-slate-500 disabled:cursor-not-allowed">
                        {isSuggesting ? '...' : 'Gợi ý khẩu hiệu'}
                    </button>
                </div>
                {sloganSuggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {sloganSuggestions.map((s, i) => (
                            <button key={i} onClick={() => { setSlogan(s); setSloganSuggestions([]); }} className="text-xs bg-slate-600 hover:bg-slate-500 text-gray-200 py-1 px-3 rounded-full">
                                "{s}"
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {(!topic.trim() && !slogan.trim()) && <p className="mt-1 text-xs text-amber-400">Gợi ý: Nhập chủ đề hoặc khẩu hiệu sẽ giúp AI tạo poster chính xác hơn.</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="poster-type" className="block text-sm font-medium text-gray-300">3. Loại poster</label>
                    <select id="poster-type" value={posterType} onChange={e => setPosterType(e.target.value as any)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md">
                        <option>Giáo dục</option>
                        <option>Điện ảnh</option>
                        <option>Tiếp thị</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="poster-style" className="block text-sm font-medium text-gray-300">4. Phong cách</label>
                    <select 
                        id="poster-style" 
                        value={style} 
                        onChange={e => {
                            const newStyle = e.target.value as PosterGeneratorParams['style'];
                            setStyle(newStyle);
                            if (newStyle !== 'Ảnh mẫu') {
                                setStyleImage(null);
                            }
                        }} 
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                    >
                        <option>Hiện đại</option>
                        <option>Cổ điển</option>
                        <option>Tối giản</option>
                        <option>Năng động</option>
                        <option>Nghệ thuật</option>
                        <option>Dễ thương</option>
                        <option>Ảnh mẫu</option>
                    </select>
                     {style === 'Ảnh mẫu' && (
                        <div className="mt-2">
                            <ImageUploader 
                                id="style-image-uploader" 
                                title="Tải lên ảnh mẫu phong cách" 
                                onImageUpload={setStyleImage} 
                                value={styleImage}
                            />
                        </div>
                    )}
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    5. Tải ảnh hoặc logo ({images.length}/4)
                </label>
                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-slate-900/50 rounded-lg">
                      {images.map((image, index) => (
                          <div key={index} className={`relative group aspect-square border-2 ${mainImageIndex === index ? 'border-purple-500' : 'border-transparent'} rounded-lg transition-all`}>
                              <img src={image} alt={`Uploaded ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                  <button
                                      onClick={() => handleSetMainImage(index)}
                                      disabled={mainImageIndex === index}
                                      className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-2 rounded disabled:bg-slate-500 disabled:cursor-not-allowed"
                                      aria-label='Đặt làm ảnh chính'
                                  >
                                      {mainImageIndex === index ? 'Ảnh chính' : 'Đặt làm chính'}
                                  </button>
                                  <button
                                      onClick={() => handleRemoveImage(index)}
                                      className="w-full text-xs bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-2 rounded"
                                      aria-label='Xóa ảnh'
                                  >
                                      Xóa
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
                )}
                {images.length < 4 && (
                    <ImageUploader 
                        id="logo-uploader" 
                        title={images.length === 0 ? "Tải ảnh chính" : `Tải ảnh/logo ${images.length + 1}`} 
                        onImageUpload={handleImageUpload} 
                        value={null}
                    />
                )}
            </div>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ModelSelector value={modelType} onChange={setModelType} />
                <div>
                    <label htmlFor="aspect-ratio" className="block text-sm font-medium text-gray-300">6. Kích thước</label>
                    <select id="aspect-ratio" value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md">
                        <option value="1:1">Mạng xã hội (1:1)</option>
                        <option value="3:4">In ấn (A3 - 3:4)</option>
                        <option value="9:16">Story/Reel (9:16)</option>
                        <option value="16:9">Ngang (16:9)</option>
                    </select>
                </div>
                <div>
                  <label htmlFor="num-images" className="block text-sm font-medium text-gray-300">7. Số lượng ảnh</label>
                  <select id="num-images" value={numberOfImages} onChange={(e) => setNumberOfImages(parseInt(e.target.value, 10))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md">
                      <option value={1}>1 ảnh</option>
                      <option value={2}>2 ảnh</option>
                      <option value={3}>3 ảnh</option>
                      <option value={4}>4 ảnh</option>
                  </select>
                </div>
            </div>
        </div>
      </FeatureContainer>

      {isLoading && (
          <div className="mt-8 flex flex-col items-center justify-center">
            <LoadingSpinner />
            {loadingMessage && <p className="text-lg text-gray-300 mt-2">{loadingMessage}</p>}
          </div>
      )}
      {error && <p className="text-red-400 text-center mt-4">{error}</p>}
      
      {resultImages.length > 0 && (
        <div className="mt-8">
            <h3 className="text-2xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">Kết quả</h3>
            <UndoRedoControls onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {resultImages.map((image, index) => (
                    <div key={index} className="bg-slate-800 p-2 rounded-lg flex flex-col gap-2">
                        <div className="relative">
                            {editingIndex === index && (
                                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-md z-10">
                                    <LoadingSpinner />
                                </div>
                            )}
                            <img 
                              src={image} 
                              alt={`Generated poster ${index + 1}`} 
                              className="w-full h-auto object-contain rounded-md cursor-zoom-in"
                              onClick={() => window.dispatchEvent(new CustomEvent('imageZoomRequest', { detail: image }))} 
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <a href={image} download={`poster-${index + 1}.png`} className="w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors">
                                Tải xuống
                            </a>
                            <SendToFeature image={image} currentFeatureId={Feature.GeneratePoster} onSend={onSendImage} className="text-sm" />
                        </div>
                        <ResultEditor onEdit={(p) => handleEditImage(p, index)} isEditing={editingIndex === index} />
                    </div>
                ))}
            </div>
        </div>
      )}
    </>
  );
};

export default PosterGenerator;