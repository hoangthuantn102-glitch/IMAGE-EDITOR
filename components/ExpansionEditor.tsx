import React, { useState, useRef, useEffect, useCallback } from 'react';

// Define handle positions
const handles = ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'];

interface Frame {
  width: number;
  height: number;
  top: number;
  left: number;
}

interface ImagePosition extends Frame {}
interface ImageDisplaySize {
  width: number;
  height: number;
}

interface ExpansionEditorProps {
  imageSrc: string;
  onFrameChange: (frameData: {
    width: number;
    height: number;
    top: number;
    left: number;
    imagePosition: ImagePosition;
    imageDisplaySize: ImageDisplaySize;
  } | null) => void;
}

const getCursorForHandle = (handle: string): string => {
    if (handle.includes('top') && handle.includes('left')) return 'nwse-resize';
    if (handle.includes('top') && handle.includes('right')) return 'nesw-resize';
    if (handle.includes('bottom') && handle.includes('left')) return 'nesw-resize';
    if (handle.includes('bottom') && handle.includes('right')) return 'nwse-resize';
    if (handle.includes('top') || handle.includes('bottom')) return 'ns-resize';
    if (handle.includes('left') || handle.includes('right')) return 'ew-resize';
    return 'auto';
};

const ExpansionEditor: React.FC<ExpansionEditorProps> = ({ imageSrc, onFrameChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [frame, setFrame] = useState<Frame>({ width: 0, height: 0, top: 0, left: 0 });
  const [imagePosition, setImagePosition] = useState<ImagePosition>({ width: 0, height: 0, top: 0, left: 0 });
  const [imageDisplaySize, setImageDisplaySize] = useState<ImageDisplaySize>({ width: 0, height: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState('');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialFrame, setInitialFrame] = useState<Frame | null>(null);
  const [selectedRatio, setSelectedRatio] = useState<string>('free');
  const [originalAspectRatio, setOriginalAspectRatio] = useState(1);
  
  const RATIOS: { [key: string]: { label: string; value: number | null } } = {
    'free': { label: 'Tự do', value: null },
    'original': { label: 'Gốc', value: originalAspectRatio },
    '1:1': { label: '1:1', value: 1 },
    '9:16': { label: '9:16', value: 9 / 16 },
    '16:9': { label: '16:9', value: 16 / 9 },
  };

  const setupFrame = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;
    const image = imageRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    const imgAspectRatio = image.naturalWidth / image.naturalHeight;
    setOriginalAspectRatio(imgAspectRatio);

    let displayWidth = image.naturalWidth;
    let displayHeight = image.naturalHeight;

    const padding = 20;
    if (displayWidth > containerRect.width - padding) {
      displayWidth = containerRect.width - padding;
      displayHeight = displayWidth / imgAspectRatio;
    }
    if (displayHeight > containerRect.height - padding) {
      displayHeight = containerRect.height - padding;
      displayWidth = displayHeight * imgAspectRatio;
    }

    const top = (containerRect.height - displayHeight) / 2;
    const left = (containerRect.width - displayWidth) / 2;

    const initialFrameState = { width: displayWidth, height: displayHeight, top, left };
    setFrame(initialFrameState);
    setImagePosition(initialFrameState);
    setImageDisplaySize({ width: displayWidth, height: displayHeight });
    setSelectedRatio('free'); // Reset ratio on new image/resize
  }, []);

  useEffect(() => {
    const image = imageRef.current;
    if (image) {
      const handleLoad = () => setupFrame();
      image.addEventListener('load', handleLoad);
      if (image.complete) setupFrame();
      window.addEventListener('resize', setupFrame);
      return () => {
        image.removeEventListener('load', handleLoad);
        window.removeEventListener('resize', setupFrame);
      }
    }
  }, [imageSrc, setupFrame]);
  
  useEffect(() => {
    if (frame.width > 0 && imagePosition.width > 0) {
      onFrameChange({ ...frame, imagePosition, imageDisplaySize });
    } else {
      onFrameChange(null);
    }
  }, [frame, imagePosition, imageDisplaySize, onFrameChange]);

  useEffect(() => {
    if (selectedRatio === 'free' || !imagePosition.width) return;
    const ratioDef = RATIOS[selectedRatio];
    const ratioValue = selectedRatio === 'original' ? originalAspectRatio : ratioDef?.value;
    if (!ratioValue) return;

    let newWidth = imagePosition.width;
    let newHeight = imagePosition.height;

    if (newWidth / newHeight > ratioValue) { // Image is wider than the target aspect ratio
        newHeight = newWidth / ratioValue;
    } else { // Image is taller or has the same aspect ratio
        newWidth = newHeight * ratioValue;
    }

    const newTop = imagePosition.top + (imagePosition.height - newHeight) / 2;
    const newLeft = imagePosition.left + (imagePosition.width - newWidth) / 2;

    setFrame({ width: newWidth, height: newHeight, top: newTop, left: newLeft });
  }, [selectedRatio, imagePosition, originalAspectRatio]);

  const handleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setActiveHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialFrame(frame);
  };
  
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    setActiveHandle('');
    setInitialFrame(null);
  }, []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !initialFrame) return;
    e.preventDefault();

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    let { width, height, top, left } = initialFrame;
    const MIN_SIZE = 50;
    
    if (activeHandle.includes('right')) width = initialFrame.width + dx;
    else if (activeHandle.includes('left')) {
      width = initialFrame.width - dx;
      left = initialFrame.left + dx;
    }

    if (activeHandle.includes('bottom')) height = initialFrame.height + dy;
    else if (activeHandle.includes('top')) {
      height = initialFrame.height - dy;
      top = initialFrame.top + dy;
    }
    
    const ratioDef = RATIOS[selectedRatio];
    const ratioValue = selectedRatio === 'original' ? originalAspectRatio : ratioDef?.value;

    if (ratioValue && activeHandle.includes('-')) {
        const isCorner = !activeHandle.includes('center');
        const isHorizontal = activeHandle.includes('left') || activeHandle.includes('right');

        if (isCorner || isHorizontal) { // Prioritize width change
            const newHeight = width / ratioValue;
            if (activeHandle.includes('top')) {
                top = initialFrame.top + (initialFrame.height - newHeight);
            }
            height = newHeight;
        } else { // Vertical resize
            const newWidth = height * ratioValue;
            if (activeHandle.includes('left')) {
                left = initialFrame.left + (initialFrame.width - newWidth);
            }
            width = newWidth;
        }
    }

    if (width < MIN_SIZE) {
        width = MIN_SIZE;
        if (activeHandle.includes('left')) left = initialFrame.left + initialFrame.width - MIN_SIZE;
    }
    if (height < MIN_SIZE) {
        height = MIN_SIZE;
        if (activeHandle.includes('top')) top = initialFrame.top + initialFrame.height - MIN_SIZE;
    }

    // Constrain frame to always contain the original image
    if (left > imagePosition.left) { left = imagePosition.left; }
    if (top > imagePosition.top) { top = imagePosition.top; }
    if ((left + width) < (imagePosition.left + imagePosition.width)) {
      width = (imagePosition.left + imagePosition.width) - left;
    }
    if ((top + height) < (imagePosition.top + imagePosition.height)) {
      height = (imagePosition.top + imagePosition.height) - top;
    }

    setFrame({ width, height, top, left });
  }, [isResizing, dragStart, initialFrame, activeHandle, selectedRatio, originalAspectRatio, imagePosition, RATIOS]);
  
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className="space-y-4">
      <div className="flex justify-center flex-wrap gap-2">
        {Object.entries(RATIOS).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setSelectedRatio(key)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedRatio === key
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div 
        ref={containerRef}
        className="w-full h-96 bg-slate-900/50 rounded-lg relative overflow-hidden select-none border-2 border-dashed border-slate-700 flex items-center justify-center p-2"
      >
          <img ref={imageRef} src={imageSrc} className="block opacity-50 pointer-events-none" style={{...imageDisplaySize}} alt="Original to expand" />
          
          <div
            className="absolute border-2 border-purple-400 box-border"
            style={{
              width: `${frame.width}px`,
              height: `${frame.height}px`,
              top: `${frame.top}px`,
              left: `${frame.left}px`,
            }}
          >
            <img src={imageSrc} className="w-full h-full object-cover pointer-events-none" style={{
                position: 'absolute',
                width: `${imageDisplaySize.width}px`,
                height: `${imageDisplaySize.height}px`,
                top: `${imagePosition.top - frame.top}px`,
                left: `${imagePosition.left - frame.left}px`
            }} alt=""/>
            
            {handles.map(handle => (
              <div
                key={handle}
                onMouseDown={(e) => handleMouseDown(e, handle)}
                className="absolute w-4 h-4 bg-white rounded-full border-2 border-purple-500 -m-2 z-10"
                style={{
                  top: handle.includes('top') ? '0%' : handle.includes('bottom') ? '100%' : '50%',
                  left: handle.includes('left') ? '0%' : handle.includes('right') ? '100%' : '50%',
                  transform: 'translate(-50%, -50%)',
                  cursor: getCursorForHandle(handle),
                }}
                aria-label={`Resize ${handle}`}
              />
            ))}
          </div>
      </div>
    </div>
  );
};

export default ExpansionEditor;
