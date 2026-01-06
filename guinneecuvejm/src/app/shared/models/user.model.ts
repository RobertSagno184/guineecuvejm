export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'client' | 'gérant';
  isActive?: boolean;
  photoURL?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
  createdBy?: string; // ID de l'utilisateur qui a créé ce compte
  roleHistory?: RoleChange[]; // Historique des changements de rôle
}

export interface RoleChange {
  previousRole: User['role'];
  newRole: User['role'];
  changedAt: Date;
  changedBy: string; // ID de l'utilisateur qui a effectué le changement
  reason?: string;
}


