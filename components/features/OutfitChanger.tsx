import React, { useState, useEffect } from 'react';
import ImageUploader from '../ImageUploader';
import LoadingSpinner from '../LoadingSpinner';
import FeatureContainer from './FeatureContainer';
import UndoRedoControls from '../UndoRedoControls';
import SendToFeature from '../SendToFeature';
import ResultEditor from '../ResultEditor';
import ModelSelector from '../ModelSelector';
import { changeOutfitWithPrompt, changeOutfitWithImage, editImageWithPrompt, suggestPrompts } from '../../services/geminiService';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { OutfitChangeOptions, Session, OutfitChangerParams } from '../../types';
import { Feature } from '../../types';

interface OutfitChangerProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null;
  onSendImage: (image: string, featureId: Feature) => void;
}

const OutfitChanger: React.FC<OutfitChangerProps> = ({ sessionToLoad, onSaveSession, imageToLoad, onSendImage }) => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [options, setOptions] = useState<OutfitChangeOptions>({
    type: 'prompt',
    promptValue: '',
    imageValue: [],
  });
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
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    if (imageToLoad) {
      setBaseImage(imageToLoad);
      resetResultImages([]);
    }
  }, [imageToLoad]);

  useEffect(() => {
    if (sessionToLoad && sessionToLoad.featureId === Feature.ChangeOutfit) {
      setBaseImage(sessionToLoad.originalImage);
      resetResultImages(sessionToLoad.resultImages || []);
      const params = sessionToLoad.parameters as OutfitChangerParams;
      setOptions(params.options);
      setNumberOfImages(params.numberOfImages || 1);
      setModelType(params.modelType || 'flash');
    }
  }, [sessionToLoad]);
  
  const handleImageUpload = (image: string | string[]) => {
    const img = Array.isArray(image) ? image[0] : image;
    setBaseImage(img);
    resetResultImages([]);
  };
  
  const handleOutfitImageUpload = (image: string | string[]) => {
    const img = Array.isArray(image) ? image[0] : image;
    if (options.imageValue.length < 4) {
      setOptions(o => ({ ...o, imageValue: [...o.imageValue, img] }));
    }
  };

  const handleRemoveOutfitImage = (indexToRemove: number) => {
    setOptions(o => ({ ...o, imageValue: o.imageValue.filter((_, index) => index !== indexToRemove) }));
  };

  const canSubmit = baseImage && (
    (options.type === 'prompt' && options.promptValue) ||
    (options.type === 'image' && options.imageValue.length > 0)
  );

  const handleSuggestPrompt = async () => {
    if (!baseImage && !options.promptValue) return;
    setIsSuggesting(true);
    setError(null);
    try {
        const suggestions = await suggestPrompts(
            "changing a person's outfit",
            baseImage,
            options.promptValue
        );
        setPromptSuggestions(suggestions);
    } catch (e) {
        setError(`Lỗi khi gợi ý: ${e instanceof Error ? e.message : String(e)}`);
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
    if (!canSubmit || !baseImage) {
      setError('Vui lòng cung cấp đầy đủ thông tin.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingMessage('');

    if (modelType === 'pro') {
        try {
            await checkApiKeyAndSelect();
        } catch (e) {
            setError("Cần chọn API Key để sử dụng mô hình Pro.");
            setIsLoading(false);
            return;
        }
    }

    try {
      const results: string[] = [];
      for (let i = 0; i < numberOfImages; i++) {
        setLoadingMessage(`Đang tạo ảnh ${i + 1} trên ${numberOfImages}...`);
        let newImage: string;
        if (options.type === 'prompt') {
          newImage = await changeOutfitWithPrompt(baseImage, options.promptValue, modelType);
        } else {
          newImage = await changeOutfitWithImage(baseImage, options.imageValue, modelType);
        }
        results.push(newImage);
      }
      setResultImages(results);
      onSaveSession({
        originalImage: baseImage,
        resultImages: results,
        parameters: { options, numberOfImages, modelType },
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
        title="Thay đổi trang phục"
        description="Tải lên ảnh của một người, sau đó mô tả hoặc tải lên ảnh trang phục mới."
        onSubmit={handleSubmit}
        isLoading={isLoading}
        canSubmit={!!canSubmit}
      >
        <ImageUploader id="outfit-changer-base" title="1. Tải lên ảnh người" onImageUpload={handleImageUpload} value={baseImage} />
        
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-300">2. Chọn phương pháp thay đổi trang phục</label>
          <div className="flex bg-slate-700 rounded-lg p-1">
            <button 
              onClick={() => setOptions(o => ({ ...o, type: 'prompt' }))}
              className={`w-1/2 py-2 rounded-md transition-colors ${options.type === 'prompt' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>
                Sử dụng mô tả
            </button>
            <button 
              onClick={() => setOptions(o => ({ ...o, type: 'image' }))}
              className={`w-1/2 py-2 rounded-md transition-colors ${options.type === 'image' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>
                Sử dụng ảnh
            </button>
          </div>

          {options.type === 'prompt' ? (
            <div>
              <label htmlFor="outfit-prompt" className="block text-sm font-medium text-gray-300 mb-2">Mô tả trang phục mới</label>
              <div className="relative">
                <input
                  type="text"
                  id="outfit-prompt"
                  value={options.promptValue}
                  onChange={(e) => setOptions(o => ({ ...o, promptValue: e.target.value }))}
                  placeholder="Ví dụ: một bộ vest đen lịch lãm"
                  className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-purple-500 focus:border-purple-500"
                />
                 <button
                    onClick={handleSuggestPrompt}
                    disabled={isSuggesting || (!baseImage && !options.promptValue)}
                    className="absolute bottom-2 right-2 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1 px-3 rounded-md disabled:bg-slate-500 disabled:cursor-not-allowed"
                >
                    {isSuggesting ? '...' : 'Gợi ý'}
                </button>
              </div>
               {promptSuggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                      {promptSuggestions.map((s, i) => (
                          <button key={i} onClick={() => { setOptions(o => ({ ...o, promptValue: s })); setPromptSuggestions([]); }} className="text-xs bg-slate-600 hover:bg-slate-500 text-gray-200 py-1 px-3 rounded-full">
                              "{s}"
                          </button>
                      ))}
                  </div>
              )}
            </div>
          ) : (
             <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tải lên ảnh trang phục/phụ kiện ({options.imageValue.length}/4)
                </label>
                {options.imageValue.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-slate-900/50 rounded-lg">
                        {options.imageValue.map((image, index) => (
                            <div key={index} className="relative group aspect-square">
                                <img src={image} alt={`Outfit ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleRemoveOutfitImage(index)}
                                        className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2"
                                        aria-label={`Xóa ảnh ${index + 1}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {options.imageValue.length < 4 && (
                    <ImageUploader 
                      id="outfit-changer-outfit" 
                      title="Tải lên ảnh trang phục" 
                      onImageUpload={handleOutfitImageUpload} 
                      value={null}
                    />
                )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ModelSelector value={modelType} onChange={setModelType} />
            <div>
                <label htmlFor="num-images" className="block text-sm font-medium text-gray-300">3. Số lượng ảnh kết quả</label>
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
                              alt={`Generated outfit ${index + 1}`} 
                              className="w-full h-auto object-contain rounded-md cursor-zoom-in"
                              onClick={() => window.dispatchEvent(new CustomEvent('imageZoomRequest', { detail: image }))} 
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <a
                                href={image}
                                download={`outfit-change-${index + 1}.png`}
                                className="w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                            >
                                Tải xuống
                            </a>
                            <SendToFeature 
                                image={image} 
                                currentFeatureId={Feature.ChangeOutfit} 
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

export default OutfitChanger;