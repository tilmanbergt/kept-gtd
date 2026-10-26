import {
  configureLogFileSink,
  flushLogFile,
  formatLogLine,
  getRecentErrors,
  getRecentLogLines,
  MAX_LINES,
  recordLogLine,
  resetLogSinkForTests,
  setFileLogging,
} from '../../src/utils/logSink';

beforeEach(() => resetLogSinkForTests());
afterEach(() => resetLogSinkForTests());

describe('formatLogLine', () => {
  it('formats time, level and args', () => {
    const d = new Date(2026, 9, 1, 9, 5, 7, 42);
    expect(formatLogLine('E', ['load failed', new Error('boom'), {a: 1}, null, 3], d)).toBe(
      '09:05:07.042 E load failed Error: boom {"a":1} null 3',
    );
  });
  it('caps long objects', () => {
    const line = formatLogLine('I', [{text: 'x'.repeat(1000)}]);
    expect(line.length).toBeLessThan(340);
  });
});

describe('ring buffer', () => {
  it('keeps the last MAX_LINES in order', () => {
    for (let i = 0; i < MAX_LINES + 5; i++) {recordLogLine('I', [`line ${i}`]);}
    const lines = getRecentLogLines();
    expect(lines).toHaveLength(MAX_LINES);
    expect(lines[0]).toMatch(/line 5$/);
    expect(lines[MAX_LINES - 1]).toMatch(new RegExp(`line ${MAX_LINES + 4}$`));
  });
  it('finds recent errors', () => {
    recordLogLine('I', ['a']);
    recordLogLine('E', ['bad 1']);
    recordLogLine('W', ['warn']);
    recordLogLine('E', ['bad 2']);
    expect(getRecentErrors(1)).toHaveLength(1);
    expect(getRecentErrors(5).map(l => l.slice(15))).toEqual(['bad 1', 'bad 2']);
  });
});

describe('file sink', () => {
  it('writes header + earlier lines on first enable, then new lines', async () => {
    const writes: string[] = [];
    configureLogFileSink(async (_name, content) => {
      writes.push(content);
      return content.length;
    }, '=== header ===');
    recordLogLine('I', ['before']);
    setFileLogging(true);
    recordLogLine('I', ['after']);
    await flushLogFile();
    expect(writes).toHaveLength(1);
    expect(writes[0].split('\n')[0]).toBe('=== header ===');
    expect(writes[0]).toMatch(/before\n.*after\n$/);
    setFileLogging(false);
    recordLogLine('I', ['off']);
    await flushLogFile();
    expect(writes).toHaveLength(1);
  });
  it('stops after a failed write', async () => {
    configureLogFileSink(async () => {
      throw new Error('disk');
    }, 'h');
    setFileLogging(true);
    await flushLogFile();
    expect(getRecentLogLines().some(l => l.includes('file logging stopped'))).toBe(true);
  });
});

// docs/dev/history/technical-design-perf-threads.md §6 scenario 8: no idle flush loop.
describe('file sink when idle', () => {
  it('a flush whose write logs nothing schedules no further flush', async () => {
    jest.useFakeTimers();
    try {
      const writes: string[] = [];
      configureLogFileSink(async (_name, content) => {
        writes.push(content);
        return content.length;
      }, 'h');
      setFileLogging(true);
      recordLogLine('I', ['last action']);
      await jest.advanceTimersByTimeAsync(5000);
      expect(writes).toHaveLength(1);
      await jest.advanceTimersByTimeAsync(30000);
      expect(writes).toHaveLength(1);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('a flush whose write logs a line schedules exactly one more (the loop a remembered grant ends)', async () => {
    jest.useFakeTimers();
    try {
      const writes: string[] = [];
      configureLogFileSink(async (_name, content) => {
        writes.push(content);
        if (writes.length === 1) recordLogLine('I', ['ensurePluginPermission: hasPermission']);
        return content.length;
      }, 'h');
      setFileLogging(true);
      await jest.advanceTimersByTimeAsync(5000);
      await jest.advanceTimersByTimeAsync(5000);
      await jest.advanceTimersByTimeAsync(30000);
      expect(writes).toHaveLength(2);
    } finally {
      jest.useRealTimers();
    }
  });
});

