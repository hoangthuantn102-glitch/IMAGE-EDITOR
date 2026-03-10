
import React, { useRef, useEffect } from 'react';

interface ImageUploaderProps {
  onImageUpload: (base64: any) => void;
  id: string;
  title?: string;
  value: string | string[] | null;
  multiple?: boolean;
  maxFiles?: number;
  className?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, id, title = "Tải ảnh lên", value, multiple = false, maxFiles, className }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      if (multiple) {
        let filesToProcess = Array.from(files);
        if (maxFiles && filesToProcess.length > maxFiles) {
          filesToProcess = filesToProcess.slice(0, maxFiles);
          alert(`Bạn chỉ có thể tải lên tối đa ${maxFiles} ảnh. Chỉ ${maxFiles} ảnh đầu tiên sẽ được xử lý.`);
        }

        const filePromises = filesToProcess.map((file: File) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        });
        Promise.all(filePromises).then(base64Strings => {
          onImageUpload(base64Strings);
        });
      } else {
        const file = files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          onImageUpload(base64String);
        };
        reader.readAsDataURL(file);
      }
    }
  };
  
  const handleAreaClick = () => {
      fileInputRef.current?.click();
  }
  
  useEffect(() => {
    // This allows re-uploading the same file after the value has been cleared.
    if (!value && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [value]);

  const renderPreview = () => {
    if (!value) return (
      <div className="text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p>Nhấp hoặc kéo và thả để tải ảnh lên</p>
        {multiple && <p className="text-xs mt-1">(Tối đa {maxFiles || 'nhiều'} ảnh)</p>}
      </div>
    );

    if (Array.isArray(value)) {
      return (
        <div className={`grid ${value.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2 p-2 w-full h-full overflow-y-auto`}>
          {value.map((img, idx) => (
            <div key={idx} className="relative aspect-square bg-slate-700 rounded-md overflow-hidden border border-slate-600">
              <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
              <div className="absolute top-1 left-1 bg-black/60 text-[10px] px-1.5 py-0.5 rounded text-white">
                #{idx + 1}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return <img src={value} alt="Preview" className="max-h-full max-w-full object-contain rounded-md" />;
  };

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">{title}</label>
      <div 
        onClick={handleAreaClick}
        className={`w-full border-2 border-dashed border-slate-600 rounded-lg flex justify-center items-center text-center cursor-pointer hover:border-purple-400 hover:bg-slate-800/50 transition-colors overflow-hidden ${className || 'h-64'}`}
      >
        <input
          id={id}
          type="file"
          accept="image/*"
          multiple={multiple}
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        {renderPreview()}
      </div>
    </div>
  );
};

export default ImageUploader;