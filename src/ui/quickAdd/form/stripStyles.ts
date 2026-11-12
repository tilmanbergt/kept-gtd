/**
 * The placements of Quick Add's form strips
 * (docs/dev/history/technical-design-quickadd-redesign.md §3.2): the text strip
 * above the box (row 0), the date, time and valid-till strips over the field's
 * second line (row 2). Both full width, absolutely positioned against the
 * field's wrapper, painted after the field - no zIndex in the box.
 */
import {StyleSheet} from 'react-native';
import {QUICK_ADD_ROWS} from '../QuickAddFrame';

/** The box's padding and border above the field: the text strip clears them. */
const BOX_TOP = 11;

export const stripStyles = StyleSheet.create({
  aboveBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    marginBottom: BOX_TOP + 3,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 3,
  },
  overRow2: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: QUICK_ADD_ROWS.input,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 3,
  },
  /** The capture panel's time strip: hovering above its field, left-aligned, as wide as it needs. */
  aboveField: {
    position: 'absolute',
    left: 0,
    bottom: '100%',
    marginBottom: 3,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 3,
  },
  /** The buttons take the room left of the switch square and ✕, and never wrap. */
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  lead: {
    alignSelf: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    flexShrink: 1,
  },
  /** A step that can't act: greyed, never hidden. */
  off: {
    opacity: 0.35,
  },
  hidden: {
    display: 'none',
  },
});
