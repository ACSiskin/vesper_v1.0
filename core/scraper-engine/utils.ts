import { Page } from 'puppeteer';

// Podstawowa funkcja losująca czas
export const randomDelay = (min: number, max: number) => 
  new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1) + min)));

/**
 * Wykonuje jeden "ludzki" ruch scrolla.
 * ZWOLNIONO TEMPO: Mniejszy dystans, płynniejszy ruch.
 */
export async function performScrollGesture(page: Page) {
    try {
        // Zmniejszamy dystans (300-500px), żeby nie przeskakiwać sekcji ładowania
        const distance = Math.floor(Math.random() * (500 - 300 + 1) + 300);
        
        await page.evaluate((y) => window.scrollBy({ top: y, behavior: 'smooth' }), distance);
        
        // Obowiązkowa pauza po każdym ruchu (dajemy czas Reactowi na renderowanie)
        await randomDelay(1000, 2000); 
    } catch (e) {
        console.error('Scroll error', e);
    }
}

/**
 * Symuluje "zastanowienie się".
 * Znacznie wydłużone czasy dla trybu DEEP.
 */
export async function simulateReading(probability = 0.3) {
    if (Math.random() < probability) {
        // "Zatrzymanie się na dłużej" - symulacja czytania komentarzy
        await randomDelay(3000, 6000);
    } else {
        // Standardowy odstęp między zdjęciami
        await randomDelay(1500, 2500);
    }
}

/**
 * Mikro-powrót (korekta).
 */
export async function microCorrection(page: Page, probability = 0.15) {
    if (Math.random() < probability) {
        await page.evaluate(() => window.scrollBy({ top: -250, behavior: 'smooth' }));
        await randomDelay(1500, 2500);
    }
}

// Parser liczb (obsługuje 10k, 1.2M, 1 000 itp.)
export const parseCount = (str: string | null | undefined) => {
    if (!str) return 0;
    // Usuwamy wszystko co nie jest cyfrą, kropką, przecinkiem lub K/M
    let clean = str.replace(/[^0-9.,kKmM]/g, '');
    
    // Zamiana przecinka na kropkę (format dziesiętny)
    clean = clean.replace(/,/g, '.');

    let mult = 1;
    if (clean.toUpperCase().includes('K')) { mult = 1000; clean = clean.replace(/[kK]/g, ''); }
    if (clean.toUpperCase().includes('M')) { mult = 1000000; clean = clean.replace(/[mM]/g, ''); }
    
    // Fix na "kropki tysięczne" (np. 1.200 postów -> to 1200, nie 1.2)
    // Jeśli mamy więcej niż jedną kropkę LUB kropkę i 3 cyfry na końcu (przy braku K/M) -> usuwamy kropki
    if ((clean.match(/\./g) || []).length > 1 || (mult === 1 && clean.includes('.') && clean.split('.')[1].length === 3)) {
        clean = clean.replace(/\./g, '');
    }

    return Math.floor(parseFloat(clean) * mult) || 0;
};

// ==========================================
// FUNKCJE DLA GEO-INTEL (GEOINT)
// ==========================================

export interface GeoEvent {
    id: string;
    type: 'photo_evidence' | 'soft_location';
    lat: number;
    lng: number;
    timestamp: number; // Unix timestamp
    dateStr: string;
    thumbnailUrl: string;
    locationName: string;
    postUrl: string;
    description?: string;
}

/**
 * Scala dane z postów (DOM) z danymi GPS (Interceptor).
 * Tworzy spójną linię czasu na mapie.
 */
export function mergeGeoData(posts: any[], ghostLocations: Array<{ name: string; lat: number; lng: number }>): GeoEvent[] {
    const events: GeoEvent[] = [];
    const usedLocations = new Set<string>();

    // 1. Iterujemy po postach, szukając dopasowań
    posts.forEach((post, index) => {
        if (post.locationName) {
            // Normalizacja nazw (małe litery, trim) dla lepszego dopasowania
            const cleanName = post.locationName.toLowerCase().trim();
            
            // Szukamy w danych z interceptora (GhostData)
            const match = ghostLocations.find(gl => gl.name.toLowerCase().trim() === cleanName);

            if (match && match.lat && match.lng) {
                events.push({
                    id: `ev_${index}_${Date.now()}`,
                    type: 'photo_evidence', // Mamy twardy dowód: zdjęcie + GPS
                    lat: match.lat,
                    lng: match.lng,
                    timestamp: new Date(post.date).getTime(),
                    dateStr: post.date,
                    thumbnailUrl: post.mediaUrl,
                    locationName: match.name, // Używamy oficjalnej nazwy z API
                    postUrl: post.url,
                    description: post.caption?.substring(0, 100) + '...'
                });
                usedLocations.add(match.name);
            }
        }
    });

    // 2.  Dodajemy lokalizacje "sieroty" - wykryte przez interceptor, ale nie przypisane do konkretnego posta
    // np. User wszedł w geotag, ale nie wiemy, które to zdjęcie. Oznaczamy jako "soft_location".
    ghostLocations.forEach((loc, idx) => {
        if (!usedLocations.has(loc.name)) {
            // Jako timestamp dajemy "teraz" lub szacowany, bo nie wiemy kiedy tam był
            // W tym przypadku pomijamy timestamp (0), mapa wyświetli to jako "znane miejsce pobytu"
             events.push({
                id: `ghost_${idx}`,
                type: 'soft_location',
                lat: loc.lat,
                lng: loc.lng,
                timestamp: 0, 
                dateStr: 'Data nieznana (wykryto w tle)',
                thumbnailUrl: '', // Brak zdjęcia
                locationName: loc.name,
                postUrl: ''
            });
        }
    });

    // Sortowanie chronologiczne (najnowsze najpierw)
    return events.sort((a, b) => b.timestamp - a.timestamp);
}
