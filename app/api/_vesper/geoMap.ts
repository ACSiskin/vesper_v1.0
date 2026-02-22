// app/api/_vesper/geoMap.ts

// Prosty cache w pamięci serwera, żeby nie pytać API o to samo miasto
const GEO_CACHE: Record<string, { lat: number, lng: number }> = {};

export class GeoMapper {
  
    /**
     * Funkcja pomocnicza: Pobiera współrzędne z OpenStreetMap (Nominatim)
     */
    static async fetchCoordinates(locationName: string): Promise<{ lat: number, lng: number } | null> {
        const cleanName = locationName.toLowerCase().trim();

        // 1. Sprawdź cache (żeby nie spamować API)
        if (GEO_CACHE[cleanName]) {
            return GEO_CACHE[cleanName];
        }

        try {
            // 2. Zapytaj OpenStreetMap (wymagany User-Agent!)
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanName)}&format=json&limit=1`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'VesperSocialBot/1.0 (internal research tool)' 
                }
            });

            const data = await response.json();

            if (data && data.length > 0) {
                const coords = { 
                    lat: parseFloat(data[0].lat), 
                    lng: parseFloat(data[0].lon) 
                };
                
                // Zapisz w cache
                GEO_CACHE[cleanName] = coords;
                return coords;
            }
        } catch (error) {
            console.error(`[GeoMapper] Błąd geokodowania dla ${locationName}:`, error);
        }

        return null;
    }

    /**
     * ZMIANA NA ASYNC: Teraz musimy czekać na zewnętrzne API
     */
    static async extractFromSnapshot(jsonData: any): Promise<any[]> {
      try {
        if (!jsonData) return [];
  
        // 1. Jeśli są gotowe geoEvents w bazie - zwracamy od razu
        if (jsonData.geoEvents && Array.isArray(jsonData.geoEvents) && jsonData.geoEvents.length > 0) {
          return jsonData.geoEvents;
        }
  
        // 2. AUTO-GEOKODOWANIE: Jeśli geoEvents puste, naprawiamy na podstawie postów
        if (jsonData.postsAnalysis && Array.isArray(jsonData.postsAnalysis)) {
            const recoveredEvents: any[] = [];
            
            // Używamy pętli for...of, żeby obsłużyć await
            for (const [index, post] of jsonData.postsAnalysis.entries()) {
                if (post.locationName) {
                    
                    //  Pobieramy współrzędne z sieci
                    const coords = await this.fetchCoordinates(post.locationName);

                    if (coords) {
                        recoveredEvents.push({
                            id: `auto_geo_${index}`,
                            type: 'photo_evidence',
                            lat: coords.lat,
                            lng: coords.lng,
                            timestamp: new Date(post.date).getTime(),
                            dateStr: new Date(post.date).toLocaleDateString(),
                            thumbnailUrl: post.mediaUrl,
                            locationName: post.locationName,
                            postUrl: post.url,
                            description: post.caption?.substring(0, 100) + '...'
                        });
                    }
                }
            }

            if (recoveredEvents.length > 0) {
                // Sortujemy chronologicznie
                return recoveredEvents.sort((a, b) => b.timestamp - a.timestamp);
            }
        }
  
        // 3. Fallback (stare dane)
        if (jsonData.ghostData?.locations && Array.isArray(jsonData.ghostData.locations)) {
             return jsonData.ghostData.locations.map((loc: any, idx: number) => ({
                id: `legacy_ghost_${idx}`,
                type: 'soft_location',
                lat: loc.lat,
                lng: loc.lng,
                timestamp: 0,
                dateStr: 'Lokalizacja w tle',
                thumbnailUrl: '',
                locationName: loc.name,
                postUrl: ''
             }));
        }
  
        return [];
      } catch (error) {
        console.error('[GeoMapper] Błąd parsowania danych mapy:', error);
        return [];
      }
    }
}
