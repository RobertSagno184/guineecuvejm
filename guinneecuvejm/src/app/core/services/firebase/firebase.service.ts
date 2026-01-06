import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { Storage } from '@angular/fire/storage';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  readonly auth = inject(Auth);
  readonly firestore = inject(Firestore);
  readonly storage = inject(Storage);
}


