import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { prisma } from '@/lib/db';
import { ScrapedProfileData, GhostData } from './types';
import { VesperLogger } from './logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- SERWIS PLIKOWY ---
export class StorageService {
  static async saveScanSession(username: string, data: any): Promise<string> {
    const safeUsername = username.replace(/[^a-zA-Z0-9._-]/g, '');
    const dir = path.join(process.cwd(), 'public', 'scrapes', safeUsername);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(dir, filename);
    await fs.promises.writeFile(filepath, JSON.stringify(data, null, 2));
    
    return `/scrapes/${safeUsername}/${filename}`;
  }
}

// --- SERWIS AI ---
export class AiAnalyst {
  static async generatePsychologicalProfile(username: string, data: ScrapedProfileData, logger?: VesperLogger): Promise<string> {
    
    if (logger) await logger.log('AI_Profiler', 'Behavioral analysis initiated...', '[*]');

    const postsContext = data.postsAnalysis 
      ? data.postsAnalysis.map((p: any) => `[Post]: ${p.caption}`).join('\n')
      : "Brak treści postów.";

    const textToAnalyze = `
      TARGET: ${username}
      BIO: ${data.bio || 'Brak bio'}
      STATS: ${JSON.stringify(data.stats)}
      CONTENT SAMPLE:
      ${postsContext}
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an intelligence analyst (OSINT). Create a concise psychological profile of the target." }, 
          { role: "user", content: textToAnalyze }
        ]
      });
      
      if (logger) await logger.log('AI_Profiler', 'Profile generated successfully.', '[+]');
      return response.choices[0].message.content || "No analysis available.";
    } catch (e) {
      if (logger) await logger.log('AI_Profiler', 'Profile generation error.', '[!]');
      return "AI profile generation error.";
    }
  }
}

// =========================================================
// --- MODUŁ IDENTITY VAULT (Agregator Wycieków) ---
// =========================================================

// Interfejs wspólny dla wszystkich dostawców
interface LeakProvider {
    name: string;
    search(query: string, type: 'email' | 'username'): Promise<any[]>;
}

// 1. DOSTAWCA: LEAKCHECK.IO
class LeakCheckProvider implements LeakProvider {
    name = 'LeakCheck.io';
    private apiKey = process.env.LEAKCHECK_API_KEY;

    async search(query: string, type: 'email' | 'username'): Promise<any[]> {
        if (!this.apiKey) return [];
        try {
            const res = await fetch(`https://leakcheck.io/api/v2/query/${query}`, {
                headers: { 'X-API-Key': this.apiKey }
            });
            const data = await res.json();
            if (!data.success || !data.result) return [];

            return data.result.map((item: any) => ({
                sourceName: item.source?.name || 'LeakCheck Unknown',
                breachDate: item.source?.breach_date || null,
                email: item.email,
                username: item.username,
                password: item.password,
                phone: item.phone,
                ip: item.ip,
                // LeakCheck rzadko zwraca DOB/Adres w standardowym polu, ale zostawiamy null
                dob: item.dob || null,
                address: item.address || null,
                searchQuery: query,
                confidence: type === 'email' ? 'HIGH' : 'LOW'
            }));
        } catch (e) {
            console.error(`[LeakCheck] Error:`, e);
            return [];
        }
    }
}

// 2. DOSTAWCA: LEAKOSINTAPI.COM
class LeakOsintProvider implements LeakProvider {
    name = 'LeakOsintAPI';
    private apiKey = process.env.LEAKOSINT_API_KEY;

