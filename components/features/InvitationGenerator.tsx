import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../LoadingSpinner';
import FeatureContainer from './FeatureContainer';
import UndoRedoControls from '../UndoRedoControls';
import SendToFeature from '../SendToFeature';
import ResultEditor from '../ResultEditor';
import ModelSelector from '../ModelSelector';
import { generateInvitationImage, editImageWithPrompt } from '../../services/geminiService';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { Session, InvitationGeneratorParams } from '../../types';
import { Feature } from '../../types';

interface InvitationGeneratorProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null;
  onSendImage: (image: string, featureId: Feature) => void;
}

const getDayOfWeekVN = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return days[date.getDay()];
};

const formatDateVN = (dateString: string) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const InvitationGenerator: React.FC<InvitationGeneratorProps> = ({ sessionToLoad, onSaveSession, onSendImage }) => {
  const [formData, setFormData] = useState<Omit<InvitationGeneratorParams, 'numberOfImages' | 'aspectRatio' | 'time'>>({
    unit: '',
    type: 'Thông báo',
    content: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    wishes: '',
    additionalInfo: '',
  });
  const [aspectRatio, setAspectRatio] = useState<InvitationGeneratorParams['aspectRatio']>('16:9');
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
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (sessionToLoad && sessionToLoad.featureId === Feature.GenerateInvitation) {
      resetResultImages(sessionToLoad.resultImages);
      const params = sessionToLoad.parameters as InvitationGeneratorParams;
      setFormData({
        unit: params.unit,
        type: params.type,
        content: params.content,
        startDate: params.startDate || '',
        startTime: params.startTime || '',
        endDate: params.endDate || '',
        endTime: params.endTime || '',
        location: params.location,
        wishes: params.wishes,
        additionalInfo: params.additionalInfo || '',
      });
      setAspectRatio(params.aspectRatio || '16:9');
      setNumberOfImages(params.numberOfImages || 1);
      setModelType(params.modelType || 'flash');
    }
  }, [sessionToLoad]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const constructTimeString = () => {
    let timeStr = '';
    if (formData.startDate) {
      const dayStart = getDayOfWeekVN(formData.startDate);
      const dateStart = formatDateVN(formData.startDate);
      timeStr += `${formData.startTime ? formData.startTime + ' ' : ''}${dayStart}, ${dateStart}`;
    }
    
    if (formData.endDate) {
      const dayEnd = getDayOfWeekVN(formData.endDate);
      const dateEnd = formatDateVN(formData.endDate);
      timeStr += ` đến ${formData.endTime ? formData.endTime + ' ' : ''}${dayEnd}, ${dateEnd}`;
    } else if (formData.endTime) {
      timeStr += ` đến ${formData.endTime}`;
    }
    
    return timeStr.trim();
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
    if (!formData.unit || !formData.content) {
      setError('Vui lòng nhập Đơn vị và Nội dung chính.');
      return;
    }

    const timeString = constructTimeString();
    if (!timeString && !formData.startDate) {
       setError('Vui lòng chọn thời gian bắt đầu.');
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
      const results = await generateInvitationImage({
        ...formData,
        time: timeString,
        aspectRatio,
        numberOfImages,
        modelType,
      });
      
      setResultImages(results);
      onSaveSession({
        originalImage: '', // Text based generation
        resultImages: results,
        parameters: { ...formData, time: timeString, aspectRatio, numberOfImages, modelType },
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
      setError(`Lỗi khi chỉnh sửa: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setEditingIndex(null);
    }
  };

  const canSubmit = !!formData.unit.trim() && !!formData.content.trim() && !!formData.startDate;

  return (
    <>
      <FeatureContainer
        title="Tạo Thông báo & Thư mời"
        description="Nhập thông tin sự kiện để AI thiết kế mẫu thông báo hoặc thiệp mời chuyên nghiệp."
        onSubmit={handleSubmit}
        isLoading={isLoading}
        canSubmit={canSubmit}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-300 mb-1">1. Đơn vị tổ chức (tối đa 2 dòng)</label>
              <textarea
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                placeholder="Ví dụ: CÔNG TY CÔNG NGHỆ ABC&#10;PHÒNG TRUYỀN THÔNG"
                rows={2}
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2.5 text-white focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">2. Hình thức</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2.5 text-white focus:ring-purple-500 focus:border-purple-500"
              >
                <option>Thông báo</option>
                <option>Thư mời</option>
                <option>Giấy mời</option>
                <option>Thiệp chúc mừng</option>
                <option>Thư ngỏ</option>
              </select>
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-1">3. Nội dung chính</label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="Ví dụ: Kính mời toàn thể nhân viên tham dự buổi tiệc tất niên cuối năm 2024"
                rows={4}
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2.5 text-white focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
            <div className="space-y-4 p-3 bg-slate-900/30 rounded-lg border border-slate-700">
              <h4 className="text-sm font-semibold text-purple-400">4. Thời gian tổ chức</h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Bắt đầu:</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded-md p-2 text-white text-sm"
                    />
                    <input
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      className="w-24 bg-slate-700 border border-slate-600 rounded-md p-2 text-white text-sm"
                    />
                  </div>
                  {formData.startDate && (
                    <p className="text-[10px] text-cyan-400 mt-1 ml-1">{getDayOfWeekVN(formData.startDate)}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Kết thúc (không bắt buộc):</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded-md p-2 text-white text-sm"
                    />
                    <input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      className="w-24 bg-slate-700 border border-slate-600 rounded-md p-2 text-white text-sm"
                    />
                  </div>
                  {formData.endDate && (
                    <p className="text-[10px] text-cyan-400 mt-1 ml-1">{getDayOfWeekVN(formData.endDate)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-1">5. Địa điểm</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Ví dụ: Nhà hàng Grand Plaza, số 123 phố X"
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2.5 text-white focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label htmlFor="wishes" className="block text-sm font-medium text-gray-300 mb-1">6. Lời chúc / Lời kết</label>
              <input
                type="text"
                id="wishes"
                name="wishes"
                value={formData.wishes}
                onChange={handleInputChange}
                placeholder="Ví dụ: Trân trọng cảm ơn và rất hân hạnh được đón tiếp!"
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2.5 text-white focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-300 mb-1">7. Mô tả bổ sung (Yêu cầu riêng cho AI)</label>
              <textarea
                id="additionalInfo"
                name="additionalInfo"
                value={formData.additionalInfo}
                onChange={handleInputChange}
                placeholder="Ví dụ: Sử dụng tông màu đỏ và vàng sang trọng cho dịp Tết. Thêm họa tiết hoa đào chìm ở nền."
                rows={4}
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2.5 text-white focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ModelSelector value={modelType} onChange={setModelType} />
              <div>
                <label htmlFor="aspect-ratio" className="block text-sm font-medium text-gray-300 mb-1">8. Tỷ lệ ảnh</label>
                <select
                  id="aspect-ratio"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as any)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md p-2.5 text-white focus:ring-purple-500 focus:border-purple-500 text-sm"
                >
                  <option value="16:9">Ngang (16:9)</option>
                  <option value="3:4">Đứng (3:4)</option>
                  <option value="1:1">Vuông (1:1)</option>
                  <option value="9:16">Dọc (9:16)</option>
                  <option value="4:3">Ngang vừa (4:3)</option>
                </select>
              </div>
              <div>
                <label htmlFor="num-images" className="block text-sm font-medium text-gray-300 mb-1">9. Số lượng</label>
                <select
                  id="num-images"
                  value={numberOfImages}
                  onChange={(e) => setNumberOfImages(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md p-2.5 text-white focus:ring-purple-500 focus:border-purple-500 text-sm"
                >
                  <option value={1}>1 ảnh</option>
                  <option value={2}>2 ảnh</option>
                  <option value={3}>3 ảnh</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </FeatureContainer>

      {isLoading && <div className="mt-8"><LoadingSpinner /></div>}
      {error && <p className="text-red-400 text-center mt-4">{error}</p>}

      {resultImages.length > 0 && (
        <div className="mt-8">
          <h3 className="text-2xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">Kết quả thiết kế</h3>
          <UndoRedoControls onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resultImages.map((image, index) => (
              <div key={index} className="bg-slate-800 p-2 rounded-lg flex flex-col gap-2 shadow-lg">
                <div className="relative">
                  {editingIndex === index && <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-md z-10"><LoadingSpinner /></div>}
                  <img
                    src={image}
                    alt={`Invitation design ${index + 1}`}
                    className="w-full h-auto object-contain rounded-md cursor-zoom-in"
                    onClick={() => window.dispatchEvent(new CustomEvent('imageZoomRequest', { detail: image }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <a href={image} download={`thiet-ke-${index + 1}.png`} className="w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors">Tải xuống</a>
                  <SendToFeature image={image} currentFeatureId={Feature.GenerateInvitation} onSend={onSendImage} className="text-sm" />
                </div>
                <ResultEditor onEdit={(p) => handleEditImage(p, index)} isEditing={editingIndex === index} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default InvitationGenerator;