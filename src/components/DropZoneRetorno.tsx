import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';

interface DropZoneRetornoProps {
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}

export const DropZoneRetorno: React.FC<DropZoneRetornoProps> = ({ onDrop, onDragOver }) => {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      onDrop={(e) => {
        setIsOver(false);
        onDrop(e);
      }}
      onDragOver={(e) => {
        setIsOver(true);
        onDragOver(e);
      }}
      onDragLeave={() => setIsOver(false)}
      className={`fixed bottom-24 left-6 z-30 flex flex-col items-center justify-center w-20 h-20 rounded-full shadow-xl border-4 transition-all ${
        isOver 
          ? 'bg-red-600 border-red-200 scale-110' 
          : 'bg-red-500 border-white dark:border-gray-900 hover:scale-105 active:scale-95'
      } text-white`}
    >
      <Trash2 size={28} className={isOver ? 'animate-bounce' : ''} />
      <span className="text-[9px] font-black uppercase mt-1">Devolver</span>
    </div>
  );
};
