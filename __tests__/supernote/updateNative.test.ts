// docs/dev/history/technical-design-in-app-updates.md §5: the wrapper is undefined on a build without KeptUpdate.
import {NativeModules} from 'react-native';
import {getKeptUpdateNative} from '../../src/supernote/updateNative';

describe('getKeptUpdateNative', () => {
  afterEach(() => {
    delete (NativeModules as Record<string, unknown>).KeptUpdate;
  });
  it('is undefined without the native module', () => {
    expect(getKeptUpdateNative()).toBeUndefined();
  });
  it('is the native module when the build has it', () => {
    const module = {download: jest.fn(), sha256File: jest.fn(), copyIntoFolder: jest.fn()};
    (NativeModules as Record<string, unknown>).KeptUpdate = module;
    expect(getKeptUpdateNative()).toBe(module);
  });
});
