export type TargetProfile = {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    status: 'active' | 'archived' | 'scanning' | 'error';
    risk: 'low' | 'med' | 'high' | 'unknown';
    lastScan: string | null;
    bio: string | null;
    stats: { 
      followers: number | null; 
      following: number | null; 
      posts: number | null 
    };
    tags: string[];
    aiAnalysis?: string | null;
    recentMedia?: { thumbnail: string; fullUrl: string; postUrl: string }[]; 
    postsAnalysis?: {
      url: string;
      date: string;
      caption: string;
      comments: string[];
      mediaUrl?: string;
      isVideo?: boolean;
    }[];
  };
  
export type ChatMessage = {
    role: string;
    txt: string;
};
