import React from 'react';
import { TargetProfile } from '@/types';
import { Brain, Terminal, ShieldAlert } from 'lucide-react';

interface IntelPanelProps {
  target: TargetProfile;
}

export const IntelPanel: React.FC<IntelPanelProps> = ({ target }) => {
  
  // === AGRESYWNE SZUKANIE DANYCH (Logika Fallback) ===
  const analysisContent = 
    target.aiAnalysis ||                        
    target.notes ||                             
    (target as any).ai_analysis ||              
    (target as any).summary ||                  
    (target as any).description ||              
    (target as any).deep_analysis;              

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-full flex flex-col">
        
        {/* Header Sekcji */}
        <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
            <Brain className="text-green-500" size={18} />
            <h3 className="text-green-500 font-bold text-sm tracking-[0.2em]">
                AI_PSYCHOMETRIC_EVALUATION
            </h3>
            <div className="flex-1" />
            <span className="text-[10px] text-gray-600 font-mono bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">
                MODE: NARRATIVE_REPORT
            </span>
        </div>

        {/* Główny kontener tekstu */}
        <div className="flex-1 bg-gray-900/30 border border-gray-800 rounded-lg p-6 relative overflow-hidden shadow-inner">
            
            {/* Ozdobne tło (delikatne) */}
            <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
                <ShieldAlert size={300} />
            </div>

            <div className="relative z-10 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 pr-2">
                {analysisContent ? (
                    <div className="font-mono text-sm leading-7 text-gray-300 whitespace-pre-wrap">
                        <span className="text-green-800/60 select-none block mb-6 text-[10px] font-bold">
                            {'//'} BEGIN_ENCRYPTED_STREAM :: TARGET_ID_{target.instagramPk || 'UNKNOWN'}
                        </span>
                        
                        {/* Treść raportu */}
                        {analysisContent}

                        <span className="text-green-800/60 select-none block mt-8 text-[10px] font-bold">
                            {'//'} END_OF_FILE :: SIGNAL_LOST
                        </span>
                    </div>
                ) : (
                    // Stan oczekiwania
                    <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4 text-gray-500">
                        <Terminal size={48} />
                        <div className="text-center font-mono">
                            <p className="font-bold tracking-widest text-xs mb-2">AWAITING_ANALYSIS</p>
                            <p className="text-[10px]">AI Agent is currently processing behavioral patterns...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
