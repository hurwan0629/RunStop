import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from './RunningScreen.styles';

export default function RunningResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    averagePace?: string;
    distance?: string;
    elapsedSeconds?: string;
    sessionId?: string;
    status?: 'COMPLETED' | 'STOPPED';
  }>();
  const distance = Number(params.distance) || 0;
  const averagePace = Number(params.averagePace) || null;
  const elapsedSeconds = Number(params.elapsedSeconds) || 0;
  const isStopped = params.status === 'STOPPED';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.resultContent}>
        <View style={styles.completeMark}>
          <Text style={styles.completeMarkText}>{isStopped ? '!' : '✓'}</Text>
        </View>
        <Text style={styles.resultTitle}>
          {isStopped ? '러닝이 중단되었어요' : '오늘의 러닝 완료!'}
        </Text>
        <Text style={styles.resultDescription}>
          {isStopped
            ? '현재까지의 러닝 기록이 저장되었습니다.'
            : '서버에 러닝 기록이 안전하게 저장되었습니다.'}
        </Text>

        <View style={styles.resultCard}>
          <ResultMetric
            label="달린 거리"
            value={`${(distance / 1000).toFixed(2)} km`}
          />
          <ResultMetric
            label="러닝 시간"
            value={formatDuration(elapsedSeconds)}
          />
          <ResultMetric
            label="평균 페이스"
            value={formatPace(averagePace)}
          />
        </View>

        <Text style={styles.sessionText}>
          {params.sessionId ? `러닝 기록 #${params.sessionId}` : ''}
        </Text>

        <Pressable
          onPress={() => router.replace('/home')}
          style={({ pressed }) => [
            styles.resultPrimaryButton,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.resultPrimaryText}>{'홈으로 가기'}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/records')}
          style={({ pressed }) => [
            styles.resultSecondaryButton,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.resultSecondaryText}>{'러닝 기록 보기'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultMetric}>
      <Text style={styles.resultMetricLabel}>{label}</Text>
      <Text style={styles.resultMetricValue}>{value}</Text>
    </View>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${minutes}분 ${seconds}초`;
}

function formatPace(pace: number | null) {
  if (pace === null || pace <= 0) {
    return '--';
  }

  const minutes = Math.floor(pace / 60);
  const seconds = String(Math.round(pace % 60)).padStart(2, '0');

  return `${minutes}'${seconds}"/km`;
}
