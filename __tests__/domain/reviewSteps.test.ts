import {
  activeReviewSteps,
  isReviewOverdue,
  nextReviewStepId,
  prevReviewStepId,
  REVIEW_STEPS,
  sumReviewSummaries,
  summaryLines,
  visibleReviewSteps,
  ZERO_REVIEW_SUMMARY,
} from '../../src/domain/reviewSteps';

describe('activeReviewSteps', () => {
  const off = activeReviewSteps({gmail: false});
  it('hides the gmail step when gmail is off', () => {
    expect(off.map(s => s.id)).not.toContain('gmailInbox');
    expect(off).toHaveLength(REVIEW_STEPS.length - 1);
    expect(activeReviewSteps({gmail: true})).toBe(REVIEW_STEPS);
  });
  it('next/previous skip the hidden step', () => {
    expect(nextReviewStepId('meetingsCloseOut', off)).toBe('tendingThreads');
    expect(nextReviewStepId('tendingThreads', off)).toBe('agreements');
    expect(nextReviewStepId('agreements', off)).toBe('inbox');
    expect(prevReviewStepId('inbox', off)).toBe('agreements');
    expect(nextReviewStepId('agreements')).toBe('gmailInbox');
  });
  it('a hidden, never-reviewed step does not make the review overdue', () => {
    const now = new Date('2026-10-01T10:00:00Z');
    const recent = {reviewedAt: '2026-09-30T10:00:00Z', counts: {} as never};
    const steps = Object.fromEntries(off.map(s => [s.id, recent]));
    expect(isReviewOverdue(steps, now, off)).toBe(false);
    expect(isReviewOverdue(steps, now)).toBe(true);
  });
});

describe('Agreements step (docs/dev/history/technical-design-meetings-0.21.md R25)', () => {
  it('is a backlog step right after "Tending threads"', () => {
    const ids = REVIEW_STEPS.map(s => s.id);
    expect(ids.indexOf('agreements')).toBe(ids.indexOf('tendingThreads') + 1);
    expect(REVIEW_STEPS.find(s => s.id === 'agreements')).toEqual({id: 'agreements', title: 'Agreements', kind: 'backlog'});
  });
  it('is hidden while it lists nothing, unless it is the step shown', () => {
    const ids = (counts: Parameters<typeof visibleReviewSteps>[1], keep: Parameters<typeof visibleReviewSteps>[2]) => visibleReviewSteps(REVIEW_STEPS, counts, keep).map(s => s.id);
    expect(ids({agreements: {n: 0}}, null)).not.toContain('agreements');
    expect(ids(null, null)).not.toContain('agreements');
    expect(ids({agreements: {n: 2}}, null)).toContain('agreements');
    expect(ids({agreements: {n: 0}}, 'agreements')).toContain('agreements');
    expect(ids({agreements: {n: 0}}, null)).toHaveLength(REVIEW_STEPS.length - 1);
  });
  it('summarizes kept and ended agreements', () => {
    expect(summaryLines({...ZERO_REVIEW_SUMMARY, agreementsKept: 1, agreementsEnded: 2})).toEqual(expect.arrayContaining(['1 agreement kept', '2 agreements ended']));
  });
});

describe('Someday / Maybe step (docs/dev/history/technical-design-engage-in-context.md §2.10)', () => {

  it('is the last step, a ritual one, after "Neglected areas"', () => {
    const ids = REVIEW_STEPS.map(s => s.id);
    expect(ids.indexOf('somedayMaybe')).toBe(ids.indexOf('neglected') + 1);
    expect(ids.at(-1)).toBe('somedayMaybe');
    expect(REVIEW_STEPS.find(s => s.id === 'somedayMaybe')).toEqual({id: 'somedayMaybe', title: 'Someday / Maybe', kind: 'ritual'});
  });

  it('counts somedayActivated, read as 0 from older records', () => {
    expect(ZERO_REVIEW_SUMMARY.somedayActivated).toBe(0);
    const older = {inbox: {reviewedAt: null, counts: {tasksAdded: 1}}};
    expect(sumReviewSummaries(older as never).somedayActivated).toBe(0);
    expect(summaryLines({...ZERO_REVIEW_SUMMARY, somedayActivated: 2})).toEqual(['2 someday todos made #next']);
  });
});
