/**
 * Settings → Advanced → Check screen and pages
 * (docs/dev/history/technical-design-launch-ready.md §6): the device answers
 * the 0.24.0 design depends on - the size of the page Kept was opened from,
 * and how a horizontal note behaves (its page size, whether an added page
 * stays horizontal, where text boxes at A5 X reference positions land).
 *
 * Everything it writes goes into one test note in Kept's debug folder, never
 * into the user's notes. The log gets sizes and counts, no paths.
 */
import {DEBUG_LOG_FOLDER_PATH} from '../supernote/devicePaths';
import {ensureFolderExists, fileExists} from '../supernote/fileSystem';
import {getRememberedLaunchNotePath} from '../supernote/hostContext';
import {buildTextboxElement} from '../supernote/noteElements';
import {createNote, getNoteTotalPageNum, insertElements, insertNotePage} from '../supernote/noteFileApi';
import {getFileMachineType, getNotePageSize} from '../supernote/pdfNative';
import {errorMessage} from '../utils/errorMessage';
import {log, logWarn} from '../utils/log';

/** The horizontal test note; created only when asked, in Kept's debug folder. */
export const LANDSCAPE_TEST_NOTE = `${DEBUG_LOG_FOLDER_PATH}/landscape-test.note`;

const TEST_TEMPLATE = 'style_white';

/** The host's machine types (`getFileMachineType`), as names for the screen. */
const MACHINE_NAMES: Record<number, string> = {0: 'A5', 1: 'A6', 2: 'A6 X', 3: 'A5 X', 4: 'Nomad', 5: 'Manta'};

export function machineName(type: number | null): string {
  if (type === null) return 'unknown';
  return MACHINE_NAMES[type] ?? `type ${type}`;
}

export interface PageInfo {
  path: string;
  /** Zero-based page the size was read for. */
  page: number;
  pageCount: number | null;
  size: {width: number; height: number} | null;
  machineType: number | null;
  /** What failed, when something did; the rest is still filled where it could be read. */
  error: string | null;
}

/** Page count, size of `page` and machine type of a `.note`; each read on its own, so one failure doesn't hide the others. */
export async function readPageInfo(path: string, page = 0): Promise<PageInfo> {
  const errors: string[] = [];
  let pageCount: number | null = null;
  try {
    pageCount = await getNoteTotalPageNum(path);
  } catch (e) {
    errors.push(`page count: ${errorMessage(e)}`);
  }
  const size = await getNotePageSize(path, page);
  if (!size.ok) errors.push(`page size: ${size.error ?? 'no answer'}`);
  const machine = await getFileMachineType(path);
  if (!machine.ok) errors.push(`machine type: ${machine.error ?? 'no answer'}`);
  const info: PageInfo = {
    path,
    page,
    pageCount,
    size: size.ok ? size.result : null,
    machineType: machine.ok ? machine.result : null,
    error: errors.length > 0 ? errors.join('; ') : null,
  };
  log('ScreenCheck: page info', `page=${page}`, `pages=${info.pageCount ?? '?'}`, info.size ? `${info.size.width}x${info.size.height}` : 'size ?', `machine=${info.machineType ?? '?'}`);
  return info;
}

/** The page info of the `.note` Kept was opened from, or null when it was opened from a document or the launch file is unknown. */
export async function readLaunchPageInfo(currentPage: number | null): Promise<PageInfo | null> {
  const launch = getRememberedLaunchNotePath()?.path ?? null;
  if (!launch || !launch.toLowerCase().endsWith('.note')) return null;
  return readPageInfo(launch, currentPage ?? 0);
}

/** Creates the horizontal test note unless it exists, then reads its first page. */
export async function createLandscapeTestNote(): Promise<PageInfo> {
  if (!(await fileExists(LANDSCAPE_TEST_NOTE))) {
    await ensureFolderExists(DEBUG_LOG_FOLDER_PATH);
    await createNote(LANDSCAPE_TEST_NOTE, TEST_TEMPLATE, false);
    log('ScreenCheck: horizontal test note created');
  } else {
    log('ScreenCheck: horizontal test note exists');
  }
  return readPageInfo(LANDSCAPE_TEST_NOTE, 0);
}

/** Appends one page to the test note and reads the new page. */
export async function addTestPage(): Promise<PageInfo> {
  const count = await getNoteTotalPageNum(LANDSCAPE_TEST_NOTE);
  await insertNotePage(LANDSCAPE_TEST_NOTE, count, TEST_TEMPLATE);
  log('ScreenCheck: test page added', `page=${count}`);
  return readPageInfo(LANDSCAPE_TEST_NOTE, count);
}

/** Text boxes at A5 X reference positions (x 100) the check writes onto the test note's last page. */
export const TEST_PIECE_YS = [100, 1300, 1600] as const;

/**
 * Writes one text box per `TEST_PIECE_YS` on the test note's last page,
 * unscaled, so the device shows where A5 X positions land on a horizontal
 * page (1300 should still be on a 1404-high page, 1600 below it). Returns
 * the page written to.
 */
export async function writeTestPieces(): Promise<number> {
  const count = await getNoteTotalPageNum(LANDSCAPE_TEST_NOTE);
  const page = Math.max(0, count - 1);
  const elements = [];
  for (const y of TEST_PIECE_YS) {
    elements.push(await buildTextboxElement({text: `Kept test text box at x 100, y ${y}`, x: 100, y, width: 900, height: 60, fontSize: 36, pageNum: page}));
  }
  try {
    await insertElements(LANDSCAPE_TEST_NOTE, page, elements);
  } catch (e) {
    logWarn('ScreenCheck: writing test text boxes failed', errorMessage(e));
    throw e;
  }
  log('ScreenCheck: test text boxes written', `page=${page}`, `${elements.length} boxes`);
  return page;
}
