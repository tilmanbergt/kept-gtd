/**
 * The size of Kept's screen, measured once at the root
 * (docs/dev/history/technical-design-launch-ready.md §4.1): every layout
 * figure that depends on the screen comes from here, not from A5 X
 * constants or `Dimensions`. It starts from the window size (known at once,
 * so the app and its button listener mount without waiting) and follows the
 * root view's layout from then on.
 *
 * With the debug "Simulate screen" on (ui/screenSimStore.ts, design §4.3) the app
 * is drawn in a framed box of the simulated size, 16 dp in from the top left
 * corner, and that size is what everything below gets.
 *
 * `estimatorWidth()` is the column figure for the line estimators
 * (domain/screenLayout.ts); helpers outside components read it at call
 * time. When it changes (a narrower screen, or rotating one), the app below
 * is drawn anew, so every estimate is made again.
 */
import React, {createContext, Fragment, useCallback, useContext, useState, useSyncExternalStore} from 'react';
import {Dimensions, LayoutChangeEvent, StyleSheet, Text, View} from 'react-native';
import {A5X_ESTIMATOR_WIDTH, A5X_PORTRAIT, estimatorWidthFor, ScreenSize, SIMULATION_INSET, simulatedScreen, simulationsThatFit} from '../domain/screenLayout';
import {getScreenSimulation, subscribeScreenSimulation} from './screenSimStore';
import {FONT} from './theme';
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

const RealSizeContext = createContext<ScreenSize>(A5X_PORTRAIT);

/** The real screen, also while a simulation draws the app smaller (Settings offers only what fits). */
export function useRealScreenSize(): ScreenSize {
  return useContext(RealSizeContext);
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

  const simKey = useSyncExternalStore(subscribeScreenSimulation, getScreenSimulation);
  const sim = simKey && simulationsThatFit(size).includes(simKey) ? simulatedScreen(simKey) : null;
  const shown = sim ? sim.size : size;
  const estimator = estimatorWidthFor(shown);
  currentEstimatorWidth = estimator;
  const app = (
    <ScreenSizeContext.Provider value={shown}>
      <Fragment key={`${estimator}${sim ? `-${sim.key}` : ''}`}>{children}</Fragment>
    </ScreenSizeContext.Provider>
  );
  return (
    <View style={styles.root} onLayout={onLayout}>
      <RealSizeContext.Provider value={size}>
        {sim ? (
          <>
            <View style={styles.frame}>
              <View style={{width: sim.size.width, height: sim.size.height}}>{app}</View>
            </View>
            <Text style={styles.simLine}>{`Simulated ${sim.label} · Settings → Advanced → Simulate screen: Off`}</Text>
          </>
        ) : (
          app
        )}
      </RealSizeContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#ffffff'},
  frame: {alignSelf: 'flex-start', marginLeft: SIMULATION_INSET, marginTop: SIMULATION_INSET, borderWidth: 1, borderColor: '#000000'},
  simLine: {fontSize: FONT.small, color: '#666666', margin: 16},
});
