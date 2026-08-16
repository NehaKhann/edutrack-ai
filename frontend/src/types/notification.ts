export interface AppNotification {
  id: number;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}
