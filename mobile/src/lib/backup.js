import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { strToU8, zipSync, unzipSync, strFromU8 } from 'fflate';
import * as base64 from 'base64-js';
import { todayISO } from './format';
import { isOpenGymBackup, normalizeState } from '../store';
import { parseImport } from './import-csv';

export async function exportBackup(state) {
  const jsonStr = JSON.stringify(state, null, 2);
  const zipData = zipSync({ 'opengym-backup.json': strToU8(jsonStr) });
  const b64 = base64.fromByteArray(zipData);
  const uri = `${FileSystem.cacheDirectory}opengym-backup-${todayISO()}.zip`;
  await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
  if (!await Sharing.isAvailableAsync()) throw new Error('Sharing is not available');
  await Sharing.shareAsync(uri, { mimeType: 'application/zip', dialogTitle: 'Export openGym backup', UTI: 'public.zip-archive' });
}
export async function pickBackup() {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'application/zip', 'application/x-zip-compressed', '*/*'], copyToCacheDirectory: true });
  if (result.canceled) return null;
  const uri = result.assets[0].uri;
  let raw = '';
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const buffer = base64.toByteArray(b64);
    if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B) {
      const unzipped = unzipSync(buffer);
      const jsonFile = Object.keys(unzipped).find(name => name.endsWith('.json'));
      if (!jsonFile) throw new Error('No JSON found in ZIP');
      raw = strFromU8(unzipped[jsonFile]);
    } else {
      raw = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
    }
  } catch (error) {
    raw = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  }
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
