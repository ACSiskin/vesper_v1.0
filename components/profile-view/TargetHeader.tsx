"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { TargetProfile } from '@/types';
import { Fingerprint, Mail, Smartphone, Briefcase, Link as LinkIcon, MapPin, Navigation, Users, Activity, Ghost, SearchX, AlertTriangle, Lock, Globe, Calendar, Home, X } from 'lucide-react';
import { ReportDocument } from '../ReportPDF'; 

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <span className="text-xs text-gray-500">Loading module...</span> }
);

interface TargetHeaderProps {
  target: TargetProfile;
}

export const TargetHeader: React.FC<TargetHeaderProps> = ({ target }) => {
  const riskLevel = target.risk || 'unknown';
  const riskColor = riskLevel === 'high' || riskLevel === 'critical' ? 'text-red-500' : 'text-green-400';
  const [isDeleting, setIsDeleting] = useState(false);

  // === 1. DANE Z PRISMA & SNAPSHOTS ===
  const latestSnapshot = target.snapshots && target.snapshots.length > 0 
    ? [...target.snapshots].sort((a, b) => new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime())[0]
    : null;

  const displayBio = target.bio || latestSnapshot?.bio || "NO_BIO_DATA_AVAILABLE";
  
  const followersCount = target.stats?.followers ?? latestSnapshot?.followerCount ?? 0;
  const followingCount = target.stats?.following ?? latestSnapshot?.followingCount ?? 0;
  const postsCount = target.stats?.posts ?? 0;

  const latestLocation = target.locations && target.locations.length > 0 ? target.locations[0] : null;

  // === 2. DATA CHECK ===
  const hasGhostData = target.publicEmail || target.publicPhone || target.externalUrl || latestLocation;
  
  // Sprawdzamy czy są jakiekolwiek zweryfikowane dane (tablice lub pola)
  const hasLeakData = (target.leakVerifiedEmails?.length || 0) > 0 || 
                      (target.leakVerifiedPhones?.length || 0) > 0 ||
                      (target.leakVerifiedIps?.length || 0) > 0 ||
                      target.leakVerifiedDob || 
                      target.leakVerifiedAddress;

  // === 3. LOGIKA USUWANIA ===
  const removeData = async (type: string, value: string | null) => {
      if(!confirm("Usunąć tę informację z nagłówka?")) return;
      setIsDeleting(true);
      try {
          await fetch('/api/manage-verified', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ targetId: target.id, type, value })
          });
          // Odświeżenie strony po usunięciu
          window.location.reload(); 
      } catch(e) { console.error(e); }
      setIsDeleting(false);
  };

  // Helper do renderowania listy elementów z przyciskiem usuwania
  const RenderVerifiedList = ({ items, icon: Icon, colorClass, type }: any) => (
      <>
        {items && items.map((item: string, idx: number) => (
            <div key={idx} className={`flex items-center gap-2 ${colorClass} truncate font-bold group/item relative pr-6`} title={`Verified ${type}`}>
                <Icon size={12} className="shrink-0" /> 
                <span className="truncate">{item}</span>
                <button 
                    onClick={() => removeData(type, item)}
                    className="absolute right-0 opacity-0 group-hover/item:opacity-100 text-red-500 hover:text-red-400 p-0.5 transition-opacity cursor-pointer"
                    title="Remove"
                    disabled={isDeleting}
                >
                    <X size={10} />
                </button>
            </div>
        ))}
      </>
  );

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg shadow-2xl relative overflow-hidden group font-mono flex flex-col min-h-[300px]">
        
      {/* Pasek Ryzyka */}
      <div className={`absolute top-0 left-0 w-1 h-full shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-colors duration-500
          ${riskLevel === 'high' || riskLevel === 'critical' ? 'bg-red-600 shadow-red-900/50' : 'bg-green-600 shadow-green-900/50'}`} 
      />
      
      <div className="flex gap-6 items-start relative z-10 flex-1">
        
        {/* === AVATAR === */}
        <div className="relative flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={target.avatarUrl || 'https://via.placeholder.com/150'} 
            alt="Target Avatar" 
            className="w-28 h-28 rounded-md border-2 border-gray-800 grayscale group-hover:grayscale-0 transition-all duration-500 object-cover shadow-lg bg-black"
          />
          <div className="absolute -bottom-3 -right-2 bg-green-600 text-[9px] px-1.5 py-0.5 font-bold text-black border border-black animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]">
              LIVE_FEED
          </div>
        </div>

        {/* === MAIN COLUMN === */}
        <div className="flex-1 min-w-0 flex flex-col h-full">
          
          {/* --- TOP: HEADER INFO --- */}
          <div className="flex justify-between items-start mb-4">
              <div>
                  <h1 className="text-2xl font-bold text-white tracking-wider truncate uppercase">
                      {target.fullName || 'UNKNOWN_TARGET'}
                  </h1>
                  <div className="flex items-center gap-3 text-xs mt-1">
                      <span className="text-green-500 font-bold">@{target.username}</span> 
                      <span className="text-gray-700">|</span>
                      <span className="text-amber-600 flex items-center gap-1 tracking-tighter" title="Instagram PK ID">
                          <Fingerprint size={12} /> ID: {target.instagramPk || 'ACQUIRING...'}
                      </span>
                  </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                  <div className="border border-gray-700 px-2 py-0.5 text-[10px] text-gray-400 bg-black/40 backdrop-blur-sm">
                      THREAT_LEVEL: <span className={`${riskColor} font-bold`}>{riskLevel.toUpperCase()}</span>
                  </div>
                  <div className="flex gap-1.5">
                      {target.isBusiness && (
                          <div className="flex items-center gap-1 text-[9px] bg-amber-950/40 text-amber-500 border border-amber-900/50 px-1.5 py-0.5 rounded">
                              <Briefcase size={9} /> {target.businessCategory ? target.businessCategory.toUpperCase() : 'BUSINESS'}
                          </div>
                      )}
                      {(hasLeakData) && (
                          <div className="flex items-center gap-1 text-[9px] bg-red-950/40 text-red-500 border border-red-900/50 px-1.5 py-0.5 rounded animate-pulse">
                              <AlertTriangle size={9} /> IDENTITY_COMPROMISED
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* --- MIDDLE: BIO STREAM --- */}
          <div className="relative group/bio mb-auto">
            <div className={`text-gray-400 text-xs italic line-clamp-3 leading-relaxed border-l-2 border-gray-700 pl-3 py-1 group-hover/bio:border-green-500 group-hover/bio:text-gray-300 transition-colors bg-gray-900/30
                ${!displayBio || displayBio === "NO_BIO_DATA_AVAILABLE" ? 'opacity-40' : ''}`}>
                "{displayBio}"
            </div>
            {latestSnapshot?.bio && !target.bio && (
                 <span className="absolute top-0 right-0 text-[8px] text-gray-600 px-1 bg-black/50 rounded">HISTORICAL_RECORD</span>
            )}
          </div>

          {/* --- BOTTOM: DOUBLE SLOT PANEL --- */}
          <div className="mt-4 mb-4">
              {(hasGhostData || hasLeakData) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* SLOT 1: OFICJALNE DANE */}
                      {hasGhostData && (
                          <div className="bg-gray-950/80 border border-green-900/30 p-3 rounded text-[11px] shadow-inner relative overflow-hidden h-full">
                              <div className="absolute top-0 right-0 bg-green-900/20 px-1.5 py-0.5 text-[8px] text-green-500 font-bold rounded-bl border-b border-l border-green-900/30">OFFICIAL / BIO</div>
                              <div className="relative z-10 flex flex-col gap-1.5 mt-2">
                                  {target.publicEmail && (
                                      <div className="flex items-center gap-2 text-blue-300 truncate font-bold" title="Official Email">
                                          <Mail size={12} className="text-blue-500" /> {target.publicEmail}
                                      </div>
                                  )}
                                  {target.publicPhone && (
                                      <div className="flex items-center gap-2 text-green-300 truncate font-bold" title="Official Phone">
                                          <Smartphone size={12} className="text-green-500" /> {target.publicPhone}
                                      </div>
                                  )}
                                  {target.externalUrl && (
                                      <div className="flex items-center gap-2 text-purple-300 truncate">
                                          <LinkIcon size={12} className="text-purple-500" /> 
                                          <a href={target.externalUrl} target="_blank" rel="noopener noreferrer" className="hover:underline opacity-90">{target.externalUrl}</a>
                                      </div>
                                  )}
                                  {latestLocation && (
                                      <div className="flex items-center gap-2 text-rose-400 truncate mt-auto pt-1">
                                          <MapPin size={12} className="text-rose-600" /> 
                                          {latestLocation.city ? latestLocation.city.toUpperCase() : 'UNKNOWN'} 
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}

                      {/* SLOT 2: ZWERYFIKOWANE WYCIEKI */}
                      {hasLeakData && (
                          <div className="bg-red-950/20 border border-red-900/40 p-3 rounded text-[11px] shadow-[0_0_15px_rgba(220,38,38,0.05)] relative overflow-hidden h-full flex flex-col justify-center">
                              <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />
                              <div className="absolute top-0 right-0 bg-red-950/80 px-1.5 py-0.5 text-[8px] text-red-500 font-bold rounded-bl flex items-center gap-1 border-b border-l border-red-900/50">
                                  <AlertTriangle size={8} /> CONFIRMED LEAK
                              </div>
                              
                              <div className="relative z-10 flex flex-col gap-1.5 mt-2 overflow-y-auto max-h-[120px] pr-1 custom-scrollbar">
                                   
                                   {/* LISTA MAILI */}
                                   <RenderVerifiedList 
                                      items={target.leakVerifiedEmails} 
                                      icon={Mail} 
                                      colorClass="text-red-200/90" 
                                      type="email" 
                                   />

                                   {/* LISTA TELEFONÓW */}
                                   <RenderVerifiedList 
                                      items={target.leakVerifiedPhones} 
                                      icon={Smartphone} 
                                      colorClass="text-green-300" 
                                      type="phone" 
                                   />

                                   {/* DATA URODZENIA (DOB) */}
                                   {target.leakVerifiedDob && (
                                      <div className="flex items-center gap-2 text-amber-300 truncate font-bold group/item relative pr-6">
                                          <Calendar size={12} className="text-amber-500 shrink-0" /> 
                                          D.O.B: {target.leakVerifiedDob}
                                          <button 
                                              onClick={() => removeData('dob', null)} 
                                              className="absolute right-0 opacity-0 group-hover/item:opacity-100 text-red-500 hover:text-red-400 p-0.5 transition-opacity cursor-pointer"
                                              disabled={isDeleting}
                                          >
                                              <X size={10}/>
                                          </button>
                                      </div>
                                   )}

                                   {/* ADRES */}
                                   {target.leakVerifiedAddress && (
                                      <div className="flex items-center gap-2 text-gray-300 truncate font-bold group/item relative pr-6">
                                          <Home size={12} className="text-gray-500 shrink-0" /> 
                                          {target.leakVerifiedAddress}
                                          <button 
                                              onClick={() => removeData('address', null)} 
                                              className="absolute right-0 opacity-0 group-hover/item:opacity-100 text-red-500 hover:text-red-400 p-0.5 transition-opacity cursor-pointer"
                                              disabled={isDeleting}
                                          >
                                              <X size={10}/>
                                          </button>
                                      </div>
                                   )}

                                   {/* LISTA IP */}
                                   <RenderVerifiedList 
                                      items={target.leakVerifiedIps} 
                                      icon={Globe} 
                                      colorClass="text-blue-300" 
                                      type="ip" 
                                   />
                                   
                                   {/* HASŁA (Tylko licznik) */}
                                   {target.leakVerifiedPass && target.leakVerifiedPass.length > 0 && (
                                      <div className="flex items-center gap-2 text-red-400/60 truncate text-[9px] mt-1 border-t border-red-900/30 pt-1">
                                          <Lock size={10} /> 
                                          PWDs: <span className="blur-[2px] hover:blur-0 transition-all cursor-help">{target.leakVerifiedPass.length} HASHES</span>
                                      </div>
                                   )}
                              </div>
                          </div>
                      )}
                  </div>
              ) : (
                  // === EMPTY STATE ===
                  <div className="bg-gray-900/40 border border-gray-800 border-dashed p-3 rounded text-[10px] text-gray-500 font-mono flex items-center justify-center gap-3 select-none opacity-70">
                      <Ghost size={14} className="text-gray-600" />
                      <span className="tracking-widest font-bold">NO GHOST/LEAK DATA DETECTED</span>
                      <SearchX size={14} className="text-gray-600" />
                  </div>
              )}
          </div>

          {/* --- FOOTER: STATS --- */}
          <div className="flex items-center justify-between border-t border-gray-800 pt-3">
             <div className="flex gap-6 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                <div className="flex flex-col">
                    <span className="text-gray-600 text-[9px] flex items-center gap-1"><Activity size={8}/> POSTS</span>
                    <span className="text-gray-200 text-sm">{postsCount}</span>
                </div>
                <div className="flex flex-col border-l border-gray-800 pl-4">
                    <span className="text-gray-600 text-[9px] flex items-center gap-1"><Users size={8}/> FOLLOWERS</span>
                    <span className="text-gray-200 text-sm">{followersCount.toLocaleString()}</span>
                </div>
                <div className="flex flex-col border-l border-gray-800 pl-4">
                    <span className="text-gray-600 text-[9px]">FOLLOWING</span>
                    <span className="text-gray-200 text-sm">{followingCount.toLocaleString()}</span>
                </div>
                
                {target.locations && target.locations.length > 0 && (
                    <div className="flex flex-col border-l border-gray-800 pl-4 text-rose-500/80">
                        <span className="text-rose-700/80 text-[9px] flex items-center gap-1"><Navigation size={8}/> GEO_HITS</span>
                        <span className="text-rose-500 text-sm">{target.locations.length}</span>
                    </div>
                )}
             </div>

             <PDFDownloadLink
                document={<ReportDocument target={target} />}
                fileName={`VESPER_${target.username.toUpperCase()}.pdf`}
                className="bg-green-800/10 hover:bg-green-700 hover:text-white text-green-500 border border-green-800/40 text-[9px] px-3 py-1.5 font-bold rounded flex items-center gap-2 transition-all uppercase tracking-wider"
            >
                {/* @ts-ignore */}
                {({ loading }) => (
                    <>
                        <span>{loading ? 'GENERATING...' : 'EXPORT_DOSSIER'}</span>
                        {!loading && <span className="text-lg leading-none">⤓</span>}
                    </>
                )}
            </PDFDownloadLink>
          </div>
        </div>
      </div>
    </div>
  );
};
