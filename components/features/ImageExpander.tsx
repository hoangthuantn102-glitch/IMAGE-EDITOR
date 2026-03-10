import React, { useState, useEffect } from 'react';
import ImageUploader from '../ImageUploader';
import LoadingSpinner from '../LoadingSpinner';
import FeatureContainer from './FeatureContainer';
import UndoRedoControls from '../UndoRedoControls';
import SendToFeature from '../SendToFeature';
import ResultEditor from '../ResultEditor';
import ExpansionEditor from '../ExpansionEditor';
import ModelSelector from '../ModelSelector';
import { expandImage, editImageWithPrompt } from '../../services/geminiService';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { Session, ExpandImageParams } from '../../types';
import { Feature } from '../../types';

interface ImageExpanderProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null;
  onSendImage: (image: string, featureId: Feature) => void;
}

const ImageExpander: React.FC<ImageExpanderProps> = ({ sessionToLoad, onSaveSession, imageToLoad, onSendImage }) => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
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
  const [editorFrame, setEditorFrame] = useState<any>(null);

  useEffect(() => {
    if (imageToLoad) {
      setBaseImage(imageToLoad);
      resetResultImages([]);
      setEditorFrame(null);
    }
  }, [imageToLoad]);

  useEffect(() => {
    if (sessionToLoad && sessionToLoad.featureId === Feature.ExpandImage) {
      setBaseImage(sessionToLoad.originalImage);
      resetResultImages(sessionToLoad.resultImages);
      const params = sessionToLoad.parameters as ExpandImageParams;
      setNumberOfImages(params.numberOfImages);
      setModelType(params.modelType || 'flash');
      setEditorFrame(null);
    }
  }, [sessionToLoad]);
  
  const handleImageUpload = (image: string) => {
    setBaseImage(image);
    resetResultImages([]);
    setEditorFrame(null);
  };

  const createImageOnCanvas = (src: string, frame: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scaleFactor = img.naturalWidth / frame.imageDisplaySize.width;
        
        const finalWidth = Math.round(frame.width * scaleFactor);
        const finalHeight = Math.round(frame.height * scaleFactor);
        
        const imageX = Math.round((frame.imagePosition.left - frame.left) * scaleFactor);
        const imageY = Math.round((frame.imagePosition.top - frame.top) * scaleFactor);

        const canvas = document.createElement('canvas');
        canvas.width = finalWidth;
        canvas.height = finalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Failed to get canvas context');

        ctx.drawImage(img, imageX, imageY, img.naturalWidth, img.naturalHeight);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = src;
    });
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
    if (!baseImage || !editorFrame) {
      setError('Vui lòng tải lên ảnh và điều chỉnh khung mở rộng.');
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

    try {
      const canvasImage = await createImageOnCanvas(baseImage, editorFrame);
      const results: string[] = [];
      for (let i = 0; i < numberOfImages; i++) {
        setLoadingMessage(`Đang tạo ảnh ${i + 1} trên ${numberOfImages}...`);
        const newImage = await expandImage(canvasImage, modelType);
        results.push(newImage);
      }
      setResultImages(results);
      onSaveSession({
        originalImage: baseImage,
        resultImages: results,
        parameters: { numberOfImages, modelType },
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
        title="Mở rộng ảnh (Outpainting)"
        description="Tải lên ảnh của bạn và kéo thả khung để xác định vùng cần mở rộng."
        onSubmit={handleSubmit}
        isLoading={isLoading}
        canSubmit={!!baseImage && !!editorFrame}
      >
        {!baseImage ? (
           <ImageUploader id="expander-img" onImageUpload={handleImageUpload} value={baseImage} />
        ) : (
          <ExpansionEditor imageSrc={baseImage} onFrameChange={setEditorFrame} />
        )}
       
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ModelSelector value={modelType} onChange={setModelType} />
            <div>
                <label htmlFor="num-images" className="block text-sm font-medium text-gray-300">Số lượng ảnh</label>
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
                              alt={`Generated expansion ${index + 1}`} 
                              className="w-full h-auto object-contain rounded-md cursor-zoom-in"
                              onClick={() => window.dispatchEvent(new CustomEvent('imageZoomRequest', { detail: image }))} 
                            />
                        </div>
                         <div className="flex flex-col gap-2">
                            <a
                                href={image}
                                download={`expanded-image-${index + 1}.png`}
                                className="w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                            >
                                Tải xuống
                            </a>
                             <SendToFeature 
                                image={image} 
                                currentFeatureId={Feature.ExpandImage} 
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

export default ImageExpander;