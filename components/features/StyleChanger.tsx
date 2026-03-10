import React, { useState, useEffect } from 'react';
import ImageUploader from '../ImageUploader';
import LoadingSpinner from '../LoadingSpinner';
import FeatureContainer from './FeatureContainer';
import UndoRedoControls from '../UndoRedoControls';
import SendToFeature from '../SendToFeature';
import ResultEditor from '../ResultEditor';
import ModelSelector from '../ModelSelector';
import { changeStyle, editImageWithPrompt } from '../../services/geminiService';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { Session, StyleChangerParams } from '../../types';
import { Feature } from '../../types';

interface StyleChangerProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null;
  onSendImage: (image: string, featureId: Feature) => void;
}

const movements = [
  { label: 'Không chọn', value: '', description: 'Không áp dụng trường phái hội họa cụ thể.' },
  { label: 'Hiện thực (Realism)', value: 'in a highly detailed and accurate Realism style', description: 'Vẽ giống thật, chi tiết, chính xác.' },
  { label: 'Ấn tượng (Impressionism)', value: 'in an Impressionism style with quick, visible brushstrokes and a focus on light', description: 'Nét cọ nhanh, màu sáng, bắt khoảnh khắc ánh sáng.' },
  { label: 'Hậu ấn tượng (Post-Impressionism)', value: 'in a Post-Impressionism style with strong colors and distinct forms, like Van Gogh', description: 'Dùng màu mạnh, hình khối rõ rệt (như Van Gogh).' },
  { label: 'Lập thể (Cubism)', value: 'in a Cubism style, fragmented and viewed from multiple angles', description: 'Phân mảnh hình khối, nhìn từ nhiều góc độ (Picasso).' },
  { label: 'Siêu thực (Surrealism)', value: 'in a dream-like and bizarre Surrealism style, like Salvador Dalí', description: 'Huyền ảo, như trong mơ (Salvador Dalí).' },
  { label: 'Trừu tượng (Abstract)', value: 'as an Abstract piece, using color and form to express emotion', description: 'Không mô tả trực tiếp, dùng màu và hình khối để biểu đạt cảm xúc.' },
  { label: 'Pop Art', value: 'in a vibrant Pop Art style with bold colors and heavy outlines, like Andy Warhol', description: 'Màu tươi, in đậm, gắn với văn hóa đại chúng (Andy Warhol).' },
  { label: 'Biểu hiện (Expressionism)', value: 'in an Expressionism style with strong, emotional brushstrokes and distorted forms', description: 'Nét vẽ mạnh, cảm xúc mãnh liệt, biến dạng hình thể.' },
];

const materials = [
  { label: 'Không chọn', value: '', description: 'Không áp dụng chất liệu hay kỹ thuật cụ thể.' },
  { label: 'Sơn dầu', value: 'rendered as a rich oil painting', description: 'Màu sắc đậm, độ sâu tốt, lâu bền.' },
  { label: 'Màu nước (Watercolor)', value: 'rendered as a soft and transparent watercolor painting', description: 'Trong trẻo, mềm mại, hiệu ứng loang màu.' },
  { label: 'Phấn màu (Pastel)', value: 'rendered as a smooth pastel drawing with gentle colors', description: 'Nét mịn, màu nhẹ nhàng.' },
  { label: 'Mực tàu – thủy mặc', value: 'rendered as a minimalist East Asian ink wash painting', description: 'Tối giản, đậm chất Á Đông.' },
  { label: 'Nét chì', value: 'rendered as a detailed pencil or charcoal sketch', description: 'Dùng bút chì, than, mực để phác nhanh.' },
  { label: 'Bút bi xanh', value: 'rendered as a blue ballpoint pen drawing, with visible cross-hatching and ink lines', description: 'Nét vẽ đặc trưng của bút bi xanh, có thể thấy các đường gạch chéo.' },
  { label: 'Bút bi đỏ', value: 'rendered as a red ballpoint pen drawing, with visible cross-hatching and ink lines', description: 'Nét vẽ đặc trưng của bút bi đỏ, thường dùng để chấm bài hoặc ghi chú.' },
];

const illustrativeStyles = [
  { label: 'Chibi', value: 'as a cute Chibi illustration with a large head and small body', description: 'Nhân vật nhỏ nhắn, dễ thương, đầu to – thân nhỏ.' },
  { label: 'Anime/Manga', value: 'in a vibrant Japanese Anime/Manga style', description: 'Phong cách truyện tranh Nhật, nét rõ, màu tươi.' },
  { label: 'Tối giản', value: 'in a minimalist style focusing on composition and color blocks', description: 'Tối giản chi tiết, tập trung bố cục và mảng màu.' },
  { label: 'Đường nét', value: 'as an elegant line art drawing with minimal color', description: 'Chỉ dùng đường nét, ít màu, tinh tế.' },
  { label: 'Kỹ thuật số', value: 'as a polished digital painting with diverse effects', description: 'Tranh vẽ kỹ thuật số, hiệu ứng đa dạng.' },
  { label: 'Biếm họa', value: 'as a humorous caricature with exaggerated features', description: 'Phóng đại nét riêng (mắt, mũi, miệng…) để gây hài hước hoặc châm biếm.' },
];


