import React, { useRef, useEffect, useState, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { editWithMask, removeObject } from '../services/geminiService';

interface InpaintingEditorProps {
  isOpen: boolean;
  onClose: () => void;
  image: string | null;
  onEditComplete: (newImage: string) => void;
  mode?: 'inpaint' | 'remove';
}

const InpaintingEditor: React.FC<InpaintingEditorProps> = ({ isOpen, onClose, image, onEditComplete, mode = 'inpaint' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(40);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const getCanvasContext = () => canvasRef.current?.getContext('2d', { willReadFrequently: true });

  const saveToHistory = () => {
    const ctx = getCanvasContext();
    if (ctx && canvasRef.current) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const ctx = getCanvasContext();
        if (ctx && history[newIndex]) {
            ctx.putImageData(history[newIndex], 0, 0);
        }
    }
  };
  
  const canUndo = historyIndex > 0;

  const handleResize = useCallback(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !img.parentElement) return;

    const { width, height, top, left } = img.getBoundingClientRect();
    const { top: parentTop, left: parentLeft } = img.parentElement.getBoundingClientRect();
    
    canvas.width = width;
    canvas.height = height;
    canvas.style.left = `${left - parentLeft}px`;
    canvas.style.top = `${top - parentTop}px`;
    
    const ctx = getCanvasContext();
    if (ctx) {
        // Only initialize history on first load, not on every resize
        if (history.length === 0) {
            const imageData = ctx.getImageData(0, 0, width, height);
            setHistory([imageData]);
            setHistoryIndex(0);
        }
    }
  }, [history.length]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('resize', handleResize);
      return () => {
          window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen, handleResize]);
  
  const getMousePos = (e: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = (e as React.TouchEvent<HTMLCanvasElement>).touches?.[0];
    return {
      x: (touch?.clientX || (e as React.MouseEvent).clientX) - rect.left,
      y: (touch?.clientY || (e as React.MouseEvent).clientY) - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => {
    const ctx = getCanvasContext();
    if (!ctx) return;
    setIsDrawing(true);
    const { x, y } = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  
  const draw = (e: React.MouseEvent | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = getCanvasContext();
    if (!ctx) return;
    const { x, y } = getMousePos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = `rgba(192, 132, 252, 0.7)`;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    const ctx = getCanvasContext();
    if (!ctx) return;
    ctx.closePath();
    if (isDrawing) {
        saveToHistory();
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const ctx = getCanvasContext();
    if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        saveToHistory();
    }
  };

  const handleGenerate = async () => {
    if (!image || !canvasRef.current) return;
    if (mode === 'inpaint' && !prompt) return;

    const canvas = canvasRef.current;
    const img = imageRef.current;
    if(!img) return;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = img.naturalWidth;
    maskCanvas.height = img.naturalHeight;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    // Scale the drawing from the on-screen canvas to the natural image size canvas
    maskCtx.drawImage(canvas, 0, 0, img.naturalWidth, img.naturalHeight);

    const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) { // Check alpha channel
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = 255;
        }
    }
    maskCtx.putImageData(imageData, 0, 0);

    const maskImage = maskCanvas.toDataURL('image/png');

    setIsLoading(true);
    setError(null);
    try {
      const newImage = mode === 'remove'
        ? await removeObject(image, maskImage)
        : await editWithMask(image, maskImage, prompt);
      onEditComplete(newImage);
      onClose();
    } catch (e) {
      setError(`Đã xảy ra lỗi: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (!isOpen) {
        setPrompt('');
        setError(null);
        setIsLoading(false);
        setHistory([]);
        setHistoryIndex(-1);
    }
  }, [isOpen]);

  if (!isOpen || !image) return null;

  const title = mode === 'remove' ? 'Xóa chi tiết thừa' : 'Chỉnh sửa vùng chọn';
  const description1 = mode === 'remove' ? '1. Tô lên vùng ảnh bạn muốn xóa' : '1. Tô lên vùng ảnh cần sửa';
  const label2 = mode === 'remove' ? '2. AI sẽ tự động xóa và lấp đầy' : '2. Mô tả thay đổi';
  const buttonText = mode === 'remove' ? '3. Xóa chi tiết' : '4. Tạo ảnh';
  const canGenerate = (mode === 'remove' ? historyIndex > 0 : !!prompt && historyIndex > 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onMouseDown={onClose}>
        <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col p-4" onMouseDown={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
            </div>

            <div className="flex-grow min-h-0 flex flex-col lg:flex-row gap-4">
                {/* Left side: Image and Canvas */}
                <div className="relative flex-grow lg:w-2/3 min-h-0 flex items-center justify-center bg-slate-900/50 rounded-md overflow-hidden">
                    <img ref={imageRef} src={image} alt="To edit" className="max-w-full max-h-full object-contain block" onLoad={handleResize}/>
                    <canvas
                        ref={canvasRef}
                        className="absolute cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                    {isLoading && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
                            <LoadingSpinner />
                        </div>
                    )}
                </div>

                {/* Right side: Controls */}
                <div className="flex-shrink-0 lg:w-1/3 flex flex-col space-y-4 p-2">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{description1}</label>
                            <p className="text-sm text-gray-400">Dùng chuột hoặc ngón tay để vẽ lên khu vực bạn muốn AI thay đổi.</p>
                        </div>
                        <div>
                            <label htmlFor="inpainting-prompt" className="block text-sm font-medium text-gray-300 mb-1">{label2}</label>
                            {mode === 'inpaint' && (
                                <textarea
                                    id="inpainting-prompt"
                                    rows={4}
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                    placeholder="Ví dụ: thêm một chiếc mũ cao bồi, đổi thành áo màu đỏ..."
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-purple-500 focus:border-purple-500"
                                />
                            )}
                        </div>
                        <div>
                            <label htmlFor="brush-size" className="block text-sm font-medium text-gray-300 mb-1">Cỡ cọ: {brushSize}px</label>
                            <input
                                id="brush-size"
                                type="range"
                                min="5"
                                max="100"
                                value={brushSize}
                                onChange={e => setBrushSize(parseInt(e.target.value, 10))}
                                className="w-full"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={undo} disabled={!canUndo || isLoading} className="flex-1 px-4 py-2 text-sm rounded-md bg-slate-600 hover:bg-slate-500 disabled:opacity-50 transition-colors">Hoàn tác</button>
                            <button onClick={clearCanvas} disabled={isLoading} className="flex-1 px-4 py-2 text-sm rounded-md bg-slate-600 hover:bg-slate-500 disabled:opacity-50 transition-colors">Xóa hết</button>
                        </div>
                        {error && <p className="text-red-400 text-center my-2 flex-shrink-0">{error}</p>}
                    </div>

                    <div className="mt-auto">
                        <button onClick={handleGenerate} disabled={!canGenerate || isLoading} className="w-full px-6 py-3 text-base font-bold rounded-md bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">
                            {isLoading ? 'Đang xử lý...' : buttonText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default InpaintingEditor;