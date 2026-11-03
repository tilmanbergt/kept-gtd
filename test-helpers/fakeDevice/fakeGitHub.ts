/**
 * GitHub's release API and the KeptUpdate native module on the fake device
 * (docs/dev/history/technical-design-in-app-updates.md §8): `fetch` answers the latest-release
 * request from `release` (null: 404), the module "downloads" the asset's text into the
 * FakeFs's private temp folder and copies it into MyStyle the way KeptUpdateModule.kt does.
 * Digests are real SHA-256 of the fake contents.
 */
import {createHash} from 'crypto';
import {FakeFs, PRIVATE_DIR} from './fakeFs';

const MY_STYLE = '/storage/emulated/0/MyStyle/';
const TMP = `${PRIVATE_DIR}/tmp/`;

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export class FakeGitHub {
  /** The latest release's JSON, as GitHub's API returns it; null answers 404. */
  release: unknown = null;
  /** An HTTP status to answer instead (403 rate limit, 500), or 'offline'. */
  failWith: number | 'offline' | null = null;
  /** Every URL fetched, in order. */
  readonly requests: string[] = [];
  /** The asset content behind each download URL. */
  readonly assets = new Map<string, string>();
  /** Download URLs whose bytes arrive changed (a mismatch). */
  readonly corrupt = new Set<string>();

  constructor(private fs: FakeFs) {}

  /** A good release `version` with one asset whose content is `content`. */
  publish(version: string, content = `snplg ${version} `.repeat(1000)): void {
    const url = `https://github.com/tilmanbergt/kept-gtd/releases/download/v${version}/kept-gtd-${version}.snplg`;
    this.assets.set(url, content);
    this.release = {
      draft: false,
      prerelease: false,
      tag_name: `v${version}`,
      published_at: '2026-11-20T10:00:00Z',
      body: `### New\n- Release ${version} for the scenario`,
      assets: [{name: `kept-gtd-${version}.snplg`, size: content.length, digest: `sha256:${sha256(content)}`, browser_download_url: url}],
    };
  }

  readonly fetch = async (url: string): Promise<{status: number; ok: boolean; json: () => Promise<unknown>}> => {
    this.requests.push(url);
    if (this.failWith === 'offline') throw new TypeError('Network request failed');
    const status = this.failWith ?? (this.release ? 200 : 404);
    return {status, ok: status === 200, json: async () => this.release};
  };

  readonly module = {
    download: async (url: string, fileName: string, maxBytes: number) => {
      this.requests.push(url);
      const content = this.assets.get(url);
      if (content === undefined) throw Object.assign(new Error('E_HTTP_404'), {code: 'E_HTTP_404'});
      if (content.length > maxBytes) throw Object.assign(new Error('E_TOO_LARGE'), {code: 'E_TOO_LARGE'});
      const arrived = this.corrupt.has(url) ? `${content.slice(0, -1)}!` : content;
      const path = `${TMP}${fileName}`;
      this.fs.put(path, arrived);
      return {path, size: arrived.length, sha256: sha256(arrived)};
    },
    sha256File: async (path: string) => {
      const content = this.fs.get(path);
      if (content === undefined) throw new Error(`no file ${path}`);
      return sha256(content);
    },
    copyIntoFolder: async (fromPath: string, toFolder: string, fileName: string) => {
      if (!fromPath.startsWith(TMP)) throw Object.assign(new Error('E_NOT_TEMP'), {code: 'E_NOT_TEMP'});
      if (!`${toFolder}/`.startsWith(MY_STYLE) || toFolder === MY_STYLE.slice(0, -1)) throw Object.assign(new Error('E_NOT_MY_STYLE'), {code: 'E_NOT_MY_STYLE'});
      const dest = `${toFolder}/${fileName}`;
      if (this.fs.exists(dest)) throw Object.assign(new Error('E_DEST_EXISTS'), {code: 'E_DEST_EXISTS'});
      const content = this.fs.get(fromPath);
      if (content === undefined) throw new Error(`no file ${fromPath}`);
      this.fs.put(dest, content);
      return dest;
    },
  };
}
