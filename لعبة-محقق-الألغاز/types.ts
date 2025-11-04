export interface StoryScene {
  scene: string;
  choices: string[];
  isEnding: boolean;
  sceneType?: 'neutral' | 'positive' | 'negative' | 'suspense';
}

export enum GameState {
  Start,
  Playing,
  End,
}
