/**
 * Small black-stroke SVG icons (technical-design-linked-files.md §6/§7/§9.3),
 * drawn with `react-native-svg` rather than emoji: emoji color rendering
 * does not read well on e-ink, a plain black glyph reads reliably on
 * Supernote's screen. Paths are taken from the approved Cowork mockup
 * ("Link a File", rev. 3).
 *
 * ClipIcon has no "linked"/"unlinked" visual variant of its own - the two
 * row states differ by prefixing a literal "+" character before a bare
 * ClipIcon (armable/unlinked) vs. the bare icon alone (linked), as the
 * mockup does (`clip-cluster`: plus + icon-clip) - see ui/TaskRow.tsx/
 * ui/MeetingRow.tsx's render rule.
 */
import React from 'react';
import {Circle, Path, Rect, Svg} from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

/** Feather-style paperclip, stroke-only. */
export function ClipIcon({size = 16, color = '#000000'}: IconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Feather-style trash can, stroke-only - QuickAddWidget's edit-mode "delete"
 * button (an icon instead of a text label saves ~40px in Row 4, which holds
 * up to five controls). Same black-stroke convention as ClipIcon so it reads
 * reliably on e-ink.
 */
export function TrashIcon({size = 18, color = '#000000'}: IconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Meeting prep/review checkpoint box (docs/dev/history/technical-design-meeting-tracking.md):
 * an outlined rounded square holding a "P" (prep still open), an "R" (review
 * still open), or a check (whatever is currently tracked is done). Stroke-
 * only in every state, so it reads the same on any background/theme - the
 * open/done difference is the glyph inside, not a fill. Letters are drawn as
 * paths (not SVG <Text>) so they don't depend on a font being available in
 * the plugin host.
 */
export function TrackingBoxIcon({
  kind,
  done,
  size = 20,
  color = '#000000',
}: IconProps & {kind: 'prep' | 'review'; done: boolean}): React.JSX.Element {
  // "P": stem + bowl. "R": the same plus a leg.
  const letterPath = kind === 'prep' ? 'M9 17V7h4.5a3 3 0 0 1 0 6H9' : 'M9 17V7h4.5a3 3 0 0 1 0 6H9M13 13l3.5 4';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={2.5} y={2.5} width={19} height={19} rx={3} fill="none" stroke={color} strokeWidth={2} />
      <Path
        d={done ? 'M7 12.5l3.5 3.5L17 8.5' : letterPath}
        fill="none"
        stroke={color}
        strokeWidth={done ? 2.4 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Teardrop map pin. `filled` = solid black (already the default Resources folder), outline otherwise (tap to set as default). */
export function PinIcon({size = 18, color = '#000000', filled = false}: IconProps & {filled?: boolean}): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 21.5S5 13.9 5 9.2A7 7 0 0 1 19 9.2c0 4.7-7 12.3-7 12.3z"
        fill={filled ? color : 'none'}
        stroke={filled ? 'none' : color}
        strokeWidth={filled ? 0 : 1.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Outline warning triangle with a filled bang - the missing-linked-file indicator (no separate text banner). */
export function WarningIcon({size = 14, color = '#000000'}: IconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3.6 2.2 20.4h19.6L12 3.6z" fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Rect x={11.1} y={9.5} width={1.8} height={5.5} rx={0.9} fill={color} />
      <Circle cx={12} cy={17.2} r={1.05} fill={color} />
    </Svg>
  );
}

/**
 * Four corner arrows pointing inward - focus mode's exit mark
 * (docs/dev/history/technical-design-now-focus-mode.md §4.2, design-philosophy.md §8).
 * Path taken from the approved "GtdPara Focus Batch" design canvas
 * (DailyFocusHidden.dc.html). Stroke-only, solid (not low-opacity) - a
 * low-contrast mark doesn't read reliably on e-ink, so quietness here comes
 * from size/placement (screens/DailyView.tsx renders this small, in the
 * bottom-right corner) rather than from opacity.
 */
export function ExitFocusModeIcon({size = 17, color = '#1a1a1a'}: IconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M9 4V9H4M15 4V9H20M20 15H15V20M4 15H9V20"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * A home notebook (docs/dev/history/technical-design-home-notebooks.md §3.3):
 * an outlined notebook with its spine and a label line; with `plus`, a
 * circled + in the corner instead of the label - the notebook doesn't exist
 * yet and a tap creates it.
 */
export function NotebookIcon({size = 22, color = '#000000', plus = false}: IconProps & {plus?: boolean}): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={5} y={3} width={14} height={18} rx={1.5} fill="none" stroke={color} strokeWidth={1.8} />
      <Path d="M8.5 3v18" fill="none" stroke={color} strokeWidth={1.8} />
      {plus ? (
        <>
          <Circle cx={18} cy={18} r={5} fill="#ffffff" stroke={color} strokeWidth={1.8} />
          <Path d="M18 15.3v5.4M15.3 18h5.4" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </>
      ) : (
        <Path d="M11.5 8H16" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      )}
    </Svg>
  );
}

/**
 * Feather-style bell, stroke-only: a count tab's due mark (ui/CountTabs.tsx,
 * docs/dev/history/technical-design-calmer-screens.md §3.5) - the number next to
 * it says how many are due; no colour.
 */
export function BellIcon({size = 14, color = '#000000'}: IconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * A clipboard, stroke-only: the strips' square that switches to All · Copy · Cut · Paste
 * (docs/dev/history/technical-design-quickadd-redesign.md §11, G1, G3).
 */
export function ClipboardIcon({size = 20, color = '#000000'}: IconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={5} y={4} width={14} height={17} rx={1.5} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" />
      <Rect x={9} y={2} width={6} height={4} rx={1} fill="#ffffff" stroke={color} strokeWidth={2.2} />
      <Path d="M8.5 11h7M8.5 15h7" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

/** A filled lightning bolt: the strips' square back to ⚡ Suggest - drawn, as the emoji shows too light on e-ink (G1). */
export function BoltIcon({size = 20, color = '#000000'}: IconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M13 2L4 14h7l-1 8 9-12h-7z" fill={color} />
    </Svg>
  );
}

/** A calendar page, stroke-only: the todo form's due-date square (G1). */
export function CalendarIcon({size = 20, color = '#000000'}: IconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={5} width={18} height={16} rx={1.5} fill="none" stroke={color} strokeWidth={2} />
      <Path d="M3 10h18M8 3v4M16 3v4" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** A folder, stroke-only: the note form's folder (G1). */
export function FolderIcon({size = 18, color = '#000000'}: IconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}
