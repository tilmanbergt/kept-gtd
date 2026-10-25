/**
 * Layout logging for Quick Add's title fields: the diagnosis of a title
 * field that sometimes isn't drawn at all (no border, no text) while its
 * text is still in the draft. Every layout change of a field logs its frame
 * (rounded dp, never the text), so a capture shows whether React Native
 * itself gave the field a size while it looked missing on the device.
 *
 * Only for views that are native anyway (a TextInput, or a View with
 * `collapsable={false}`): `onLayout` on a plain layout-only View would stop
 * Android from flattening it and so change what is being diagnosed.
 */
import {LayoutChangeEvent} from 'react-native';
import {log} from '../../utils/log';

/** An `onLayout` handler that logs `label`'s frame. */
export function layoutLogger(label: string): (e: LayoutChangeEvent) => void {
  return e => {
    const {x, y, width, height} = e.nativeEvent.layout;
    log(`QuickAdd: ${label} layout`, {x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height)});
  };
}
