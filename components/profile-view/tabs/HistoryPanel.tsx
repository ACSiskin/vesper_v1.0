import React from 'react';
import { TargetProfile } from '@/types';
import { Clock, GitCommit, ArrowUpRight, ArrowDownRight, Hash } from 'lucide-react';

interface HistoryPanelProps {
  snapshots: TargetProfile['snapshots']; // Zakładamy, że API zwraca tablicę snapshotów
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ snapshots }) => {
  // Sortujemy od najnowszego, żeby mieć historię "w dół"
  // Zakładamy, że backend zwraca dane, ale dla pewności sortujemy tutaj
  const sortedSnapshots = [...(snapshots || [])].sort((a, b) => 
    new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime()
  );

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
        
        <h3 className="text-green-500 font-bold mb-4 flex items-center gap-2 border-b border-gray-800 pb-2">
            <Clock size={16} /> CHRONOLOGICAL_EVENT_LOG
        </h3>

        <div className="relative border-l border-gray-800 ml-4 space-y-8">
            {sortedSnapshots.map((snap, idx) => {
                // Obliczamy różnicę followerów względem poprzedniego (starszego) snapshota
                const prevSnap = sortedSnapshots[idx + 1];
                const followersDiff = prevSnap && snap.followerCount 
                    ? snap.followerCount - (prevSnap.followerCount || 0) 
                    : 0;

                return (
                    <div key={idx} className="relative pl-6">
                        {/* Kropka na osi czasu */}
                        <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-gray-700 border border-gray-900 group-hover:bg-green-500 transition-colors" />

                        {/* Nagłówek Zdarzenia */}
                        <div className="flex items-center gap-3 text-xs text-gray-500 font-mono mb-2">
                            <span className="text-green-500/80 bg-green-950/20 px-1 rounded">
                                {new Date(snap.scrapedAt).toLocaleDateString()} 
                                <span className="opacity-50 mx-1">|</span> 
                                {new Date(snap.scrapedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] opacity-70">
                                <GitCommit size={10} /> SNAPSHOT_{snap.id.slice(-4).toUpperCase()}
                            </span>
                        </div>

                        {/* Karta Zmian */}
                        <div className="bg-gray-900/40 border border-gray-800 p-3 rounded hover:border-gray-600 transition-colors">
                            
                            {/* Sekcja BIO - Wyświetlamy tylko jeśli jest */}
                            {snap.bio && (
                                <div className="mb-3">
                                    <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Bio Content:</div>
                                    <div className="text-sm text-gray-300 italic font-serif bg-black/20 p-2 rounded border-l-2 border-gray-700">
                                        "{snap.bio}"
                                    </div>
                                </div>
                            )}

                            {/* Statystyki w momencie skanu */}
                            <div className="flex gap-4 text-[10px] font-mono pt-2 border-t border-gray-800/50">
                                <div className="flex items-center gap-1 text-gray-400">
                                    <Hash size={10} /> 
                                    FOLLOWERS: <span className="text-gray-200">{snap.followerCount?.toLocaleString()}</span>
                                    
                                    {/* Diff Indicator (Wzrost/Spadek) */}
                                    {followersDiff !== 0 && (
                                        <span className={`ml-1 flex items-center ${followersDiff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {followersDiff > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                            {Math.abs(followersDiff)}
                                        </span>
                                    )}
                                </div>
                                <div className="text-gray-500">
                                    FOLLOWING: {snap.followingCount?.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {sortedSnapshots.length === 0 && (
                <div className="pl-6 text-gray-600 text-xs italic">
                    NO HISTORICAL DATA POINTS AVAILABLE.
                </div>
            )}
        </div>
    </div>
  );
};
