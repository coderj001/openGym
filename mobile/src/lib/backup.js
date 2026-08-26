import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { todayISO } from './format';
import { isOpenGymBackup, normalizeState } from '../store';
import { parseImport } from './import-csv';

export async function exportBackup(state) {
  const uri = `${FileSystem.cacheDirectory}opengym-backup-${todayISO()}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(state, null, 2));
  if (!await Sharing.isAvailableAsync()) throw new Error('Sharing is not available');
  await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export openGym backup', UTI: 'public.json' });
}
export async function pickBackup() {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (result.canceled) return null;
  const raw = await FileSystem.readAsStringAsync(result.assets[0].uri);
  const value = JSON.parse(raw);
  if (!isOpenGymBackup(value)) throw new Error('Not an openGym backup');
  return normalizeState(value);
}
export async function pickAppExport(unit) {
  const result = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/xml', 'application/xml', 'text/plain'], copyToCacheDirectory: true });
  if (result.canceled) return null;
  const raw = await FileSystem.readAsStringAsync(result.assets[0].uri);
  const parsed = parseImport(raw, { unit });
  if (parsed.error) throw new Error(parsed.error === 'unrecognised' ? 'Unrecognised export format' : parsed.error);
  return parsed;
}
