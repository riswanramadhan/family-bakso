'use client';

import { useEffect } from 'react';
import { Heart, Sparkles, Star } from 'lucide-react';

interface MotivationalPopupProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

export default function MotivationalPopup({ open, message, onClose }: MotivationalPopupProps) {

  useEffect(() => {
    if (open) {
      // Auto close after 4 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="motivational-popup animate-scaleIn">
        <div className="mb-4 flex justify-center gap-2">
          <Heart className="h-6 w-6 animate-bounce text-white/80" style={{ animationDelay: '0ms' }} />
          <Sparkles className="h-6 w-6 animate-bounce text-white" style={{ animationDelay: '100ms' }} />
          <Star className="h-6 w-6 animate-bounce text-white/80" style={{ animationDelay: '200ms' }} />
        </div>
        <h3>Kerja Bagus!</h3>
        <p>{message}</p>
        <button
          type="button"
          className="mt-4 rounded-full bg-white/20 px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-white/30 active:scale-95"
          onClick={onClose}
        >
          Terima Kasih
        </button>
      </div>
    </>
  );
}
