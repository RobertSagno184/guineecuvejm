export function buildExportFileName(base: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${base}_${date}`;
}