    async search(query: string, type: 'email' | 'username'): Promise<any[]> {
        if (!this.apiKey) return [];

        try {
            const res = await fetch('https://leakosintapi.com/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: this.apiKey,
                    request: query,
                    limit: 100, 
                    lang: 'en',
                    type: 'json'
                })
            });

            const data = await res.json();
            
            if (data.error || !data.List) {
                return [];
            }

            const results: any[] = [];

            for (const [dbName, dbContent] of Object.entries(data.List as Record<string, any>)) {
                if (!dbContent.Data || !Array.isArray(dbContent.Data)) continue;

                for (const row of dbContent.Data) {
                    const keys = Object.keys(row);
                    
                    const emailKey = keys.find(k => k.toLowerCase().includes('mail'));
                    const userKey = keys.find(k => k.toLowerCase().includes('user') || k.toLowerCase().includes('login') || k.toLowerCase().includes('name'));
                    const passKey = keys.find(k => k.toLowerCase().includes('pass') || k.toLowerCase().includes('pwd'));
                    const phoneKey = keys.find(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile'));
                    const ipKey = keys.find(k => k.toLowerCase().includes('ip'));
                    
                    // Szukanie DOB i Adresu w dynamicznych kluczach
                    const dobKey = keys.find(k => k.toLowerCase().includes('dob') || k.toLowerCase().includes('birth'));
                    const addrKey = keys.find(k => k.toLowerCase().includes('address') || k.toLowerCase().includes('city') || k.toLowerCase().includes('country'));

                    results.push({
                        sourceName: dbName, 
                        breachDate: null,   
                        email: emailKey ? row[emailKey] : undefined,
                        username: userKey ? row[userKey] : undefined,
                        password: passKey ? row[passKey] : undefined,
                        phone: phoneKey ? row[phoneKey] : undefined,
                        ip: ipKey ? row[ipKey] : undefined,
                        dob: dobKey ? row[dobKey] : undefined,
                        address: addrKey ? row[addrKey] : undefined,
                        searchQuery: query,
                        confidence: type === 'email' ? 'HIGH' : 'LOW'
                    });
                }
            }
            return results;

        } catch (e) {
            console.error(`[LeakOsint] Connection Error:`, e);
            return [];
        }
    }
}

// 3. DOSTAWCA: SNUSBASE (Placeholder)
class SnusbaseProvider implements LeakProvider {
    name = 'Snusbase';
    private apiKey = process.env.SNUSBASE_API_KEY;

    async search(query: string, type: 'email' | 'username'): Promise<any[]> {
        if (!this.apiKey) return [];
        return []; 
    }
}

// --- GŁÓWNY SERWIS (AGREGATOR) ---
export class LeakService {
    // Rejestracja dostawców
    private static providers: LeakProvider[] = [
        new LeakCheckProvider(),
        new LeakOsintProvider(),
        new SnusbaseProvider()
    ];

    // 1. Agregacja wyników (Search All)
    static async searchBreaches(query: string, type: 'email' | 'username'): Promise<any[]> {
        const promises = this.providers.map(p => 
            p.search(query, type).catch(err => {
                console.error(`Błąd dostawcy ${p.name}:`, err);
                return []; 
            })
        );

        const results = await Promise.all(promises);
        return results.flat();
    }

    // 2. Zapisywanie wyników do bazy
    static async saveBreaches(targetId: string, breaches: any[]) {
        for (const breach of breaches) {
            const existing = await prisma.identityBreach.findFirst({
                where: {
                    targetId: targetId,
                    sourceName: breach.sourceName,
                    email: breach.email || undefined,
                    username: breach.username || undefined,
                    password: breach.password || undefined
                }
            });

            if (!existing) {
                await prisma.identityBreach.create({
                    data: {
                        targetId,
                        sourceName: breach.sourceName,
                        breachDate: breach.breachDate,
                        email: breach.email,
                        username: breach.username,
                        password: breach.password,
                        phone: breach.phone,
                        ip: breach.ip,
                        dob: breach.dob,          // <-- ZAPISUJEMY DOB
                        address: breach.address,  // <-- ZAPISUJEMY ADRES
                        searchQuery: breach.searchQuery,
                        confidence: breach.confidence,
                        isPromoted: false
                    }
                });
            }
        }
    }

