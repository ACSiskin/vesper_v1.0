// core/scraper-engine/browser.ts
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

// Globalna zmienna przechowująca instancję przeglądarki (Hack dla środowiska Node.js)
declare global {
  var _browserInstance: any;
}

export class BrowserSession {
  
  static async getBrowser() {
    if (global._browserInstance) {
        // Sprawdzamy czy przeglądarka nadal żyje
        if (global._browserInstance.isConnected()) {
            console.log('[BrowserSession] Używam otwartej sesji przeglądarki.');
            return global._browserInstance;
        }
    }

    console.log('[BrowserSession] Uruchamiam nową instancję przeglądarki...');
    
    let executablePath: string;
    try { executablePath = puppeteer.executablePath(); } catch (e) { console.warn("Chrome path lookup failed"); }

    const browser = await puppeteer.launch({
      headless: true, // "new" - false dla debugowania
      executablePath: executablePath,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080', '--lang=pl-PL,pl'
      ],
      ignoreDefaultArgs: ['--enable-automation']
    });

    global._browserInstance = browser;
    return browser;
  }

  static async createPage(browser: any) {
    const page = await browser.newPage();
    
    // Stealth
    await page.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8' });

    // Cookies (Ładowanie tylko raz)
    const cookiesPath = path.resolve(process.cwd(), 'instagram_cookies.json');
    if (fs.existsSync(cookiesPath)) {
        try {
            const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf8'));
            await page.setCookie(...cookies);
        } catch (e) { console.error('Cookies error:', e); }
    }

    return page;
  }

  // Metoda do wywołania ręcznego, gdy użytkownik skończy pracę
  static async closeSession() {
      if (global._browserInstance) {
          await global._browserInstance.close();
          global._browserInstance = null;
          console.log('[BrowserSession] X Sesja zamknięta.');
      }
  }
}
