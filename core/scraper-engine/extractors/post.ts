import { Page } from 'puppeteer';
import { performScrollGesture, randomDelay } from '../utils';

export async function scrapePostDetails(page: Page, url: string) {
    console.log(`[Extractor] => Analiza posta: ${url}`);
    
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Scroll elementu, aby załadować komentarze (niezbędne dla Twojego HTML)
        await performScrollGesture(page); 
        await randomDelay(2000, 3500);

        return await page.evaluate(() => {
            // Funkcja czyszcząca tekst z metadanych
            const cleanText = (txt: string) => {
                if (!txt) return "";
                return txt
                    .split(/\n/)
                    .filter(line => {
                        const l = line.trim();
                        // Filtrowanie systemowych napisów
                        return l.length > 1 && 
                               !l.match(/^(Odpowiedz|Reply|Wyświetl|See trans|Zgłoś|Report|Lubię|Like|Polubione|Ukryj)/i) &&
                               !l.match(/^\d+[hwmdyw]$/); // Filtruje "2h", "1w" itp.
                    })
                    .join(' ')
                    .trim();
            };

            const timeEl = document.querySelector('time');
            const date = timeEl ? (timeEl.getAttribute('datetime') || timeEl.getAttribute('title')) : new Date().toISOString();

            // --- NOWOŚĆ: Pobieranie nazwy lokalizacji ---
            let locationName = null;
            // Szukamy linku do lokalizacji (zawsze ma /explore/locations/ w href na Instagramie)
            const locLink = document.querySelector('a[href*="/explore/locations/"]');
            if (locLink) {
                locationName = (locLink as HTMLElement).innerText;
            }

            let mediaUrl = "";
            let isVideo = false;

            // Szukanie wideo
            const video = document.querySelector('video');
            if (video) {
                mediaUrl = video.getAttribute('src') || video.getAttribute('poster') || "";
                isVideo = true;
            }

            // Szukanie zdjęcia (HD via srcset)
            if (!mediaUrl) {
                const img = document.querySelector('article img[sizes], article img[srcset]');
                if (img) {
                    const srcset = img.getAttribute('srcset');
                    if (srcset) {
                        const sources = srcset.split(',').map(s => {
                            const p = s.trim().split(' ');
                            return { url: p[0], width: parseInt(p[1]?.replace('w', '') || '0') };
                        });
                        sources.sort((a, b) => b.width - a.width);
                        if (sources.length > 0) mediaUrl = sources[0].url;
                    } else {
                        mediaUrl = img.getAttribute('src') || "";
                    }
                }
            }
            
            if (!mediaUrl) {
                 mediaUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || "";
            }

            // --- WIELOWARSTWOWE WYKRYWANIE OPISU (Kaskada) ---
            let caption = "";
            let comments: string[] = [];

            // Metoda 1: Sprawdzenie H1 (Hidden accessibility text)
            const h1 = document.querySelector('h1');
            if (h1 && h1.innerText.length > 5) {
                caption = cleanText(h1.innerText);
            }

            // Metoda 2: Przeszukiwanie listy komentarzy (UL > LI > SPAN)
            const listItems = document.querySelectorAll('ul li');
            
            listItems.forEach((li) => {
                const spans = li.querySelectorAll('span');
                const h2User = li.querySelector('h2'); 

                let content = "";
                // Zbieramy tekst ze wszystkich spanów w danym LI, pomijając linki
                spans.forEach(s => {
                    if (s.innerText.length > 2 && !s.querySelector('a')) {
                         content += s.innerText + " ";
                    }
                });

                if (content && h2User) {
                    const cleanContent = cleanText(content);
                    if (cleanContent.length > 2) {
                        // Jeśli jeszcze nie mamy caption (i nie był w H1), to pierwszy tekst autora jest opisem
                        if (!caption) {
                            caption = cleanContent;
                        } else if (cleanContent !== caption) {
                            // Reszta to komentarze
                            if (comments.length < 15) comments.push(cleanContent);
                        }
                    }
                }
            });

            // Metoda 3: Fallback z Meta Taga (og:title)
            if (!caption || caption.length < 3) {
                const metaTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
                if (metaTitle && metaTitle.includes(':')) {
                    const parts = metaTitle.split(':');
                    parts.shift(); // usuń login
                    const metaCaption = parts.join(':').trim().replace(/^['"]|['"]$/g, '');
                    if (metaCaption.length > 3) caption = metaCaption;
                }
            }

            // Metoda 4: Alt obrazka (ostateczność)
            if (!caption) {
                const imgAlt = document.querySelector('article img')?.getAttribute('alt');
                if (imgAlt && !imgAlt.includes('No photo')) {
                    caption = imgAlt.replace(/opis:/i, '').trim();
                } else {
                    caption = "[Brak opisu tekstowego]";
                }
            }

            // --- NOWOŚĆ: Hashtagi ---
            const hashtags: string[] = [];
            // Hashtagi często są linkami /explore/tags/
            document.querySelectorAll('a[href*="/explore/tags/"]').forEach(tag => {
                if (tag.textContent) hashtags.push(tag.textContent);
            });
            // Oraz wyciągamy z caption jeśli nie znaleziono linków
            if (hashtags.length === 0 && caption) {
                const matches = caption.match(/#[a-z0-9_]+/gi);
                if (matches) matches.forEach(m => hashtags.push(m));
            }

            return {
                url: document.location.href,
                date,
                mediaUrl,
                isVideo,
                caption,
                comments,
                locationName, // <-- Nowe pole
                hashtags      // <-- Nowe pole
            };
        });

    } catch (e) {
        console.error(`[Post Extractor Error] ${url}`, e);
        return {
            url,
            date: new Date().toISOString(),
            mediaUrl: "",
            caption: "Błąd odczytu",
            comments: [],
            isVideo: false,
            locationName: null,
            hashtags: []
        };
    }
}
