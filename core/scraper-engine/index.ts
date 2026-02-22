import { BrowserSession } from './browser';
import { scrapeProfileData } from './extractors/profile';
import { scrapePostDetails } from './extractors/post';
import { randomDelay, mergeGeoData } from './utils'; // <-- ZMIANA: Dodany import mergeGeoData
import { attachNetworkInterceptor } from './interceptor';

// Zmieniona sygnatura: przyjmuje 'mode' oraz 'limit'
export async function scrapeProfile(username: string, mode: 'quick' | 'deep' = 'quick', limit: number = 3) {
  let page = null;
  
  try {
    console.log(`[SocialBot] START: ${username} [MODE: ${mode} | LIMIT: ${limit}]`);
    
    const browser = await BrowserSession.getBrowser();
    page = await BrowserSession.createPage(browser);

    // --- NOWOŚĆ: Uruchomienie nasłuchu "Ghost Data" ---
    // Ten obiekt będzie się wypełniał w tle podczas nawigacji bota
    console.log(`[SocialBot] Uruchamiam interceptor sieciowy...`);
    const ghostData = await attachNetworkInterceptor(page);

    // 2. Skan Profilu (przekazujemy limit, aby extractor wiedział ile linków zebrać)
    const profileData = await scrapeProfileData(page, username, mode, limit);
    
    console.log(`[SocialBot] Stats:`, profileData.stats);
    console.log(`[SocialBot] Znalezione linki do postów: ${profileData.postLinks.length} (Cel: ${limit})`);

    // 3. Deep Dive (Analiza Postów + Media)
    const analyzedPosts = [];
    const mediaStream = [...profileData.recentMedia]; // Kopia mediów z profilu

    // Bierzemy tyle postów, ile user zażyczył (limit), chyba że znaleziono mniej
    const postsToScan = profileData.postLinks.slice(0, limit);

    for (const link of postsToScan) {
        // FIX: Sprawdzamy, czy link jest już pełny, czy relatywny
        let fullLink = link;
        if (!link.startsWith('http')) {
            fullLink = `https://www.instagram.com${link}`;
        }
        
        console.log(`[SocialBot] Wchodzę w post (${analyzedPosts.length + 1}/${postsToScan.length}): ${fullLink}`);
        const details = await scrapePostDetails(page, fullLink);
        
        if (details) {
            analyzedPosts.push(details);
            // Jeśli w poście znaleziono lepszą jakość/wideo, dodajemy do galerii
            if (details.mediaUrl && !mediaStream.some(m => m.fullUrl === details.mediaUrl)) {
                mediaStream.push({ thumbnail: details.mediaUrl, fullUrl: details.mediaUrl, postUrl: fullLink });
            }
        }
        // Losowy odpoczynek między postami (humanizacja)
        await randomDelay(2000, 5000); 
    }

    await page.close();

    // --- NOWOŚĆ: GEOINT - Scalanie danych (DOM + Network) ---
    console.log(`[SocialBot] Generowanie mapy GEOINT (scalanie nazw miejsc z danymi GPS)...`);
    const geoEvents = mergeGeoData(analyzedPosts, ghostData.locations);
    console.log(`[SocialBot] Zidentyfikowano ${geoEvents.length} zdarzeń geograficznych.`);

    // 4. Finalny zrzut danych
    return {
        username,
        fullName: username,
        bio: profileData.bio,
        profilePicUrl: profileData.avatar,
        stats: profileData.stats,
        recentMedia: mediaStream, 
        postsAnalysis: analyzedPosts,
        ghostData: ghostData, // <-- Dane z interceptora
        geoEvents: geoEvents  // <-- Nowe pole: Scalona mapa zdarzeń
    };

  } catch (e: any) {
    console.error("[SocialBot CRITICAL]", e);
    if (page) await page.close();
    throw e;
  }
}

export const closeSocialBotSession = async () => {
    await BrowserSession.closeSession();
};
