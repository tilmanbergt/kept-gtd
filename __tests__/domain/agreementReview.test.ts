// docs/dev/history/technical-design-meetings-0.21.md R25, R26, §9: which agreements the Weekly Review asks
// about, the reasons it names, and the project close-out's warning.
import {agreementReviewCount, agreementsToReview} from '../../src/domain/agreementReview';
import {reviewReasonText} from '../../src/domain/agreementText';
import {Agreement, buildAgreement, endedAgreement} from '../../src/domain/agreements';
import {CounterpartLine} from '../../src/domain/threadsSection';
import {EMPTY_PLAN} from '../../src/domain/closeOut/plan';
import {evaluateReadiness, ReadinessInput} from '../../src/domain/closeOut/readiness';
import {EngageSource} from '../../src/domain/engageOwner';
import {LoopLine} from '../../src/domain/loopsSection';
import {item} from '../../test-helpers/fixtures';

const TODAY = '2026-10-24';
const a = (text: string, valid: string | null = null): Agreement => buildAgreement(text, {today: '2026-09-01', valid, meeting: null});
const loopLine = (tag: string, status: LoopLine['status']): LoopLine => ({tag, status, mainDate: null, linkedFile: null, extraColumns: [], raw: null});

const coaching = item('area', 'Coaching', {
  threads: [{leaf: 'jordan', status: 'inactive'} as CounterpartLine, {leaf: 'sven', status: 'active'} as CounterpartLine],
  loops: [loopLine('proj/old', 'done'), loopLine('proj/live', 'active')],
  agreements: [
    a('Fridays are quiet', '2026-10-23'), // 0 over
    a('Feedback in 1:1s #sparring/jordan'), // 1 counterpart inactive
    a('Over and inactive #jordan', '2026-10-01'), // 2 both
    a('Sven rule #sparring/sven', '2026-12-31'), // 3 nothing
    endedAgreement(a('Ended #sparring/jordan', '2026-01-01'), TODAY), // 4 ended: never asked
    a('Old loop #proj/old'), // 5 loop closed
    a('Live loop #proj/live'), // 6 nothing
    a('Valid today', TODAY), // 7 not over yet
  ],
});
const doneProject = item('project', 'Done one', {status: 'done', agreements: [a('Done rule')]});
const parked = item('project', 'Parked', {status: 'on-hold', agreements: [a('Parked rule')]});
const archived = item('project', 'Archived', {status: 'archived', agreements: [a('Archived rule', '2026-01-01')]});
const source: EngageSource = {items: [coaching, doneProject, parked, archived], inbox: null, loopKinds: ['proj'], threadTypes: ['sparring']};

describe('agreementsToReview (R25)', () => {
  const groups = agreementsToReview(source, TODAY);
  const rows = groups.flatMap(g => g.rows.map(r => `${g.item.name}: ${r.ref.agreement.text} = ${r.reasons.join('+')}`));

  it('lists active agreements with every reason that applies, grouped by file', () => {
    expect(rows).toEqual([
      'Coaching: Fridays are quiet = over',
      'Coaching: Feedback in 1:1s #sparring/jordan = counterpartInactive',
      'Coaching: Over and inactive #jordan = over+counterpartInactive',
      'Coaching: Old loop #proj/old = loopClosed',
      'Done one: Done rule = itemDone',
      'Parked: Parked rule = itemOnHold',
    ]);
    expect(agreementReviewCount(groups)).toBe(6);
  });

  it('keeps the index into the file for the write path', () => {
    expect(groups[0].rows.map(r => r.ref.index)).toEqual([0, 1, 2, 5]);
  });

  it('names the reasons as the step shows them', () => {
    const over = coaching.agreements[0];
    expect(reviewReasonText('over', over, TODAY)).toBe('till 23.10. – over');
    expect(reviewReasonText('counterpartInactive', over, TODAY)).toBe('thread inactive');
    expect(reviewReasonText('loopClosed', over, TODAY)).toBe('loop closed');
    expect(reviewReasonText('itemDone', over, TODAY)).toBe('project done');
    expect(reviewReasonText('itemOnHold', over, TODAY)).toBe('on hold');
  });
});

describe('project close-out: active agreements (R26)', () => {
  const input = (over: Partial<ReadinessInput>): ReadinessInput => ({
    mode: 'quick',
    projectPath: '/P/Garden',
    tasks: [],
    meetings: [],
    today: TODAY,
    now: new Date(2026, 9, 24),
    noteSetups: {setups: [], defaults: {pages: {}, tracking: {trackPrep: false, trackReview: false}}},
    others: [],
    projectLinkedPrefix: '1 Projects/Garden',
    plan: EMPTY_PLAN,
    targetFolderExists: false,
    targetPdfExists: null,
    targetFolderLabel: 'Archive/Garden',
    targetPdfLabel: null,
    unreadableNoteNames: [],
    launchPath: null,
    ...over,
  });

  it('warns "n active agreements" (not a blocker), listing them', () => {
    const f = evaluateReadiness(input({activeAgreements: [{index: 0, label: 'Fridays are quiet'}, {index: 2, label: 'Feedback in 1:1s'}]})).find(x => x.id === 'activeAgreements')!;
    expect(f).toEqual({
      id: 'activeAgreements',
      severity: 'warning',
      label: '2 active agreements',
      caption: 'they stay in the archived file as they are',
      items: [{index: 0, label: 'Fridays are quiet'}, {index: 2, label: 'Feedback in 1:1s'}],
    });
  });

  it('says nothing without active agreements', () => {
    expect(evaluateReadiness(input({})).find(x => x.id === 'activeAgreements')).toBeUndefined();
  });
});
