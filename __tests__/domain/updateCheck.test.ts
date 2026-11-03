// docs/dev/history/technical-design-in-app-updates.md §2, §8: which release counts and whether it is newer.
// The agreement of compareVersions with scripts/lib/versioning.mjs is pinned in scripts/test-versioning.mjs.
import {
  AUTO_CHECK_INTERVAL_MS,
  AvailableUpdate,
  MAX_ASSET_BYTES,
  TEST_RUNNING_VERSION,
  UPDATE_DISCLAIMER,
  checkResultText,
  compareVersions,
  downloadFileName,
  downloadResultText,
  downloadingText,
  isNewer,
  parseLatestRelease,
  runningVersion,
  shouldAutoCheck,
  shouldNotify,
} from '../../src/domain/updateCheck';
import {DEVICE_WIDE_KEYS} from '../../src/domain/profiles';
import {DEFAULT_SETTINGS} from '../../src/domain/settings';

const HEX = 'a'.repeat(64);

function release(over: Record<string, unknown> = {}, asset: Record<string, unknown> = {}) {
  return {
    draft: false,
    prerelease: false,
    tag_name: 'v0.26.0',
    published_at: '2026-11-20T10:00:00Z',
    body: '  ### New\n- Something  \n',
    assets: [
      {
        name: 'kept-gtd-0.26.0.snplg',
        size: 4404019,
        digest: `sha256:${HEX}`,
        browser_download_url: 'https://github.com/tilmanbergt/kept-gtd/releases/download/v0.26.0/kept-gtd-0.26.0.snplg',
        ...asset,
      },
    ],
    ...over,
  };
}

function reasonOf(json: unknown): string {
  const r = parseLatestRelease(json);
  return r.ok ? 'ok' : r.reason;
}

describe('runningVersion', () => {
  it('a release is its version', () => {
    expect(runningVersion({version: '0.24.0', label: '0.24.0', nextVersion: null, stage: null, release: true})).toEqual({core: '0.24.0', preRelease: false});
  });
  it('a beta towards 0.24.0 is a pre-release of 0.24.0', () => {
    expect(runningVersion({version: '0.23.0', label: '0.24.0-beta+abc1234', nextVersion: '0.24.0', stage: 'beta', release: false})).toEqual({
      core: '0.24.0',
      preRelease: true,
    });
  });
  it('a +dev build is at least the release it came from', () => {
    expect(runningVersion({version: '0.24.0', label: '0.24.0+dev.abc1234', nextVersion: null, stage: null, release: false})).toEqual({
      core: '0.24.0',
      preRelease: false,
    });
  });
});

describe('isNewer', () => {
  const rel = (core: string) => ({core, preRelease: false});
  it.each([
    ['0.24.0', {core: '0.24.0', preRelease: true}, true],
    ['0.24.0', rel('0.24.0'), false],
    ['0.24.0', rel('0.23.9'), true],
    ['0.23.9', rel('0.24.0'), false],
    ['0.23.9', {core: '0.24.0', preRelease: true}, false],
    ['0.10.0', rel('0.9.0'), true],
    ['0.23.1', TEST_RUNNING_VERSION, true],
  ])('%s against %j → %s', (version, running, expected) => {
    expect(isNewer(version, running)).toBe(expected);
  });
  it('0.24.0+dev is not offered 0.24.0, 0.24.0 beta is', () => {
    const dev = runningVersion({version: '0.24.0', label: '0.24.0+dev.abc', nextVersion: null, stage: null, release: false});
    const beta = runningVersion({version: '0.23.0', label: '0.24.0-beta+abc', nextVersion: '0.24.0', stage: 'beta', release: false});
    expect(isNewer('0.24.0', dev)).toBe(false);
    expect(isNewer('0.24.0', beta)).toBe(true);
  });
  it('compareVersions refuses anything but x.y.z', () => {
    expect(() => compareVersions('v0.24.0', '0.24.0')).toThrow();
  });
});

