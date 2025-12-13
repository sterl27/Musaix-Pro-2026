export enum GenerationStatus {
  IDLE = 'IDLE',
  GENERATING_TEXT = 'GENERATING_TEXT',
  GENERATING_IMAGE = 'GENERATING_IMAGE',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface SongConcept {
  title: string;
  style: string;
  bpm: number;
  key: string;
  lyrics: string[];
  chords: string[];
  description: string;
  moodAnalysis: {
    energy: number;
    valence: number;
    danceability: number;
    acousticness: number;
    instrumentalness: number;
  }
}

export interface GeneratedAsset {
  concept: SongConcept | null;
  coverArtUrl: string | null;
  status: GenerationStatus;
  error: string | null;
}

export interface NavItem {
  label: string;
  href: string;
}

export enum View {
  HOME = 'HOME',
  APP = 'APP',
  LOGIN = 'LOGIN',
  SIGNUP = 'SIGNUP'
}