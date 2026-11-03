/**
 * In-app updates from GitHub (docs/dev/history/technical-design-in-app-updates.md §2): which
 * release counts, whether it is newer than the running build, when the daily check runs, the
 * notice rule, the download's file name and the texts the user sees. Pure; the fetch and the
 * download are in storage/updates.ts, the native download in KeptUpdateModule.kt.
 *
 * Kept never installs anything: it saves the official `.snplg` into `MyStyle/kept-gtd/`, and
 * the Supernote's own Settings → Plugins → Add plugin installs it.
 */
import {BuildVersionInfo} from './buildVersionText';

export const UPDATE_REPO = 'tilmanbergt/kept-gtd';
export const LATEST_RELEASE_URL = `https://api.github.com/repos/${UPDATE_REPO}/releases/latest`;
/** Where downloads go, relative to the internal storage root; Add plugin lists MyStyle's subfolders. */
export const UPDATE_FOLDER = 'MyStyle/kept-gtd';
export const UPDATE_DISCLAIMER =
  'Releases on GitHub are not reviewed or approved by Ratta. You install them at your own risk. ' +
  'Each release is tested to keep your data safe.';
/** "Once a day", tolerant of opening Kept a little earlier than the day before. */
export const AUTO_CHECK_INTERVAL_MS = 20 * 60 * 60 * 1000;
/** A `.snplg` is a few MB; anything above this is not one of ours. */
export const MAX_ASSET_BYTES = 50 * 1024 * 1024;

export type UpdateCheckMode = 'manual' | 'daily';

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const RELEASE_TAG = /^v(\d+\.\d+\.\d+)$/;
const SHA256_DIGEST = /^sha256:([0-9a-f]{64})$/;
const ASSET_URL_PREFIX = `https://github.com/${UPDATE_REPO}/releases/download/`;

/**
 * -1, 0 or 1 for two "x.y.z" versions; throws on anything else. The same rule as
 * scripts/lib/versioning.mjs's compareVersions (pinned by a shared table in the tests).
 */
