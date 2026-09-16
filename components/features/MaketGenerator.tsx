import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../LoadingSpinner';
import FeatureContainer from './FeatureContainer';
import UndoRedoControls from '../UndoRedoControls';
import SendToFeature from '../SendToFeature';
import ResultEditor from '../ResultEditor';
import ModelSelector from '../ModelSelector';
import { generateMaketImage, suggestMaketBackground, editImageWithPrompt } from '../../services/geminiService';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import type { Session, MaketGeneratorParams } from '../../types';
import { Feature } from '../../types';

interface MaketGeneratorProps {
  sessionToLoad: Session | null;
  onSaveSession: (sessionData: Omit<Session, 'id' | 'timestamp' | 'featureId' | 'featureTitle'>) => void;
  imageToLoad: string | null;
  onSendImage: (image: string, featureId: Feature) => void;
}

const BACKGROUND_PRESETS = [
  {
    name: 'Đại hội / Đảng / Đoàn',
    prompt: 'Phông nền đỏ cờ hoa trang trọng, họa tiết trống đồng Đông Sơn chìm tinh tế, ánh sáng vàng ấm uy nghiêm.',
  },
  {
    name: 'Doanh nghiệp / Tổng kết',
    prompt: 'Phông nền xanh dương cobalt gradient sang trọng, dải lụa uốn lượn ánh kim vàng gold, ánh đèn spotlight sân khấu.',
  },
  {
    name: 'Gala Dinner / Tiệc tối',
    prompt: 'Phông nền đen huyền bí kết hợp ánh vàng kim tuyến lấp lánh (black and gold luxury), đèn chùm pha lê và pháo hoa rực rỡ.',
  },
  {
    name: 'Công nghệ / Hội thảo',
    prompt: 'Phông nền xanh neon công nghệ kỹ thuật số 3D, mạng lưới liên kết dữ liệu hiện đại, dải sáng tương lai sắc nét.',
  },
  {
    name: 'Khai giảng / Giáo dục',
    prompt: 'Phông nền xanh ngọc tươi sáng, biểu tượng trang sách, chim bồ câu hòa bình và dải ruy băng tri thức thanh lịch.',
  },
];