    // 3. AWANSOWANIE DANYCH (Teraz obsługuje listy i nowe pola)
    static async promoteBreachToTarget(targetId: string, breachId: string) {
        const breach = await prisma.identityBreach.findUnique({ where: { id: breachId } });
        if (!breach) throw new Error("No breach record found.");

        const updateData: any = {
            risk: 'critical'
        };

        // Dodajemy do tablic (push) zamiast nadpisywać
        if (breach.email) updateData.leakVerifiedEmails = { push: breach.email };
        if (breach.phone) updateData.leakVerifiedPhones = { push: breach.phone };
        if (breach.ip)    updateData.leakVerifiedIps    = { push: breach.ip };
        if (breach.password) updateData.leakVerifiedPass = { push: breach.password };
        
        // Pola pojedyncze (nadpisujemy najnowszym)
        if (breach.dob)     updateData.leakVerifiedDob     = breach.dob;
        if (breach.address) updateData.leakVerifiedAddress = breach.address;

        await prisma.socialBotTarget.update({
            where: { id: targetId },
            data: updateData
        });

        await prisma.identityBreach.update({
            where: { id: breachId },
            data: { isPromoted: true }
        });

        return { success: true };
    }

    // 4. USUWANIE DANYCH Z NAGŁÓWKA (NOWOŚĆ)
    static async removeVerifiedData(targetId: string, type: string, value: string | null) {
        const target = await prisma.socialBotTarget.findUnique({ where: { id: targetId } });
        if (!target) throw new Error("Target does not exist.");

        const dataToUpdate: any = {};

        // Filtrujemy tablicę, usuwając wskazany element
        if (type === 'email') dataToUpdate.leakVerifiedEmails = target.leakVerifiedEmails.filter(e => e !== value);
        if (type === 'phone') dataToUpdate.leakVerifiedPhones = target.leakVerifiedPhones.filter(p => p !== value);
        if (type === 'ip')    dataToUpdate.leakVerifiedIps    = target.leakVerifiedIps.filter(i => i !== value);
        if (type === 'pass')  dataToUpdate.leakVerifiedPass   = target.leakVerifiedPass.filter(p => p !== value);
        
        // Czyścimy pola pojedyncze
        if (type === 'dob')     dataToUpdate.leakVerifiedDob = null;
        if (type === 'address') dataToUpdate.leakVerifiedAddress = null;

        await prisma.socialBotTarget.update({
            where: { id: targetId },
            data: { ...dataToUpdate, updatedAt: new Date() }
        });
        
        return { success: true };
    }
}

// --- SERWIS BAZODANOWY (TARGETY) ---
export class TargetRepository {
  static async upsertTarget(
    username: string, 
    profileData: ScrapedProfileData, 
    ghostData: GhostData | undefined,
    sessionPath: string,
    fullJsonData: any
  ) {
    const target = await prisma.socialBotTarget.upsert({
      where: { username },
      update: {
        fullName: profileData.fullName,
        instagramPk: ghostData?.instagramPk,
        isBusiness: ghostData?.isBusiness,
        businessCategory: ghostData?.categoryName,
        publicEmail: ghostData?.businessEmail,
        publicPhone: ghostData?.businessPhone,
        externalUrl: ghostData?.externalUrl,
        status: 'active',
        updatedAt: new Date(),
      },
      create: {
        username,
        fullName: profileData.fullName,
        instagramPk: ghostData?.instagramPk,
        isBusiness: ghostData?.isBusiness || false,
        businessCategory: ghostData?.categoryName,
        publicEmail: ghostData?.businessEmail,
        publicPhone: ghostData?.businessPhone,
        externalUrl: ghostData?.externalUrl,
        status: 'active',
      }
    });

    if (ghostData?.locations?.length) {
      await prisma.socialBotLocation.createMany({
        data: ghostData.locations.map((loc) => ({
          targetId: target.id,
          name: loc.name,
          lat: loc.lat, lng: loc.lng,
          address: loc.address, city: loc.city
        }))
      });
    }

    await prisma.socialBotSnapshot.create({
      data: {
        targetId: target.id,
        bio: profileData.bio,
        followerCount: profileData.stats.followers,
        followingCount: profileData.stats.following,
        localPath: sessionPath,
        rawJsonData: JSON.stringify(fullJsonData),
        scrapedAt: new Date()
      }
    });

    return target;
  }
  
  static async getAllTargets() {
    return prisma.socialBotTarget.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
            locations: { orderBy: { detectedAt: 'desc' }, take: 50 },
            snapshots: { orderBy: { scrapedAt: 'desc' }, take: 1 },
            breaches: { orderBy: { detectedAt: 'desc' } }
        }
    });
  }
}