describe('parseLatestRelease', () => {
  it('reads a good release', () => {
    const r = parseLatestRelease(release());
    expect(r).toEqual({
      ok: true,
      update: {
        version: '0.26.0',
        tag: 'v0.26.0',
        publishedAt: '2026-11-20T10:00:00Z',
        notes: '### New\n- Something',
        asset: {
          name: 'kept-gtd-0.26.0.snplg',
          url: 'https://github.com/tilmanbergt/kept-gtd/releases/download/v0.26.0/kept-gtd-0.26.0.snplg',
          size: 4404019,
          sha256: HEX,
        },
      },
    });
  });
  it('accepts other, non-plugin assets beside the one .snplg', () => {
    const json = release();
    json.assets.push({name: 'notes.txt', size: 3, digest: `sha256:${HEX}`, browser_download_url: 'https://github.com/x'});
    expect(reasonOf(json)).toBe('ok');
  });
  it.each([
    ['a draft', release({draft: true}), 'draft'],
    ['a pre-release', release({prerelease: true}), 'pre-release'],
    ['a missing draft flag', release({draft: undefined}), 'draft'],
    ['a beta tag', release({tag_name: 'v0.26.0-beta.1'}), 'tag "v0.26.0-beta.1"'],
    ['a tag without v', release({tag_name: '0.26.0'}), 'tag "0.26.0"'],
    ['no assets', release({assets: []}), '0 .snplg assets'],
    ['an asset of another version', release({}, {name: 'kept-gtd-0.25.0.snplg'}), 'asset named "kept-gtd-0.25.0.snplg"'],
    ['an oddly named asset', release({}, {name: 'gtdpara.snplg'}), 'asset named "gtdpara.snplg"'],
    ['a missing digest', release({}, {digest: undefined}), 'asset without a sha256 digest'],
    ['a short digest', release({}, {digest: 'sha256:abc'}), 'asset without a sha256 digest'],
    ['another digest kind', release({}, {digest: `sha512:${HEX}`}), 'asset without a sha256 digest'],
    ['an http URL', release({}, {browser_download_url: 'http://github.com/tilmanbergt/kept-gtd/releases/download/v0.26.0/kept-gtd-0.26.0.snplg'}), 'asset URL not on this repository'],
    ['a URL elsewhere', release({}, {browser_download_url: 'https://example.com/kept-gtd-0.26.0.snplg'}), 'asset URL not on this repository'],
    ['a zero size', release({}, {size: 0}), 'asset size 0'],
    ['too large', release({}, {size: MAX_ASSET_BYTES + 1}), `asset size ${MAX_ASSET_BYTES + 1}`],
    ['not an object', null, 'not an object'],
  ])('refuses %s', (_name, json, reason) => {
    expect(reasonOf(json)).toBe(reason);
  });
  it('refuses two .snplg assets', () => {
    const json = release();
    json.assets.push({...json.assets[0]});
    expect(reasonOf(json)).toBe('2 .snplg assets');
  });
  it('reads an uppercase digest as lowercase hex', () => {
    const r = parseLatestRelease(release({}, {digest: `sha256:${'A'.repeat(64)}`}));
    expect(r.ok && r.update.asset.sha256).toBe(HEX);
  });
  it('a missing body and date are empty', () => {
    const r = parseLatestRelease(release({body: null, published_at: undefined}));
    expect(r.ok && [r.update.notes, r.update.publishedAt]).toEqual(['', null]);
  });
});

describe('shouldAutoCheck', () => {
  const now = 1_000_000_000_000;
  it('never when the check is manual', () => {
    expect(shouldAutoCheck('manual', null, now)).toBe(false);
  });
  it('daily: at once without an earlier check, then after the interval', () => {
    expect(shouldAutoCheck('daily', null, now)).toBe(true);
    expect(shouldAutoCheck('daily', now - AUTO_CHECK_INTERVAL_MS + 1, now)).toBe(false);
    expect(shouldAutoCheck('daily', now - AUTO_CHECK_INTERVAL_MS, now)).toBe(true);
  });
  it('daily: when the clock went back', () => {
    expect(shouldAutoCheck('daily', now + 60_000, now)).toBe(true);
  });
});

describe('shouldNotify', () => {
  const update = {version: '0.26.0'} as AvailableUpdate;
  it('shows unless Not now was said to exactly this version', () => {
    expect(shouldNotify(update, null)).toBe(true);
    expect(shouldNotify(update, '0.25.0')).toBe(true);
    expect(shouldNotify(update, '0.26.0')).toBe(false);
  });
});

describe('downloadFileName', () => {
  it('plain first, then numbered', () => {
    expect(downloadFileName('0.26.0', 1)).toBe('kept-gtd-0.26.0.snplg');
    expect(downloadFileName('0.26.0', 2)).toBe('kept-gtd-0.26.0 (2).snplg');
    expect(downloadFileName('0.26.0', 3)).toBe('kept-gtd-0.26.0 (3).snplg');
  });
});

describe('texts', () => {
  it('the check, download and install texts the user sees', () => {
    const update = (parseLatestRelease(release()) as {ok: true; update: AvailableUpdate}).update;
    expect(checkResultText({kind: 'upToDate', version: '0.25.0'})).toBe('Kept GTD is up to date (0.25.0).');
    expect(checkResultText({kind: 'available', update})).toBe('Kept GTD 0.26.0 is available.');
    expect(checkResultText({kind: 'unusable'})).toContain('download it from GitHub instead');
    expect(downloadResultText({kind: 'saved', path: 'MyStyle/kept-gtd/kept-gtd-0.26.0.snplg'})).toBe(
      'Saved to MyStyle/kept-gtd/kept-gtd-0.26.0.snplg. To install: close Kept, then Settings → Plugins → Add plugin → choose this file. Your data stays where it is.',
    );
    expect(downloadResultText({kind: 'already', path: 'MyStyle/kept-gtd/kept-gtd-0.26.0.snplg'})).toMatch(/^Already downloaded: MyStyle\/kept-gtd\/kept-gtd-0.26.0.snplg\./);
    expect(downloadingText(update)).toBe('Downloading Kept GTD 0.26.0 (4.2 MB)…');
    expect(UPDATE_DISCLAIMER).toContain('not reviewed or approved by Ratta');
    for (const kind of ['noPermission', 'noRelease', 'rateLimited', 'error'] as const) expect(checkResultText({kind})).not.toBe('');
    for (const kind of ['noPermission', 'mismatch', 'notSupported', 'error'] as const) expect(downloadResultText({kind})).not.toBe('');
  });
});

describe('the updateCheck setting', () => {
  it('defaults to manual and stays on the device when the profile switches', () => {
    expect(DEFAULT_SETTINGS.updateCheck).toBe('manual');
    expect(DEVICE_WIDE_KEYS).toContain('updateCheck');
  });
});
