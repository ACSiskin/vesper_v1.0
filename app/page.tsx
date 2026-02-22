"use client";

import { useState, useEffect, useCallback } from 'react';
import { TargetProfile, ChatMessage } from './types';
import { Lightbox } from '@/components/Lightbox';
import { TargetList } from '@/components/TargetList';
import { MainView } from '@/components/MainView';
import { Terminal } from '@/components/Terminal';

export default function SocialBotPage() {
  const [targets, setTargets] = useState<TargetProfile[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<TargetProfile | null>(null);
  const [input, setInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);

  const [chatLog, setChatLog] = useState<ChatMessage[]>([
    { role: 'sys', txt: 'SOCIALBOT_CORE v1.2 (IDENTITY_MODULE) loaded.' },
    { role: 'sys', txt: 'Secure vault connection: ESTABLISHED.' },
    { role: 'vesper', txt: 'System ready. Enter target or command.' }
  ]);

  // 1. Funkcja do pobierania listy celów (wyciągnięta na zewnątrz useEffect)
  // Używamy useCallback, aby móc przekazać ją bezpiecznie do MainView jako props
  const fetchTargets = useCallback(async () => {
    try {
      // Cichy log, żeby nie spamować konsoli przy każdym odświeżeniu
      // console.log("🔄 [Frontend] Aktualizacja rejestru celów...");

      const res = await fetch('/api');

      if (!res.ok) {
        const errText = await res.text();
        console.error("Server Error:", errText);
        return;
      }

      const textData = await res.text();
      try {
        const data = JSON.parse(textData);
        if (Array.isArray(data)) {
          setTargets(data);

          // Kluczowe dla Identity Vault:
          // Jeśli mamy wybrany cel, musimy go zaktualizować "w locie", 
          // żeby Header od razu pokazał czerwoną plakietkę po weryfikacji.
          if (selectedTarget) {
            const updatedSelected = data.find((t: TargetProfile) => t.id === selectedTarget.id);
            if (updatedSelected) {
              setSelectedTarget(updatedSelected);
            }
          }
        }
      } catch (e) {
        console.error("Błąd parsowania JSON:", e);
      }

    } catch (e) {
      console.error("History Error:", e);
      setChatLog(prev => [...prev, { role: 'sys', txt: 'DB_CONNECTION: FAILED' }]);
    }
  }, [selectedTarget]); // Zależność do selectedTarget jest ważna dla auto-odświeżania widoku

  // 2. Pobieranie historii przy starcie
  useEffect(() => {
    fetchTargets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- OBSŁUGA STREAMINGU (MATRIX MODE) ---
  const handleCommand = async () => {
    if (!input.trim()) return;

    const cmd = input;
    // Dodajemy wiadomość usera od razu
    setChatLog(prev => [...prev, { role: 'usr', txt: cmd }]);
    setInput('');
    setIsScanning(true);

    try {
      const response = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: cmd }] // Uproszczona historia dla API
        })
      });

      if (!response.body) throw new Error("Brak strumienia danych z serwera (ReadableStream is null).");

      // Inicjalizacja czytnika strumienia
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';

      // Pętla czytająca dane w czasie rzeczywistym
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        // Dekodujemy paczkę bajtów na tekst
        const chunkValue = decoder.decode(value, { stream: true });
        buffer += chunkValue;

        // Dzielimy bufor na podstawie prefiksów używanych przez backend
        // (LOG:, RESULT:, ERROR:)
        const parts = buffer.split(/(?=LOG:|RESULT:|ERROR:)/g);

        // Przetwarzamy wszystkie kompletne fragmenty
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];

          // Jeśli to ostatni element i strumień nadal trwa, zostaw go w buforze (może być ucięty)
          if (i === parts.length - 1 && !done && !part.trim().endsWith('}')) {
            buffer = part;
            break;
          } else {
            buffer = ''; // Czyścimy bufor, bo przetworzyliśmy fragment
            processStreamPart(part);
          }
        }
      }

    } catch (error: any) {
      console.error("Streaming Error:", error);
      setChatLog(prev => [...prev, { role: 'sys', txt: `CRITICAL ERROR: ${error.message}` }]);
    } finally {
      setIsScanning(false);
      // Po zakończeniu skanowania zawsze odświeżamy listę, 
      // żeby pobrać ewentualne nowe wycieki lub zaktualizowane dane
      fetchTargets();
    }
  };

  // Helper do interpretacji komunikatów z backendu
  const processStreamPart = (text: string) => {
    if (!text.trim()) return;

    // A. Logi operacyjne (np. [DeepDive] ...)
    if (text.startsWith('LOG:')) {
      const logContent = text.replace('LOG:', '').trim();
      setChatLog(prev => [...prev, { role: 'sys', txt: logContent }]);
    }
    // B. Finalny wynik (JSON)
    else if (text.startsWith('RESULT:')) {
      try {
        const jsonStr = text.replace('RESULT:', '').trim();
        const data = JSON.parse(jsonStr);

        // Wyświetlenie wiadomości od V.E.S.P.E.R. (zakończenie)
        if (data.content) {
          setChatLog(prev => [...prev, { role: 'vesper', txt: data.content }]);
        }

        // Jeśli przyszły nowe dane celu (newTarget) bezpośrednio ze skanera
        if (data.data) {
          const newTarget = data.data;
          setTargets(prev => {
            // Usuń duplikat jeśli już jest, dodaj nowy na górę
            const filtered = prev.filter(t => t.id !== newTarget.id);
            return [newTarget, ...filtered];
          });
          setSelectedTarget(newTarget);
          console.log("Lista celów zaktualizowana (Live Update).");
        }

      } catch (e) {
        console.error("Błąd parsowania wyniku JSON:", e);
      }
    }
    // C. Błędy backendu
    else if (text.startsWith('ERROR:')) {
      const errContent = text.replace('ERROR:', '').trim();
      setChatLog(prev => [...prev, { role: 'sys', txt: `SYSTEM FAILURE: ${errContent}` }]);
    }
  };

  // Obsługa zapisu mediów
  const handleSaveMedia = async (url: string) => {
    if (!selectedTarget) {
      setChatLog(prev => [...prev, { role: 'sys', txt: 'ERROR: NO TARGET SELECTED.' }]);
      return;
    }

    setChatLog(prev => [...prev, { role: 'sys', txt: `[VAULT] Downloading: ${url.slice(0, 30)}...` }]);

    try {
      const res = await fetch('/api/save-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          username: selectedTarget.username
        })
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data = await res.json();
      setChatLog(prev => [...prev, { role: 'sys', txt: `[VAULT] SUCCESS. Saved as: ${data.filename}` }]);

    } catch (error: any) {
      console.error("Save Error:", error);
      setChatLog(prev => [...prev, { role: 'sys', txt: `[VAULT] ERROR: ${error.message}` }]);
    }
  };

  return (
    <div className="flex w-full h-screen bg-black text-white font-mono overflow-hidden p-2 gap-2">
      {/* Lightbox Overlay */}
      {fullscreenImg && (
        <Lightbox
          src={fullscreenImg}
          onClose={() => setFullscreenImg(null)}
          onSave={handleSaveMedia}
        />
      )}

      {/* Komponenty UI */}
      <TargetList
        targets={targets}
        selectedTarget={selectedTarget}
        onSelect={setSelectedTarget}
      />

      <MainView
        target={selectedTarget}
        onOpenMedia={setFullscreenImg}
        onSaveMedia={handleSaveMedia}
        // Przekazujemy funkcję odświeżania do IdentityPanel
        onRefreshData={fetchTargets}
      />

      <Terminal
        chatLog={chatLog}
        isScanning={isScanning}
        input={input}
        setInput={setInput}
        onCommand={handleCommand}
      />
    </div>
  );
}
