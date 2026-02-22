import { NextRequest, NextResponse } from 'next/server';
// POPRAWIONO ŚCIEŻKĘ: Jeden "../" zamiast dwóch
import { LeakService } from '../_vesper/services'; 

export async function POST(req: NextRequest) {
    try {
        const { targetId, type, value } = await req.json();
        
        // type = co usuwamy (email, phone, dob...)
        // value = konkretna wartość do usunięcia (dla tablic)
        
        await LeakService.removeVerifiedData(targetId, type, value);
        
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
