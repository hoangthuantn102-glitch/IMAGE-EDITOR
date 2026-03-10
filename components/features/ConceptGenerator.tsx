import React, { useState, useEffect } from 'react';
import ImageUploader from '../ImageUploader';
import LoadingSpinner from '../LoadingSpinner';
import FeatureContainer from './FeatureContainer';
import UndoRedoControls from '../UndoRedoControls';
import SendToFeature from '../SendToFeature';
import ResultEditor from '../ResultEditor';
import ModelSelector from '../ModelSelector';
import { generateConceptPhoto, editImageWithPrompt, suggestPrompts } from '../../services/geminiService';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { ConceptPhotoOptions, Session, ConceptGeneratorParams } from '../../types';
import { Feature } from '../../types';

interface ConceptGeneratorProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null;
  onSendImage: (image: string, featureId: Feature) => void;
}

const ConceptGenerator: React.FC<ConceptGeneratorProps> = ({ sessionToLoad, onSaveSession, imageToLoad, onSendImage }) => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [options, setOptions] = useState<ConceptPhotoOptions>({
    numberOfImages: 1,
    size: '1:1',
  });
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
    if (sessionToLoad && sessionToLoad.featureId === Feature.GenerateConceptPhoto) {
      setBaseImage(sessionToLoad.originalImage);
      resetResultImages(sessionToLoad.resultImages);
      const params = sessionToLoad.parameters as ConceptGeneratorParams;
      setPrompt(params.prompt);
      setOptions(params.options);
      setModelType(params.modelType || 'flash');
    }
  }, [sessionToLoad]);
  
  const handleImageUpload = (image: string) => {
    setBaseImage(image);
    resetResultImages([]);
  };

  const handleSuggestPrompt = async () => {
    if (!baseImage && !prompt) return;
    setIsSuggesting(true);
    setError(null);
    try {
        const suggestions = await suggestPrompts(
            "creating a new conceptual scene based on a subject from an image",
            baseImage,
            prompt
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
    if (!baseImage || !prompt) {
      setError('Vui lòng tải lên ảnh mẫu và nhập mô tả concept.');
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
      for (let i = 0; i < options.numberOfImages; i++) {
        setLoadingMessage(`Đang tạo ảnh ${i + 1} trên ${options.numberOfImages}...`);
        const newImage = await generateConceptPhoto(baseImage, prompt, options.size, modelType);
        results.push(newImage);
      }
      setResultImages(results);
      onSaveSession({
        originalImage: baseImage,
        resultImages: results,
        parameters: { prompt, options, modelType },
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

  const canSubmit = !!baseImage && !!prompt;

  return (
    <>
      <FeatureContainer
        title="Tạo ảnh theo concept"
        description="Tải lên ảnh mẫu, mô tả ý tưởng của bạn, và AI sẽ tạo ra những bức ảnh độc đáo."
        onSubmit={handleSubmit}
        isLoading={isLoading}
        canSubmit={canSubmit}
      >
        <ImageUploader id="concept-img" onImageUpload={handleImageUpload} title="1. Tải lên ảnh mẫu" value={baseImage} />
        <div>
          <label htmlFor="concept-prompt" className="block text-sm font-medium text-gray-300 mb-2">2. Mô tả concept</label>
          <div className="relative">
            <textarea
              id="concept-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ví dụ: một phi hành gia trên sao Hỏa, theo phong cách tranh sơn dầu"
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-purple-500 focus:border-purple-500"
            />
            <button
                onClick={handleSuggestPrompt}
                disabled={isSuggesting || (!baseImage && !prompt)}
                className="absolute bottom-2 right-2 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1 px-3 rounded-md disabled:bg-slate-500 disabled:cursor-not-allowed"
            >
                {isSuggesting ? '...' : 'Gợi ý'}
            </button>
          </div>
          {promptSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                  {promptSuggestions.map((s, i) => (
                      <button key={i} onClick={() => { setPrompt(s); setPromptSuggestions([]); }} className="text-xs bg-slate-600 hover:bg-slate-500 text-gray-200 py-1 px-3 rounded-full">
                          "{s}"
                      </button>
                  ))}
              </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ModelSelector value={modelType} onChange={setModelType} />
            <div>
                <label htmlFor="num-images" className="block text-sm font-medium text-gray-300">3. Số lượng ảnh</label>
                <select 
                    id="num-images"
                    value={options.numberOfImages}
                    onChange={(e) => setOptions(o => ({ ...o, numberOfImages: parseInt(e.target.value, 10) }))}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                >
                    <option value={1}>1 ảnh</option>
                    <option value={2}>2 ảnh</option>
                    <option value={3}>3 ảnh</option>
                    <option value={4}>4 ảnh</option>
                </select>
            </div>
            <div>
                <label htmlFor="image-size" className="block text-sm font-medium text-gray-300">4. Kích thước</label>
                <select 
                    id="image-size"
                    value={options.size}
                    onChange={(e) => setOptions(o => ({ ...o, size: e.target.value as ConceptPhotoOptions['size'] }))}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                >
                    <option value="1:1">Vuông (1:1)</option>
                    <option value="9:16">Dọc (9:16)</option>
                    <option value="16:9">Ngang (16:9)</option>
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
                              alt={`Generated concept ${index + 1}`} 
                              className="w-full h-auto object-contain rounded-md cursor-zoom-in"
                              onClick={() => window.dispatchEvent(new CustomEvent('imageZoomRequest', { detail: image }))} 
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <a
                                href={image}
                                download={`concept-image-${index + 1}.png`}
                                className="w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                            >
                                Tải xuống
                            </a>
                            <SendToFeature 
                                image={image} 
                                currentFeatureId={Feature.GenerateConceptPhoto} 
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

export default ConceptGenerator;