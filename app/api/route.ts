import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { VESPER_TOOLS } from './_vesper/tools';
import { VesperActions } from './_vesper/actions';
import { VesperLogger } from './_vesper/logger';
import { TargetRepository } from './_vesper/services';
import { GeoMapper } from './_vesper/geoMap';

// Limit czasu dla Vercel/Node (5 minut)
export const maxDuration = 300;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- POST: STREAMING CHAT & SCAN COMMANDS ---
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const logger = new VesperLogger(writer);

  (async () => {
    try {
      const { messages } = await req.json();

      // 1. Komunikacja z OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are V.E.S.P.E.R., created by ShadowRig. Act like a terminal." },
          ...messages
        ],
        tools: VESPER_TOOLS,
        tool_choice: "auto"
      });

      const msg = response.choices[0].message;

      // 2. Obsługa narzędzi
      if (msg.tool_calls) {
        for (const toolCall of msg.tool_calls) {
          
          // A. Skanowanie profilu Instagram
          if (toolCall.function.name === "scan_instagram_profile") {
            const args = JSON.parse(toolCall.function.arguments);
            
            const result = await VesperActions.executeScan(
              args.username, 
              args.mode || 'quick', 
              args.postLimit || 3,
              logger
            );

            // PRZYGOTOWANIE DANYCH GEO DLA MAPY PO SKANIE (LIVE UPDATE)
            let liveGeoEvents: any[] = [];
            if (result.target && result.target.snapshots && result.target.snapshots.length > 0) {
                // Pobieramy najnowszy snapshot ze świeżego skanu
                const latestScanData = result.target.snapshots[0].rawJsonData 
                    ? JSON.parse(result.target.snapshots[0].rawJsonData as string)
                    : null;
                
                // Używamy GeoMapper, aby wygenerować punkty dla SocialMap3D
                if (latestScanData) {
                    // Dodano await, bo GeoMapper teraz łączy się z API
                    liveGeoEvents = await GeoMapper.extractFromSnapshot(latestScanData);
                }
            }

            // Dołączamy geoEvents do obiektu data, aby frontend mógł od razu odświeżyć mapę
            const enrichedTarget = {
                ...result.target,
                geoEvents: liveGeoEvents
            };

            const finalPayload = JSON.stringify({
              role: "assistant",
              content: result.message,
              data: enrichedTarget
            });
            await writer.write(encoder.encode(`RESULT:${finalPayload}`));
          }

          // B. Ręczne szukanie wycieków (Manual Enrichment)
          if (toolCall.function.name === "manual_leak_search") {
            const args = JSON.parse(toolCall.function.arguments);
            
            const result = await VesperActions.manualLeakSearch(
              args.targetUsername, 
              args.query,
              logger
            );

            // Obsługa błędu lub sukcesu
            if (typeof result === 'string') {
                 await writer.write(encoder.encode(`RESULT:${JSON.stringify({ content: result })}`));
            } else {
                const finalPayload = JSON.stringify({
                  role: "assistant",
                  content: result.message,
                  data: result.target // Frontend zaktualizuje ten konkretny cel
                });
                await writer.write(encoder.encode(`RESULT:${finalPayload}`));
            }
          }

          // C. Zamykanie sesji
          if (toolCall.function.name === "end_investigation") {
            await VesperActions.terminateSession(logger);
            await writer.write(encoder.encode(`RESULT:${JSON.stringify({ content: "Sesja zamknięta." })}`));
          }
        }
      } else {
        // Zwykła odpowiedź tekstowa
        await writer.write(encoder.encode(`RESULT:${JSON.stringify({ content: msg.content })}`));
      }

    } catch (error: any) {
      console.error("Stream Error:", error);
      await writer.write(encoder.encode(`ERROR:${error.message}`));
    } finally {
      await writer.close();
    }
  })();

  // Zwracamy strumień odpowiedzi
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}

// --- GET: FETCH HISTORY & DATA ---
export async function GET() {
    try {
        // 1. Pobieramy surowe dane z repozytorium
        const targets = await TargetRepository.getAllTargets();

        // 2. Mapujemy je do formatu oczekiwanego przez Frontend (types.ts)
        // ZMIANA: Promise.all + async map, aby obsłużyć asynchroniczne geokodowanie
        const formatted = await Promise.all(targets.map(async (t) => {
            const lastSnapshot = t.snapshots[0]; // Bierzemy najnowszy snapshot
            
            const parsedData = lastSnapshot?.rawJsonData 
                ? JSON.parse(lastSnapshot.rawJsonData as string) 
                : {};

            const ghost = parsedData.ghostData || {};

            // UŻYCIE GEOMAPPERA DO PRZYGOTOWANIA DANYCH DLA MAPY 3D
            // ZMIANA: Dodano await
            const computedGeoEvents = await GeoMapper.extractFromSnapshot(parsedData);

            return {
                // Podstawowe dane
                id: t.id,
                username: t.username,
                fullName: t.fullName || parsedData.fullName || t.username,
                avatarUrl: parsedData.profilePicUrl || '/public/scan_debug.png',

                // SLOT 1: GHOST DATA (Oficjalne z IG)
                instagramPk: t.instagramPk || ghost.instagramPk,
                isBusiness: t.isBusiness ?? ghost.isBusiness,
                businessCategory: t.businessCategory || ghost.categoryName,
                publicEmail: t.publicEmail || ghost.businessEmail || ghost.publicEmail,
                publicPhone: t.publicPhone || ghost.businessPhone || ghost.publicPhone,
                externalUrl: t.externalUrl || ghost.externalUrl,
                
                // SLOT 2: LEAK VERIFIED (Identity Vault) - TERAZ TABLICE
                leakVerifiedEmails: t.leakVerifiedEmails || [],
                leakVerifiedPhones: t.leakVerifiedPhones || [],
                leakVerifiedIps:    t.leakVerifiedIps || [],
                leakVerifiedPass:   t.leakVerifiedPass || [],
                
                // Nowe pola (pojedyncze)
                leakVerifiedDob:     t.leakVerifiedDob,
                leakVerifiedAddress: t.leakVerifiedAddress,
                
                // RELACJE
                breaches: t.breaches || [], 
                
                // Relacje historii i lokalizacji
                snapshots: t.snapshots, 
                // ZMIANA: Zamiast surowego t.locations, przekazujemy też obliczone zdarzenia dla DeckGL
                locations: t.locations,
                geoEvents: computedGeoEvents, // <--- TUTAJ PRZEKAZUJEMY DANE DO SOCIALMAP3D
                
                // Dane operacyjne
                status: t.status,
                risk: t.risk,
                lastScan: lastSnapshot?.scrapedAt || t.updatedAt,
                
                // Statystyki
                bio: lastSnapshot?.bio || parsedData.bio,
                stats: parsedData.stats || { followers: 0, following: 0, posts: 0 },
                
                // Analiza
                aiAnalysis: t.notes || parsedData.aiAnalysis,
                recentMedia: parsedData.recentMedia || [],
                postsAnalysis: parsedData.postsAnalysis || []
            };
        }));
        
        return NextResponse.json(formatted);
    } catch (e: any) {
        console.error("GET Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
