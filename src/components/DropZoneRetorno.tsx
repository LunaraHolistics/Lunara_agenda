import React from 'react';
import { Trash2 } from 'lucide-react';

interface DropZoneRetornoProps {
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}

export const DropZoneRetorno: React.FC<DropZoneRetornoProps> = ({ onDrop, onDragOver }) => {
  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      className="fixed bottom-24 left-6 z-30 flex flex-col items-center justify-center w-20 h-20 bg-red-500 text-white rounded-full shadow-xl border-4 border-white dark:border-gray-900 transition-all hover:scale-105 active:scale-95"
    >
      <Trash2 size={28} />
      <span className="text-[9px] font-black uppercase mt-1">Devolver</span>
    </div>
  );
};
