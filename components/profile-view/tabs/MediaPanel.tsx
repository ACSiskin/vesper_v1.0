import React from 'react';
import { TargetProfile } from '@/types';

interface MediaPanelProps {
  media: TargetProfile['recentMedia'];
  onOpenMedia: (url: string) => void;
  onSaveMedia: (url: string) => void;
}

export const MediaPanel: React.FC<MediaPanelProps> = ({ media, onOpenMedia, onSaveMedia }) => {
  return (
    <div className="animate-in fade-in duration-300">
        <div className="grid grid-cols-4 gap-4">
            {media?.map((item, idx) => (
                <div 
                    key={idx} 
                    className="group relative aspect-square border border-gray-800 overflow-hidden bg-black rounded"
                >
                    {/* Media Actions Overlay (Hover) */}
                    <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => onOpenMedia(item.fullUrl)} 
                            className="bg-black/80 p-1 rounded hover:text-green-500"
                            title="Powiększ"
                        >
                            🔍
                        </button>
                        <button 
                            onClick={() => onSaveMedia(item.fullUrl)} 
                            className="bg-black/80 p-1 rounded hover:text-green-500"
                            title="Zapisz"
                        >
                            💾
                        </button>
                    </div>

                    {/* Hover Darkening Effect */}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors pointer-events-none" />

                    {/* Image or Video Display */}
                    {item.fullUrl.includes('.mp4') ? (
                        <video 
                            src={item.thumbnail} 
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100" 
                        />
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                            src={item.thumbnail} 
                            alt={`media-${idx}`} 
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100" 
                            loading="lazy" 
                        />
                    )}
                </div>
            ))}
        </div>
        {(!media || media.length === 0) && (
            <div className="text-center py-10 text-gray-600 italic">NO MEDIA CAPTURED</div>
        )}
    </div>
  );
};
