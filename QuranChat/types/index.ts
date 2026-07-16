export interface Verse {
  id?: string;
  arabic: string;
  translation: string;
  reference: string;
  tafsir?: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  verse?: Verse;
}

export interface HistoryItem {
  id: string;
  text: string;
  type: 'search' | 'chat';
}