import React, { useState, useEffect } from 'react';
import ImageUploader from '../ImageUploader';
import LoadingSpinner from '../LoadingSpinner';
import FeatureContainer from './FeatureContainer';
import UndoRedoControls from '../UndoRedoControls';
import SendToFeature from '../SendToFeature';
import ResultEditor from '../ResultEditor';
import ModelSelector from '../ModelSelector';
import { extractAccessory, editImageWithPrompt } from '../../services/geminiService';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { Session, ExtractAccessoryParams } from '../../types';
import { Feature } from '../../types';

interface AccessoryExtractorProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null;
  onSendImage: (image: string, featureId: Feature) => void;
}

const AccessoryExtractor: React.FC<AccessoryExtractorProps> = ({ sessionToLoad, onSaveSession, imageToLoad, onSendImage }) => {
  const [baseImages, setBaseImages] = useState<(string | null)[]>([null, null, null, null]);
  const [prompt, setPrompt] = useState<string>('');
  const [numberOfImagesPerInput, setNumberOfImagesPerInput] = useState<number>(1);
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
      setBaseImages([imageToLoad, null, null, null]);
      resetResultImages([]);
    }
  }, [imageToLoad]);

  useEffect(() => {
    if (sessionToLoad && sessionToLoad.featureId === Feature.ExtractAccessory) {
      const newBaseImages = [null, null, null, null] as (string | null)[];
      if (Array.isArray(sessionToLoad.originalImage)) {
        sessionToLoad.originalImage.forEach((img, idx) => {
          if (idx < 4) newBaseImages[idx] = img;
        });
      } else if (sessionToLoad.originalImage) {
        newBaseImages[0] = sessionToLoad.originalImage;
      }
      setBaseImages(newBaseImages);
      resetResultImages(sessionToLoad.resultImages);
      const params = sessionToLoad.parameters as ExtractAccessoryParams;
      setPrompt(params.prompt);
      setNumberOfImagesPerInput(params.numberOfImages || 1);
      setModelType(params.modelType || 'flash');
    }
  }, [sessionToLoad]);
  
  const handleImageUpload = (images: string | string[], startIndex: number) => {
    const newBaseImages = [...baseImages];
    if (Array.isArray(images)) {
      images.forEach((img, i) => {
        const targetIndex = startIndex + i;
        if (targetIndex < 4) {
          newBaseImages[targetIndex] = img;
        }
      });
    } else {
      newBaseImages[startIndex] = images;
    }
    setBaseImages(newBaseImages);
    resetResultImages([]);
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
    const activeImages = baseImages.filter(img => img !== null) as string[];
    if (activeImages.length === 0 || !prompt) {
      setError('Vui lòng tải lên ít nhất một ảnh và mô tả món đồ cần tách.');
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
      for (let i = 0; i < activeImages.length; i++) {
        const currentBaseImage = activeImages[i];
        for (let j = 0; j < numberOfImagesPerInput; j++) {
          setLoadingMessage(`Đang xử lý ảnh ${i + 1}/${activeImages.length}${numberOfImagesPerInput > 1 ? ` (Bản tạo ${j + 1}/${numberOfImagesPerInput})` : ''}...`);
          const newImage = await extractAccessory(currentBaseImage, prompt, modelType);
          results.push(newImage);
        }
      }
      setResultImages(results);
      onSaveSession({
        originalImage: activeImages.length === 1 ? activeImages[0] : activeImages,
        resultImages: results,
        parameters: { prompt, numberOfImages: numberOfImagesPerInput, modelType },
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

  return (
    <>
      <FeatureContainer
        title="Tách trang phục & phụ kiện"
        description="Tải lên tối đa 4 ảnh chân dung và mô tả món đồ (áo, mũ, đồng hồ...) để AI tạo ảnh sản phẩm cho món đồ đó."
        onSubmit={handleSubmit}
        isLoading={isLoading}
        canSubmit={baseImages.some(img => img !== null) && !!prompt}
      >
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-300">1. Tải lên ảnh chân dung (Tối đa 4 ảnh - Có thể chọn nhiều ảnh cùng lúc)</label>
          <div className="grid grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="relative">
                <ImageUploader 
                  id={`accessory-extractor-img-${idx}`} 
                  onImageUpload={(img) => handleImageUpload(img, idx)} 
                  value={baseImages[idx]} 
                  title={`Ảnh ${idx + 1}`}
                  className="h-40"
                  multiple={true}
                  maxFiles={4 - idx}
                />
                {baseImages[idx] && (
                  <button 
                    onClick={() => {
                      const newImages = [...baseImages];
                      newImages[idx] = null;
                      setBaseImages(newImages);
                    }}
                    className="absolute top-8 right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-lg z-10"
                    title="Xóa ảnh"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">2. Mô tả món đồ cần tách</label>
          <input
            type="text"
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ví dụ: đồng hồ, mũ, áo sơ mi, váy, nhẫn..."
            className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModelSelector value={modelType} onChange={setModelType} />
            <div>
                <label htmlFor="num-images" className="block text-sm font-medium text-gray-300">3. Số lượng ảnh kết quả (cho mỗi ảnh tải lên)</label>
                <select 
                    id="num-images"
                    value={numberOfImagesPerInput}
                    onChange={(e) => setNumberOfImagesPerInput(parseInt(e.target.value, 10))}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                >
                    <option value={1}>1 ảnh</option>
                    <option value={2}>2 ảnh</option>
                    <option value={3}>3 ảnh</option>
                    <option value={4}>4 ảnh</option>
                </select>
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
                              alt={`Extracted item ${index + 1}`} 
                              className="w-full h-auto object-contain rounded-md bg-white cursor-zoom-in"
                              onClick={() => window.dispatchEvent(new CustomEvent('imageZoomRequest', { detail: image }))} 
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <a
                                href={image}
                                download={`extracted-item-${index + 1}.png`}
                                className="w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                            >
                                Tải xuống
                            </a>
                            <SendToFeature 
                                image={image} 
                                currentFeatureId={Feature.ExtractAccessory} 
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

export default AccessoryExtractor;
