import { Page } from 'puppeteer';
import { performScrollGesture, simulateReading, microCorrection, randomDelay } from '../utils';

const QUICK_LIMIT = 15;
const DEEP_LIMIT = 150; 

// Nowy parametr requiredLinksCount (limit)
export async function scrapeProfileData(page: Page, username: string, mode: 'quick' | 'deep' = 'quick', requiredLinksCount: number = 3) {
    console.log(`[Extractor] Skanowanie profilu: ${username} | TRYB: ${mode.toUpperCase()} | Cel linków: ${requiredLinksCount}`);
    const url = `https://www.instagram.com/${username}/`;
    
    // Czekamy na sieć/DOM
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    
    const mediaSet = new Set<string>(); 
    const linkSet = new Set<string>();  
    
    // --- 1. FUNKCJA EKSTRAKCJI ---
    const extractVisible = async () => {
        return await page.evaluate(() => {
            const medias: string[] = [];
            const links: string[] = [];
            
            // Obrazki
            document.querySelectorAll('img').forEach(img => {
                const src = img.getAttribute('src');
                if (src && src.includes('http') && img.width > 100) medias.push(src);
            });

            // Linki do postów (Używamy includes, aby złapać zarówno relatywne jak i pełne)
            document.querySelectorAll('a').forEach(a => {
                const href = a.getAttribute('href');
                if (href && (href.includes('/p/') || href.includes('/reel/'))) {
                    // Ignorujemy linki systemowe
                    if (!href.includes('liked_by') && !href.includes('comments')) {
                        links.push(href);
                    }
                }
            });
            return { medias, links };
        });
    };

    // Warunki pętli: Musimy spełnić limit mediów (dla galerii) LUB limit linków (dla analizy tekstu)
    const baseTarget = mode === 'deep' ? DEEP_LIMIT : QUICK_LIMIT;
    const targetCount = Math.max(baseTarget, requiredLinksCount);

    let noChangeCount = 0;
    let previousHeight = 0;
    let loopCount = 0;

    console.log(`[DeepDive] Start pętli. Warunek stopu: >${targetCount} mediów ORAZ >${requiredLinksCount} linków.`);

    // Pętla trwa, dopóki brakuje nam mediów LUB brakuje nam linków do postów
    while (mediaSet.size < targetCount || linkSet.size < requiredLinksCount) {
        const data = await extractVisible();
        data.medias.forEach(m => mediaSet.add(m));
        data.links.forEach(l => linkSet.add(l));

        if (loopCount % 3 === 0) console.log(`[DeepDive] Stan: ${mediaSet.size} mediów, ${linkSet.size} linków...`);

        const currentHeight = await page.evaluate(() => document.body.scrollHeight);
        if (currentHeight === previousHeight) {
            noChangeCount++;
            if (noChangeCount >= 4) {
                console.log('[DeepDive] Brak zmian wysokości przez 4 pętle - koniec profilu.');
                break; 
            }
        } else {
            noChangeCount = 0;
            previousHeight = currentHeight;
        }

        await performScrollGesture(page);
        await simulateReading(mode === 'deep' ? 0.4 : 0.1);
        if (loopCount % 5 === 0) await microCorrection(page, 0.3);

        loopCount++;
        if (loopCount > 200) break; // Safety break
    }

    // --- 2. STATYSTYKI ---
    console.log('[Extractor] Wracam na górę po statystyki...');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await randomDelay(2000, 4000); 

    const headerData = await page.evaluate(() => {
        const parseCount = (str: string | null | undefined) => {
             if (!str) return 0;
             let c = str.replace(/\s/g, '').replace(/\u00a0/g, '').replace(/[^0-9.,kKmM]/g, '').replace(/,/g, '.');
             let m = 1;
             if (c.toUpperCase().includes('K')) { m=1000; c=c.replace(/[kK]/g,''); }
             if (c.toUpperCase().includes('M')) { m=1000000; c=c.replace(/[mM]/g,''); }
             return Math.floor(parseFloat(c)*m)||0;
        };

        const getHdUrl = (url: string | null) => {
            if (!url) return null;
            return url.replace(/\/s\d+x\d+\//, '/').replace(/\/p\d+x\d+\//, '/').replace(/\/e\d+\//, '/'); 
        };

        let stats = { posts: 0, followers: 0, following: 0 };
        let bio = "";
        
        // Header Text Mining
        const header = document.querySelector('header');
        if (header) {
            const headerText = (header as HTMLElement).innerText;
            const findStatValue = (keywords: string[]) => {
                const pattern = keywords.join('|');
                const regexAfter = new RegExp(`([\\d.,]+[kKmM]?)[\\s\\n]+(${pattern})`, 'i');
                const regexBefore = new RegExp(`(${pattern})[:\\s\\n]+([\\d.,]+[kKmM]?)`, 'i');
                const matchAfter = headerText.match(regexAfter);
                if (matchAfter) return parseCount(matchAfter[1]);
                const matchBefore = headerText.match(regexBefore);
                if (matchBefore) return parseCount(matchBefore[2]);
                return 0;
            };
            stats.posts = findStatValue(['Posty', 'Postów', 'Posts']);
            stats.followers = findStatValue(['Obserwujących', 'Obserwujący', 'Followers']);
            stats.following = findStatValue(['Obserwowani', 'Obserwowanych', 'Following']);

            const elements = Array.from(header.querySelectorAll('div, span, h1'));
            const candidates = elements
                .map(el => (el as HTMLElement).innerText)
                .filter(t => t && t.length > 5 && !t.includes('Obserwuj') && !t.includes('Follow') && !t.match(/^[\d\s.,kKmM]+$/));
            if (candidates.length > 0) bio = candidates.sort((a,b) => b.length - a.length)[0];
        } 
        
        // Fallback: Meta Description
        if (stats.followers === 0) {
            const metaDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
            if (metaDesc) {
                const parts = metaDesc.split(' - ')[0]; 
                const matchF = parts.match(/([\d.,]+[kKmM]?)\s+(Followers|Obserwujących)/i);
                if (matchF) stats.followers = parseCount(matchF[1]);
            }
        }

        // Script Mining (Video/Photo URLs)
        const scriptUrls: string[] = [];
        Array.from(document.querySelectorAll('script')).forEach(s => {
             const html = s.innerHTML;
             if (html.includes('video_url')) {
                 const vMatches = html.match(/"video_url":"(https:[^"]+)"/g);
                 if (vMatches) vMatches.forEach(v => scriptUrls.push(v.split('"')[3].replace(/\\u0026/g, '&')));
             }
             if (html.includes('display_url')) {
                 const iMatches = html.match(/"display_url":"(https:[^"]+)"/g);
                 if (iMatches) iMatches.forEach(i => scriptUrls.push(i.split('"')[3].replace(/\\u0026/g, '&')));
             }
        });

        return {
            stats,
            bio: bio || "Brak BIO",
            avatar: getHdUrl(document.querySelector('meta[property="og:image"]')?.getAttribute('content')),
            scriptUrls
        };
    });

    const finalMedia = Array.from(mediaSet).map(url => ({ thumbnail: url, fullUrl: url, postUrl: "" }));
    headerData.scriptUrls.forEach(url => {
        const isVideo = url.includes('.mp4');
        if (isVideo || !mediaSet.has(url)) {
            finalMedia.push({ thumbnail: url, fullUrl: url, postUrl: "" });
        }
    });

    return {
        stats: headerData.stats,
        bio: headerData.bio || "Brak BIO",
        avatar: headerData.avatar,
        postLinks: Array.from(linkSet).slice(0, requiredLinksCount), // Zwracamy tyle ile trzeba do analizy
        recentMedia: finalMedia
    };
}
