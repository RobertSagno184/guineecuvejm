export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'client' | 'gérant';
}


