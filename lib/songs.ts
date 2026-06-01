export interface Song {
  id: number;
  title: string;
  artist: string;
  duration: string;
  src: string;
  mood?: string | null;
}
