
export enum Language {
  HINDI = 'hi',
  ENGLISH = 'en',
  MARATHI = 'mr',
  RAJASTHANI = 'rj'
}

export interface FarmerProfile {
  name: string;
  mobile: string;
  password?: string;
  state: string;
  district: string;
  landSize: string;
  cropPreference: string[];
}

export interface CropTask {
  id: string;
  crop: string;
  task: string;
  dueDate: string;
  isCompleted: boolean;
  priority: 'High' | 'Medium' | 'Low';
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: 'Seeds' | 'Fertilizers' | 'Pesticides' | 'Labor' | 'Other';
}

export interface MandiPrice {
  commodity: string;
  market: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  arrivalDate: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
