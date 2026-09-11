import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import { getInquiryDetail } from '../api/inquiriesApi';
import type { InquiryDetail, InquiryStatus } from '../types';
import { styles } from './InquiryDetailScreen.styles';

const statusLabels: Record<InquiryStatus, string> = {
  PENDING: '답변 대기',
  IN_PROGRESS: '검토 중',
  ANSWERED: '답변 완료',
};

export default function InquiryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ inquiryId?: string }>();
  const { accessToken } = useAuth();
  const inquiryId = Number(params.inquiryId);
  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadInquiry = useCallback(async () => {
    if (!accessToken || !Number.isInteger(inquiryId) || inquiryId <= 0) {
      setErrorMessage('문의 내용을 확인할 수 없습니다.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      setInquiry(await getInquiryDetail(accessToken, inquiryId));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, inquiryId]);

  useEffect(() => {
    void loadInquiry();
  }, [loadInquiry]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.backButton}>{'‹'}</Text>
        </Pressable>
        <Text style={styles.screenTitle}>{'문의 상세'}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#100078" style={styles.loader} />
      ) : errorMessage ? (
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable onPress={() => void loadInquiry()}>
            <Text style={styles.retryText}>{'다시 불러오기'}</Text>
          </Pressable>
        </View>
      ) : inquiry ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{inquiry.title}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{statusLabels[inquiry.status]}</Text>
            </View>
          </View>
          <Text style={styles.dateText}>{formatDate(inquiry.createdAt)}</Text>

          <View style={styles.contentCard}>
            <Text style={styles.cardLabel}>{'문의 내용'}</Text>
            <Text style={styles.bodyText}>{inquiry.content}</Text>
          </View>

          <View style={styles.answerCard}>
            <Text style={styles.cardLabel}>{'답변'}</Text>
            {inquiry.answer ? (
              <>
                <Text style={styles.bodyText}>{inquiry.answer}</Text>
                {inquiry.answeredAt ? (
                  <Text style={styles.answerDate}>
                    {formatDate(inquiry.answeredAt)}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.waitingText}>
                {'담당자가 문의 내용을 확인하고 있어요.'}
              </Text>
            )}
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
