import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateAgo',
  standalone: true,
})
export class DateAgoPipe implements PipeTransform {
  transform(value: Date | string | number | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    const intervals: { [key: string]: number } = {
      année: 31536000,
      mois: 2592000,
      semaine: 604800,
      jour: 86400,
      heure: 3600,
      minute: 60,
      seconde: 1,
    };

    for (const key of Object.keys(intervals)) {
      const secondsInInterval = intervals[key];
      const counter = Math.floor(seconds / secondsInInterval);
      if (counter > 0) {
        return counter === 1 ? `il y a 1 ${key}` : `il y a ${counter} ${key}s`;
      }
    }

    return 'à l’instant';
  }
}


