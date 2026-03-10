import React, { useState, useEffect } from 'react';
import ImageUploader from '../ImageUploader';
import LoadingSpinner from '../LoadingSpinner';
import FeatureContainer from './FeatureContainer';
import UndoRedoControls from '../UndoRedoControls';
import SendToFeature from '../SendToFeature';
import ResultEditor from '../ResultEditor';
import ModelSelector from '../ModelSelector';
import { replicatePose, editImageWithPrompt, suggestPrompts } from '../../services/geminiService';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { Session, ReplicatePoseParams } from '../../types';
import { Feature } from '../../types';

interface PoseReplicatorProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null;
  onSendImage: (image: string, featureId: Feature) => void;
}

const PoseReplicator: React.FC<PoseReplicatorProps> = ({ sessionToLoad, onSaveSession, imageToLoad, onSendImage }) => {
  const [subjectImage, setSubjectImage] = useState<string | null>(null);
  const [poseImage, setPoseImage] = useState<string | null>(null);
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
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    // When an image is sent from another feature, it becomes the subject image.
    if (imageToLoad) {
      setSubjectImage(imageToLoad);
      setPoseImage(null);
      resetResultImages([]);
    }
  }, [imageToLoad]);

  useEffect(() => {
    if (sessionToLoad && sessionToLoad.featureId === Feature.ReplicatePose) {
      setSubjectImage(sessionToLoad.originalImage);
      resetResultImages(sessionToLoad.resultImages);
      const params = sessionToLoad.parameters as ReplicatePoseParams;
      setPoseImage(params.poseImage);
      setNumberOfImages(params.numberOfImages);
      setPrompt(params.prompt || '');
      setModelType(params.modelType || 'flash');
    }
  }, [sessionToLoad]);

  const handleSuggestPrompt = async () => {
    if (!subjectImage && !prompt) return;
    setIsSuggesting(true);
    setError(null);
    try {
        const suggestions = await suggestPrompts(
            "relicating a person's pose from another image with optional adjustments",
            subjectImage,
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
    if (!subjectImage || !poseImage) {
      setError('Vui lòng tải lên cả hai ảnh: người mẫu và dáng.');
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
        const newImage = await replicatePose(subjectImage, poseImage, prompt, modelType);
        results.push(newImage);
      }
      setResultImages(results);
      onSaveSession({
        originalImage: subjectImage,
        resultImages: results,
        parameters: { poseImage, numberOfImages, prompt, modelType },
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

  return (
    <>
      <FeatureContainer
        title="Sao chép dáng"
        description="Tải lên ảnh người mẫu và ảnh dáng bạn muốn sao chép. Bạn có thể nhập thêm mô tả để tinh chỉnh kết quả."
        onSubmit={handleSubmit}
        isLoading={isLoading}
        canSubmit={!!subjectImage && !!poseImage}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImageUploader id="subject-image" onImageUpload={setSubjectImage} value={subjectImage} title="1. Tải lên ảnh người mẫu"/>
            <ImageUploader id="pose-image" onImageUpload={setPoseImage} value={poseImage} title="2. Tải lên ảnh dáng"/>
        </div>

        <div className="space-y-2">
            <label htmlFor="pose-prompt" className="block text-sm font-medium text-gray-300">3. Mô tả bổ sung (tùy chọn)</label>
            <div className="relative">
                <textarea
                    id="pose-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ví dụ: Giữ nguyên hậu cảnh của ảnh 1, hoặc đổi thành hậu cảnh bãi biển..."
                    rows={3}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-purple-500 focus:border-purple-500"
                />
                <button
                    onClick={handleSuggestPrompt}
                    disabled={isSuggesting || (!subjectImage && !prompt)}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModelSelector value={modelType} onChange={setModelType} />
            <div>
                <label htmlFor="num-images" className="block text-sm font-medium text-gray-300">4. Số lượng ảnh kết quả</label>
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
                              alt={`Generated pose ${index + 1}`} 
                              className="w-full h-auto object-contain rounded-md cursor-zoom-in"
                              onClick={() => window.dispatchEvent(new CustomEvent('imageZoomRequest', { detail: image }))} 
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <a
                                href={image}
                                download={`pose-replication-${index + 1}.png`}
                                className="w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                            >
                                Tải xuống
                            </a>
                            <SendToFeature
                                image={image}
                                currentFeatureId={Feature.ReplicatePose}
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

export default PoseReplicator;