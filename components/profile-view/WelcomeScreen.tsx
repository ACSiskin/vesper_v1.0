import React from 'react';
// Importujemy plik logo znajdujący się w tym samym katalogu
import vesperLogo from './vesper.png';

export const WelcomeScreen: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center border border-gray-800 rounded-lg bg-gray-900/50">
      <div className="text-center opacity-30">
        
        {/* Kontener na logo - wycentrowany */}
        <div className="flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
                src={vesperLogo.src} 
                alt="V.E.S.P.E.R." 
                className="w-92 h-92 object-contain opacity-80 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]"
            />
        </div>

        <div className="text-xl font-mono tracking-widest text-green-500/80">SYSTEM</div>
        <div className="text-xs tracking-[0.3em] mt-2">WAITING FOR TARGET</div>
      </div>
    </div>
  );
};
