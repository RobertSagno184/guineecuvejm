import { Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// Simple placeholder implementation; à adapter avec la vraie logique d'auth
export const authGuard: CanActivateFn = (route, state) => {
  // TODO: inject AuthService via inject() et vérifier l'état d'authentification
  console.warn('authGuard utilisé sans logique réelle, à implémenter.');
  return true;
};


