import { NextRequest, NextResponse } from 'next/server';
import { SocialVault } from '@/core/vault';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, username } = body;

    if (!url || !username) {
      return NextResponse.json({ error: "Missing url or username" }, { status: 400 });
    }

    console.log(`[API] Zapisywanie mediów dla: ${username}`);

    // 1. Inicjujemy (lub pobieramy istniejącą) sesję w Vault dla tego usera
    // To upewni się, że katalog /Targets/{username}/{data} istnieje
    const sessionPath = await SocialVault.initSession(username);

    // 2. Generujemy unikalną nazwę pliku
    const timestamp = new Date().getTime();
    const filename = `manual_save_${timestamp}.jpg`;

    // 3. Zapisujemy obraz
    const savedPath = await SocialVault.saveImage(url, sessionPath, filename);

    if (!savedPath) {
      return NextResponse.json({ error: "Failed to download image from source" }, { status: 502 });
    }

    return NextResponse.json({ 
      status: "SUCCESS", 
      path: savedPath,
      filename: filename
    });

  } catch (error: any) {
    console.error("Save Media Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