const MaketGenerator: React.FC<MaketGeneratorProps> = ({ sessionToLoad, onSaveSession, onSendImage }) => {
  const [leftTitle, setLeftTitle] = useState('');
  const [centerTitle, setCenterTitle] = useState('');
  const [rightTitle, setRightTitle] = useState('');
  const [mainContent, setMainContent] = useState('');
  const [locationDate, setLocationDate] = useState('');
  const [backgroundPrompt, setBackgroundPrompt] = useState('');

  const [aspectRatio, setAspectRatio] = useState<MaketGeneratorParams['aspectRatio']>('16:9');
  const [numberOfImages, setNumberOfImages] = useState<number>(1);
  const [modelType, setModelType] = useState<string>('auto');

  const [isSuggestingBg, setIsSuggestingBg] = useState(false);
  const [bgSuggestions, setBgSuggestions] = useState<string[]>([]);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

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

  // Restore from session
  useEffect(() => {
    if (sessionToLoad && sessionToLoad.featureId === Feature.GenerateMaket) {
      resetResultImages(sessionToLoad.resultImages);
      const params = sessionToLoad.parameters as MaketGeneratorParams;
      setLeftTitle(params.leftTitle || '');
      setCenterTitle(params.centerTitle || '');
      setRightTitle(params.rightTitle || '');
      setMainContent(params.mainContent || '');
      setLocationDate(params.locationDate || '');
      setBackgroundPrompt(params.backgroundPrompt || '');
      setAspectRatio(params.aspectRatio || '16:9');
      setNumberOfImages(params.numberOfImages || 1);
      setModelType(params.modelType || 'auto');
    }
  }, [sessionToLoad]);

  const handleSuggestBackground = async () => {
    if (!mainContent.trim()) {
      setSuggestionError('Vui lòng nhập "Nội dung chính" trước để AI có cơ sở phân tích và gợi ý phong cách nền phù hợp.');
      return;
    }
    setSuggestionError(null);
    setIsSuggestingBg(true);
    try {
      const suggestions = await suggestMaketBackground(
        mainContent,
        leftTitle,
        centerTitle,
        rightTitle
      );
      if (suggestions.length === 0) {
        setSuggestionError('Không nhận được gợi ý từ AI. Vui lòng thử lại.');
      } else {
        setBgSuggestions(suggestions);
      }
    } catch (e: any) {
      setSuggestionError(`Lỗi khi gợi ý nền: ${e.message || String(e)}`);
    } finally {
      setIsSuggestingBg(false);
    }
  };

  const handleGenerateMaket = async () => {
    if (!mainContent.trim()) {
      setError('Vui lòng nhập nội dung chính hiển thị ở giữa maket.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const params: MaketGeneratorParams = {
        leftTitle: leftTitle.trim() || undefined,
        centerTitle: centerTitle.trim() || undefined,
        rightTitle: rightTitle.trim() || undefined,
        mainContent: mainContent.trim(),
        locationDate: locationDate.trim() || undefined,
        backgroundPrompt: backgroundPrompt.trim(),
        aspectRatio,
        numberOfImages,
        modelType,
      };

      const images = await generateMaketImage(params);
      setResultImages(images);

      onSaveSession({
        originalImage: '',
        resultImages: images,
        parameters: params,
      });
    } catch (e: any) {
      setError(`Lỗi khi tạo ảnh maket: ${e.message || String(e)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditImage = async (prompt: string, index: number) => {
    if (!resultImages[index]) return;
    setEditingIndex(index);
    setError(null);
    try {
      const edited = await editImageWithPrompt(resultImages[index], prompt, modelType);
      const newImages = [...resultImages];
      newImages[index] = edited;
      setResultImages(newImages);
    } catch (e: any) {
      setError(`Lỗi chỉnh sửa ảnh: ${e.message || String(e)}`);
    } finally {
      setEditingIndex(null);
    }
  };

  return (
    <>
      <FeatureContainer
        title="Tạo ảnh Maket sân khấu"
        description="Thiết kế phông bạt, backdrop, maket hội nghị, sự kiện với bố cục tiêu đề đỉnh cao, nội dung chính trang trọng ở giữa và gợi ý nền thông minh bằng AI."
        onSubmit={handleGenerateMaket}
        isLoading={isLoading}
        canSubmit={Boolean(mainContent.trim())}
      >
        <div className="space-y-6">
          {/* Visual Wireframe Layout Helper */}
          <div className="bg-slate-900/70 border border-slate-700/80 rounded-lg p-4 text-xs">
            <div className="flex items-center justify-between text-gray-400 mb-2 font-medium">
              <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                Sơ đồ bố cục Maket tiêu chuẩn
              </span>
              <span className="text-gray-400 hidden sm:inline">Phân bổ vị trí các ô nhập liệu trên phông bạt</span>
            </div>

            <div className="border border-dashed border-purple-500/40 rounded-md p-3 bg-slate-950/60 flex flex-col justify-between min-h-44 relative overflow-hidden">
              {/* Top Row: Left - Center - Right Titles */}
              <div className="grid grid-cols-3 gap-2 border-b border-slate-800 pb-2">
                <div className="text-left text-[11px] text-cyan-300 font-medium whitespace-pre-line leading-tight">
                  {leftTitle ? `↖ ${leftTitle}` : '↖ Tiêu đề trái (Tùy chọn - 1 hoặc 2 dòng)'}
                </div>
                <div className="text-center text-[11px] text-purple-300 font-medium whitespace-pre-line leading-tight">
                  {centerTitle ? `↑ ${centerTitle}` : '↑ Tiêu đề giữa (Tùy chọn - 1 hoặc 2 dòng)'}
                </div>
                <div className="text-right text-[11px] text-cyan-300 font-medium whitespace-pre-line leading-tight">
                  {rightTitle ? `${rightTitle} ↗` : 'Tiêu đề phải (Tùy chọn - 1 hoặc 2 dòng) ↗'}
                </div>
              </div>

              {/* Center: Main Content */}
              <div className="my-auto text-center px-4 py-2">
                <div className="text-amber-400 font-bold text-sm tracking-wide line-clamp-2 uppercase">
                  {mainContent ? mainContent : '★ NỘI DUNG CHÍNH (HIỂN THỊ CHÍNH GIỮA) ★'}
                </div>
              </div>

              {/* Bottom: Location & Date (Bottom Right, safely padded) */}
              <div className="flex justify-end pr-8 pb-1">
                <div className="text-[11px] text-emerald-400 italic font-medium">
                  {locationDate ? `📍 ${locationDate}` : '📍 Địa danh, ngày tháng (Góc dưới bên phải)'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Top Titles (Left, Center, Right) */}
          <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                <span>1. Hàng tiêu đề trên cùng (Nằm ở đỉnh maket - Hỗ trợ ghi 2 dòng)</span>
              </h4>
              <span className="text-xs text-gray-400 italic">(Có thể nhập 1 hoặc 2 dòng, để trống nếu không dùng)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Left Title */}
              <div>
                <label htmlFor="leftTitle" className="block text-xs font-medium text-gray-300 mb-1">
                  Tiêu đề trái (Cho phép ghi 2 dòng)
                </label>
                <textarea
                  id="leftTitle"
                  value={leftTitle}
                  onChange={(e) => setLeftTitle(e.target.value)}
                  rows={2}
                  placeholder="Dòng 1: ĐẢNG BỘ TỈNH THÁI NGUYÊN&#10;Dòng 2: HUYỆN ỦY PHÚ BÌNH"
                  className="w-full bg-slate-700/90 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none font-normal"
                />
                <p className="mt-1 text-[11px] text-gray-400">Góc trên cùng bên trái (nhấn Enter để xuống dòng 2)</p>
              </div>

              {/* Center Title */}
              <div>
                <label htmlFor="centerTitle" className="block text-xs font-medium text-gray-300 mb-1">
                  Tiêu đề giữa (Cho phép ghi 2 dòng)
                </label>
                <textarea
                  id="centerTitle"
                  value={centerTitle}
                  onChange={(e) => setCenterTitle(e.target.value)}
                  rows={2}
                  placeholder="Dòng 1: ĐẢNG CỘNG SẢN VIỆT NAM&#10;Dòng 2: QUANG VINH MUÔN NĂM"
                  className="w-full bg-slate-700/90 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none font-normal"
                />
                <p className="mt-1 text-[11px] text-gray-400">Chính giữa trên cùng (nhấn Enter để xuống dòng 2)</p>
              </div>

              {/* Right Title */}
              <div>
                <label htmlFor="rightTitle" className="block text-xs font-medium text-gray-300 mb-1">
                  Tiêu đề phải (Cho phép ghi 2 dòng)
                </label>
                <textarea
                  id="rightTitle"
                  value={rightTitle}
                  onChange={(e) => setRightTitle(e.target.value)}
                  rows={2}
                  placeholder="Dòng 1: ĐOÀN TNCS HỒ CHÍ MINH&#10;Dòng 2: CHI ĐOÀN CƠ QUAN"
                  className="w-full bg-slate-700/90 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none font-normal"
                />
                <p className="mt-1 text-[11px] text-gray-400">Góc trên cùng bên phải (nhấn Enter để xuống dòng 2)</p>
              </div>
            </div>
          </div>

          {/* Section 2: Main Content (Center) */}
          <div className="bg-slate-800/60 p-4 rounded-lg border border-purple-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="mainContent" className="block text-sm font-semibold text-amber-300 uppercase tracking-wider">
                2. Nội dung chính (Hiển thị ở giữa maket) <span className="text-red-400">*</span>
              </label>
              <span className="text-xs text-purple-300 font-medium">Trọng tâm sân khấu</span>
            </div>
            <textarea
              id="mainContent"
              value={mainContent}
              onChange={(e) => setMainContent(e.target.value)}
              placeholder="Nhập nội dung sự kiện, hội nghị hoặc tiêu đề chính...&#10;Ví dụ: LỄ KỶ NIỆM 20 NĂM NGÀY THÀNH LẬP CÔNG TY (2006 - 2026) VÀ ĐÓN NHẬN HUÂN CHƯƠNG LAO ĐỘNG HẠNG NHÌ"
              rows={3}
              className="w-full bg-slate-700/90 border border-slate-600 rounded-md p-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 font-medium"
            />
            <p className="text-xs text-gray-400">
              Nội dung này sẽ được AI hiển thị ở vị trí chính giữa maket với phông chữ lớn, trang trọng, nổi bật và đẹp mắt nhất.
            </p>
          </div>

          {/* Section 3: Location and Date */}
          <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/60 space-y-2">
            <label htmlFor="locationDate" className="block text-sm font-semibold text-emerald-300 uppercase tracking-wider">
              3. Địa danh, ngày tháng (Góc dưới bên phải)
            </label>
            <input
              type="text"
              id="locationDate"
              value={locationDate}
              onChange={(e) => setLocationDate(e.target.value)}
              placeholder="VD: Hà Nội, ngày 26 tháng 3 năm 2026 (hoặc: Thái Nguyên, ngày 19/05/2026)"
              className="w-full bg-slate-700/90 border border-slate-600 rounded-md px-3 py-2.5 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
            />
            <p className="text-xs text-gray-400">
              Nội dung này sẽ được ghi ở góc bên dưới bên phải, nhưng giữ khoảng lề cân đối, không nằm sát mép đáy dưới cùng hay lệch quá sát rìa để đảm bảo mỹ quan sân khấu.
            </p>
          </div>

          {/* Section 4: Background Description with AI Suggest Button */}
          <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label htmlFor="backgroundPrompt" className="block text-sm font-semibold text-cyan-300 uppercase tracking-wider">
                4. Mô tả phông nền (Background & Phong cách)
              </label>
              <button
                type="button"
                onClick={handleSuggestBackground}
                disabled={isSuggestingBg}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-60 transition-all self-start sm:self-auto cursor-pointer"
              >
                {isSuggestingBg ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>AI đang phân tích...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                    </svg>
                    <span>Gợi ý nền tự động</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              id="backgroundPrompt"
              value={backgroundPrompt}
              onChange={(e) => setBackgroundPrompt(e.target.value)}
              placeholder="Nhập mô tả phong cách nền... (hoặc bấm 'Gợi ý nền tự động' để AI tự phân tích nội dung chính và đưa ra gợi ý phù hợp nhất)&#10;VD: Phông nền đỏ hoa văn trống đồng trang trọng, có cờ Đảng và tượng Bác, ánh sáng vàng ấm."
              rows={3}
              className="w-full bg-slate-700/90 border border-slate-600 rounded-md p-2.5 text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
            />

            {suggestionError && (
              <p className="text-xs text-rose-400 flex items-center gap-1">
                <span>⚠️</span> {suggestionError}
              </p>
            )}

            {/* AI Generated Suggestions */}
            {bgSuggestions.length > 0 && (
              <div className="bg-slate-900/80 p-3 rounded-md border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs text-purple-300 font-semibold">
                  <span>✨ Gợi ý từ AI theo nội dung chính: (Bấm vào để chọn)</span>
                  <button
                    type="button"
                    onClick={() => setBgSuggestions([])}
                    className="text-gray-400 hover:text-gray-200 text-[11px]"
                  >
                    Đóng
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {bgSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setBackgroundPrompt(suggestion)}
                      className="text-left p-2.5 rounded bg-slate-800/90 hover:bg-purple-900/40 border border-slate-700 hover:border-purple-500/50 text-xs text-gray-200 hover:text-white transition-all cursor-pointer flex items-start gap-2"
                    >
                      <span className="text-purple-400 font-bold mt-0.5">{idx + 1}.</span>
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Preset themes */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs text-gray-400">Hoặc chọn nhanh phong cách nền mẫu:</span>
              <div className="flex flex-wrap gap-1.5">
                {BACKGROUND_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setBackgroundPrompt(preset.prompt)}
                    className="text-xs px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white border border-slate-600 transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 5: Configurations (Aspect Ratio, Quantity, Model) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-800/60 p-4 rounded-lg border border-slate-700/60">
            <ModelSelector value={modelType} onChange={setModelType} />

            <div>
              <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-300 mb-1">
                Tỷ lệ phông bạt
              </label>
              <select
                id="aspectRatio"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as any)}
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-purple-500 focus:border-purple-500 text-sm"
              >
                <option value="16:9">16:9 (Màn hình LED / Phông ngang chuẩn)</option>
                <option value="4:3">4:3 (Sân khấu hội trường truyền thống)</option>
                <option value="1:1">1:1 (Phông vuông)</option>
                <option value="3:4">3:4 (Phông đứng)</option>
                <option value="9:16">9:16 (Màn hình LED dọc)</option>
              </select>
            </div>

            <div>
              <label htmlFor="numberOfImages" className="block text-sm font-medium text-gray-300 mb-1">
                Số lượng ảnh tạo
              </label>
              <select
                id="numberOfImages"
                value={numberOfImages}
                onChange={(e) => setNumberOfImages(parseInt(e.target.value, 10))}
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-purple-500 focus:border-purple-500 text-sm"
              >
                <option value={1}>1 phương án thiết kế</option>
                <option value={2}>2 phương án thiết kế</option>
                <option value={3}>3 phương án thiết kế</option>
                <option value={4}>4 phương án thiết kế</option>
              </select>
            </div>
          </div>
        </div>
      </FeatureContainer>

      {/* Loading & Error Indicators */}
      {isLoading && (
        <div className="mt-8 text-center">
          <LoadingSpinner />
          <p className="text-purple-300 mt-2 text-sm animate-pulse">
            Đang thiết kế và dựng maket sân khấu theo bố cục của bạn...
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-950/60 border border-red-700/60 rounded-md text-red-300 text-sm text-center max-w-2xl mx-auto">
          {error}
        </div>
      )}

      {/* Results Display */}
      {resultImages.length > 0 && (
        <div className="mt-10 max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">
              Kết quả thiết kế Maket
            </h3>
            <UndoRedoControls onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resultImages.map((image, index) => (
              <div key={index} className="bg-slate-800/90 border border-slate-700 p-3 rounded-lg flex flex-col gap-3 shadow-xl">
                <div className="relative group">
                  {editingIndex === index && (
                    <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center rounded-md z-10">
                      <LoadingSpinner />
                      <p className="text-xs text-purple-300 mt-2">Đang chỉnh sửa maket...</p>
                    </div>
                  )}
                  <img
                    src={image}
                    alt={`Maket design ${index + 1}`}
                    className="w-full h-auto object-contain rounded-md cursor-zoom-in hover:brightness-105 transition-all"
                    onClick={() => window.dispatchEvent(new CustomEvent('imageZoomRequest', { detail: image }))}
                    title="Bấm vào để phóng to xem chi tiết"
                  />
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[11px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    🔍 Bấm để phóng to
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href={image}
                    download={`maket-san-khau-${index + 1}.png`}
                    className="flex-1 text-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow"
                  >
                    Tải về máy
                  </a>
                  <div className="flex-1">
                    <SendToFeature
                      image={image}
                      currentFeatureId={Feature.GenerateMaket}
                      onSend={onSendImage}
                      className="text-sm w-full"
                    />
                  </div>
                </div>

                {/* Edit with prompt */}
                <div className="border-t border-slate-700/60 pt-2">
                  <ResultEditor
                    onEdit={(prompt) => handleEditImage(prompt, index)}
                    isEditing={editingIndex === index}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default MaketGenerator;
