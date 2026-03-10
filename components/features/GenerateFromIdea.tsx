import React, { useState, useEffect } from 'react';
import ImageUploader from '../ImageUploader';
import LoadingSpinner from '../LoadingSpinner';
import FeatureContainer from './FeatureContainer';
import SendToFeature from '../SendToFeature';
import UndoRedoControls from '../UndoRedoControls';
import ResultEditor from '../ResultEditor';
import ModelSelector from '../ModelSelector';
import { generateImageFromText, generateImageFromSketch, editImageWithPrompt, suggestPrompts } from '../../services/geminiService';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { GenerateFromIdeaOptions, Session, GenerateFromIdeaParams } from '../../types';
import { Feature } from '../../types';

interface GenerateFromIdeaProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null; // Not used, but part of the standard interface
  onSendImage: (image: string, featureId: Feature) => void;
}

const GenerateFromIdea: React.FC<GenerateFromIdeaProps> = ({ sessionToLoad, onSaveSession, onSendImage }) => {
  const [options, setOptions] = useState<GenerateFromIdeaOptions>({
    inputType: 'prompt',
    prompt: '',
    sketchImage: null,
    outputType: 'photo',
    drawingStyle: 'none',
    aspectRatio: '1:1',
    numberOfImages: 1,
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
    if (sessionToLoad && sessionToLoad.featureId === Feature.GenerateFromIdea) {
      resetResultImages(sessionToLoad.resultImages);
      const params = sessionToLoad.parameters as GenerateFromIdeaParams;
      setOptions(params.options);
      setModelType(params.modelType || 'flash');
    }
  }, [sessionToLoad]);
  
  const handleOptionChange = <K extends keyof GenerateFromIdeaOptions>(key: K, value: GenerateFromIdeaOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleSuggestPrompt = async () => {
    const image = options.inputType === 'sketch' ? options.sketchImage : null;
    if (!image && !options.prompt) return;

    setIsSuggesting(true);
    setError(null);
    try {
        const suggestions = await suggestPrompts(
            "generating a new image from an idea or a sketch",
            image,
            options.prompt
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
    if (options.inputType === 'prompt' && !options.prompt) {
      setError('Vui lòng nhập mô tả ý tưởng.');
      return;
    }
     if (options.inputType === 'sketch' && !options.sketchImage) {
      setError('Vui lòng tải lên ảnh phác thảo.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingMessage('');
    resetResultImages([]);

    if (modelType === 'pro') {
        try {
            await checkApiKeyAndSelect();
        } catch (e) {
            setError("Cần chọn API Key để sử dụng mô hình Pro.");
            setIsLoading(false);
            return;
        }
    }

    let stylePrompt = '';
    if (options.outputType === 'photo') {
      stylePrompt = 'a highly detailed, photorealistic photograph, 8k, professional quality';
    } else { // drawing
      if (options.drawingStyle === 'pencil') {
        stylePrompt = 'a detailed black and white pencil sketch with fine lines and shading';
      } else if (options.drawingStyle === 'ink') {
        stylePrompt = 'a traditional Chinese ink wash painting (sumi-e style) with minimalist composition and expressive brushstrokes. IMPORTANT: Do not include any red seals, logos, signatures, or watermarks in the final image.';
      } else if (options.drawingStyle === 'blue_ballpoint') {
        stylePrompt = 'rendered as a blue ballpoint pen drawing, with visible cross-hatching and ink lines';
      } else if (options.drawingStyle === 'red_ballpoint') {
        stylePrompt = 'rendered as a red ballpoint pen drawing, with visible cross-hatching and ink lines';
      }
    }

    const finalPrompt = `${options.prompt}, ${stylePrompt}`;

    try {
      let results: string[] = [];
      if (options.inputType === 'prompt') {
        setLoadingMessage(`Đang tạo ${options.numberOfImages} ảnh...`);
        results = await generateImageFromText(finalPrompt, { 
            aspectRatio: options.aspectRatio,
            numberOfImages: options.numberOfImages,
            modelType
        });
      } else { // sketch
        for (let i = 0; i < options.numberOfImages; i++) {
          setLoadingMessage(`Đang tạo ảnh ${i + 1} trên ${options.numberOfImages}...`);
          const newImage = await generateImageFromSketch(options.sketchImage!, options.prompt, stylePrompt, options.aspectRatio, modelType);
          results.push(newImage);
        }
      }
      setResultImages(results);
      onSaveSession({
        originalImage: options.sketchImage || '', // Use sketch as original, or empty for prompt
        resultImages: results,
        parameters: { options, modelType },
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

  const canSubmit = (options.inputType === 'prompt' && !!options.prompt) || (options.inputType === 'sketch' && !!options.sketchImage);

  return (
    <>
      <FeatureContainer
        title="Tạo ảnh từ ý tưởng"
        description="Biến văn bản hoặc bản phác thảo của bạn thành hình ảnh độc đáo với AI."
        onSubmit={handleSubmit}
        isLoading={isLoading}
        canSubmit={canSubmit}
      >
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">1. Chọn phương thức nhập</label>
                <div className="flex bg-slate-700 rounded-lg p-1">
                    <button onClick={() => handleOptionChange('inputType', 'prompt')} className={`w-1/2 py-2 rounded-md transition-colors ${options.inputType === 'prompt' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>
                        Nhập mô tả
                    </button>
                    <button onClick={() => handleOptionChange('inputType', 'sketch')} className={`w-1/2 py-2 rounded-md transition-colors ${options.inputType === 'sketch' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>
                        Dùng ảnh phác thảo
                    </button>
                </div>
            </div>

            {options.inputType === 'sketch' && (
                <ImageUploader id="sketch-uploader" title="Tải lên ảnh phác thảo" onImageUpload={(img) => handleOptionChange('sketchImage', img)} value={options.sketchImage}/>
            )}
            
            <div>
                <label htmlFor="idea-prompt" className="block text-sm font-medium text-gray-300 mb-2">2. Mô tả ý tưởng</label>
                <div className="relative">
                    <textarea
                        id="idea-prompt"
                        value={options.prompt}
                        onChange={(e) => handleOptionChange('prompt', e.target.value)}
                        placeholder="Ví dụ: một con rồng đang bay qua một thành phố tương lai"
                        rows={4}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-purple-500 focus:border-purple-500"
                    />
                    <button
                        onClick={handleSuggestPrompt}
                        disabled={isSuggesting || (options.inputType === 'prompt' && !options.prompt) || (options.inputType === 'sketch' && !options.sketchImage && !options.prompt) }
                        className="absolute bottom-2 right-2 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1 px-3 rounded-md disabled:bg-slate-500 disabled:cursor-not-allowed"
                    >
                        {isSuggesting ? '...' : 'Gợi ý'}
                    </button>
                </div>
                {promptSuggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {promptSuggestions.map((s, i) => (
                            <button key={i} onClick={() => { handleOptionChange('prompt', s); setPromptSuggestions([]); }} className="text-xs bg-slate-600 hover:bg-slate-500 text-gray-200 py-1 px-3 rounded-full">
                                "{s}"
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">3. Chọn phong cách ảnh</label>
                <div className="flex bg-slate-700 rounded-lg p-1">
                    <button onClick={() => handleOptionChange('outputType', 'photo')} className={`w-1/2 py-2 rounded-md transition-colors ${options.outputType === 'photo' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>
                        Ảnh chụp
                    </button>
                    <button onClick={() => handleOptionChange('outputType', 'drawing')} className={`w-1/2 py-2 rounded-md transition-colors ${options.outputType === 'drawing' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>
                        Ảnh vẽ
                    </button>
                </div>
                {options.outputType === 'drawing' && (
                    <div className="mt-4">
                         <select 
                            value={options.drawingStyle}
                            onChange={(e) => handleOptionChange('drawingStyle', e.target.value as any)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-purple-500 focus:border-purple-500"
                        >
                            <option value="none">Mặc định</option>
                            <option value="pencil">Vẽ chì</option>
                            <option value="ink">Thủy mặc</option>
                            <option value="blue_ballpoint">Vẽ bút bi xanh</option>
                            <option value="red_ballpoint">Vẽ bút bi đỏ</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ModelSelector value={modelType} onChange={setModelType} />
                <div>
                    <label htmlFor="num-images" className="block text-sm font-medium text-gray-300">4. Số lượng ảnh</label>
                    <select 
                        id="num-images"
                        value={options.numberOfImages}
                        onChange={(e) => handleOptionChange('numberOfImages', parseInt(e.target.value, 10))}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                    >
                        <option value={1}>1 ảnh</option>
                        <option value={2}>2 ảnh</option>
                        <option value={3}>3 ảnh</option>
                        <option value={4}>4 ảnh</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="aspect-ratio" className="block text-sm font-medium text-gray-300">5. Tỷ lệ</label>
                    <select 
                        id="aspect-ratio"
                        value={options.aspectRatio}
                        onChange={(e) => handleOptionChange('aspectRatio', e.target.value as any)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                    >
                        <option value="1:1">Vuông (1:1)</option>
                        <option value="16:9">Ngang (16:9)</option>
                        <option value="9:16">Dọc (9:16)</option>
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
                              alt={`Generated from idea ${index + 1}`} 
                              className="w-full h-auto object-contain rounded-md cursor-zoom-in"
                              onClick={() => window.dispatchEvent(new CustomEvent('imageZoomRequest', { detail: image }))} 
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <a
                                href={image}
                                download={`generated-idea-${index + 1}.png`}
                                className="w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                            >
                                Tải xuống
                            </a>
                            <SendToFeature 
                                image={image} 
                                currentFeatureId={Feature.GenerateFromIdea} 
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

export default GenerateFromIdea;