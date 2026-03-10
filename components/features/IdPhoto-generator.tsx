





import React, { useState, useEffect, useRef } from 'react';
import ImageUploader from '../ImageUploader';
import LoadingSpinner from '../LoadingSpinner';
import ResultDisplay from '../ResultDisplay';
import FeatureContainer from './FeatureContainer';
import UndoRedoControls from '../UndoRedoControls';
import SendToFeature from '../SendToFeature';
import ResultEditor from '../ResultEditor';
import { generateIdPhoto, editImageWithPrompt } from '../../services/geminiService';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { IdPhotoOptions, Session, IdPhotoGeneratorParams } from '../../types';
import { Feature } from '../../types';

interface IdPhotoGeneratorProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null;
  onSendImage: (image: string, featureId: Feature) => void;
}

const Checkbox = ({ id, label, checked, onChange }: { id: string, label: string, checked: boolean, onChange: (isChecked: boolean) => void }) => (
    <div className="relative flex items-start">
        <div className="flex items-center h-5">
            <input
                id={id}
                name={id}
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 text-purple-600 border-gray-400 rounded focus:ring-purple-500"
            />
        </div>
        <div className="ml-3 text-sm">
            <label htmlFor={id} className="font-medium text-gray-300">{label}</label>
        </div>
    </div>
);


