import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import { createInquiry, getInquiries } from '../api/inquiriesApi';
import type { InquiryListItem, InquiryStatus } from '../types';
import { styles } from './InquiryListScreen.styles';

type InquiryTab = 'write' | 'history';
type FieldErrors = { title?: string; content?: string };

const statusLabels: Record<InquiryStatus, string> = {
  PENDING: '답변 대기',
  IN_PROGRESS: '검토 중',
  ANSWERED: '답변 완료',
};

export default function InquiryListScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<InquiryTab>('write');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [items, setItems] = useState<InquiryListItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [listNotice, setListNotice] = useState('');

  const loadInquiries = useCallback(async () => {
    if (!accessToken) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setListError('');

    try {
      const response = await getInquiries(accessToken);
      setItems(response.items);
    } catch (error) {
      setListError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (activeTab === 'history') {
      void loadInquiries();
    }
  }, [activeTab, loadInquiries]);

  const handleSubmit = async () => {
    const nextErrors: FieldErrors = {};
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      nextErrors.title = '제목을 입력해 주세요.';
    }
    if (!trimmedContent) {
      nextErrors.content = '문의 내용을 입력해 주세요.';
    }

    setFieldErrors(nextErrors);
    setSubmitError('');

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!accessToken) {
      setSubmitError('로그인 후 문의를 등록할 수 있어요.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createInquiry(accessToken, {
        title: trimmedTitle,
        content: trimmedContent,
      });
      setTitle('');
      setContent('');
      setFieldErrors({});
      setListNotice('문의가 등록되었습니다.');
      setActiveTab('history');
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="뒤로 가기"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.back()}>
            <Text style={styles.backButton}>{'‹'}</Text>
          </Pressable>
          <Text style={styles.screenTitle}>{'문의하기'}</Text>
        </View>

        <View style={styles.tabs}>
          <TabButton
            active={activeTab === 'write'}
            label="문의 작성"
            onPress={() => setActiveTab('write')}
          />
          <TabButton
            active={activeTab === 'history'}
            label="문의 내역"
            onPress={() => setActiveTab('history')}
          />
        </View>

        {activeTab === 'write' ? (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>{'제목'}</Text>
            <TextInput
              maxLength={100}
              onChangeText={(value) => {
                setTitle(value);
                if (fieldErrors.title) {
                  setFieldErrors((current) => ({ ...current, title: undefined }));
                }
              }}
              placeholder="문의 제목을 입력해 주세요"
              placeholderTextColor="#A5ABB8"
              style={[styles.input, fieldErrors.title && styles.inputError]}
              value={title}
            />
            {fieldErrors.title ? (
              <Text style={styles.errorText}>{fieldErrors.title}</Text>
            ) : null}

            <Text style={styles.contentLabel}>{'내용'}</Text>
            <TextInput
              maxLength={1000}
              multiline
              onChangeText={(value) => {
                setContent(value);
                if (fieldErrors.content) {
                  setFieldErrors((current) => ({ ...current, content: undefined }));
                }
              }}
              placeholder="문의하실 내용을 자세히 적어주세요"
              placeholderTextColor="#A5ABB8"
              style={[styles.textArea, fieldErrors.content && styles.inputError]}
              textAlignVertical="top"
              value={content}
            />
            <Text style={styles.counter}>{`${content.length} / 1000`}</Text>
            {fieldErrors.content ? (
              <Text style={styles.errorText}>{fieldErrors.content}</Text>
            ) : null}
            {submitError ? (
              <Text style={styles.submitError}>{submitError}</Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => void handleSubmit()}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                isSubmitting && styles.disabled,
              ]}>
              {isSubmitting ? (
                <ActivityIndicator color="#C8FF30" />
              ) : (
                <Text style={styles.primaryButtonText}>{'문의 등록하기'}</Text>
              )}
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.historyContent}
            showsVerticalScrollIndicator={false}>
            {listNotice ? (
              <Text style={styles.noticeText}>{listNotice}</Text>
            ) : null}
            <InquiryHistory
              accessToken={accessToken}
              error={listError}
              isLoading={isLoading}
              items={items}
              onOpen={(inquiryIdx) =>
                router.push({
                  pathname: '/profile/inquiries/[inquiryId]',
                  params: { inquiryId: String(inquiryIdx) },
                })
              }
              onRetry={() => void loadInquiries()}
            />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tabButton, active && styles.activeTab]}>
      <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
    </Pressable>
  );
}

function InquiryHistory({
  accessToken,
  error,
  isLoading,
  items,
  onOpen,
  onRetry,
}: {
  accessToken: string | null;
  error: string;
  isLoading: boolean;
  items: InquiryListItem[];
  onOpen: (inquiryIdx: number) => void;
  onRetry: () => void;
}) {
  if (!accessToken) {
    return <EmptyState message="로그인 후 문의 내역을 확인할 수 있어요." />;
  }

  if (isLoading) {
    return <ActivityIndicator color="#100078" style={styles.loader} />;
  }

  if (error) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={onRetry}>
          <Text style={styles.retryText}>{'다시 불러오기'}</Text>
        </Pressable>
      </View>
    );
  }

  if (items.length === 0) {
    return <EmptyState message="아직 등록한 문의가 없어요." />;
  }

  return (
    <View style={styles.historyList}>
      {items.map((item) => (
        <Pressable
          accessibilityRole="button"
          key={item.idx}
          onPress={() => onOpen(item.idx)}
          style={({ pressed }) => [
            styles.historyCard,
            pressed && styles.pressed,
          ]}>
          <Text numberOfLines={2} style={styles.historyTitle}>
            {item.title}
          </Text>
          <View style={styles.historyMeta}>
            <Text style={styles.historyDate}>{formatDate(item.createdAt)}</Text>
            <Text
              style={[
                styles.statusText,
                item.status === 'ANSWERED' && styles.answeredStatus,
              ]}>
              {statusLabels[item.status]}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{'문의 내역'}</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

function formatDate(value: string) {
  return value.slice(0, 10).replace(/-/g, '.');
}