const StyleChanger: React.FC<StyleChangerProps> = ({ sessionToLoad, onSaveSession, imageToLoad, onSendImage }) => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [selectedIllustrativeStyle, setSelectedIllustrativeStyle] = useState<string>(illustrativeStyles[0].value);
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

  useEffect(() => {
    if (imageToLoad) {
      setBaseImage(imageToLoad);
      resetResultImages([]);
    }
  }, [imageToLoad]);

  useEffect(() => {
    if (sessionToLoad && sessionToLoad.featureId === Feature.ChangeStyle) {
      setBaseImage(sessionToLoad.originalImage);
      resetResultImages(sessionToLoad.resultImages);
      const params = sessionToLoad.parameters as StyleChangerParams;
      setSelectedMovement(params.movement || '');
      setSelectedMaterial(params.material || '');
      setSelectedIllustrativeStyle(params.illustrativeStyle || illustrativeStyles[0].value);
      setNumberOfImages(params.numberOfImages || 1);
      setModelType(params.modelType || 'flash');
    }
  }, [sessionToLoad]);
  
  const handleImageUpload = (image: string) => {
    setBaseImage(image);
    resetResultImages([]);
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
      setError('Vui lòng tải lên một ảnh.');
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

    const promptParts = [selectedIllustrativeStyle, selectedMovement, selectedMaterial].filter(Boolean);
    const finalPrompt = `Redraw the subject(s) in this image in a new artistic style, described as: ${promptParts.join(', ')}. The new image should retain the original composition and poses but be rendered in the new style.`;
    
    const results: string[] = [];
    try {
      for (let i = 0; i < numberOfImages; i++) {
        setLoadingMessage(`Đang tạo ảnh ${i + 1} trên ${numberOfImages}...`);
        const newImage = await changeStyle(baseImage, finalPrompt, modelType);
        results.push(newImage);
      }
      setResultImages(results);
      onSaveSession({
        originalImage: baseImage,
        resultImages: results,
        parameters: { 
          movement: selectedMovement,
          material: selectedMaterial,
          illustrativeStyle: selectedIllustrativeStyle,
          numberOfImages,
          modelType
        },
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
  
  const selectedStyleDesc = illustrativeStyles.find(s => s.value === selectedIllustrativeStyle)?.description;
  const selectedMovementDesc = movements.find(m => m.value === selectedMovement)?.description;
  const selectedMaterialDesc = materials.find(m => m.value === selectedMaterial)?.description;

  return (
    <>
      <FeatureContainer
        title="Thay đổi phong cách"
        description="Tải lên ảnh của bạn và chọn các tùy chọn để tạo ra phong cách độc đáo."
        onSubmit={handleSubmit}
        isLoading={isLoading}
        canSubmit={!!baseImage}
      >
        <div className="space-y-6">
            <ImageUploader id="styler-img" onImageUpload={handleImageUpload} title="1. Tải ảnh lên" value={baseImage} />
            
            <div>
                <label htmlFor="style-select" className="block text-sm font-medium text-gray-300 mb-2">2. Phong cách</label>
                <select 
                    id="style-select"
                    value={selectedIllustrativeStyle}
                    onChange={(e) => setSelectedIllustrativeStyle(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                >
                    {illustrativeStyles.map(style => <option key={style.label} value={style.value}>{style.label}</option>)}
                </select>
                {selectedStyleDesc && <p className="mt-2 text-sm text-gray-400">{selectedStyleDesc}</p>}
            </div>

            <div>
                <label htmlFor="movement-select" className="block text-sm font-medium text-gray-300 mb-2">3. Trường phái (Tùy chọn)</label>
                <select 
                    id="movement-select"
                    value={selectedMovement}
                    onChange={(e) => setSelectedMovement(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                >
                    {movements.map(move => <option key={move.label} value={move.value}>{move.label}</option>)}
                </select>
                {selectedMovementDesc && selectedMovement && <p className="mt-2 text-sm text-gray-400">{selectedMovementDesc}</p>}
            </div>

            <div>
                <label htmlFor="material-select" className="block text-sm font-medium text-gray-300 mb-2">4. Chất liệu (Tùy chọn)</label>
                <select 
                    id="material-select"
                    value={selectedMaterial}
                    onChange={(e) => setSelectedMaterial(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                >
                    {materials.map(mat => <option key={mat.label} value={mat.value}>{mat.label}</option>)}
                </select>
                {selectedMaterialDesc && selectedMaterial && <p className="mt-2 text-sm text-gray-400">{selectedMaterialDesc}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ModelSelector value={modelType} onChange={setModelType} />
                <div>
                  <label htmlFor="num-images" className="block text-sm font-medium text-gray-300 mb-2">5. Số lượng ảnh</label>
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
                              alt={`Generated style ${index + 1}`} 
                              className="w-full h-auto object-contain rounded-md cursor-zoom-in"
                              onClick={() => window.dispatchEvent(new CustomEvent('imageZoomRequest', { detail: image }))} 
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <a
                                href={image}
                                download={`style-change-${index + 1}.png`}
                                className="w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                            >
                                Tải xuống
                            </a>
                            <SendToFeature 
                                image={image} 
                                currentFeatureId={Feature.ChangeStyle} 
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

export default StyleChanger;