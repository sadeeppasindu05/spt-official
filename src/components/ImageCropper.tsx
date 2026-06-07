import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check } from 'lucide-react';

export const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<string> => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (error) => reject(error));
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // set canvas size to match the bounding box
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((file) => {
      if (file) {
        resolve(URL.createObjectURL(file));
      }
    }, 'image/jpeg');
  });
};

interface ImageCropperProps {
  imageSrc: string;
  onCropSave: (croppedImageUrl: string) => void;
  onCropCancel: () => void;
  aspectRatio?: number;
}

export function ImageCropperModal({ imageSrc, onCropSave, onCropCancel, aspectRatio = 16 / 9 }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      if (croppedAreaPixels) {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
        onCropSave(croppedImage);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden w-full max-w-2xl flex flex-col h-[500px]">
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-slate-800/50">
          <h3 className="font-mono text-sm tracking-widest uppercase text-cyan-400 font-bold">Crop Image</h3>
          <button onClick={onCropCancel} className="text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="relative flex-1 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="p-4 bg-slate-800/50 border-t border-white/10 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="flex-1 w-full max-w-xs flex items-center gap-3">
             <span className="text-xs font-mono text-slate-400">Zoom</span>
             <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
             />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onCropCancel}
              className="px-4 py-2 flex-1 sm:flex-none border border-white/10 text-white rounded font-mono text-xs uppercase tracking-wider hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 flex-1 sm:flex-none bg-cyan-500 hover:bg-cyan-600 text-black font-bold rounded font-mono text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
