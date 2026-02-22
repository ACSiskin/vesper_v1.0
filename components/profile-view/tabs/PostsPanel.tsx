import React, { useState } from 'react';
import { TargetProfile } from '@/types';
import { MessageSquare, Heart, Calendar, Video, Image as ImageIcon, ExternalLink, AlertCircle } from 'lucide-react';

interface PostsPanelProps {
  posts: TargetProfile['postsAnalysis'];
}

export const PostsPanel: React.FC<PostsPanelProps> = ({ posts }) => {
  
  // Helper do wyciągania źródła mediów
  const getMediaSrc = (post: any) => post.mediaUrl || post.displayUrl || post.imageUrl || post.thumbnailUrl;

  // Funkcja sprawdzająca czy URL jest bezpieczny do wyświetlenia (nie jest blobem z innej sesji)
  const isPlayableUrl = (url: string | undefined) => {
      if (!url) return false;
      return !url.startsWith('blob:'); 
  };

  // Bezpieczne odtwarzanie po najechaniu
  const handleMouseEnter = (e: React.MouseEvent<HTMLVideoElement>) => {
      const video = e.currentTarget;
      // Próba odtworzenia tylko jeśli zasób jest załadowany
      if (video.readyState >= 2) { 
          video.play().catch(err => {
              // Ciche przechwycenie błędu "NotSupportedError" lub "AbortError"
              console.warn("Autoplay blocked or media invalid:", err);
          });
      }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLVideoElement>) => {
      e.currentTarget.pause();
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300 w-full">
        {posts && posts.length > 0 ? (
            posts.map((post: any, idx: number) => {
                const mediaSrc = getMediaSrc(post);
                // Uznajemy za wideo tylko jeśli flaga jest true I URL nie jest blobem
                // Jeśli jest blobem, traktujemy to jako "broken media" i pokazujemy fallback
                const isVideo = post.isVideo === true;
                const canPlay = isVideo && isPlayableUrl(mediaSrc);
                const isBlob = mediaSrc?.startsWith('blob:');

                return (
                    <div key={idx} className="group border border-zinc-800 bg-black/40 hover:border-green-900/50 transition-all rounded-sm flex overflow-hidden min-h-[160px]">
                        
                        {/* --- LEWA STRONA: MEDIA --- */}
                        <div className="w-48 shrink-0 bg-zinc-900 relative border-r border-zinc-800 flex items-center justify-center">
                            
                            {/* SCENARIUSZ A: Działające Wideo */}
                            {canPlay ? (
                                <div className="relative w-full h-full">
                                    <video 
                                        src={mediaSrc} 
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        controls={false}
                                        muted 
                                        loop
                                        playsInline
                                        onMouseEnter={handleMouseEnter}
                                        onMouseLeave={handleMouseLeave}
                                        onError={(e) => {
                                            // Gdyby jednak link wygasł - ukrywamy wideo
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement?.classList.add('hidden-video-fallback');
                                        }}
                                    />
                                    {/* Ikona w rogu */}
                                    <div className="absolute top-2 right-2 bg-black/70 p-1 rounded backdrop-blur-md">
                                        <Video className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                            ) : (
                                /* SCENARIUSZ B: Zdjęcie lub Zepsute/Blob Wideo */
                                <div className="w-full h-full relative group/media">
                                    {/* Jeśli to Blob-Wideo, pokazujemy placeholder */}
                                    {isVideo && isBlob ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/80 p-2 text-center gap-2">
                                            <AlertCircle className="w-8 h-8 text-zinc-600" />
                                            <span className="text-[9px] text-zinc-500 font-mono leading-tight">
                                                VIDEO STREAM ENCRYPTED (BLOB)
                                            </span>
                                            <a 
                                                href={post.url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="mt-2 text-[9px] text-green-500 border border-green-900 px-2 py-1 hover:bg-green-900/30 rounded"
                                            >
                                                OPEN SOURCE
                                            </a>
                                        </div>
                                    ) : (
                                        /* Zwykłe zdjęcie */
                                        mediaSrc ? (
                                            <img 
                                                src={mediaSrc} 
                                                alt={`post_${idx}`}
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                                                onError={(e) => {
                                                    // Fallback dla zepsutego obrazka
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.parentElement?.classList.add('broken-img');
                                                }}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-zinc-700">
                                                <ImageIcon className="w-8 h-8 opacity-20" />
                                                <span className="text-[10px] font-mono">NO_PREVIEW</span>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                            
                            {/* Overlay z ID */}
                            <div className="absolute top-0 left-0 bg-black/60 text-[9px] text-green-500 px-2 py-1 font-mono backdrop-blur-sm z-10">
                                #{idx.toString().padStart(2, '0')}
                            </div>
                        </div>

                        {/* --- PRAWA STRONA: DANE --- */}
                        <div className="flex-1 p-4 flex flex-col min-w-0">
                            
                            {/* Nagłówek */}
                            <div className="flex items-center justify-between border-b border-zinc-800/50 pb-2 mb-3">
                                <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> 
                                        {post.date ? new Date(post.date).toLocaleDateString() : 'UNKNOWN'}
                                    </span>
                                    {post.likesCount !== undefined && (
                                        <span className="flex items-center gap-1">
                                            <Heart className="w-3 h-3 hover:text-red-500 transition-colors cursor-help" /> 
                                            {post.likesCount}
                                        </span>
                                    )}
                                </div>
                                <div className="text-[9px] font-mono uppercase tracking-wider flex items-center gap-2">
                                    <a href={post.url} target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-green-500 hover:underline flex items-center gap-1">
                                        OPEN_SRC <ExternalLink className="w-2 h-2" />
                                    </a>
                                </div>
                            </div>

                            {/* Treść */}
                            <div className="mb-4 relative">
                                <p className="text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap break-words line-clamp-4 hover:line-clamp-none transition-all cursor-text">
                                    {post.caption ? post.caption : <span className="italic text-zinc-600 text-[10px]">NO CAPTION DATA</span>}
                                </p>
                            </div>

                            {/* Komentarze */}
                            <div className="mt-auto pt-3 border-t border-zinc-900 bg-zinc-900/20 -mx-4 -mb-4 px-4 py-3">
                                {post.comments && post.comments.length > 0 ? (
                                    <>
                                        <div className="flex items-center gap-2 mb-2">
                                            <MessageSquare className="w-3 h-3 text-zinc-500" />
                                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                                Intercepted Comms ({post.comments.length})
                                            </h4>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            {post.comments.slice(0, 3).map((comment: any, cIdx: number) => {
                                                const author = comment.owner || comment.user || comment.author || 'Unknown';
                                                const text = comment.text || comment.content || (typeof comment === 'string' ? comment : '');

                                                return (
                                                    <div key={cIdx} className="text-[11px] flex gap-2 items-start font-mono group/comment">
                                                        <span className="text-green-800 shrink-0 mt-[2px] select-none">↳</span>
                                                        <div className="break-all">
                                                            {typeof comment === 'object' ? (
                                                                <>
                                                                    <span className="text-zinc-400 font-bold mr-2 hover:text-green-400 cursor-pointer">@{author}:</span>
                                                                    <span className="text-zinc-500 group-hover/comment:text-zinc-300 transition-colors">{text}</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-zinc-500">{String(comment)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {post.comments.length > 3 && (
                                                <div className="text-[9px] text-zinc-600 pl-4 pt-1 italic">
                                                    ... + {post.comments.length - 3} more hidden
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2 opacity-50">
                                        <MessageSquare className="w-3 h-3 text-zinc-700" />
                                        <span className="text-[10px] text-zinc-700 italic font-mono">No interactions detected.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })
        ) : (
            <div className="w-full h-32 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded bg-black/20">
                <p className="text-zinc-500 font-mono text-xs">[!] NO POST DATA IN LOCAL CACHE</p>
                <p className="text-zinc-700 text-[10px] mt-1">Execute 'scan' command with 'deep' mode.</p>
            </div>
        )}
    </div>
  );
};
