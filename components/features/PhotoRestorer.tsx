import React, { useState, useEffect } from 'react';
import ImageUploader from '../ImageUploader';
import LoadingSpinner from '../LoadingSpinner';
import ResultDisplay from '../ResultDisplay';
import FeatureContainer from './FeatureContainer';
import UndoRedoControls from '../UndoRedoControls';
import SendToFeature from '../SendToFeature';
import ResultEditor from '../ResultEditor';
import ModelSelector from '../ModelSelector';
import { restorePhoto, editImageWithPrompt } from '../../services/geminiService';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { Session } from '../../types';
import { Feature } from '../../types';

interface PhotoRestorerProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null;
  onSendImage: (image: string, featureId: Feature) => void;
}

const PhotoRestorer: React.FC<PhotoRestorerProps> = ({ sessionToLoad, onSaveSession, imageToLoad, onSendImage }) => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
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
  const [modelType, setModelType] = useState<'flash' | 'pro'>('flash');
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    if (imageToLoad) {
      setBaseImage(imageToLoad);
      resetResultImage(null);
    }
  }, [imageToLoad]);

  useEffect(() => {
    if (sessionToLoad && sessionToLoad.featureId === Feature.RestorePhoto) {
      setBaseImage(sessionToLoad.originalImage);
      resetResultImage(sessionToLoad.resultImages[0] || null);
      const params = sessionToLoad.parameters as any;
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
      setError('Vui lòng tải lên một ảnh để khôi phục.');
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
      const newImage = await restorePhoto(baseImage, modelType);
      setResultImage(newImage);
      onSaveSession({
        originalImage: baseImage,
        resultImages: [newImage],
        parameters: { modelType },
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
        title="Khôi phục ảnh cũ"
        description="Tải lên một bức ảnh cũ, mờ hoặc bị hỏng để AI làm mới nó."
        onSubmit={handleSubmit}
        isLoading={isLoading}
        canSubmit={!!baseImage}
      >
        <ImageUploader id="restorer-img" onImageUpload={handleImageUpload} value={baseImage} />
        <div className="mt-4">
            <ModelSelector value={modelType} onChange={setModelType} />
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
                currentFeatureId={Feature.RestorePhoto}
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

export default PhotoRestorer;