const IdPhotoGenerator: React.FC<IdPhotoGeneratorProps> = ({ sessionToLoad, onSaveSession, imageToLoad, onSendImage }) => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [options, setOptions] = useState<IdPhotoOptions>({
    size: '3x4 cm',
    backgroundColor: 'Xanh',
    outfitChangeType: 'none',
    outfitPrompt: '',
    outfitImage: null,
    hairDescription: '',
    removeBlemishes: true,
    autoAdjustLighting: true,
    autoAdjustFace: true,
  });
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

  // Batch mode states
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [batchFiles, setBatchFiles] = useState<{ name: string; dataUrl: string }[]>([]);
  const [batchResults, setBatchResults] = useState<{ original: string; result: string; name: string }[]>([]);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [editingBatchIndex, setEditingBatchIndex] = useState<number | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const resetBatchState = () => {
    setBatchFiles([]);
    setBatchResults([]);
    setBatchProgress(null);
    setRegeneratingIndex(null);
    setEditingBatchIndex(null);
    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (imageToLoad) {
      setMode('single');
      setBaseImage(imageToLoad);
      resetResultImage(null);
      resetBatchState();
    }
  }, [imageToLoad]);

  useEffect(() => {
    if (sessionToLoad && sessionToLoad.featureId === Feature.GenerateIdPhoto) {
      setMode('single');
      setBaseImage(sessionToLoad.originalImage);
      resetResultImage(sessionToLoad.resultImages[0] || null);
      const params = sessionToLoad.parameters as IdPhotoGeneratorParams;
      setOptions({
        size: '3x4 cm',
        backgroundColor: 'Xanh',
        outfitChangeType: 'none',
        outfitPrompt: '',
        outfitImage: null,
        hairDescription: '',
        removeBlemishes: true,
        autoAdjustLighting: true,
        autoAdjustFace: true,
        ...params.options,
      });
      resetBatchState();
    }
  }, [sessionToLoad]);
  
  const handleImageUpload = (image: string) => {
    setBaseImage(image);
    resetResultImage(null);
  };

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // FIX: Explicitly type `file` as `File` to resolve type inference issues when using the non-standard `webkitdirectory` attribute.
    const imageFiles = Array.from(files).filter((file: File) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
        setError("Thư mục không chứa ảnh nào.");
        return;
    }

    setBatchFiles([]);
    setBatchResults([]);
    setError(null);
    setIsLoading(true);

    const filePromises = imageFiles.map((file: File) => {
        return new Promise<{ name: string; dataUrl: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve({ name: file.name, dataUrl: e.target?.result as string });
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    });

    Promise.all(filePromises).then(results => {
        setBatchFiles(results);
        setIsLoading(false);
    }).catch(err => {
        setError("Lỗi khi đọc file ảnh.");
        setIsLoading(false);
    });
  };

  const removeBatchFile = (indexToRemove: number) => {
    setBatchFiles(files => files.filter((_, index) => index !== indexToRemove));
  };


  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    if (mode === 'single') {
        if (!baseImage) {
          setError('Vui lòng tải lên một ảnh chân dung.');
          setIsLoading(false);
          return;
        }
        try {
          const newImage = await generateIdPhoto(baseImage, options);
          setResultImage(newImage);
          onSaveSession({
            originalImage: baseImage,
            resultImages: [newImage],
            parameters: { options },
          });
        } catch (e) {
          setError(`Đã xảy ra lỗi: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
          setIsLoading(false);
        }
    } else { // Batch mode
        if (batchFiles.length === 0) {
            setError("Vui lòng chọn một thư mục chứa ảnh.");
            setIsLoading(false);
            return;
        }
        setBatchResults([]);
        const results: { original: string; result: string; name: string }[] = [];
        const filesToProcess = [...batchFiles];

        for (let i = 0; i < filesToProcess.length; i++) {
            const file = filesToProcess[i];
            setBatchProgress({ current: i + 1, total: filesToProcess.length });
            try {
                const newImage = await generateIdPhoto(file.dataUrl, options);
                const newResult = { original: file.dataUrl, result: newImage, name: file.name };
                results.push(newResult);
                setBatchResults([...results]); 
            } catch (e) {
                console.error(`Failed to process ${file.name}:`, e);
            }
        }
        setBatchProgress(null);
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

  const handleRegenerateBatchItem = async (index: number) => {
    const itemToRegenerate = batchResults[index];
    if (!itemToRegenerate || regeneratingIndex !== null) return;

    setRegeneratingIndex(index);
    setError(null);

    try {
        const newImage = await generateIdPhoto(itemToRegenerate.original, options);
        const updatedResults = [...batchResults];
        updatedResults[index] = { ...itemToRegenerate, result: newImage };
        setBatchResults(updatedResults);
    } catch (e) {
        console.error(`Failed to regenerate image for ${itemToRegenerate.name}:`, e);
        setError(`Lỗi khi tạo lại ảnh cho ${itemToRegenerate.name}.`);
    } finally {
        setRegeneratingIndex(null);
    }
  };

  const handleEditBatchImage = async (prompt: string, index: number) => {
    const itemToEdit = batchResults[index];
    if (!itemToEdit || editingBatchIndex !== null) return;

    setEditingBatchIndex(index);
    setError(null);

    try {
        const newImage = await editImageWithPrompt(itemToEdit.result, prompt);
        const updatedResults = [...batchResults];
        updatedResults[index] = { ...itemToEdit, result: newImage };
        setBatchResults(updatedResults);
    } catch (e) {
        console.error(`Failed to edit image for ${itemToEdit.name}:`, e);
        setError(`Lỗi khi chỉnh sửa ảnh cho ${itemToEdit.name}.`);
    } finally {
        setEditingBatchIndex(null);
    }
  };


  const handleDownloadAll = async () => {
    if (batchResults.length === 0 || isLoading || batchResults.length !== batchFiles.length) return;

    for (let i = 0; i < batchResults.length; i++) {
      const item = batchResults[i];
      const link = document.createElement('a');
      link.href = item.result;
      
      const safeName = item.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
      link.download = `id-photo-${safeName}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (i < batchResults.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  };

  const backgroundColors = [
    { name: 'Xanh', value: '#003366' },
    { name: 'Trắng', value: '#FFFFFF' },
  ];
  
  const canSubmit = mode === 'single'
    ? baseImage && (options.outfitChangeType !== 'image' || (options.outfitChangeType === 'image' && !!options.outfitImage))
    : batchFiles.length > 0;

  return (
    <>
      <FeatureContainer
        title="Tạo ảnh thẻ"
        description="Tải lên ảnh chân dung và tùy chỉnh các thông số để tạo ảnh thẻ chuyên nghiệp."
        onSubmit={handleSubmit}
        isLoading={isLoading}
        canSubmit={canSubmit}
      >
        <div className="flex bg-slate-700 rounded-lg p-1 mb-6">
            <button 
              onClick={() => setMode('single')}
              className={`w-1/2 py-2 rounded-md transition-colors ${mode === 'single' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>
                Một ảnh
            </button>
            <button 
              onClick={() => setMode('batch')}
              className={`w-1/2 py-2 rounded-md transition-colors ${mode === 'batch' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>
                Hàng loạt (từ thư mục)
            </button>
        </div>

        {mode === 'single' && <ImageUploader id="id-photo-img" title="1. Tải ảnh chân dung của bạn" onImageUpload={handleImageUpload} value={baseImage} />}
        
        {mode === 'batch' && (
            <div>
                <input
                    type="file"
                    // @ts-ignore
                    webkitdirectory=""
                    directory=""
                    multiple
                    ref={folderInputRef}
                    onChange={handleFolderSelect}
                    className="hidden"
                    accept="image/*"
                />
                <button
                    onClick={() => folderInputRef.current?.click()}
                    disabled={isLoading}
                    className="w-full inline-flex justify-center items-center px-6 py-3 border-2 border-dashed border-slate-600 rounded-md shadow-sm text-base font-medium text-gray-300 hover:border-purple-500 hover:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    Chọn thư mục ảnh ({batchFiles.length} ảnh)
                </button>
                {batchFiles.length > 0 && (
                     <div className="mt-4">
                        <h4 className="text-lg font-semibold mb-2">Ảnh đã chọn:</h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto bg-slate-900/50 p-2 rounded-lg">
                            {batchFiles.map((file, index) => (
                                <div key={index} className="relative group aspect-square">
                                    <img src={file.dataUrl} alt={file.name} title={file.name} className="w-full h-full object-cover rounded-md" />
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => removeBatchFile(index)} className="bg-red-600 text-white rounded-full p-1.5" aria-label={`Xóa ${file.name}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        <div className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="size-select" className="block text-sm font-medium text-gray-300 mb-2">Kích thước</label>
                    <select 
                        id="size-select"
                        value={options.size}
                        onChange={(e) => setOptions(o => ({ ...o, size: e.target.value }))}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-purple-500 focus:border-purple-500"
                    >
                        <option>3x4 cm</option>
                        <option>4x6 cm</option>
                        <option>2x2 inches (US Passport)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Màu nền</label>
                    <fieldset className="flex items-center space-x-4 p-3 bg-slate-700 border border-slate-600 rounded-md h-full">
                        {backgroundColors.map(color => (
                            <label key={color.name} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="background-color"
                                    value={color.name}
                                    checked={options.backgroundColor === color.name}
                                    onChange={(e) => setOptions(o => ({...o, backgroundColor: e.target.value as 'Trắng' | 'Xanh'}))}
                                    className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                                />
                                <span className="h-6 w-6 rounded-full border border-gray-400" style={{ backgroundColor: color.value }} aria-hidden="true"></span>
                                <span className="text-white">{color.name}</span>
                            </label>
                        ))}
                    </fieldset>
                </div>
            </div>
            <fieldset className="border border-slate-600 rounded-lg p-4">
                <legend className="text-lg font-semibold text-purple-400 px-2">Trang phục</legend>
                 <div className="flex bg-slate-900 rounded-lg p-1 mb-4">
                    {(['none', 'prompt', 'image'] as const).map((type) => (
                        <button 
                            key={type}
                            onClick={() => setOptions(o => ({ ...o, outfitChangeType: type }))}
                            className={`w-1/3 py-2 rounded-md transition-colors text-sm font-medium ${options.outfitChangeType === type ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-slate-700'}`}
                        >
                            {type === 'none' ? 'Giữ nguyên' : type === 'prompt' ? 'Mô tả' : 'Dùng ảnh'}
                        </button>
                    ))}
                </div>
                {options.outfitChangeType === 'prompt' && (
                     <input
                        type="text"
                        value={options.outfitPrompt}
                        onChange={(e) => setOptions(o => ({ ...o, outfitPrompt: e.target.value }))}
                        placeholder="Ví dụ: áo sơ mi trắng, áo vest đen"
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-purple-500 focus:border-purple-500"
                    />
                )}
                 {options.outfitChangeType === 'image' && (
                     <ImageUploader
                        id="outfit-image-uploader"
                        title="Tải lên ảnh trang phục"
                        onImageUpload={(img) => setOptions(o => ({ ...o, outfitImage: img }))}
                        value={options.outfitImage}
                     />
                 )}
            </fieldset>
            <div>
                <label htmlFor="hair-desc" className="block text-sm font-medium text-gray-300 mb-2">Kiểu tóc và màu tóc (tùy chọn)</label>
                <input
                    id="hair-desc"
                    type="text"
                    value={options.hairDescription}
                    onChange={(e) => setOptions(o => ({ ...o, hairDescription: e.target.value }))}
                    placeholder="Ví dụ: tóc xoăn màu nâu hạt dẻ"
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-purple-500 focus:border-purple-500"
                />
            </div>
            <fieldset className="border border-slate-600 rounded-lg p-4">
                <legend className="text-lg font-semibold text-purple-400 px-2">Tự động chỉnh sửa</legend>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Checkbox id="remove-blemishes" label="Xóa mụn, tàn nhang" checked={options.removeBlemishes} onChange={isChecked => setOptions(o => ({ ...o, removeBlemishes: isChecked }))} />
                    <Checkbox id="auto-light" label="Cân chỉnh màu sắc, ánh sáng" checked={options.autoAdjustLighting} onChange={isChecked => setOptions(o => ({ ...o, autoAdjustLighting: isChecked }))} />
                    <Checkbox id="auto-face" label="Điều chỉnh khuôn mặt cân đối" checked={options.autoAdjustFace} onChange={isChecked => setOptions(o => ({ ...o, autoAdjustFace: isChecked }))} />
                </div>
            </fieldset>
        </div>
      </FeatureContainer>

      {isLoading && mode === 'single' && <div className="mt-8"><LoadingSpinner /></div>}
      {error && <p className="text-red-400 text-center mt-4">{error}</p>}
      
      {mode === 'single' && (
        <ResultDisplay
          originalImage={baseImage}
          newImage={resultImage}
          isEditing={isEditing}
          customActions={
            resultImage && (
              <div className="flex flex-col gap-2">
                  <SendToFeature
                  image={resultImage}
                  currentFeatureId={Feature.GenerateIdPhoto}
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
      )}

      {mode === 'batch' && isLoading && batchProgress && (
        <div className="mt-8 text-center">
            <LoadingSpinner />
            <p className="text-lg text-gray-300 mt-2">
                Đang xử lý ảnh {batchProgress.current} trên {batchProgress.total}...
            </p>
            <div className="w-full bg-slate-700 rounded-full h-2.5 mt-2">
                <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}></div>
            </div>
        </div>
      )}

      {mode === 'batch' && batchResults.length > 0 && (
        <div className="mt-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <h3 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">
                  Kết quả hàng loạt ({batchResults.length}/{batchFiles.length})
              </h3>
              <button
                  onClick={handleDownloadAll}
                  disabled={isLoading || batchResults.length !== batchFiles.length}
                  className="flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Tải tất cả
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {batchResults.map((item, index) => (
                    <div key={index} className="bg-slate-800 p-3 rounded-lg flex flex-col gap-3 relative">
                        {regeneratingIndex === index && (
                            <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-lg z-10">
                                <div className="flex flex-col items-center gap-2">
                                    <svg className="animate-spin h-8 w-8 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="text-sm text-gray-300">Đang tạo lại...</span>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                <h4 className="text-sm font-semibold text-center mb-1 text-gray-400">Ảnh gốc</h4>
                                <img src={item.original} alt={`Original ${item.name}`} className="w-full h-auto object-contain rounded-md aspect-[3/4]" />
                            </div>
                             <div>
                                <h4 className="text-sm font-semibold text-center mb-1 text-gray-300">Ảnh thẻ</h4>
                                <div className="relative">
                                    {editingBatchIndex === index && (
                                        <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-lg z-10">
                                            <LoadingSpinner />
                                        </div>
                                    )}
                                    <img 
                                      src={item.result} 
                                      alt={`Generated ${item.name}`} 
                                      className="w-full h-auto object-contain rounded-md aspect-[3/4] cursor-zoom-in"
                                      onClick={() => window.dispatchEvent(new CustomEvent('imageZoomRequest', { detail: item.result }))}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <a
                                href={item.result}
                                download={`id-photo-${item.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`}
                                className="w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                            >
                                Tải xuống
                            </a>
                            <button
                                onClick={() => handleRegenerateBatchItem(index)}
                                disabled={isLoading || regeneratingIndex !== null || editingBatchIndex !== null}
                                className="w-full text-center px-4 py-2 border border-slate-600 text-sm font-medium rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                            >
                                Tạo lại
                            </button>
                        </div>
                        <ResultEditor 
                            onEdit={(prompt) => handleEditBatchImage(prompt, index)}
                            isEditing={editingBatchIndex === index}
                        />
                    </div>
                ))}
            </div>
        </div>
      )}
    </>
  );
};

export default IdPhotoGenerator;