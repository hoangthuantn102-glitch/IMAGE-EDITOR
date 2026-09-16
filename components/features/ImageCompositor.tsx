import React, { useState, useEffect } from 'react';
import ImageUploader from '../ImageUploader';
import LoadingSpinner from '../LoadingSpinner';
import FeatureContainer from './FeatureContainer';
import UndoRedoControls from '../UndoRedoControls';
import SendToFeature from '../SendToFeature';
import ResultEditor from '../ResultEditor';
import ModelSelector from '../ModelSelector';
import { compositeImages, editImageWithPrompt } from '../../services/geminiService';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { Session, CompositeImagesParams } from '../../types';
import { Feature } from '../../types';

interface ImageCompositorProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null;
  onSendImage: (image: string, featureId: Feature) => void;
}

const ImageCompositor: React.FC<ImageCompositorProps> = ({ sessionToLoad, onSaveSession, imageToLoad, onSendImage }) => {
  const [images, setImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<string>('');
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
  
  useEffect(() => {
    if (imageToLoad) {
      handleImageUpload(imageToLoad);
    }
  }, [imageToLoad]);

  useEffect(() => {
    if (sessionToLoad && sessionToLoad.featureId === Feature.CompositeImages) {
      resetResultImages(sessionToLoad.resultImages);
      const params = sessionToLoad.parameters as CompositeImagesParams & { image2?: string }; // Handle old format
      setPrompt(params.prompt);
      setNumberOfImages(params.numberOfImages);
      setModelType(params.modelType || 'flash');

      const allImages = [sessionToLoad.originalImage];
      if (params.additionalImages) { // New format
        allImages.push(...params.additionalImages);
      } else if (params.image2) { // Old format compatibility
        allImages.push(params.image2);
      }
      setImages(allImages);
    }
  }, [sessionToLoad]);

  const handleImageUpload = (image: string) => {
    if (images.length < 4) {
      setImages(prev => [...prev, image]);
      resetResultImages([]);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
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
    if (images.length < 2 || !prompt) {
      setError('Vui lòng tải lên ít nhất hai ảnh và nhập mô tả.');
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
        const newImage = await compositeImages(images, prompt, modelType);
        results.push(newImage);
      }
      setResultImages(results);
      onSaveSession({
        originalImage: images[0],
        resultImages: results,
        parameters: { prompt, numberOfImages, additionalImages: images.slice(1), modelType },
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

  const handleEditImage = async (prompt: string, index: number) => {
    if (editingIndex !== null) return;
    setEditingIndex(index);
    setError(null);
    try {
        const imageToEdit = resultImages[index];
        const newImage = await editImageWithPrompt(imageToEdit, prompt);
        
        const updatedResultImages = [...resultImages];
        updatedResultImages[index] = newImage;
        
        setResultImages(updatedResultImages);
    } catch (e) {
        setError(`Lỗi khi chỉnh sửa ảnh: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
        setEditingIndex(null);
    }
  };
  
  const canSubmit = images.length >= 2 && !!prompt;

  return (
    <>
      <FeatureContainer
        title="Ghép ảnh"
        description="Tải lên tối đa 4 ảnh và mô tả cách bạn muốn AI kết hợp chúng. Ảnh đầu tiên sẽ là ảnh chính."
        onSubmit={handleSubmit}
        isLoading={isLoading}
        canSubmit={canSubmit}
      >
        <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ảnh đã tải lên ({images.length}/4)
                </label>
                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-slate-900/50 rounded-lg">
                      {images.map((image, index) => (
                          <div key={index} className="relative group aspect-square">
                              <img src={image} alt={`Uploaded ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                      onClick={() => handleRemoveImage(index)}
                                      className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2"
                                      aria-label={`Xóa ảnh ${index + 1}`}
                                  >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                      </svg>
                                  </button>
                              </div>
                              <div className="absolute bottom-0 left-0 bg-black/70 text-white text-xs px-2 py-1 rounded-tr-md rounded-bl-md">
                                  {index === 0 ? 'Ảnh chính' : `Ảnh ${index + 1}`}
                              </div>
                          </div>
                      ))}
                  </div>
                )}
                {images.length < 4 && (
                    <ImageUploader
                        id={`compositor-img-${images.length}`}
                        title={images.length === 0 ? "Tải lên ảnh chính" : `Tải lên ảnh ${images.length + 1}`}
                        onImageUpload={handleImageUpload}
                        value={null}
                    />
                )}
            </div>
            <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">Mô tả cách ghép ảnh</label>
                <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ví dụ: Đặt người từ ảnh 1 vào bãi biển trong ảnh 2"
                    rows={3}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-purple-500 focus:border-purple-500"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ModelSelector value={modelType} onChange={setModelType} />
                <div>
                    <label htmlFor="num-images" className="block text-sm font-medium text-gray-300">Số lượng ảnh kết quả</label>
                    <select 
                        id="num-images"
                        value={numberOfImages}
                        onChange={(e) => setNumberOfImages(parseInt(e.target.value, 10))}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                    >
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
            <UndoRedoControls
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
            />
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
                              alt={`Generated composite ${index + 1}`} 
                              className="w-full h-auto object-contain rounded-md cursor-zoom-in"
                              onClick={() => window.dispatchEvent(new CustomEvent('imageZoomRequest', { detail: image }))} 
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <a
                                href={image}
                                download={`composite-image-${index + 1}.png`}
                                className="w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                            >
                                Tải xuống
                            </a>
                            <SendToFeature 
                                image={image} 
                                currentFeatureId={Feature.CompositeImages} 
                                onSend={onSendImage}
                                className="text-sm"
                            />
                        </div>
                        <ResultEditor 
                            onEdit={(prompt) => handleEditImage(prompt, index)}
                            isEditing={editingIndex === index}
                        />
                    </div>
                ))}
            </div>
        </div>
      )}
    </>
  );
};

export default ImageCompositor;
