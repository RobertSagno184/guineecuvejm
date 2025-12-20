import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExportService {
  // TODO: implémenter l'export Excel/PDF (xlsx, jsPDF, etc.)
  exportToExcel(data: unknown[], fileName: string): void {
    console.warn('ExportService.exportToExcel non implémenté.');
  }

  exportToPdf(data: unknown[], fileName: string): void {
    console.warn('ExportService.exportToPdf non implémenté.');
  }
}


