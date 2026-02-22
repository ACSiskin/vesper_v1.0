export interface InstagramStats {
  followers: number;
  following: number;
  posts: number;
}

export interface GhostData {
  instagramPk?: string;
  isBusiness?: boolean;
  categoryName?: string;
  businessEmail?: string;
  businessPhone?: string;
  externalUrl?: string;
  locations?: Array<{
    name: string;
    lat: number;
    lng: number;
    address?: string;
    city?: string;
  }>;
}

export interface ScrapedProfileData {
  fullName?: string;
  bio?: string;
  profilePicUrl?: string;
  stats: InstagramStats;
  recentMedia: any[];
  postsAnalysis: any[];
  ghostData?: GhostData;
  aiAnalysis?: string;
}

export interface ScanResult {
  message: string;
  target: any;
}

// Nowy typ dla funkcji logującej (wstrzykiwanej do scrapera)
export type LogCallback = (component: string, message: string, emoji?: string) => void;

// DEFINICJA PROFILU (OBSŁUGA TABLIC I NOWYCH PÓL) 
export interface TargetProfile {
  id: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  
  // Ghost Data
  instagramPk?: string;
  isBusiness?: boolean;
  businessCategory?: string;
  publicEmail?: string;
  publicPhone?: string;
  externalUrl?: string;
  
  // Identity Vault (Verified)
  // Zmienione na tablice (String[]) aby obsługiwać wiele danych
  leakVerifiedEmails?: string[];
  leakVerifiedPhones?: string[];
  leakVerifiedPass?: string[];
  leakVerifiedIps?: string[];
  
  // Nowe pola (Single Value)
  leakVerifiedDob?: string | null;
  leakVerifiedAddress?: string | null;
  
  // Operational
  status?: string;
  risk?: string;
  notes?: string;
  lastScan?: string | Date;
  
  // Relations
  snapshots?: any[];
  locations?: any[];
  breaches?: any[];
  
  // Stats/Bio shortcut (z mapowania w route.ts)
  bio?: string;
  stats?: InstagramStats;
  aiAnalysis?: string;
  recentMedia?: any[];
  postsAnalysis?: any[];
}
