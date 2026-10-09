import React, { useRef, useState } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Trash2,
  X,
  Palette,
  Check,
  User,
  Sparkles
} from 'lucide-react';
import AvatarDisplay from './AvatarDisplay';

export const COLOR_OPTIONS = [
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Crimson', hex: '#EF4444' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Lime', hex: '#84CC16' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Orange', hex: '#F97316' }
];

export const processAvatarImage = (file) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image'));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 128;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Center-crop to square
        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;

        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export default function AvatarPickerModal({
  isOpen,
  onClose,
  playerName,
  playerColor,
  playerAvatar,
  onUpdateColor,
  onUpdateAvatar
}) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setErrorMessage('');
      const compressedDataUrl = await processAvatarImage(file);
      onUpdateAvatar(compressedDataUrl);
    } catch (err) {
      console.error('Avatar processing error:', err);
      setErrorMessage('Could not load photo. Please choose another image.');
    } finally {
      setIsProcessing(false);
      // Reset input so re-selecting the same photo works
      e.target.value = '';
    }
  };

  const handleRemovePhoto = () => {
    const defaultInitial = (playerName || 'O').trim().charAt(0).toUpperCase();
    onUpdateAvatar(defaultInitial);
  };

  const isCustomPhoto =
    typeof playerAvatar === 'string' &&
    (playerAvatar.startsWith('data:image/') ||
      playerAvatar.startsWith('http://') ||
      playerAvatar.startsWith('https://') ||
      playerAvatar.startsWith('blob:'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Operative Photo & Marker</h3>
              <p className="text-xs text-slate-400">Your live tactical map avatar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 touch-scroll overflow-y-auto overscroll-contain flex flex-col gap-5">
          {/* Live Preview Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="relative mb-2">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center p-1 shadow-xl transition-all"
                style={{
                  boxShadow: `0 0 20px -2px ${playerColor}60`,
                  border: `3px solid ${playerColor}`
                }}
              >
                <AvatarDisplay
                  avatar={playerAvatar}
                  name={playerName}
                  color={playerColor}
                  size="xl"
                  ring={false}
                  className="w-full h-full"
                />
              </div>

              {/* Pulsing beacon indicator */}
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-950 flex items-center justify-center shadow"
                style={{ backgroundColor: playerColor }}
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              </div>
            </div>

            <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-1">
              <span>{playerName || 'Operative'}</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Live Radar & Teammate Display
            </div>

            {isProcessing && (
              <div className="mt-2 text-xs font-mono text-cyan-400 animate-pulse">
                Optimizing photo for tactical network...
              </div>
            )}
            {errorMessage && (
              <div className="mt-2 text-xs text-rose-400 font-medium">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Action Buttons for Camera & Gallery */}
          <div className="flex flex-col gap-2">
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="user"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              type="file"
              ref={galleryInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Take Photo Button */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>TAKE PHOTO NOW (CAMERA)</span>
            </button>

            {/* Camera Roll / Gallery Button */}
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              <span>CHOOSE FROM CAMERA ROLL</span>
            </button>

            {/* Remove / Reset to Initial Button */}
            {isCustomPhoto && (
              <button
                onClick={handleRemovePhoto}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Custom Photo</span>
              </button>
            )}
          </div>

          {/* Signature Neon Color Selector */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono font-bold uppercase text-slate-400">
              <span className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                <span>Signature Marker Color</span>
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2.5 pt-1">
              {COLOR_OPTIONS.map((col) => (
                <button
                  key={col.hex}
                  onClick={() => onUpdateColor(col.hex)}
                  style={{ backgroundColor: col.hex }}
                  className={`h-9 rounded-xl flex items-center justify-center transition active:scale-90 ${
                    playerColor === col.hex
                      ? 'ring-2 ring-white scale-105 shadow-lg'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  title={col.name}
                >
                  {playerColor === col.hex && (
                    <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition active:scale-95 cursor-pointer"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}
