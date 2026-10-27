// Pure helpers for the GitHub Actions builds (alpha artifact per push, beta pre-release).
// No I/O here, so scripts/test-ci-build.mjs can test them directly.
// Design: docs/dev/history/technical-design-ci-builds.md

import {isSemver, releaseNotes} from './versioning.mjs';

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The next beta of `target` given the repository's tags:
 * {number, tag: 'v0.22.0-beta.2', name: '0.22.0-beta.2', title: 'Kept GTD 0.22.0 beta 2'}.
 * The number is one above the highest existing beta of that version (gaps are not filled).
 */
export function nextBeta(target, tags) {
  if (!isSemver(target ?? '')) throw new Error('no release is being worked on - set it with: npm run next-version -- <x.y.z>');
  const re = new RegExp(`^v${escapeRegExp(target)}-beta\\.(\\d+)$`);
  let highest = 0;
  for (const t of tags) {
    const m = re.exec(t.trim());
    if (m) highest = Math.max(highest, Number(m[1]));
  }
  const number = highest + 1;
  return {
    number,
    tag: `v${target}-beta.${number}`,
    name: `${target}-beta.${number}`,
    title: `Kept GTD ${target} beta ${number}`,
  };
}

/**
 * What is wrong with a finished buildPlugin.ps1 run. buildPlugin.ps1 still writes a package when
 * Gradle failed (without the native modules), so the package alone proves nothing.
 *
 * info: build/build-info.json (or null); config: build/generated/PluginConfig.json (or null);
 * has: {labelledSnplg, nativePackage} - whether those files exist; beta: the run is a beta.
 * Returns {errors: string[], warnings: string[]}.
 */
export function checkBuild({info, config, has, beta = false}) {
  const errors = [];
  const warnings = [];
  if (!info) {
    errors.push('build/build-info.json is missing - the build did not stamp its build info');
    return {errors, warnings};
  }
  if (!has.labelledSnplg) errors.push(`build/outputs/kept-gtd-${info.label}.snplg is missing - packaging failed`);
  if (!has.nativePackage || config?.nativeCodePackage !== '/app.npk') {
    errors.push('the package has no native modules (build/generated/app.npk) - the Gradle build failed');
  }
  if (info.dirty) {
    (beta ? errors : warnings).push(`the build is labelled ${info.label}: files changed during the run`);
  }
  if (beta) {
    if (info.stage !== 'beta' || !info.nextVersion) {
      errors.push(`a beta must be built towards the next version with -Stage beta (label: ${info.label})`);
    }
    if (info.release) errors.push('a beta cannot be built from a release commit');
  }
  return {errors, warnings};
}

/** The text of a beta pre-release: a short note for testers, then CHANGELOG [Unreleased]. */
export function betaNotes(changelogText, {target, number, commit}) {
  const changes = releaseNotes(changelogText, 'Unreleased');
  if (!changes) throw new Error('CHANGELOG.md: the [Unreleased] section is empty - nothing to test in a beta');
  return [
    `**Beta ${number} of Kept GTD ${target}** for testing, built from ${commit}. ` +
      'Install the `.snplg` over your current version (Settings and files are kept). ' +
      'It may still contain bugs - please report them on GitHub with the version from Settings → About.',
    '',
    changes,
    '',
  ].join('\n');
}
