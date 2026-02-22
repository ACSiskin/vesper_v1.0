import { scrapeProfile, closeSocialBotSession } from '@/core/scraper-engine'; 
import { AiAnalyst, StorageService, TargetRepository, LeakService } from './services'; 
import { ScrapedProfileData, ScanResult } from './types';
import { VesperLogger } from './logger';

export class VesperActions {
  
  static async executeScan(
    username: string, 
    mode: 'quick' | 'deep', 
    postLimit: number,
    logger: VesperLogger
  ): Promise<ScanResult> {
    
    // Normalizacja nazwy użytkownika (to jest nasze ID)
    const cleanUsername = username.replace('@', '').toLowerCase().trim();
    
    await logger.log('SocialBot', `Inicjalizacja sesji dla celu: ${cleanUsername}...`, '[*]');
    await logger.delay(500); 

    const logBridge = (msg: string) => {
        if (msg.includes('post')) logger.log('DeepDive', msg, '[>]');
        else if (msg.includes('Analiza')) logger.log('Extractor', msg, '[i]');
        else logger.log('SocialBot', msg, '[#]');
    };

    try {
        // --- KROK 1: SCRAPING ---
        // @ts-ignore
        const rawData = await scrapeProfile(cleanUsername, mode, postLimit, logBridge);
        
        const { ghostData, ...profileCore } = rawData;
        const profileData = profileCore as ScrapedProfileData;

        await logger.log('SocialBot', `Pobrano dane: ${profileData.stats.posts} postów, ${profileData.stats.followers} obs.`, '[+]');

        // --- KROK 2: AI ANALIZA ---
        const aiAnalysis = await AiAnalyst.generatePsychologicalProfile(cleanUsername, profileData, logger);
        rawData.aiAnalysis = aiAnalysis;

        // --- KROK 3: ZAPIS ---
        await logger.log('System', 'Zrzut pamięci na dysk...', '[S]');
        const sessionPath = await StorageService.saveScanSession(cleanUsername, rawData);

        // --- KROK 4: BAZA DANYCH ---
        await logger.log('System', 'Aktualizacja rejestru celów...', '[D]');
        const savedTarget = await TargetRepository.upsertTarget(
          cleanUsername,
          profileData,
          ghostData,
          sessionPath,
          rawData
        );

        // --- KROK 5: DETEKCJA WYCIEKÓW (IDENTITY VAULT) ---
        await logger.log('BreachHunter', 'Analiza cyfrowego cienia (LeakCheck API)...', '[?]');
        
        let leaksFound = 0;
        const foundBreaches = [];

        // A. Wektor Email (Pewniak - High Confidence)
        const emailToCheck = ghostData?.businessEmail || ghostData?.publicEmail;
        if (emailToCheck) {
            await logger.log('BreachHunter', `Weryfikacja adresu email: ${emailToCheck}`, '[email]');
            const emailBreaches = await LeakService.searchBreaches(emailToCheck, 'email');
            foundBreaches.push(...emailBreaches);
        }

        // B. Wektor Username (Poszlaka - Low Confidence)
        const userBreaches = await LeakService.searchBreaches(cleanUsername, 'username');
        foundBreaches.push(...userBreaches);

        // C.  Wektor Full Name (Low Confidence) 
        // Jeśli scraper znalazł Imię i Nazwisko w profilu, szukamy też tego!
        if (profileData.fullName && profileData.fullName.toLowerCase() !== cleanUsername) {
            await logger.log('BreachHunter', `Weryfikacja tożsamości: "${profileData.fullName}"`, '[name]');
            const nameBreaches = await LeakService.searchBreaches(profileData.fullName, 'username');
            foundBreaches.push(...nameBreaches);
        }

        if (foundBreaches.length > 0) {
            await LeakService.saveBreaches(savedTarget.id, foundBreaches);
            leaksFound = foundBreaches.length;
            await logger.log('BreachHunter', `Wykryto ${leaksFound} potencjalnych wycieków danych.`, '[!]');
        } else {
            await logger.log('BreachHunter', 'Brak znanych wycieków w rejestrach.', '[ok]');
        }
        
        // Pobieramy zaktualizowany obiekt (z relacją breaches)
        const finalTarget = await TargetRepository.getAllTargets().then(ts => ts.find(t => t.id === savedTarget.id));

        await logger.log('Session', 'Sesja bota aktywna (STATUS: IDLE). Oczekiwanie na polecenia...', '[*]');

        return {
          message: `Cel ${cleanUsername} przetworzony. Wycieki: ${leaksFound}.`,
          target: {
            ...finalTarget,
            // Nadpisujemy pola frontendowe
            fullName: profileData.fullName || finalTarget?.fullName,
            avatarUrl: profileData.profilePicUrl,
            stats: profileData.stats,
            aiAnalysis: aiAnalysis,
            recentMedia: profileData.recentMedia,
            breaches: finalTarget?.breaches || [] 
          }
        };

    } catch (error: any) {
        await logger.log('Error', `Błąd krytyczny skanera: ${error.message}`, '[!]');
        throw error; 
    }
  }

  // --- RĘCZNE SZUKANIE WYCIEKÓW ---
  static async manualLeakSearch(
    targetUsername: string, 
    query: string, 
    logger: VesperLogger
  ) {
    const cleanUsername = targetUsername.replace('@', '').toLowerCase().trim();

    await logger.log('BreachHunter', `Ręczne poszukiwanie: "${query}" dla celu [${cleanUsername}]...`, '[search]');

    // 1. Znajdź cel w bazie
    const targets = await TargetRepository.getAllTargets();
    const existingTarget = targets.find(t => t.username.toLowerCase() === cleanUsername);

    if (!existingTarget) {
        await logger.log('Error', `Nie znaleziono celu ${cleanUsername} w bazie. Najpierw wykonaj skan profilu.`, '[!]');
        return "Błąd: Cel nie istnieje.";
    }

    try {
        // 2. Szukaj w API (tryb username = low confidence, szukanie po frazie)
        const newBreaches = await LeakService.searchBreaches(query, 'username');

        if (newBreaches.length > 0) {
            // 3. Zapisz wyniki podpinając je pod istniejące ID celu
            await LeakService.saveBreaches(existingTarget.id, newBreaches);
            await logger.log('BreachHunter', `Znaleziono i dodano ${newBreaches.length} nowych rekordów.`, '[+]');
        } else {
            await logger.log('BreachHunter', 'Brak wyników dla podanej frazy.', '[-]');
        }

        // 4. Pobierz odświeżony cel
        const updatedTarget = await TargetRepository.getAllTargets().then(ts => ts.find(t => t.id === existingTarget.id));

        return {
            message: `Wyszukiwanie "${query}" zakończone. Wyniki dodane do profilu.`,
            target: {
                ...updatedTarget,
                fullName: updatedTarget?.fullName || updatedTarget?.username,
                breaches: updatedTarget?.breaches || []
            }
        };

    } catch (e: any) {
        await logger.log('Error', `Błąd wyszukiwania: ${e.message}`, '[!]');
        throw e;
    }
  }

  static async terminateSession(logger?: VesperLogger) {
    if (logger) {
        await logger.log('SocialBot', 'Zamykanie kontekstu przeglądarki...', '[x]');
        await logger.delay(500);
        await logger.log('System', 'Czyszczenie pamięci podręcznej...', '[x]');
    }
    
    await closeSocialBotSession();
    
    if (logger) await logger.log('V.E.S.P.E.R.', 'Sesja zakończona. System offline.', 'END');
    
    return "Sesja zamknięta. Przeglądarka zatrzymana.";
  }
}
