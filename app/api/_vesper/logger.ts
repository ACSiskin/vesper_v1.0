import { LogCallback } from './types';

/**
 * Klasa pomocnicza do formatowania logów w stylu terminalowym.
 */
export class VesperLogger {
  private streamWriter: WritableStreamDefaultWriter<any> | null = null;
  private encoder = new TextEncoder();

  constructor(writer?: WritableStreamDefaultWriter<any>) {
    if (writer) {
      this.streamWriter = writer;
    }
  }

  /**
   * Główna funkcja logująca. Wysyła sformatowany ciąg do strumienia.
   */
  async log(component: string, message: string, emoji: string = 'ℹ️') {
    const timestamp = new Date().toLocaleTimeString('pl-PL', { hour12: false });
    const formattedLine = `[${timestamp}] ${emoji} [${component}] ${message}\n`;
    
    console.log(formattedLine.trim()); // Zawsze loguj też na serwerze (dla admina)

    if (this.streamWriter) {
      // Wysyłamy do klienta jako specjalny event strumienia
      // Format: "LOG:Tresc_logu" - frontend musi to obsłużyć
      await this.streamWriter.write(this.encoder.encode(`LOG:${formattedLine}`));
    }
  }

  /**
   * Symuluje opóźnienie, żeby użytkownik zdążył przeczytać logi (Hollywood effect)
   */
  async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
