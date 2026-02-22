import { X, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LightboxProps {
  src: string;
  onClose: () => void;
  onSave: (url: string) => void;
}

export function Lightbox({ src, onClose, onSave }: LightboxProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-sm">
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-full"
      >
        <X className="w-8 h-8" />
      </button>
      
      <div className="relative flex flex-col items-center max-w-7xl w-full">
        <div className="relative border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-black">
             <img 
               src={src} 
               className="max-h-[80vh] w-auto object-contain" 
               alt="Deep Dive Media" 
             />
             <div className="absolute top-0 left-0 bg-green-500 text-black text-[10px] font-bold px-2 py-1 uppercase tracking-widest">
                Source_HD
             </div>
        </div>
        
        <div className="flex gap-4 mt-6">
             <Button 
                variant="outline" 
                className="border-green-500 text-green-500 hover:bg-green-500 hover:text-black rounded-none h-10 px-6 font-mono text-xs tracking-widest uppercase transition-all" 
                onClick={() => onSave(src)}
             >
                <Download className="w-4 h-4 mr-2" /> Save to Vault
             </Button>
             <Button 
                variant="ghost" 
                className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-none h-10 px-6 font-mono text-xs tracking-widest uppercase" 
                onClick={() => window.open(src, '_blank')}
             >
                <ExternalLink className="w-4 h-4 mr-2" /> Open Source
             </Button>
        </div>
      </div>
    </div>
  );
}
