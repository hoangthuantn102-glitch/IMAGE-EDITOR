import React, { useState, useEffect } from 'react';
import ImageUploader from '../ImageUploader';
import LoadingSpinner from '../LoadingSpinner';
import ResultDisplay from '../ResultDisplay';
import FeatureContainer from './FeatureContainer';
import UndoRedoControls from '../UndoRedoControls';
import SendToFeature from '../SendToFeature';
import ResultEditor from '../ResultEditor';
import ModelSelector from '../ModelSelector';
import { increaseResolution, editImageWithPrompt } from '../../services/geminiService';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { Session, IncreaseResolutionParams } from '../../types';
import { Feature } from '../../types';

interface IncreaseResolutionProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null;
  onSendImage: (image: string, featureId: Feature) => void;
}

const IncreaseResolution: React.FC<IncreaseResolutionProps> = ({ sessionToLoad, onSaveSession, imageToLoad, onSendImage }) => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [resolution, setResolution] = useState<'Full HD' | '2K' | '4K' | '8K'>('Full HD');
  const [modelType, setModelType] = useState<'flash' | 'pro'>('flash');
  const {
    state: resultImage,
    setState: setResultImage,
    resetState: resetResultImage,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoRedo<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    if (imageToLoad) {
      setBaseImage(imageToLoad);
      resetResultImage(null);
    }
  }, [imageToLoad]);

  useEffect(() => {
    if (sessionToLoad && sessionToLoad.featureId === Feature.IncreaseResolution) {
      setBaseImage(sessionToLoad.originalImage);
      resetResultImage(sessionToLoad.resultImages[0] || null);
      const params = sessionToLoad.parameters as IncreaseResolutionParams;
      setResolution(params.resolution || 'Full HD');
      setModelType(params.modelType || 'flash');
    }
  }, [sessionToLoad]);

  const handleImageUpload = (image: string) => {
    setBaseImage(image);
    resetResultImage(null);
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
    if (!baseImage) {
      setError('Vui lòng tải lên một ảnh để tăng độ phân giải.');
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
      const newImage = await increaseResolution(baseImage, resolution, modelType);
      setResultImage(newImage);
      onSaveSession({
        originalImage: baseImage,
        resultImages: [newImage],
        parameters: { resolution, modelType },
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
    }
  };
  
  const handleEditImage = async (prompt: string) => {
    if (!resultImage) return;
    setIsEditing(true);
    setError(null);
    try {
        const newImage = await editImageWithPrompt(resultImage, prompt);
        setResultImage(newImage);
    } catch (e) {
        setError(`Lỗi khi chỉnh sửa ảnh: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
        setIsEditing(false);
    }
  };

  return (
    <>
      <FeatureContainer
        title="Tăng độ phân giải ảnh"
        description="Tải lên ảnh của bạn để AI làm cho nó sắc nét và chi tiết hơn."
        onSubmit={handleSubmit}
        isLoading={isLoading}
        canSubmit={!!baseImage}
      >
        <div className="space-y-6">
          <ImageUploader id="resolution-img" onImageUpload={handleImageUpload} value={baseImage} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ModelSelector value={modelType} onChange={setModelType} />
            <div>
                <label htmlFor="resolution-select" className="block text-sm font-medium text-gray-300">Chọn độ phân giải</label>
                <select
                    id="resolution-select"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as 'Full HD' | '2K' | '4K' | '8K')}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                >
                    <option value="Full HD">Full HD</option>
                    <option value="2K">2K</option>
                    <option value="4K">4K</option>
                    <option value="8K">8K</option>
                </select>
            </div>
          </div>
        </div>
      </FeatureContainer>

      {isLoading && <div className="mt-8"><LoadingSpinner /></div>}
      {error && <p className="text-red-400 text-center mt-4">{error}</p>}
      <ResultDisplay
        originalImage={baseImage}
        newImage={resultImage}
        isEditing={isEditing}
        customActions={
          resultImage && (
            <div className="flex flex-col gap-2">
                <SendToFeature
                image={resultImage}
                currentFeatureId={Feature.IncreaseResolution}
                onSend={onSendImage}
                />
                 <ResultEditor onEdit={handleEditImage} isEditing={isEditing} />
            </div>
          )
        }
      >
         <UndoRedoControls
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </ResultDisplay>
    </>
  );
};

export default IncreaseResolution;