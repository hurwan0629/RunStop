import { StyleSheet } from 'react-native';

import { colors } from '@/styles/tokens';

/** 최종 디자인 적용 전, 러닝 목표 화면의 배치와 상태를 확인하기 위한 기본 스타일입니다. */
export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: '#F3F4F6',
    borderBottomWidth: 1,
    paddingHorizontal: 28,
  },
  backButton: {
    width: 38,
    color: colors.navy,
    fontSize: 40,
    lineHeight: 42,
  },
  screenTitle: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: '900',
    marginLeft: 10,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 40,
  },
  loader: {
    marginTop: 40,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 0,
    borderRadius: 16,
    backgroundColor: colors.inactive,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  typeButtonActive: {
    backgroundColor: colors.navy,
  },
  typeButtonText: {
    color: colors.textSub,
    fontSize: 15,
    fontWeight: '800',
  },
  typeButtonTextActive: {
    color: colors.lime,
  },
  distanceLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 28,
    marginBottom: 10,
  },
  distanceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 84,
    borderRadius: 18,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  distanceInput: {
    flex: 1,
    color: colors.navy,
    fontSize: 34,
    fontWeight: '900',
    paddingHorizontal: 0,
    paddingVertical: 6,
  },
  distanceUnit: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '800',
  },
  quickLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 26,
    marginBottom: 10,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickButton: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.inactive,
  },
  quickButtonActive: {
    backgroundColor: colors.navy,
  },
  quickButtonText: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
  },
  quickButtonTextActive: {
    color: colors.lime,
  },
  periodHelp: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 22,
  },
  formError: {
    color: '#FF3B30',
    fontSize: 13,
    marginTop: 18,
    textAlign: 'center',
  },
  noticeText: {
    color: '#218653',
    fontSize: 13,
    marginTop: 18,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.navy,
    marginTop: 28,
  },
  primaryButtonText: {
    color: colors.lime,
    fontSize: 16,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.68,
  },
  disabled: {
    opacity: 0.5,
  },
  errorCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD1CD',
    borderRadius: 12,
    backgroundColor: '#FFF7F6',
    padding: 18,
    marginBottom: 18,
  },
  errorText: {
    color: '#D33D34',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryText: {
    color: '#100078',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
  currentCard: {
    borderWidth: 0,
    borderRadius: 26,
    backgroundColor: colors.pageIndigo,
    padding: 26,
  },
  currentEyebrow: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '700',
  },
  currentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  currentTitle: {
    color: colors.navy,
    fontSize: 23,
    fontWeight: '800',
  },
  currentRate: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: '800',
  },
  currentDistance: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 15,
  },
  progressTrack: {
    height: 10,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: colors.white,
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.lime,
  },
  currentHelp: {
    color: '#777F8F',
    fontSize: 13,
    marginTop: 14,
  },
  currentFootnote: {
    color: '#9299A8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 28,
  },
  stopButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0B8B8',
    borderRadius: 12,
    marginTop: 18,
  },
  stopButtonText: { color: '#D33D34', fontSize: 14, fontWeight: '800' },
});
