import { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChatMessage } from '@/types';

interface TerminalProps {
  chatLog: ChatMessage[];
  isScanning: boolean;
  input: string;
  setInput: (val: string) => void;
  onCommand: () => void;
}

export function Terminal({ chatLog, isScanning, input, setInput, onCommand }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll przy nowej wiadomości
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  return (
    <Card className="w-1/4 h-full bg-black border border-zinc-800 flex flex-col rounded-none shadow-none">
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-green-500" />
            <span className="text-xs font-bold text-white tracking-widest">V.E.S.P.E.R._CLI</span>
          </div>
          <div className="text-[9px] text-zinc-600 uppercase">NET: SECURE</div>
        </div>

        <ScrollArea className="flex-1 p-4 font-mono text-xs bg-black">
          <div className="space-y-1 pb-4">
            {chatLog.map((msg, i) => (
              <div key={i} className="mb-2 leading-relaxed break-words">
                <span className={`font-bold uppercase mr-2 ${
                  msg.role === 'usr' 
                    ? 'text-zinc-500' 
                    : msg.role === 'vesper' 
                      ? 'text-green-500' 
                      : 'text-zinc-700'
                }`}>
                  {msg.role === 'usr' ? 'USER' : msg.role === 'vesper' ? 'V.E.S.P.E.R.' : 'SYSTEM'}
                </span>
                <span className="text-zinc-800 mr-2">::</span>
                <span className={msg.role === 'usr' ? 'text-zinc-300' : 'text-zinc-100'}>
                  {msg.txt}
                </span>
              </div>
            ))}
            
            {isScanning && (
              <div className="text-green-500 animate-pulse mt-2 flex items-center gap-2">
                 <div className="w-2 h-4 bg-green-500 block" />
                 PROCESSING_DATA_STREAM...
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-2 border-t border-zinc-800 bg-black">
          <div className="flex gap-0 relative group">
            <span className="absolute left-3 top-2.5 text-green-500 text-xs font-bold">{'>'}</span>
            <Input 
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && onCommand()}
               className="h-9 bg-black border-zinc-800 pl-7 text-xs text-white font-mono focus-visible:ring-1 focus-visible:ring-green-500 placeholder:text-zinc-700 rounded-none"
               placeholder="ENTER_COMMAND..."
            />
            <Button size="icon" className="h-9 w-9 bg-zinc-900 hover:bg-zinc-800 text-white rounded-none border-l border-zinc-800" onClick={onCommand}>
               <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
    </Card>
  );
}
