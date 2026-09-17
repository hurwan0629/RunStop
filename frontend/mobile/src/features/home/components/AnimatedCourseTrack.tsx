import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const NAVY = '#0B076A';
const LIME = '#B7FF28';

type TrackLaneProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  delay: number;
};

function TrackLane({
  x,
  y,
  width,
  height,
  radius,
  delay,
}: TrackLaneProps) {
  const progress = useSharedValue(0);

  // 둥근 사각형 테두리 전체 길이
  const straightWidth = width - radius * 2;
  const straightHeight = height - radius * 2;
  const perimeter =
    2 * (straightWidth + straightHeight) + 2 * Math.PI * radius;

  useEffect(() => {
    progress.value = 0;

    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration: 720,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [delay, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: perimeter * (1 - progress.value),
  }));

  return (
    <AnimatedRect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={radius}
      fill="none"
      stroke={NAVY}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeDasharray={`${perimeter} ${perimeter}`}
      animatedProps={animatedProps}
    />
  );
}

export function AnimatedCourseTrack() {
  const logoProgress = useSharedValue(0);
  const topAccentProgress = useSharedValue(0);
  const centerAccentProgress = useSharedValue(0);

  useEffect(() => {
    logoProgress.value = 0;
    topAccentProgress.value = 0;
    centerAccentProgress.value = 0;

    // 트랙이 거의 다 완성된 다음 RunStop 표시
    logoProgress.value = withDelay(
      980,
      withTiming(1, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      }),
    );

    // 마지막 라임 포인트
    topAccentProgress.value = withDelay(
      1140,
      withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      }),
    );

    centerAccentProgress.value = withDelay(
      1250,
      withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [centerAccentProgress, logoProgress, topAccentProgress]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoProgress.value,
    transform: [
      {
        scale: 0.9 + logoProgress.value * 0.1,
      },
    ],
  }));

  const topAccentStyle = useAnimatedStyle(() => ({
    opacity: topAccentProgress.value,
    transform: [{ scaleX: topAccentProgress.value }],
  }));

  const centerAccentStyle = useAnimatedStyle(() => ({
    opacity: centerAccentProgress.value,
    transform: [{ scaleX: centerAccentProgress.value }],
  }));

  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={styles.container}
    >
      <Svg
        viewBox="0 0 360 180"
        preserveAspectRatio="xMidYMid meet"
        style={styles.svg}
      >
        <TrackLane
          x={10}
          y={12}
          width={340}
          height={150}
          radius={75}
          delay={0}
        />
        <TrackLane
          x={28}
          y={30}
          width={304}
          height={114}
          radius={57}
          delay={130}
        />
        <TrackLane
          x={46}
          y={48}
          width={268}
          height={78}
          radius={39}
          delay={260}
        />
        <TrackLane
          x={64}
          y={66}
          width={232}
          height={42}
          radius={21}
          delay={390}
        />
      </Svg>

      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Text style={styles.logoText}>RunStop</Text>
      </Animated.View>

      <Animated.View style={[styles.topAccent, topAccentStyle]} />
      <Animated.View style={[styles.centerAccent, centerAccentStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  svg: {
    width: '100%',
    height: '100%',
  },
  logoWrap: {
    position: 'absolute',
    top: '39%',
    alignSelf: 'center',
  },
  logoText: {
    color: NAVY,
    fontSize: 26,
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: -1.8,
  },
  topAccent: {
    position: 'absolute',
    top: '16.7%',
    left: '61%',
    width: '14%',
    height: 2.2,
    borderRadius: 999,
    backgroundColor: LIME,
  },
  centerAccent: {
    position: 'absolute',
    top: '59.5%',
    left: '43%',
    width: '9%',
    height: 2.2,
    borderRadius: 999,
    backgroundColor: LIME,
  },
});
