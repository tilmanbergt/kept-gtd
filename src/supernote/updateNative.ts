/**
 * JS surface of android/.../KeptUpdateModule.kt (native name "KeptUpdate"), the download half
 * of the in-app updater (docs/dev/history/technical-design-in-app-updates.md §5). `undefined`
 * on a build without the module; storage/updates.ts then reports "needs a newer build".
 * Permissions are asked by the caller (INTERNET before `download`, FILE:WRITE before
 * `copyIntoFolder`).
 */
import {NativeModules} from 'react-native';

export interface DownloadedFile {
  /** Absolute, inside the private temp folder. */
  path: string;
  size: number;
  /** Lowercase hex. */
  sha256: string;
}

export interface KeptUpdateNative {
  /** Streams an https URL (redirects must stay https) into `<private tmp>/<fileName>`; rejects above `maxBytes`. */
  download(url: string, fileName: string, maxBytes: number, userAgent: string): Promise<DownloadedFile>;
  /** Lowercase hex SHA-256 of a file. */
  sha256File(path: string): Promise<string>;
  /** Copies a private temp file into a folder below MyStyle/ through `.<name>.part` + rename; rejects E_DEST_EXISTS when `fileName` is taken. Resolves the final path. */
  copyIntoFolder(fromPath: string, toFolder: string, fileName: string): Promise<string>;
}

export function getKeptUpdateNative(): KeptUpdateNative | undefined {
  return (NativeModules as {KeptUpdate?: KeptUpdateNative}).KeptUpdate;
}
