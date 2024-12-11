export interface VideoRecord {
  id: string;
  url: string;
  title: string;
  duration: string;
  markdownFile: string;
  createdAt: string;
  thumbnailUrl?: string | null;
  views?: string;
  author?: string | { name: string; [key: string]: any };
} 