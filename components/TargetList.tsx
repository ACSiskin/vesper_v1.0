import { Database, Search, Signal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TargetProfile } from '@/types';

interface TargetListProps {
  targets: TargetProfile[];
  selectedTarget: TargetProfile | null;
  onSelect: (target: TargetProfile) => void;
}

export function TargetList({ targets, selectedTarget, onSelect }: TargetListProps) {
  return (
    <Card className="w-1/4 h-full bg-black border border-zinc-800 flex flex-col rounded-none shadow-none">
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-white" />
            <span className="text-xs font-bold tracking-[0.2em] text-white">TARGETS_DB</span>
          </div>
          <div className="flex gap-1.5">
             <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
             <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(0,255,0,0.8)]" />
          </div>
        </div>
        
        <div className="p-2 border-b border-zinc-800">
          <div className="relative group">
            <Search className="absolute left-2 top-2 w-3 h-3 text-zinc-500 group-hover:text-white transition-colors" />
            <Input 
              placeholder="SEARCH_UUID::" 
              className="h-7 pl-7 bg-black border-zinc-800 text-[10px] text-white focus-visible:ring-1 focus-visible:ring-green-500 placeholder:text-zinc-700 rounded-none font-mono" 
            />
          </div>
        </div>

        <ScrollArea className="flex-1 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px]">
          {targets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-700 gap-3 mt-10">
              <Signal className="w-8 h-8 opacity-20" />
              <span className="text-[10px] tracking-widest opacity-40 uppercase">Awaiting Data Stream</span>
            </div>
          ) : (
            <div className="flex flex-col">
              {targets.map(target => (
                <button
                  key={target.id}
                  onClick={() => onSelect(target)}
                  className={`flex items-center gap-3 p-3 text-left border-b border-zinc-800 transition-all hover:bg-zinc-900 ${
                    selectedTarget?.id === target.id ? 'bg-zinc-900 border-l-2 border-l-green-500 pl-3' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <Avatar className="w-8 h-8 rounded-none border border-zinc-700 bg-black">
                    <AvatarImage src={target.avatarUrl || ''} />
                    <AvatarFallback className="bg-black text-white text-[10px] rounded-none">?</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-xs font-bold truncate text-white">@{target.username}</div>
                    <div className="text-[9px] text-zinc-500 font-sans tracking-tight uppercase">{target.id.slice(0,8)}...</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-1 border-t border-zinc-800 bg-zinc-950 text-[9px] text-zinc-600 flex justify-between uppercase px-2">
           <span>Records: {targets.length}</span>
           <span>SYNC: OK</span>
        </div>
    </Card>
  );
}
