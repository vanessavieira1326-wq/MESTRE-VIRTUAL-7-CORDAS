
export enum Level {
  BEGINNER = 'Iniciante',
  INTERMEDIATE = 'Intermediário',
  ADVANCED = 'Avançado'
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  videoUrl: string;
  isCompleted: boolean;
  module: string;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  icon: string;
}

export interface Master {
  name: string;
  role: string;
  description: string;
  photoUrl: string;
  history: string;
  style: string;
}

export interface SheetMusic {
  id: string;
  title: string;
  composer: string;
  genre: 'Samba' | 'Choro' | 'Pagode';
  difficulty: Level;
  imageUrl: string;
}
