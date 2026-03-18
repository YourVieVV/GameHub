import { LucideIcon } from 'lucide-react-native';

export interface Game {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  route: string;
  color: string;
}

export interface SettingsState {
  volume: number;
  notifications: boolean;
}
