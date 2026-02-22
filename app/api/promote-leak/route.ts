import { NextRequest, NextResponse } from 'next/server';
import { LeakService } from '../_vesper/services'; // [cite: 14] Importujemy logikę z Twojego serwisu

export async function POST(req: NextRequest) {
    try {
        // Pobieramy ID celu i ID wycieku z żądania
        const { targetId, breachId } = await req.json();
        
        if (!targetId || !breachId) {
            return NextResponse.json(
                { error: "Error: Missing required identifiers (targetId, breachId)." }, 
                { status: 400 }
            );
        }

        // Wywołujemy funkcję w serwisie, która:
        // 1. Pobiera dane wycieku z tabeli IdentityBreach [cite: 102]
        // 2. Aktualizuje pola leakVerified... w tabeli SocialBotTarget [cite: 93, 98, 99]
        // 3. Ustawia flagę isPromoted = true w wycieku 
        await LeakService.promoteBreachToTarget(targetId, breachId);
        
        return NextResponse.json({ 
            success: true, 
            message: "Identity verified. Data transferred to the profile header." 
        });

    } catch (e: any) {
        console.error("Promote Leak Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
