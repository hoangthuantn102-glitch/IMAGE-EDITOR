import React, { useState, useEffect, useRef } from 'react';

interface ImageZoomModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ imageUrl, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // Đặt lại trạng thái khi imageUrl thay đổi hoặc modal đóng
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [imageUrl, onClose]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 0.1;
    const newScale = e.deltaY < 0 ? scale * (1 + zoomFactor) : scale * (1 - zoomFactor);
    const clampedScale = Math.max(0.5, Math.min(newScale, 5));

    if (imageRef.current) {
        const rect = imageRef.current.parentElement!.getBoundingClientRect();
        const mouseRelative = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        
        // Điểm trên ảnh dưới con trỏ, trong hệ tọa độ riêng của ảnh
        const imagePoint = { 
            x: (mouseRelative.x - position.x) / scale, 
            y: (mouseRelative.y - position.y) / scale 
        };

        // Vị trí mới được tính toán để giữ imagePoint dưới con trỏ sau khi thay đổi tỷ lệ
        const newPosition = {
            x: mouseRelative.x - imagePoint.x * clampedScale,
            y: mouseRelative.y - imagePoint.y * clampedScale,
        };

        setScale(clampedScale);

        if (clampedScale > 1) {
            setPosition(newPosition);
        } else {
            // Đặt lại vị trí khi thu nhỏ hoàn toàn
            setPosition({ x: 0, y: 0 });
        }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUpOrLeave = (e: React.MouseEvent) => {
    if (isDragging) {
        e.preventDefault();
        setIsDragging(false);
    }
  };

  if (!imageUrl) {
    return null;
  }

  const cursorStyle = scale > 1 
    ? isDragging ? 'grabbing' : 'grab' 
    : 'default';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex items-center justify-center p-4 transition-opacity duration-300 overflow-hidden"
      onClick={onClose}
      onWheel={handleWheel} // Gắn sự kiện cuộn chuột vào toàn bộ nền modal
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave} // Cũng dừng kéo nếu chuột rời khỏi modal
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative max-w-full max-h-full"
        onClick={e => e.stopPropagation()} // Ngăn việc đóng modal khi nhấp vào vùng chứa ảnh
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Zoomed view"
          className="block max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: cursorStyle,
            touchAction: 'none', // Ngăn các hành động chạm mặc định như cuộn
           }}
          onMouseDown={handleMouseDown}
          // Ngăn hành vi kéo ảnh mặc định của trình duyệt
          onDragStart={(e) => e.preventDefault()}
        />
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 bg-slate-700 hover:bg-slate-600 text-white rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-transform hover:scale-110"
          aria-label="Close zoomed image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ImageZoomModal;