export function compareVersions(a: string, b: string): number {
  const pa = SEMVER.exec(a);
  const pb = SEMVER.exec(b);
  if (!pa || !pb) throw new Error(`not x.y.z versions: "${a}", "${b}"`);
  for (let i = 1; i <= 3; i++) {
    const d = Number(pa[i]) - Number(pb[i]);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** The release a build is, for comparing: an alpha or beta towards X.Y.Z is older than X.Y.Z itself. */
export interface RunningVersion {
  core: string;
  preRelease: boolean;
}

/** What the "Update test: treat this build as 0.0.0" switch makes the build look like. */
export const TEST_RUNNING_VERSION: RunningVersion = {core: '0.0.0', preRelease: false};

/** Release → {version, false}; towards nextVersion with a stage → {nextVersion, true}; a +dev build → {version, false} (it is at least that release). */
export function runningVersion(b: BuildVersionInfo): RunningVersion {
  if (b.release) return {core: b.version, preRelease: false};
  if (b.nextVersion && b.stage && SEMVER.test(b.nextVersion)) return {core: b.nextVersion, preRelease: true};
  return {core: b.version, preRelease: false};
}

/** `version` is newer than the running build: a higher core, or the same core while running an alpha or beta of it. */
export function isNewer(version: string, running: RunningVersion): boolean {
  const c = compareVersions(version, running.core);
  return c > 0 || (c === 0 && running.preRelease);
}

export interface UpdateAsset {
  name: string;
  url: string;
  size: number;
  /** Lowercase hex. */
  sha256: string;
}

export interface AvailableUpdate {
  version: string;
  tag: string;
  publishedAt: string | null;
  /** The release body (markdown), trimmed. */
  notes: string;
  asset: UpdateAsset;
}

/** A refusal's `reason` is for the log, never shown. */
export type ReleaseParse = {ok: true; update: AvailableUpdate} | {ok: false; reason: string};

/** "kept-gtd-0.26.0.snplg". */
export function assetName(version: string): string {
  return `kept-gtd-${version}.snplg`;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/**
 * GitHub's `/releases/latest` answer, read strictly: not a draft or pre-release, tag `vX.Y.Z`,
 * exactly one `.snplg` asset and it is named `kept-gtd-X.Y.Z.snplg`, size above 0 and at most
 * MAX_ASSET_BYTES, digest `sha256:<64 hex>`, download URL https on this repository's releases.
 * A release without a digest is refused, not trusted: every asset `gh release create` uploads has one.
 */
export function parseLatestRelease(json: unknown): ReleaseParse {
  const r = record(json);
  if (!r) return {ok: false, reason: 'not an object'};
  if (r.draft !== false) return {ok: false, reason: 'draft'};
  if (r.prerelease !== false) return {ok: false, reason: 'pre-release'};
  const tag = typeof r.tag_name === 'string' ? r.tag_name : '';
  const tagMatch = RELEASE_TAG.exec(tag);
  if (!tagMatch) return {ok: false, reason: `tag "${tag.slice(0, 40)}"`};
  const version = tagMatch[1];
  const assets = Array.isArray(r.assets) ? r.assets.map(record) : [];
  const plugins = assets.filter(a => typeof a?.name === 'string' && (a.name as string).endsWith('.snplg'));
  if (plugins.length !== 1) return {ok: false, reason: `${plugins.length} .snplg assets`};
  const a = plugins[0] as Record<string, unknown>;
  if (a.name !== assetName(version)) return {ok: false, reason: `asset named "${String(a.name).slice(0, 60)}"`};
  const size = typeof a.size === 'number' ? a.size : 0;
  if (!(size > 0) || size > MAX_ASSET_BYTES || !Number.isInteger(size)) return {ok: false, reason: `asset size ${size}`};
  const digest = typeof a.digest === 'string' ? SHA256_DIGEST.exec(a.digest.toLowerCase()) : null;
  if (!digest) return {ok: false, reason: 'asset without a sha256 digest'};
  const url = typeof a.browser_download_url === 'string' ? a.browser_download_url : '';
  if (!url.startsWith(ASSET_URL_PREFIX)) return {ok: false, reason: 'asset URL not on this repository'};
  return {
    ok: true,
    update: {
      version,
      tag,
      publishedAt: typeof r.published_at === 'string' ? r.published_at : null,
      notes: typeof r.body === 'string' ? r.body.trim() : '',
      asset: {name: a.name, url, size, sha256: digest[1]},
    },
  };
}

/** The daily check is due: switched on, and no successful check in the last AUTO_CHECK_INTERVAL_MS (or the clock went back). */
export function shouldAutoCheck(mode: UpdateCheckMode, lastCheckAt: number | null, now: number): boolean {
  if (mode !== 'daily') return false;
  if (lastCheckAt === null) return true;
  return now - lastCheckAt >= AUTO_CHECK_INTERVAL_MS || now < lastCheckAt;
}

/** The notice shows unless the user said Not now to exactly this version. */
export function shouldNotify(update: AvailableUpdate, dismissedVersion: string | null): boolean {
  return update.version !== dismissedVersion;
}

/** The `attempt`-th name a download may take: 1 → "kept-gtd-0.26.0.snplg", 2 → "kept-gtd-0.26.0 (2).snplg", … */
export function downloadFileName(version: string, attempt: number): string {
  return attempt <= 1 ? assetName(version) : `kept-gtd-${version} (${attempt}).snplg`;
}

/** How many names a download tries before giving up (the folder is full of different files of that name). */
export const MAX_NAME_ATTEMPTS = 20;

/** The outcome of one check (storage/updates.ts's checkForUpdate). */
export type UpdateCheckResult =
  | {kind: 'upToDate'; version: string}
  | {kind: 'available'; update: AvailableUpdate}
  | {kind: 'noPermission'}
  | {kind: 'noRelease'}
  | {kind: 'rateLimited'}
  | {kind: 'unusable'}
  | {kind: 'error'};

/** The outcome of one download (storage/updates.ts's downloadUpdate); paths are relative to the storage root. */
export type UpdateDownloadResult =
  | {kind: 'saved'; path: string}
  | {kind: 'already'; path: string}
  | {kind: 'noPermission'}
  | {kind: 'mismatch'}
  | {kind: 'notSupported'}
  | {kind: 'error'};

export function availableText(version: string): string {
  return `Kept GTD ${version} is available.`;
}

/** The status slot's sentence for a check (U3). */
export function checkResultText(result: UpdateCheckResult): string {
  switch (result.kind) {
    case 'upToDate':
      return `Kept GTD is up to date (${result.version}).`;
    case 'available':
      return availableText(result.update.version);
    case 'noPermission':
      return "Kept can't check for updates without internet access.";
    case 'noRelease':
      return 'No release of Kept GTD found on GitHub.';
    case 'rateLimited':
      return 'GitHub is not answering more requests right now. Try again in an hour.';
    case 'unusable':
      return "The latest release can't be checked; download it from GitHub instead.";
    case 'error':
      return "Can't reach GitHub. Check the Wi-Fi and try again.";
  }
}

/** How to install, said plainly (U8); also on the Settings help page. */
export const INSTALL_HINT = 'To install: close Kept, then Settings → Plugins → Add plugin → choose this file. Your data stays where it is.';

/** The status slot's sentence for a download (U6, U8). */
export function downloadResultText(result: UpdateDownloadResult): string {
  switch (result.kind) {
    case 'saved':
      return `Saved to ${result.path}. ${INSTALL_HINT}`;
    case 'already':
      return `Already downloaded: ${result.path}. ${INSTALL_HINT}`;
    case 'noPermission':
      return "Kept can't download without internet access and permission to save files.";
    case 'mismatch':
      return "The download didn't match the release on GitHub, so nothing was saved. Try again later.";
    case 'notSupported':
      return 'Downloading updates needs a newer build of Kept GTD.';
    case 'error':
      return 'The download failed, nothing was saved. Check the Wi-Fi and try again.';
  }
}

/** "Downloading Kept GTD 0.26.0 (4.2 MB)…" - no progress bar on e-ink. */
export function downloadingText(update: AvailableUpdate): string {
  const mb = (update.asset.size / (1024 * 1024)).toFixed(1);
  return `Downloading Kept GTD ${update.version} (${mb} MB)…`;
}
