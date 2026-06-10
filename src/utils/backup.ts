import { supabase } from '../supabaseClient';

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

let autoBackupSettingsCache: AutoBackupSettings = { interval: 'off', lastBackup: null };
let autoBackupDataCache: BackupData | null = null;

export function getAutoBackupSettings(): AutoBackupSettings {
  return { ...autoBackupSettingsCache };
}

export function saveAutoBackupSettings(settings: AutoBackupSettings): void {
  autoBackupSettingsCache = { ...settings };
}

export function saveAutoBackupData(backup: BackupData): void {
  autoBackupDataCache = backup;
  persistAutoBackupToSupabase(backup);
}

export function getAutoBackupData(): BackupData | null {
  return autoBackupDataCache ? { ...autoBackupDataCache } : null;
}

export async function persistAutoBackupToSupabase(backup: BackupData): Promise<void> {
  try {
    const { data: existing } = await supabase.from('backups').select('id').eq('label', 'auto').maybeSingle();
    if (existing) {
      await supabase.from('backups').update({ data: backup as any, created_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('backups').insert({ data: backup as any, label: 'auto' });
    }
  } catch {}
}

export async function loadAutoBackupFromSupabase(): Promise<void> {
  try {
    const { data } = await supabase.from('backups').select('data').eq('label', 'auto').maybeSingle();
    if (data?.data) {
      const backup = data.data as BackupData;
      autoBackupDataCache = backup;
    }
  } catch {}
}

export async function persistBackupSettingsToSupabase(settings: AutoBackupSettings): Promise<void> {
  try {
    await supabase.from('system_config').upsert(
      { key: 'auto_backup_settings', value: JSON.stringify(settings) },
      { onConflict: 'key' }
    );
  } catch {}
}

export async function loadBackupSettingsFromSupabase(): Promise<void> {
  try {
    const { data } = await supabase.from('system_config').select('value').eq('key', 'auto_backup_settings').maybeSingle();
    if (data?.value) {
      const parsed = JSON.parse(data.value) as AutoBackupSettings;
      autoBackupSettingsCache = { ...parsed };
    }
  } catch {}
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
