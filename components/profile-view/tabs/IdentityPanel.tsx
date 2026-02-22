import React, { useState } from 'react';
import { ShieldAlert, Database, Lock, UserCheck, ArrowUpCircle, AlertTriangle, Globe, Mail, User, Smartphone, Calendar, Home } from 'lucide-react';

interface IdentityPanelProps {
  targetId: string;
  breaches: any[]; 
  onPromote: () => void;
}

export const IdentityPanel: React.FC<IdentityPanelProps> = ({ targetId, breaches, onPromote }) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handlePromote = async (breachId: string) => {
    setLoadingId(breachId);
    try {
        await fetch('/api/promote-leak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetId, breachId })
        });
        onPromote(); 
    } catch (e) {
        console.error("Promote Error:", e);
    } finally {
        setLoadingId(null);
    }
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
        <div className="flex items-center gap-2 border-b border-gray-800 pb-2 mb-4">
            <ShieldAlert className="text-red-500" size={18} />
            <h3 className="text-red-500 font-bold text-sm tracking-[0.2em]">
                IDENTITY_VAULT :: LEAKED_CREDENTIALS
            </h3>
        </div>

        {(!breaches || breaches.length === 0) ? (
            <div className="text-center py-10 text-gray-600 font-mono text-xs">
                SECURE :: NO KNOWN BREACHES DETECTED
            </div>
        ) : (
            <div className="space-y-3">
                {breaches.map((breach) => (
                    <div 
                        key={breach.id} 
                        className={`relative border rounded p-3 flex gap-4 transition-all
                            ${breach.confidence === 'HIGH' 
                                ? 'bg-red-950/20 border-red-900/50' 
                                : 'bg-gray-900/40 border-gray-800 hover:border-gray-600'
                            }
                            ${breach.isPromoted ? 'opacity-50' : 'opacity-100'}
                        `}
                    >
                        <div className="shrink-0 flex flex-col items-center pt-1 gap-2">
                            <Database size={16} className={breach.confidence === 'HIGH' ? 'text-red-500' : 'text-gray-500'} />
                            {breach.confidence === 'LOW' && (
                                <span className="text-[9px] bg-gray-800 text-gray-400 px-1 rounded uppercase">Check</span>
                            )}
                        </div>

                        <div className="flex-1 font-mono text-[11px] space-y-1">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-200 font-bold tracking-wide">{breach.sourceName}</span>
                                <span className="text-gray-600 text-[9px]">{breach.breachDate || 'UNKNOWN DATE'}</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
                                {breach.email && (
                                    <div className="text-gray-500 flex items-center gap-2" title="Leaked Email">
                                        <Mail size={10} />
                                        EMAIL: <span className="text-gray-300 select-all">{breach.email}</span>
                                    </div>
                                )}
                                {breach.phone && (
                                    <div className="text-gray-500 flex items-center gap-2" title="Leaked Phone">
                                        <Smartphone size={10} className="text-green-500" />
                                        PHONE: <span className="text-green-300 font-bold select-all">{breach.phone}</span>
                                    </div>
                                )}
                                {breach.username && (
                                    <div className="text-gray-500 flex items-center gap-2" title="Leaked Username">
                                        <User size={10} />
                                        USER: <span className="text-gray-300 select-all">{breach.username}</span>
                                    </div>
                                )}
                                {breach.ip && (
                                    <div className="text-gray-500 flex items-center gap-2" title="Leaked IP">
                                        <Globe size={10} className="text-blue-500" />
                                        IP: <span className="text-blue-300 font-bold select-all">{breach.ip}</span>
                                    </div>
                                )}
                                {/* NOWE POLA */}
                                {breach.dob && (
                                    <div className="text-gray-500 flex items-center gap-2" title="Date of Birth">
                                        <Calendar size={10} className="text-amber-500" />
                                        DOB: <span className="text-amber-300 font-bold select-all">{breach.dob}</span>
                                    </div>
                                )}
                                {breach.address && (
                                    <div className="text-gray-500 flex items-center gap-2 md:col-span-2" title="Address">
                                        <Home size={10} className="text-gray-500" />
                                        ADDR: <span className="text-gray-300 select-all">{breach.address}</span>
                                    </div>
                                )}

                                {breach.password && (
                                    <div className="text-red-400/80 md:col-span-2 flex items-center gap-2 bg-black/30 px-2 py-1.5 rounded mt-1 border border-red-900/20">
                                        <Lock size={10} /> 
                                        PWD: <span className="text-red-300 font-bold select-all tracking-wider">{breach.password}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {!breach.isPromoted && (
                            <div className="shrink-0 flex items-center border-l border-gray-800 pl-3">
                                <button
                                    onClick={() => handlePromote(breach.id)}
                                    disabled={loadingId === breach.id}
                                    className="group flex flex-col items-center gap-1 text-gray-600 hover:text-green-500 transition-colors"
                                    title="Potwierdź tożsamość i przypnij do profilu"
                                >
                                    {loadingId === breach.id ? (
                                        <div className="animate-spin w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full" />
                                    ) : (
                                        <>
                                            <ArrowUpCircle size={20} />
                                            <span className="text-[8px] font-bold group-hover:block hidden">VERIFY</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                        
                        {breach.isPromoted && (
                             <div className="absolute top-2 right-2 text-green-500">
                                 <UserCheck size={16} />
                             </div>
                        )}
                    </div>
                ))}
            </div>
        )}
        
        <div className="mt-4 p-3 bg-blue-950/10 border border-blue-900/30 rounded flex items-start gap-3">
            <AlertTriangle className="text-blue-500 shrink-0" size={16} />
            <div className="text-[10px] text-blue-300/60 font-mono leading-relaxed">
                <strong className="text-blue-400">ANALIZA INTELLIGENCE:</strong> Wyniki oznaczone jako <span className="text-gray-400 bg-gray-800 px-1 rounded">CHECK</span> pochodzą z wyszukiwania po nicku.
                Zweryfikuj je ręcznie i kliknij <span className="text-green-400 font-bold">VERIFY</span>, aby włączyć je do głównego profilu.
            </div>
        </div>
    </div>
  );
};
