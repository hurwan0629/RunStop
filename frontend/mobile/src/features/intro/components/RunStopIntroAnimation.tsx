import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
    Easing,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

const SHOE_REST = require(
  '../../../../assets/images/intro/shoe1.png',
);

const SHOE_STEP = require(
  '../../../../assets/images/intro/shoe2.png',
);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const NAVY = '#08056B';
const RING_NAVY = '#24296A';
const LIME = '#D5FF1A';
const ORBIT_COLOR = '#ABBEEB';

type RunStopIntroAnimationProps = {
    onFinished: () => void;
};

export function RunStopIntroAnimation({
    onFinished,
}: RunStopIntroAnimationProps) {
    const outerRadius = 132;
    const circumference = 2 * Math.PI * outerRadius;
    const orbitProgress = useSharedValue(0);

    const subtitleProgress = useSharedValue(0);
    const shoeFrameProgress = useSharedValue(0);

    useEffect(() => {
        // 바깥 원을 계속 도는 효과
        orbitProgress.value = withRepeat(
            withTiming(circumference, {
                duration: 1350,
                easing: Easing.linear,
            }),
            -1,
            false,
        );

        // 이미지 두 번씩 반복
        shoeFrameProgress.value = withSequence(
            withDelay(
                450,
                withTiming(1, {
                    duration: 220,
                    easing: Easing.linear,
                }),
            ),
            withDelay(
                450,
                withTiming(0, {
                    duration: 220,
                    easing: Easing.linear,
                }),
            ),
            withDelay(
                450,
                withTiming(1, {
                    duration: 220,
                    easing: Easing.linear,
                }),
            ),
        );

        subtitleProgress.value = withDelay(
            2050,
            withTiming(1, {
                duration: 350,
                easing: Easing.out(Easing.cubic),
            }),
        );

        // 전체 인트로 종료 후 다음 화면으로 이동
        const timer = setTimeout(onFinished, 2800);

        return () => clearTimeout(timer);
    }, [
        circumference,
        onFinished,
        orbitProgress,
        shoeFrameProgress,
        subtitleProgress,
    ]);

    const orbitAnimatedProps = useAnimatedProps(() => ({
        strokeDashoffset: -orbitProgress.value,
    }));

    const shoeRestStyle = useAnimatedStyle(() => ({
        opacity: 1 - shoeFrameProgress.value,
    }));

    const shoeStepStyle = useAnimatedStyle(() => ({
        opacity: shoeFrameProgress.value,
    }));

    const subtitleStyle = useAnimatedStyle(() => ({
        opacity: subtitleProgress.value,
        transform: [
            {
                translateY: 16 * (1 - subtitleProgress.value),
            },
        ],
    }));

    return (
        <View style={styles.container}>
            <View style={styles.trackArea}>
                <Svg viewBox="0 0 360 360" style={styles.svg}>
                    <Circle
                        cx="180"
                        cy="180"
                        r="132"
                        fill="none"
                        stroke={RING_NAVY}
                        strokeWidth="16"
                    />
                    <Circle
                        cx="180"
                        cy="180"
                        r="108"
                        fill="none"
                        stroke={RING_NAVY}
                        strokeWidth="16"
                    />
                    <Circle
                        cx="180"
                        cy="180"
                        r="84"
                        fill="none"
                        stroke={RING_NAVY}
                        strokeWidth="16"
                    />
                    <Circle
                        cx="180"
                        cy="180"
                        r="60"
                        fill="none"
                        stroke={RING_NAVY}
                        strokeWidth="16"
                    />

                    <AnimatedCircle
                        cx="180"
                        cy="180"
                        r={outerRadius}
                        fill="none"
                        stroke={ORBIT_COLOR}
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={`142 ${circumference - 142}`}
                        transform="rotate(-90 180 180)"
                        animatedProps={orbitAnimatedProps}
                    />

                </Svg>

                <View pointerEvents="none" style={styles.shoeStage}>
                    <Animated.Image
                        source={SHOE_REST}
                        resizeMode="contain"
                        style={[styles.shoeFrame, shoeRestStyle]}
                    />
                    <Animated.Image
                        source={SHOE_STEP}
                        resizeMode="contain"
                        style={[styles.shoeFrame, shoeStepStyle]}
                    />
                </View>
            </View>

            <Animated.View style={[styles.subtitleArea, subtitleStyle]}>
                <Text style={styles.brandSubtitle}>나만의 러닝 코스</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: NAVY,
        paddingHorizontal: 28,
    },
    trackArea: {
        width: '100%',
        maxWidth: 360,
        aspectRatio: 1,
        marginTop: -100,
        position: 'relative',
    },
    svg: {
        width: '100%',
        height: '100%',
    },
    shoeStage: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shoeFrame: {
        position: 'absolute',
        width: '84%',
        height: '84%',

        transform: [
            { translateX: 4 },
            { translateY: -21 },
        ],
    },
    subtitleArea: {
        marginTop: 36,
    },
    brandSubtitle: {
        color: LIME,
        fontSize: 34,
        fontWeight: '700',
        letterSpacing: -1.5,
    },
});
