import React, { useState, useEffect } from 'react';
import ImageUploader from '../ImageUploader';
import LoadingSpinner from '../LoadingSpinner';
import ResultDisplay from '../ResultDisplay';
import FeatureContainer from './FeatureContainer';
import UndoRedoControls from '../UndoRedoControls';
import SendToFeature from '../SendToFeature';
import ResultEditor from '../ResultEditor';
import ModelSelector from '../ModelSelector';
import { applyBeautification, editImageWithPrompt } from '../../services/geminiService';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { Session, BeautifyPhotoParams } from '../../types';
import { Feature } from '../../types';

interface PhotoBeautifierProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null;
  onSendImage: (image: string, featureId: Feature) => void;
}

const beautificationCategories = [
  {
    title: "Chỉnh khuôn mặt",
    options: [
      { id: 'smoothSkin', label: 'Làm mịn da, xoá mụn, xoá thâm' },
      { id: 'whitenTeeth', label: 'Làm trắng răng' },
      { id: 'brightenEyes', label: 'Làm sáng mắt, xoá quầng thâm' },
      { id: 'slimFace', label: 'Thay đổi hình dáng khuôn mặt (thon gọn, V-line)' },
      { id: 'adjustFeatures', label: 'Chỉnh mũi cao, môi đầy, cằm nhọn' },
    ],
  },
  {
    title: "Trang điểm ảo",
    options: [
      { id: 'lipstickBlush', label: 'Thêm son môi, má hồng' },
      { id: 'eyeMakeup', label: 'Eyeliner, mascara, lông mày' },
      { id: 'changeEyeColor', label: 'Đổi màu mắt (kính áp tròng ảo)' },
      { id: 'contouring', label: 'Highlight – tạo khối khuôn mặt' },
      { id: 'makeupStyle', label: 'Tự động makeup theo phong cách', type: 'text', placeholder: 'ví dụ: Hàn Quốc, Âu Mỹ…' },
    ],
  },
  {
    title: "Hiệu ứng da và tóc",
    options: [
        { id: 'evenSkinTone', label: 'Làm sáng/tone da đều màu' },
        { id: 'changeHairColor', label: 'Đổi màu tóc', type: 'text', placeholder: 'ví dụ: nâu hạt dẻ, highlight bạch kim...' },
        { id: 'thickerHair', label: 'Làm tóc dày hơn, mượt hơn' },
    ],
  },
  {
    title: "Chỉnh dáng cơ thể (Body Retouch)",
    options: [
      { id: 'longerLegs', label: 'Kéo dài chân' },
      { id: 'slimWaist', label: 'Thu gọn eo, vai' },
      { id: 'adjustHeight', label: 'Tăng/giảm chiều cao' },
      { id: 'straightenPosture', label: 'Làm thẳng dáng đứng' },
    ],
  },
  {
    title: "Bộ lọc & hiệu ứng",
    options: [
      { id: 'skinFilter', label: 'Filter làm da mịn, trong trẻo' },
      { id: 'lightingEffect', label: 'Hiệu ứng ánh sáng', type: 'text', placeholder: 'ví dụ: ánh nắng hoàng hôn, đèn studio...' },
      { id: 'blurBackground', label: 'Xoá phông nền, làm mờ hậu cảnh' },
      { id: 'lightDirection', label: 'Chỉnh hướng ánh sáng', type: 'text', placeholder: 'ví dụ: từ trên xuống, từ trái qua' },
      { id: 'shootingAngle', label: 'Chỉnh góc chụp', type: 'text', placeholder: 'ví dụ: góc chụp từ dưới lên, cận mặt' },
    ],
  },
];


