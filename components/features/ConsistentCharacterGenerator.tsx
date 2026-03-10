import React, { useState, useEffect } from 'react';
import ImageUploader from '../ImageUploader';
import LoadingSpinner from '../LoadingSpinner';
import FeatureContainer from './FeatureContainer';
import UndoRedoControls from '../UndoRedoControls';
import SendToFeature from '../SendToFeature';
import ResultEditor from '../ResultEditor';
import ModelSelector from '../ModelSelector';
import { generateConsistentCharacterImage, editImageWithPrompt } from '../../services/geminiService';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { Session, ConsistentCharacterParams } from '../../types';
import { Feature } from '../../types';

interface ConsistentCharacterGeneratorProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null;
  onSendImage: (image: string, featureId: Feature) => void;
}

const ConsistentCharacterGenerator: React.FC<ConsistentCharacterGeneratorProps> = ({ sessionToLoad, onSaveSession, imageToLoad, onSendImage }) => {
  const [characterImages, setCharacterImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [quality, setQuality] = useState<'Standard' | 'High'>('Standard');
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
      if (characterImages.length < 4) {
        setCharacterImages(prev => [imageToLoad, ...prev].slice(0, 4));
      } else {
        setCharacterImages([imageToLoad]);
      }
      resetResultImages([]);
    }
  }, [imageToLoad]);

  useEffect(() => {
    if (sessionToLoad && sessionToLoad.featureId === Feature.GenerateConsistentCharacter) {
      resetResultImages(sessionToLoad.resultImages);
      const params = sessionToLoad.parameters as ConsistentCharacterParams;
      setPrompt(params.prompt);
      setCharacterImages(params.characterImages);
      setAspectRatio(params.aspectRatio);
      setQuality(params.quality);
      setNumberOfImages(params.numberOfImages);
      setModelType(params.modelType || 'flash');
    }
  }, [sessionToLoad]);

  const handleImageUpload = (image: string) => {
    if (characterImages.length < 4) {
      setCharacterImages(prev => [...prev, image]);
      resetResultImages([]);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setCharacterImages(prev => prev.filter((_, index) => index !== indexToRemove));
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
    if (characterImages.length === 0 || !prompt) {
      setError('Vui lòng tải lên ít nhất một ảnh nhân vật và nhập mô tả bối cảnh.');
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
        const newImage = await generateConsistentCharacterImage(characterImages, prompt, aspectRatio, quality, modelType);
        results.push(newImage);
      }
      setResultImages(results);
      onSaveSession({
        originalImage: characterImages[0],
        resultImages: results,
        parameters: { prompt, characterImages, aspectRatio, quality, numberOfImages, modelType },
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
  
  const canSubmit = characterImages.length > 0 && !!prompt;

  return (
    <>
      <FeatureContainer
        title="Tạo ảnh nhân vật đồng nhất"
        description="Tải lên tối đa 4 ảnh nhân vật tham chiếu và mô tả bối cảnh bạn muốn tạo."
        onSubmit={handleSubmit}
        isLoading={isLoading}
        canSubmit={canSubmit}
      >
        <div className="space-y-6">
             <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    1. Tải ảnh nhân vật ({characterImages.length}/4)
                </label>
                {characterImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-slate-900/50 rounded-lg">
                      {characterImages.map((image, index) => (
                          <div key={index} className="relative group aspect-square">
                              <img src={image} alt={`Character ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                      onClick={() => handleRemoveImage(index)}
                                      className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2"
                                      aria-label={`Xóa nhân vật ${index + 1}`}
                                  >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                      </svg>
                                  </button>
                              </div>
                              <div className="absolute bottom-0 left-0 bg-black/70 text-white text-xs px-2 py-1 rounded-tr-md rounded-bl-md">
                                  Nhân vật {index + 1}
                              </div>
                          </div>
                      ))}
                  </div>
                )}
                {characterImages.length < 4 && (
                    <ImageUploader
                        id={`character-img-${characterImages.length}`}
                        title={characterImages.length === 0 ? "Tải ảnh nhân vật 1" : `Tải ảnh nhân vật ${characterImages.length + 1}`}
                        onImageUpload={handleImageUpload}
                        value={null}
                    />
                )}
            </div>
            <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">2. Mô tả bối cảnh</label>
                <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ví dụ: Nhân vật 1 và nhân vật 2 đang ngồi uống cà phê ở Paris"
                    rows={3}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-purple-500 focus:border-purple-500"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <ModelSelector value={modelType} onChange={setModelType} />
                 <div>
                    <label htmlFor="aspect-ratio" className="block text-sm font-medium text-gray-300">3. Tỷ lệ</label>
                    <select 
                        id="aspect-ratio"
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value as any)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                    >
                        <option value="1:1">Vuông (1:1)</option>
                        <option value="16:9">Ngang (16:9)</option>
                        <option value="9:16">Dọc (9:16)</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="quality" className="block text-sm font-medium text-gray-300">4. Chất lượng</label>
                    <select 
                        id="quality"
                        value={quality}
                        onChange={(e) => setQuality(e.target.value as any)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                    >
                        <option value="Standard">Tiêu chuẩn</option>
                        <option value="High">Cao</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="num-images" className="block text-sm font-medium text-gray-300">5. Số lượng ảnh</label>
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
                              alt={`Generated character scene ${index + 1}`} 
                              className="w-full h-auto object-contain rounded-md cursor-zoom-in"
                              onClick={() => window.dispatchEvent(new CustomEvent('imageZoomRequest', { detail: image }))} 
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <a
                                href={image}
                                download={`character-scene-${index + 1}.png`}
                                className="w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                            >
                                Tải xuống
                            </a>
                            <SendToFeature 
                                image={image} 
                                currentFeatureId={Feature.GenerateConsistentCharacter} 
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

export default ConsistentCharacterGenerator;
