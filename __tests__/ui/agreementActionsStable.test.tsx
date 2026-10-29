// docs/dev/history/technical-design-perf-current-page.md §3.2: Quick Add's agreement handlers keep their
// identity across renders, so the memoized widget skips a parent's re-render.
jest.mock('sn-plugin-lib', () => ({PluginManager: {}, PluginCommAPI: {}, PluginFileAPI: {}, PluginNoteAPI: {}}));

jest.mock('../../src/utils/log', () => ({log: jest.fn(), logWarn: jest.fn(), logError: jest.fn()}));
jest.mock('../../src/utils/screenRefresh', () => ({requestEinkRefresh: jest.fn(), useEinkRefreshOnLoad: jest.fn()}));

import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {AgreementActions, AgreementEditApi, useAgreementActions} from '../../src/ui/useAgreementActions';

const edit: AgreementEditApi = {current: null, mode: 'card', select: () => undefined, startChange: () => undefined, edit: () => undefined, saved: () => undefined, cancel: () => undefined};
const seen: AgreementActions[] = [];
/** `tick` only makes each update a new render. */
function Probe({targetPath}: {targetPath: string | null; tick: number}): null {
  seen.push(useAgreementActions({name: 'Probe', edit: {...edit}, refs: [], targetPath}));
  return null;
}

it('keeps the handlers object and each handler across renders; only the target decides onAddAgreement', () => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(<Probe targetPath="/a" tick={0} />);
  });
  act(() => r.update(<Probe targetPath="/a" tick={1} />));
  const [first, second] = seen;
  expect(second.handlers).toBe(first.handlers);
  expect(first.handlers.onAddAgreement).toBeDefined();
  act(() => r.update(<Probe targetPath={null} tick={2} />));
  const third = seen[2];
  expect(third.handlers.onAddAgreement).toBeUndefined();
  expect(third.handlers.onSaveEditAgreement).toBe(first.handlers.onSaveEditAgreement);
  act(() => r.unmount());
});
