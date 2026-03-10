import React, { useState, useEffect, useRef } from 'react';
import LoadingSpinner from '../LoadingSpinner';
import FeatureContainer from './FeatureContainer';
import UndoRedoControls from '../UndoRedoControls';
import SendToFeature from '../SendToFeature';
import ResultEditor from '../ResultEditor';
import ModelSelector from '../ModelSelector';
import { generateAffiliateImage, generateProductBackgroundImage, generateExplodedView, editImageWithPrompt, suggestProductBackgrounds, suggestPrompts } from '../../services/geminiService';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { Session, AffiliateImageGeneratorParams } from '../../types';
import { Feature } from '../../types';
import ImageUploader from '../ImageUploader';

interface AffiliateImageGeneratorProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null;
  onSendImage: (image: string, featureId: Feature) => void;
}

const AffiliateImageGenerator: React.FC<AffiliateImageGeneratorProps> = ({ sessionToLoad, onSaveSession, imageToLoad, onSendImage }) => {
  const [mode, setMode] = useState<'kol' | 'product' | 'exploded' | 'kol_batch'>('kol');
  
  // KOL Mode State
  const [modelImages, setModelImages] = useState<string[]>([]);
  
  // Product Mode State
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  
  // Exploded View Mode State
  const [explodedProductImage, setExplodedProductImage] = useState<string | null>(null);
  
  // Shared State
  const [products, setProducts] = useState<{ image: string; name: string }[]>([]);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [quality, setQuality] = useState<'Standard' | 'High'>('Standard');
  const [imageType, setImageType] = useState<'Realistic' | 'Artistic'>('Realistic');
  const [numberOfImages, setNumberOfImages] = useState<number>(1);
  const [modelType, setModelType] = useState<'flash' | 'pro'>('flash');
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  
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
  
  const modelFileInputRef = useRef<HTMLInputElement>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, uploaderType: 'model' | 'product') => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          if (uploaderType === 'model') {
            handleModelImageUpload(base64String);
          } else {
            handleProductImageUpload(base64String);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleModelImageUpload = (image: string) => {
    if (modelImages.length < 2) {
      setModelImages(prev => [...prev, image]);
    }
  };

  const handleProductImageUpload = (image: string) => {
    // For batch mode, we allow up to 20 products
    setProducts(prev => {
      if (prev.length < 20) {
        return [...prev, { image, name: '' }];
      }
      return prev;
    });
  };

  const handleRemoveModelImage = (indexToRemove: number) => {
    setModelImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleRemoveProduct = (indexToRemove: number) => {
    setProducts(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleProductNameChange = (index: number, newName: string) => {
    setProducts(currentProducts => {
      const updated = [...currentProducts];
      const productToUpdate = updated[index];
      if (productToUpdate) {
        productToUpdate.name = newName;
      }
      return updated;
    });
  };

  useEffect(() => {
    if (imageToLoad) {
      // Default behavior based on mode
      if (mode === 'product' || mode === 'kol_batch') {
        handleProductImageUpload(imageToLoad);
      } else if (mode === 'exploded') {
        setExplodedProductImage(imageToLoad);
      } else {
        if (modelImages.length < 2) {
          setModelImages(prev => [imageToLoad, ...prev].slice(0, 2));
        } else {
          setModelImages([imageToLoad]);
        }
      }
      resetResultImages([]);
    }
  }, [imageToLoad]);

  useEffect(() => {
    if (sessionToLoad && sessionToLoad.featureId === Feature.GenerateAffiliateImage) {
      resetResultImages(sessionToLoad.resultImages);
      const params = sessionToLoad.parameters as AffiliateImageGeneratorParams;
      
      setMode(params.mode || 'kol');
      setPrompt(params.prompt || '');
      setModelImages(params.modelImages || []);
      setProducts(params.products || []);
      setBackgroundImage(params.backgroundImage || null);
      setAspectRatio(params.aspectRatio || '1:1');
      setQuality(params.quality || 'Standard');
      setImageType(params.imageType || 'Realistic');
      setNumberOfImages(params.numberOfImages || 1);
      setModelType(params.modelType || 'flash');
      if (params.mode === 'exploded' && sessionToLoad.originalImage) {
          setExplodedProductImage(sessionToLoad.originalImage);
      }
    }
  }, [sessionToLoad]);

  const handleSuggestPrompt = async () => {
    setIsSuggesting(true);
    setError(null);
    setPromptSuggestions([]);
    try {
      let suggestions: string[] = [];
      if (mode === 'product') {
          if (products.length === 0 && !prompt.trim()) {
              setError("Vui lòng tải ảnh sản phẩm hoặc nhập mô tả nền trước khi gợi ý.");
              setIsSuggesting(false);
              return;
          }
          suggestions = await suggestProductBackgrounds(products[0]?.image, products[0]?.name);
      } else if (mode === 'exploded') {
          setError("Chế độ tách lớp tự động tạo sơ đồ kỹ thuật.");
          setIsSuggesting(false);
          return;
      } else { // 'kol' or 'kol_batch' mode
          const imageContext = modelImages[0] || products[0]?.image || null;
          if (!imageContext && !prompt.trim()) {
              setError("Vui lòng tải ảnh KOL hoặc sản phẩm, hoặc nhập mô tả trước khi gợi ý.");
              setIsSuggesting(false);
              return;
          }
          suggestions = await suggestPrompts(
              `an affiliate marketing photo showing a person (KOL) interacting with a product. The prompt should describe the scene, the KOL's action, and the mood.`,
              imageContext,
              prompt
          );
      }
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
        let sessionParams: AffiliateImageGeneratorParams;

        if (mode === 'kol') {
            if (modelImages.length === 0 || products.length === 0 || !prompt) {
              setError('Vui lòng tải lên ảnh KOL, ảnh sản phẩm và nhập mô tả.');
              setIsLoading(false);
              return;
            }
            sessionParams = { mode, prompt, modelImages, products, aspectRatio, quality, numberOfImages, imageType, modelType };
            for (let i = 0; i < numberOfImages; i++) {
                setLoadingMessage(`Đang tạo ảnh ${i + 1} trên ${numberOfImages}...`);
                const newImage = await generateAffiliateImage(modelImages, products, prompt, aspectRatio, quality, imageType, modelType);
                results.push(newImage);
            }
        } else if (mode === 'kol_batch') {
            if (modelImages.length === 0 || products.length === 0 || !prompt) {
              setError('Vui lòng tải lên ảnh KOL, ít nhất một sản phẩm và nhập mô tả.');
              setIsLoading(false);
              return;
            }
            sessionParams = { mode, prompt, modelImages, products, aspectRatio, quality, numberOfImages, imageType, modelType };
            
            // Loop through each product to generate specific images
            for (let pIdx = 0; pIdx < products.length; pIdx++) {
                const currentProduct = products[pIdx];
                for (let i = 0; i < numberOfImages; i++) {
                    const progressStr = products.length > 1 ? ` (Sản phẩm ${pIdx + 1}/${products.length})` : '';
                    setLoadingMessage(`Đang tạo ảnh ${i + 1}/${numberOfImages} cho "${currentProduct.name || `Sản phẩm ${pIdx + 1}`}"${progressStr}...`);
                    
                    // Generate using only the current specific product
                    const newImage = await generateAffiliateImage(modelImages, [currentProduct], prompt, aspectRatio, quality, imageType, modelType);
                    results.push(newImage);
                }
            }
        } else if (mode === 'product') {
            if (products.length === 0) {
              setError('Vui lòng tải lên ít nhất một ảnh sản phẩm.');
              setIsLoading(false);
              return;
            }
            sessionParams = { mode, prompt, modelImages: [], products, backgroundImage, aspectRatio, quality, numberOfImages, imageType, modelType };
             for (let i = 0; i < numberOfImages; i++) {
                setLoadingMessage(`Đang tạo ảnh ${i + 1} trên ${numberOfImages}...`);
                const newImage = await generateProductBackgroundImage(products, prompt, backgroundImage, aspectRatio, quality, imageType, modelType);
                results.push(newImage);
            }
        } else { // 'exploded' mode
            if (!explodedProductImage) {
                setError('Vui lòng tải lên ảnh sản phẩm.');
                setIsLoading(false);
                return;
            }
            sessionParams = { mode, prompt: 'Tạo ảnh tách lớp exploded view', modelImages: [], products: [], aspectRatio, quality, numberOfImages, imageType, modelType };
            for (let i = 0; i < numberOfImages; i++) {
                setLoadingMessage(`Đang tạo ảnh tách lớp ${i + 1} trên ${numberOfImages}...`);
                const newImage = await generateExplodedView(explodedProductImage, aspectRatio, quality, imageType, modelType);
                results.push(newImage);
            }
        }

      setResultImages(results);
      onSaveSession({
        originalImage: (mode === 'kol' || mode === 'kol_batch' ? modelImages[0] : (mode === 'exploded' ? explodedProductImage : products[0]?.image)) || '',
        resultImages: results,
        parameters: sessionParams,
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
  
  const canSubmit = (mode === 'kol' || mode === 'kol_batch') 
    ? modelImages.length > 0 && products.length > 0 && !!prompt.trim()
    : mode === 'exploded' ? !!explodedProductImage : products.length > 0;

  const renderSharedOptions = () => (
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ModelSelector value={modelType} onChange={setModelType} />
        <div>
            <label htmlFor="aspect-ratio" className="block text-sm font-medium text-gray-300">Tỷ lệ</label>
            <select id="aspect-ratio" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as any)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md">
                <option value="1:1">Vuông (1:1)</option>
                <option value="16:9">Ngang (16:9)</option>
                <option value="9:16">Dọc (9:16)</option>
            </select>
        </div>
        <div>
            <label htmlFor="image-type" className="block text-sm font-medium text-gray-300">Loại ảnh</label>
            <select id="image-type" value={imageType} onChange={(e) => setImageType(e.target.value as any)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md">
                <option value="Realistic">Ảnh thực tế</option>
                <option value="Artistic">Ảnh nghệ thuật</option>
            </select>
        </div>
        <div>
            <label htmlFor="quality" className="block text-sm font-medium text-gray-300">Chất lượng</label>
            <select id="quality" value={quality} onChange={(e) => setQuality(e.target.value as any)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md">
                <option value="Standard">Tiêu chuẩn</option>
                <option value="High">Cao</option>
            </select>
        </div>
        <div>
            <label htmlFor="num-images" className="block text-sm font-medium text-gray-300">Số lượng ảnh (mỗi sản phẩm)</label>
            <select id="num-images" value={numberOfImages} onChange={(e) => setNumberOfImages(parseInt(e.target.value, 10))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md">
                <option value={1}>1 ảnh</option>
                <option value={2}>2 ảnh</option>
                <option value={3}>3 ảnh</option>
                <option value={4}>4 ảnh</option>
            </select>
        </div>
    </div>
  );

  return (
    <>
      <FeatureContainer
        title="Tạo ảnh Affiliate"
        description="Chọn chế độ để tạo ảnh review với KOL, ảnh quảng cáo hoặc sơ đồ tách lớp. Chế độ hàng loạt sẽ tạo riêng từng ảnh cho mỗi sản phẩm. Hỗ trợ tải lên nhiều sản phẩm cùng lúc."
        onSubmit={handleSubmit}
        isLoading={isLoading}
        canSubmit={canSubmit}
      >
        <div className="flex bg-slate-700 rounded-lg p-1 mb-6 flex-wrap gap-1">
            <button onClick={() => setMode('kol')} className={`flex-1 min-w-[120px] py-2 rounded-md transition-colors text-xs sm:text-sm font-medium ${mode === 'kol' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>
                KOL x Sản phẩm
            </button>
            <button onClick={() => setMode('kol_batch')} className={`flex-1 min-w-[120px] py-2 rounded-md transition-colors text-xs sm:text-sm font-medium ${mode === 'kol_batch' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>
                KOL hàng loạt
            </button>
            <button onClick={() => setMode('product')} className={`flex-1 min-w-[120px] py-2 rounded-md transition-colors text-xs sm:text-sm font-medium ${mode === 'product' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>
                Thay nền sản phẩm
            </button>
            <button onClick={() => setMode('exploded')} className={`flex-1 min-w-[120px] py-2 rounded-md transition-colors text-xs sm:text-sm font-medium ${mode === 'exploded' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-slate-600'}`}>
                Ảnh tách lớp
            </button>
        </div>

        {/* ----- KOL & KOL BATCH Mode UI ----- */}
        {(mode === 'kol' || mode === 'kol_batch') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    {/* KOL Image Uploader */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">1. Tải ảnh người mẫu (KOL) ({modelImages.length}/2)</label>
                        {modelImages.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mb-2 p-2 bg-slate-900/50 rounded-lg">
                                {modelImages.map((img, i) => (
                                    <div key={i} className="relative group aspect-square">
                                        <img src={img} alt={`KOL ${i+1}`} className="w-full h-full object-cover rounded-md"/>
                                        <button onClick={() => handleRemoveModelImage(i)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Xóa ảnh mẫu ${i+1}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <input type="file" ref={modelFileInputRef} onChange={(e) => handleFileSelect(e, 'model')} className="hidden" accept="image/*"/>
                        {modelImages.length < 2 && <button onClick={() => modelFileInputRef.current?.click()} className="w-full py-3 border-2 border-dashed border-slate-600 rounded-lg flex justify-center items-center text-center cursor-pointer hover:border-purple-400 hover:bg-slate-800/50 transition-colors text-gray-300">Thêm mẫu (KOL)</button>}
                    </div>
                    {/* Product Uploader */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">2. Tải ảnh & đặt tên sản phẩm ({products.length}/20)</label>
                        {products.length > 0 && (
                            <div className="space-y-4 mb-2 p-2 bg-slate-900/50 rounded-lg max-h-64 overflow-y-auto">{products.map((p, i) => (<div key={i} className="flex items-center gap-3"><div className="relative group w-20 h-20 flex-shrink-0"><img src={p.image} alt={`Product ${i+1}`} className="w-full h-full object-cover rounded-md"/><button onClick={() => handleRemoveProduct(i)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Xóa sản phẩm ${i+1}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button></div><input type="text" value={p.name} onChange={(e) => handleProductNameChange(i, e.target.value)} placeholder={`Tên sản phẩm ${i+1}`} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm text-white focus:ring-purple-500 focus:border-purple-500"/></div>))}</div>
                        )}
                        <input type="file" ref={productFileInputRef} onChange={(e) => handleFileSelect(e, 'product')} className="hidden" accept="image/*" multiple/>
                        {products.length < 20 && <button onClick={() => productFileInputRef.current?.click()} className="w-full py-3 border-2 border-dashed border-slate-600 rounded-lg flex justify-center items-center text-center cursor-pointer hover:border-purple-400 hover:bg-slate-800/50 transition-colors text-gray-300">Thêm sản phẩm (Hỗ trợ chọn nhiều)</button>}
                        {mode === 'kol_batch' && products.length > 0 && <p className="text-[10px] text-purple-400 mt-1">* Ở chế độ hàng loạt, mỗi sản phẩm trên sẽ tạo ra ảnh riêng với KOL.</p>}
                    </div>
                </div>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="prompt-kol" className="block text-sm font-medium text-gray-300 mb-2">3. Mô tả bối cảnh và tương tác</label>
                        <div className="relative">
                            <textarea id="prompt-kol" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ví dụ: KOL đang cầm sản phẩm và mỉm cười, bối cảnh studio sang trọng" rows={8} className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-purple-500 focus:border-purple-500"/>
                            <button onClick={handleSuggestPrompt} disabled={isSuggesting || (modelImages.length === 0 && products.length === 0 && !prompt)} className="absolute bottom-2 right-2 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1 px-3 rounded-md disabled:bg-slate-500 disabled:cursor-not-allowed">{isSuggesting ? '...' : 'Gợi ý'}</button>
                        </div>
                        {promptSuggestions.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{promptSuggestions.map((s, i) => <button key={i} onClick={() => { setPrompt(s); setPromptSuggestions([]); }} className="text-xs bg-slate-600 hover:bg-slate-500 text-gray-200 py-1 px-3 rounded-full">"{s}"</button>)}</div>}
                    </div>
                    {renderSharedOptions()}
                </div>
            </div>
        )}

        {/* ----- Product Mode UI ----- */}
        {mode === 'product' && (
             <div className="space-y-6">
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">1. Tải ảnh & đặt tên sản phẩm ({products.length}/20)</label>
                    {products.length > 0 && (
                        <div className="space-y-4 mb-2 p-2 bg-slate-900/50 rounded-lg">{products.map((p, i) => (<div key={i} className="flex items-center gap-3"><div className="relative group w-20 h-20 flex-shrink-0"><img src={p.image} alt={`Product ${i+1}`} className="w-full h-full object-cover rounded-md"/><button onClick={() => handleRemoveProduct(i)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Xóa sản phẩm ${i+1}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button></div><input type="text" value={p.name} onChange={(e) => handleProductNameChange(i, e.target.value)} placeholder={`Tên sản phẩm ${i+1}`} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm text-white focus:ring-purple-500 focus:border-purple-500"/></div>))}</div>
                    )}
                    <input type="file" ref={productFileInputRef} onChange={(e) => handleFileSelect(e, 'product')} className="hidden" accept="image/*" multiple/>
                    {products.length < 20 && <button onClick={() => productFileInputRef.current?.click()} className="w-full py-3 border-2 border-dashed border-slate-600 rounded-lg flex justify-center items-center text-center cursor-pointer hover:border-purple-400 hover:bg-slate-800/50 transition-colors text-gray-300">Thêm sản phẩm (Hỗ trợ chọn nhiều)</button>}
                </div>
                 <ImageUploader id="background-uploader" title="2. Tải ảnh nền (tùy chọn)" onImageUpload={setBackgroundImage} value={backgroundImage} />
                 <div>
                    <label htmlFor="prompt-product" className="block text-sm font-medium text-gray-300 mb-2">3. Mô tả nền (tùy chọn)</label>
                    <div className="relative">
                        <textarea id="prompt-product" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ví dụ: trên một tảng đá rêu phong trong rừng, có ánh nắng xuyên qua tán lá" rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-purple-500 focus:border-purple-500"/>
                        <button onClick={handleSuggestPrompt} disabled={isSuggesting || (products.length === 0 && !prompt)} className="absolute bottom-2 right-2 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1 px-3 rounded-md disabled:bg-slate-500 disabled:cursor-not-allowed">{isSuggesting ? '...' : 'Gợi ý'}</button>
                    </div>
                    {promptSuggestions.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{promptSuggestions.map((s, i) => <button key={i} onClick={() => { setPrompt(s); setPromptSuggestions([]); }} className="text-xs bg-slate-600 hover:bg-slate-500 text-gray-200 py-1 px-3 rounded-full">"{s}"</button>)}</div>}
                 </div>
                 {renderSharedOptions()}
            </div>
        )}

        {/* ----- Exploded Mode UI ----- */}
        {mode === 'exploded' && (
            <div className="space-y-6">
                <ImageUploader 
                    id="exploded-product-uploader" 
                    title="1. Tải lên ảnh sản phẩm để tách lớp" 
                    onImageUpload={setExplodedProductImage} 
                    value={explodedProductImage} 
                />
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 text-sm text-gray-400">
                    <p className="font-semibold text-purple-400 mb-2">Yêu cầu:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Tạo hình ảnh exploded-view cho sản phẩm này.</li>
                        <li>Hiển thị sản phẩm được tách lớp thành nhiều bộ phận đang lơ lửng.</li>
                        <li>Theo đúng hình dạng và cấu trúc gốc với nhãn tên bộ phận.</li>
                        <li>Thể hiện cấu trúc bên trong một cách trực quan và thẩm mỹ.</li>
                    </ul>
                </div>
                {renderSharedOptions()}
            </div>
        )}
      </FeatureContainer>

      {isLoading && (
          <div className="mt-8 flex flex-col items-center justify-center">
            <LoadingSpinner />
            {loadingMessage && <p className="text-lg text-gray-300 mt-2 text-center max-w-md">{loadingMessage}</p>}
          </div>
      )}
      {error && <p className="text-red-400 text-center mt-4">{error}</p>}
      
      {resultImages.length > 0 && (
        <div className="mt-8">
            <h3 className="text-2xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">Kết quả</h3>
            <UndoRedoControls onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}/>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {resultImages.map((image, index) => (
                    <div key={index} className="bg-slate-800 p-2 rounded-lg flex flex-col gap-2">
                        <div className="relative">
                            {editingIndex === index && <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-md z-10"><LoadingSpinner /></div>}
                            <img src={image} alt={`Affiliate image ${index + 1}`} className="w-full h-auto object-contain rounded-md cursor-zoom-in" onClick={() => window.dispatchEvent(new CustomEvent('imageZoomRequest', { detail: image }))}/>
                        </div>
                        <div className="flex flex-col gap-2">
                            <a href={image} download={`affiliate-image-${index + 1}.png`} className="w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors">Tải xuống</a>
                            <SendToFeature image={image} currentFeatureId={Feature.GenerateAffiliateImage} onSend={onSendImage} className="text-sm"/>
                        </div>
                        <ResultEditor onEdit={(prompt) => handleEditImage(prompt, index)} isEditing={editingIndex === index}/>
                    </div>
                ))}
            </div>
        </div>
      )}
    </>
  );
};

export default AffiliateImageGenerator;