import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useAnimatedValue,
  View,
} from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import type { RecommendationFailure } from '@/services/api/errors';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const STOPS = Array.from({ length: 17 }, (_, index) => index / 16);

type Props = {
  loading: boolean;
  failure: RecommendationFailure | null;
  onClose: () => void;
  onAction: () => void;
};

/** 로딩→실패를 하나의 모달 안에서 전환해 플랫폼별 모달 겹침을 피한다. */
export function RecommendationFeedback({ loading, failure, onClose, onAction }: Props) {
  return (
    <Modal
      visible={loading || failure !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.content}>
            {loading ? <WaitingRunner /> : (
              <>
                <Text style={styles.errorIcon}>!</Text>
                <Text accessibilityRole="header" style={styles.title}>{failure?.title}</Text>
                <Text style={styles.description}>{failure?.message}</Text>
              </>
            )}

            {!loading && failure ? (
              <Pressable accessibilityRole="button" onPress={onAction} style={styles.primaryButton}>
                <Text style={styles.primaryText}>
                  {failure.action === 'edit' ? '조건 수정' : failure.action === 'login' ? '로그인' : '다시 시도'}
                </Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>{loading ? '대기 취소' : '닫기'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function WaitingRunner() {
  const progress = useAnimatedValue(0);
  const drawing = useAnimatedValue(0);
  const bounce = useAnimatedValue(1);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [cheers, setCheers] = useState(0);

  // 시스템의 동작 줄이기 설정을 따르고, 화면을 닫으면 모든 애니메이션을 정리한다.
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) setReduceMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      drawing.setValue(1);
      return;
    }

    drawing.setValue(0);
    const draw = Animated.timing(drawing, { toValue: 1, duration: 900, useNativeDriver: false });
    const run = Animated.loop(Animated.timing(progress, {
      toValue: 1,
      duration: 4200,
      easing: Easing.linear,
      useNativeDriver: true,
    }));
    draw.start();
    run.start();
    return () => {
      draw.stop();
      run.stop();
      bounce.stopAnimation();
    };
  }, [reduceMotion, drawing, progress, bounce]);

  const cheer = () => {
    setCheers(previous => previous + 1);
    if (reduceMotion) return;
    bounce.stopAnimation();
    bounce.setValue(1);
    Animated.sequence([
      Animated.timing(bounce, { toValue: 1.35, duration: 130, useNativeDriver: true }),
      Animated.spring(bounce, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  return (
    <>
      <Text style={styles.eyebrow}>RUNSTOP</Text>
      <Text accessibilityRole="header" style={styles.title}>달리기 좋은 코스를 찾고 있어요</Text>
      <Text style={styles.description}>잠깐 달리는 친구를 응원해 주세요.</Text>

      {/* 실제 생성 진행률과 무관한 대기 연출이며, 터치하면 러너가 반응한다. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="달리는 친구 응원하기"
        onPress={cheer}
        style={styles.track}>
        <Svg width={264} height={180} viewBox="0 0 264 180">
          <Ellipse cx={132} cy={90} rx={94} ry={54} fill="#F4F1FC" stroke="#E5DDF6" strokeWidth={14} />
          <AnimatedEllipse cx={132} cy={90} rx={94} ry={54} fill="none"
            stroke="#7A40CF" strokeWidth={4} strokeDasharray={[480, 480]}
            strokeDashoffset={drawing.interpolate({ inputRange: [0, 1], outputRange: [480, 0] })} />
        </Svg>
        <View pointerEvents="none" style={styles.trackCenter}>
          <Text style={styles.footprints}>{cheers ? '👟  ✨  👟' : '👟'}</Text>
          <Text style={styles.tapHint}>{cheers ? '좋아요, 한 걸음 더!' : '터치해서 응원하기'}</Text>
        </View>
        <Animated.View pointerEvents="none" style={[styles.runner, {
          transform: [
            { translateX: progress.interpolate({
              inputRange: STOPS,
              outputRange: STOPS.map(t => 114 + 94 * Math.cos(t * Math.PI * 2 - Math.PI / 2)),
            }) },
            { translateY: progress.interpolate({
              inputRange: STOPS,
              outputRange: STOPS.map(t => 72 + 54 * Math.sin(t * Math.PI * 2 - Math.PI / 2)),
            }) },
            { scale: bounce },
          ],
        }]}>
          <Svg width={36} height={36} viewBox="0 0 36 36">
            <Circle cx={18} cy={18} r={17} fill="#100078" stroke="#FFFFFF" strokeWidth={2} />
            <Circle cx={21} cy={9} r={3} fill="#C8FF30" />
            <Path d="m15 14 5-1 4 5h4m-8-5-4 9 6 3 1 5m-7-8-5 7H7m8-15-4 5H7"
              fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Animated.View>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={styles.description}>
        {cheers ? `${cheers}번 응원했어요! 결과가 나오면 바로 보여드릴게요.` : '결과가 나오면 자동으로 이동해요.'}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#0B073B99',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  content: { padding: 24, alignItems: 'center', gap: 14 },
  eyebrow: { color: '#7A40CF', fontWeight: '800', letterSpacing: 3 },
  title: { color: '#17113D', fontSize: 21, fontWeight: '800', textAlign: 'center' },
  description: { color: '#686378', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  track: { width: 264, height: 180, maxWidth: '100%' },
  trackCenter: { position: 'absolute', top: 67, left: 58, right: 58, alignItems: 'center' },
  footprints: { fontSize: 21 },
  tapHint: { color: '#785E9F', fontSize: 11, marginTop: 4 },
  runner: { position: 'absolute', top: 0, left: 0, width: 36, height: 36 },
  errorIcon: { fontSize: 30, fontWeight: '900', color: '#BE3B53' },
  primaryButton: { minHeight: 48, alignSelf: 'stretch', borderRadius: 14, backgroundColor: '#100078', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '700' },
  closeButton: { minHeight: 44, alignSelf: 'stretch', justifyContent: 'center' },
  closeText: { color: '#686378', textAlign: 'center', fontWeight: '600' },
});