const PhotoBeautifier: React.FC<PhotoBeautifierProps> = ({ sessionToLoad, onSaveSession, imageToLoad, onSendImage }) => {
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
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [modelType, setModelType] = useState<'flash' | 'pro'>('flash');
  
  const [selections, setSelections] = useState<Record<string, boolean>>({});
  const [textInputs, setTextInputs] = useState<Record<string, string>>({
    makeupStyle: '',
    changeHairColor: '',
    lightingEffect: '',
    lightDirection: '',
    shootingAngle: '',
  });

  useEffect(() => {
    if (imageToLoad) {
      setBaseImage(imageToLoad);
      resetResultImage(null);
    }
  }, [imageToLoad]);

  useEffect(() => {
    if (sessionToLoad && sessionToLoad.featureId === Feature.BeautifyPhoto) {
      setBaseImage(sessionToLoad.originalImage);
      resetResultImage(sessionToLoad.resultImages[0] || null);
      const params = sessionToLoad.parameters as BeautifyPhotoParams;
      if (params) {
        setSelections(params.selections || {});
        setModelType(params.modelType || 'flash');
        setTextInputs({
            makeupStyle: params.makeupStyle || '',
            changeHairColor: params.hairColor || '',
            lightingEffect: params.lightingEffect || '',
            lightDirection: params.lightDirection || '',
            shootingAngle: params.shootingAngle || '',
        });
      }
    }
  }, [sessionToLoad]);

  const handleImageUpload = (image: string) => {
    setBaseImage(image);
    resetResultImage(null);
  }

  const handleSelectionChange = (id: string, isChecked: boolean) => {
    setSelections(prev => ({ ...prev, [id]: isChecked }));
  };
  
  const handleTextInputChange = (id: string, value: string) => {
    setTextInputs(prev => ({ ...prev, [id]: value }));
    // Also mark the corresponding selection as true if user types something
    if (value.trim() !== '' && !selections[id]) {
        handleSelectionChange(id, true);
    }
  };

  const getParams = (): BeautifyPhotoParams => ({
    selections: selections,
    makeupStyle: textInputs.makeupStyle,
    hairColor: textInputs.changeHairColor,
    lightingEffect: textInputs.lightingEffect,
    lightDirection: textInputs.lightDirection,
    shootingAngle: textInputs.shootingAngle,
    modelType: modelType,
  });

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
      setError('Vui lòng tải lên một ảnh để làm đẹp.');
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
        const params = getParams();
        const newImage = await applyBeautification(baseImage, params);
        setResultImage(newImage);
        onSaveSession({
            originalImage: baseImage,
            resultImages: [newImage],
            parameters: params,
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

  const hasSelection = Object.values(selections).some(v => v === true);
  const canSubmit = baseImage && hasSelection;

  return (
    <>
      <FeatureContainer
        title="Làm đẹp ảnh"
        description="Tải lên ảnh chân dung của bạn và chọn các công cụ tinh chỉnh."
        onSubmit={handleSubmit}
        isLoading={isLoading}
        canSubmit={canSubmit}
      >
        <ImageUploader id="beautifier-img" onImageUpload={handleImageUpload} value={baseImage} />
        
        <div className="flex justify-center">
            <div className="w-full max-w-xs">
                <ModelSelector value={modelType} onChange={setModelType} />
            </div>
        </div>
        
        <div className="space-y-6">
            {beautificationCategories.map((category) => (
                <fieldset key={category.title} className="border border-slate-600 rounded-lg p-4">
                    <legend className="text-lg font-semibold text-purple-400 px-2">{category.title}</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        {category.options.map((option) => (
                             <div key={option.id} className="space-y-2">
                                <div className="relative flex items-start">
                                    <div className="flex items-center h-5">
                                        <input
                                            id={option.id}
                                            name={option.id}
                                            type="checkbox"
                                            checked={!!selections[option.id]}
                                            onChange={(e) => handleSelectionChange(option.id, e.target.checked)}
                                            className="h-4 w-4 text-purple-600 border-gray-500 rounded focus:ring-purple-500"
                                        />
                                    </div>
                                    <div className="ml-3 text-sm">
                                        <label htmlFor={option.id} className="font-medium text-gray-200">{option.label}</label>
                                    </div>
                                </div>
                                {option.type === 'text' && (
                                    <input
                                        type="text"
                                        value={textInputs[option.id] || ''}
                                        onChange={(e) => handleTextInputChange(option.id, e.target.value)}
                                        placeholder={option.placeholder}
                                        className="w-full bg-slate-900 border border-slate-500 rounded-md p-2 text-sm text-white focus:ring-purple-500 focus:border-purple-500"
                                    />
                                )}
                             </div>
                        ))}
                    </div>
                </fieldset>
            ))}
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
                currentFeatureId={Feature.BeautifyPhoto}
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

export default PhotoBeautifier;