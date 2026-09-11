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
    withTiming,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const NAVY = '#08056B';
const RING_NAVY = '#24296A';
const LIME = '#D5FF1A';

type RunStopIntroAnimationProps = {
    onFinished: () => void;
};

export function RunStopIntroAnimation({
    onFinished,
}: RunStopIntroAnimationProps) {
    const outerRadius = 132;
    const circumference = 2 * Math.PI * outerRadius;
    const orbitProgress = useSharedValue(0);

    const titleProgress = useSharedValue(0);
    const subtitleProgress = useSharedValue(0);
    const rProgress = useSharedValue(0);

    useEffect(() => {
        // 라임 선분이 바깥 원을 계속 도는 효과
        orbitProgress.value = withRepeat(
            withTiming(circumference, {
                duration: 1350,
                easing: Easing.linear,
            }),
            -1,
            false,
        );

        // R 글자를 왼쪽부터 차례로 드러내, 써지는 듯한 인상을 만듭니다.
        rProgress.value = withDelay(
            450,
            withTiming(1, {
                duration: 850,
                easing: Easing.out(Easing.cubic),
            }),
        );

        // R 완성 후 브랜드명과 소개 문구 등장
        titleProgress.value = withDelay(
            1550,
            withTiming(1, {
                duration: 350,
                easing: Easing.out(Easing.cubic),
            }),
        );

        subtitleProgress.value = withDelay(
            1780,
            withTiming(1, {
                duration: 300,
                easing: Easing.out(Easing.cubic),
            }),
        );

        // 전체 인트로 종료 후 다음 화면으로 이동
        const timer = setTimeout(onFinished, 3000);

        return () => clearTimeout(timer);
    }, [
        circumference,
        onFinished,
        orbitProgress,
        rProgress,
        subtitleProgress,
        titleProgress,
    ]);

    const orbitAnimatedProps = useAnimatedProps(() => ({
        strokeDashoffset: -orbitProgress.value,
    }));

    const rRevealStyle = useAnimatedStyle(() => ({
        width: 190 * rProgress.value,
        opacity: rProgress.value === 0 ? 0 : 1,
    }));

    const titleStyle = useAnimatedStyle(() => ({
        opacity: titleProgress.value,
        transform: [
            {
                translateY: 22 * (1 - titleProgress.value),
            },
        ],
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
                    {/* 어두운 남색 동심원 트랙 */}
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

                    {/* 원을 따라 달리는 라임색 선분 */}
                    <AnimatedCircle
                        cx="180"
                        cy="180"
                        r={outerRadius}
                        fill="none"
                        stroke={LIME}
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={`142 ${circumference - 142}`}
                        transform="rotate(-90 180 180)"
                        animatedProps={orbitAnimatedProps}
                    />

                </Svg>

                <View pointerEvents="none" style={styles.rClip}>
                    <Animated.View style={[styles.rReveal, rRevealStyle]}>
                        <Text style={styles.rText}>R</Text>
                    </Animated.View>
                </View>
            </View>

            <Animated.View style={[styles.brandArea, titleStyle]}>
                <Text style={styles.brandName}>RunStop</Text>
            </Animated.View>

            <Animated.View style={subtitleStyle}>
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
        marginTop: -80,
        position: 'relative',
    },
    svg: {
        width: '100%',
        height: '100%',
    },
    brandArea: {
        marginTop: 32,
    },
    brandName: {
        color: LIME,
        fontSize: 54,
        fontWeight: '900',
        fontStyle: 'italic',
        letterSpacing: -5,
        transform: [{ scaleX: 0.86 }],
    },
    brandSubtitle: {
        marginTop: 8,
        color: '#8C9263',
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -1,
    },
    rClip: {
        position: 'absolute',
        top: '24%',
        width: 190,
        height: 190,
        alignSelf: 'center',
        overflow: 'hidden',
    },
    rReveal: {
        height: 190,
        overflow: 'hidden',
    },
    rText: {
        width: 190,
        color: LIME,
        fontSize: 178,
        fontWeight: '900',
        fontStyle: 'italic',
        letterSpacing: -12,
        lineHeight: 190,
        textAlign: 'center',
        includeFontPadding: false,
    },
});
