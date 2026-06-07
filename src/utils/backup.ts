export type AutoBackupInterval = 'off' | 'hourly' | '6hours' | 'daily' | 'weekly' | 'monthly';

export interface BackupData {
  backupDate: string;
  version: number;
  data: Record<string, unknown>;
}

export interface AutoBackupSettings {
  interval: AutoBackupInterval;
  lastBackup: string | null;
}

const AUTO_BACKUP_KEY = 'spt_autobackup_settings';
const AUTO_BACKUP_DATA_KEY = 'spt_autobackup_data';

export function getAutoBackupSettings(): AutoBackupSettings {
  try {
    const stored = localStorage.getItem(AUTO_BACKUP_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { interval: 'off', lastBackup: null };
}

export function saveAutoBackupSettings(settings: AutoBackupSettings): void {
  localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(settings));
}

export function saveAutoBackupData(backup: BackupData): void {
  localStorage.setItem(AUTO_BACKUP_DATA_KEY, JSON.stringify(backup));
}

export function getAutoBackupData(): BackupData | null {
  try {
    const stored = localStorage.getItem(AUTO_BACKUP_DATA_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

export function getIntervalMs(interval: AutoBackupInterval): number | null {
  switch (interval) {
    case 'hourly': return 3600000;
    case '6hours': return 21600000;
    case 'daily': return 86400000;
    case 'weekly': return 604800000;
    case 'monthly': return 2592000000;
    default: return null;
  }
}

export function createBackup(sources: Record<string, unknown>): BackupData {
  return {
    backupDate: new Date().toISOString(),
    version: 2,
    data: { ...sources }
  };
}

export function downloadBackup(backup: BackupData): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = backup.backupDate.slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SPT-Backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed.version || !parsed.data) {
          reject(new Error('Invalid backup file format'));
          return;
        }
        resolve(parsed as BackupData);
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
