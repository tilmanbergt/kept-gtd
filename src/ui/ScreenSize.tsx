/**
 * The size of Kept's screen, measured once at the root
 * (docs/dev/history/technical-design-launch-ready.md §4.1): every layout
 * figure that depends on the screen comes from here, not from A5 X
 * constants or `Dimensions`. It starts from the window size (known at once,
 * so the app and its button listener mount without waiting) and follows the
 * root view's layout from then on.
 *
 * `estimatorWidth()` is the column figure for the line estimators
 * (domain/screenLayout.ts); helpers outside components read it at call
 * time. When it changes (a narrower screen, or rotating one), the app below
 * is drawn anew, so every estimate is made again.
 */
import React, {createContext, Fragment, useCallback, useContext, useState} from 'react';
import {Dimensions, LayoutChangeEvent, StyleSheet, View} from 'react-native';
import {A5X_ESTIMATOR_WIDTH, A5X_PORTRAIT, estimatorWidthFor, ScreenSize} from '../domain/screenLayout';
import {log} from '../utils/log';

const ScreenSizeContext = createContext<ScreenSize>(A5X_PORTRAIT);

let currentEstimatorWidth = A5X_ESTIMATOR_WIDTH;

/** The line estimators' column figure for the current screen (678 on an A5 X or wider). */
export function estimatorWidth(): number {
  return currentEstimatorWidth;
}

export function useScreenSize(): ScreenSize {
  return useContext(ScreenSizeContext);
}

function windowSize(): ScreenSize {
  const w = Dimensions.get('window');
  return w.width > 0 && w.height > 0 ? {width: w.width, height: w.height} : A5X_PORTRAIT;
}

export function ScreenSizeProvider({children}: {children: React.ReactNode}): React.JSX.Element {
  const [size, setSize] = useState<ScreenSize>(windowSize);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    setSize(prev => {
      if (prev.width === width && prev.height === height) return prev;
      log('ScreenSize: layout', `${Math.round(width)}x${Math.round(height)}`);
      return {width, height};
    });
  }, []);

  const estimator = estimatorWidthFor(size);
  currentEstimatorWidth = estimator;
  return (
    <View style={styles.root} onLayout={onLayout}>
      <ScreenSizeContext.Provider value={size}>
        <Fragment key={estimator}>{children}</Fragment>
      </ScreenSizeContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
});
