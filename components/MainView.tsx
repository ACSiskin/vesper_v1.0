"use client";

import { useState } from 'react';
import { TargetProfile } from '@/types';
import { WelcomeScreen } from './profile-view/WelcomeScreen';
import { TargetHeader } from './profile-view/TargetHeader';
import { IntelPanel } from './profile-view/tabs/IntelPanel';
import { PostsPanel } from './profile-view/tabs/PostsPanel';
import { MediaPanel } from './profile-view/tabs/MediaPanel';
import { RawPanel } from './profile-view/tabs/RawPanel';
import { HistoryPanel } from './profile-view/tabs/HistoryPanel';
import { IdentityPanel } from './profile-view/tabs/IdentityPanel';
import { SocialMap3D } from './profile-view/tabs/SocialMap3D';
import { Brain, History, LayoutGrid, Image as ImageIcon, Database, FileJson, ShieldAlert, Globe, Map as MapIcon } from 'lucide-react';

interface MainViewProps {
  target: TargetProfile | null;
  onOpenMedia: (url: string) => void;
  onSaveMedia: (url: string) => void;
  onRefreshData: () => void; 
}

// 'geo_intel' do typu zakładek
type TabType = 'intel' | 'identity' | 'geo_intel' | 'posts' | 'media' | 'history' | 'raw';

export const MainView: React.FC<MainViewProps> = ({ target, onOpenMedia, onSaveMedia, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState<TabType>('intel');

  if (!target) {
    return <WelcomeScreen />;
  }

  // Bezpieczny dostęp do geoEvents (rzutowanie as any zapobiega błędom TS, jeśli types.ts nie jest zaktualizowany)
  const geoEvents = (target as any).geoEvents || [];

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
      
      {/* ================= HEADER SECTION ================= */}
      <TargetHeader target={target} />

      {/* ================= TABS NAVIGATION & CONTENT ================= */}
      <div className="flex-1 flex flex-col bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        
        {/* Navigation Bar */}
        <div className="flex border-b border-gray-800 bg-black/20 font-mono overflow-x-auto scrollbar-hide">
            {[
                { id: 'intel', label: 'PSYCH_PROFILE', icon: <Brain size={12}/> },
                { id: 'identity', label: 'IDENTITY_VAULT', icon: <ShieldAlert size={12} className={target.breaches && target.breaches.length > 0 ? "text-red-500 animate-pulse" : ""}/> },
                // GEO_INTEL - zakladka
                { 
                    id: 'geo_intel', 
                    label: 'GEO_INTEL', 
                    icon: <Globe size={12} className={geoEvents.length > 0 ? "text-green-400" : ""} /> 
                },
                { id: 'history', label: 'TIMELINE', icon: <History size={12}/> },
                { id: 'posts', label: 'POST_ANALYSIS', icon: <LayoutGrid size={12}/> },
                { id: 'media', label: 'COMM_VAULT', icon: <ImageIcon size={12}/> },
                { id: 'raw', label: 'RAW_DATA', icon: <FileJson size={12}/> },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`px-4 py-3 text-[10px] font-bold tracking-widest transition-all border-r border-gray-800 flex items-center gap-2 whitespace-nowrap
                        ${activeTab === tab.id 
                            ? 'bg-green-900/20 text-green-400 border-b-2 border-b-green-500' 
                            : 'text-gray-500 hover:bg-gray-800'
                        }
                    `}
                >
                    <span>{tab.icon}</span> {tab.label}
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto font-mono scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
            {activeTab === 'intel' && <IntelPanel target={target} />}
            
            {activeTab === 'identity' && (
                <IdentityPanel 
                    targetId={target.id} 
                    breaches={target.breaches || []} 
                    onPromote={onRefreshData} 
                />
            )}

            {/* Renderowanie Mapy 3D (GEO_INTEL) */}
            {activeTab === 'geo_intel' && (
                <div className="h-full flex flex-col gap-4 animate-in fade-in duration-500">
                    <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xs font-mono text-gray-400 flex items-center gap-2">
                                <MapIcon size={14} /> GEOSPATIAL INTELLIGENCE GRID
                            </h3>
                            {geoEvents.length > 0 && (
                                <span className="text-[10px] font-mono text-green-400 bg-green-900/20 px-2 py-1 rounded border border-green-900/50">
                                    {geoEvents.length} DETECTED LOCATIONS
                                </span>
                            )}
                    </div>
                    {/* Komponent Mapy - wysokość dostosowana */}
                    <div className="min-h-[500px] flex-1 relative rounded-lg overflow-hidden border border-gray-700">
                        <SocialMap3D 
                            events={geoEvents} 
                            onEventClick={onOpenMedia}
                            theme="dark" 
                        />
                    </div>
                </div>
            )}
            
            {activeTab === 'history' && <HistoryPanel snapshots={target.snapshots} />}
            {activeTab === 'posts' && <PostsPanel posts={target.postsAnalysis} />}
            {activeTab === 'media' && <MediaPanel media={target.recentMedia} onOpenMedia={onOpenMedia} onSaveMedia={onSaveMedia} />}
            {activeTab === 'raw' && <RawPanel target={target} />}
        </div>
      </div>
    </div>
  );
};
