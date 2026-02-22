import { Page, HTTPResponse } from 'puppeteer';

export interface GhostData {
    instagramPk?: string;
    isBusiness?: boolean;
    businessEmail?: string;
    businessPhone?: string;
    categoryName?: string;
    externalUrl?: string;
    locations: Array<{
        name: string;
        lat: number;
        lng: number;
        address?: string;
        city?: string;
    }>;
    taggedUsers: Array<{
        username: string;
        fullName?: string;
        pk: string;
    }>;
}

/**
 * Podpina nasłuch sieciowy pod stronę.
 * WV2: Agresywna inspekcja JSON (niezależna od zmian URL Instagrama)
 */
export async function attachNetworkInterceptor(page: Page): Promise<GhostData> {
    const collectedData: GhostData = {
        locations: [],
        taggedUsers: []
    };

    // Nasłuchujemy odpowiedzi serwera
    page.on('response', async (response: HTTPResponse) => {
        const url = response.url();
        const headers = response.headers();
        const contentType = headers['content-type'] || '';

        // Filtrujemy tylko JSON-y, ignorujemy fonty, obrazki itp.
        if (contentType.includes('application/json')) {
            try {
                // Niektóre odpowiedzi są puste (204) lub pre-flight, ignorujemy
                if (response.request().method() === 'OPTIONS') return;

                // Klonujemy JSON
                const json = await response.json();
                
                // === STRATEGIA 1: GŁĘBOKIE SZUKANIE OBIEKTU UŻYTKOWNIKA ===
                // Instagram zwraca dane w różnych miejscach: data.user, graphql.user, user
                const userObj = json.data?.user || json.user || json.graphql?.user;

                if (userObj) {
                    // Sprawdzamy, czy to jest obiekt profilu (musi mieć username lub id)
                    if (userObj.username || userObj.id || userObj.pk) {
                        
                        // 1. Ghost Data (PK, Email, Telefon)
                        if (userObj.id || userObj.pk) collectedData.instagramPk = userObj.id || userObj.pk;
                        
                        if (userObj.is_business_account !== undefined) collectedData.isBusiness = userObj.is_business_account;
                        
                        // Tutaj łapiemy dane, niezależnie od nazwy endpointu
                        if (userObj.public_email) {
                            collectedData.businessEmail = userObj.public_email;
                            console.log(`[Interceptor]  Przechwycono Email: ${userObj.public_email}`);
                        }
                        
                        if (userObj.contact_phone_number) {
                            collectedData.businessPhone = userObj.contact_phone_number;
                            console.log(`[Interceptor]  Przechwycono Telefon: ${userObj.contact_phone_number}`);
                        }
                        
                        if (userObj.category_name) collectedData.categoryName = userObj.category_name;
                        
                        if (userObj.external_url) collectedData.externalUrl = userObj.external_url;
                    }
                }

                // === STRATEGIA 2: LOKALIZACJE I TAGI (FEED/TIMELINE) ===
                // Szukamy tablicy 'edges' lub 'items', która zawiera posty
                const items = json.items || 
                              json.data?.user?.edge_owner_to_timeline_media?.edges || 
                              json.edge_owner_to_timeline_media?.edges || 
                              [];

                if (Array.isArray(items) && items.length > 0) {
                    for (const item of items) {
                        const node = item.node || item; // Obsługa różnic w strukturze

                        // Geolokalizacja
                        if (node.location) {
                            const loc = node.location;
                            const exists = collectedData.locations.some(l => l.name === loc.name);
                            if (!exists && loc.lat && loc.lng) {
                                collectedData.locations.push({
                                    name: loc.name,
                                    lat: loc.lat,
                                    lng: loc.lng,
                                    address: loc.address,
                                    city: loc.city
                                });
                            }
                        }

                        // Oznaczeni użytkownicy
                        if (node.usertags?.in?.length) {
                            node.usertags.in.forEach((tag: any) => {
                                const u = tag.user;
                                if (u && u.username && !collectedData.taggedUsers.some(tu => tu.username === u.username)) {
                                    collectedData.taggedUsers.push({
                                        username: u.username,
                                        fullName: u.full_name,
                                        pk: u.pk || u.id
                                    });
                                }
                            });
                        }
                    }
                }

            } catch (e) {
                // Ignorujemy błędy parsowania (nie każdy JSON to API Instagrama !!!)
            }
        }
    });

    return collectedData;
}
