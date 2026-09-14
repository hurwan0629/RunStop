import { StyleSheet } from 'react-native';

import { colors } from '@/styles/tokens';

/** 최종 색상과 폰트 적용 전, 마이페이지 구조를 확인하기 위한 기본 스타일입니다. */
export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImagePlaceholder: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.navy,
  },
  profileImageText: {
    color: colors.lime,
    fontSize: 20,
    fontWeight: '900',
  },
  profileCopy: {
    flex: 1,
    marginLeft: 14,
  },
  nickname: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: '900',
  },
  loginId: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  levelText: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: colors.lime,
    color: colors.navy,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  editText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  expHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  expLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  expValue: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    overflow: 'hidden',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.inactive,
    marginTop: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.lime,
  },
  progressHelp: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 6,
  },
  goalCard: {
    borderWidth: 0,
    borderRadius: 22,
    backgroundColor: colors.pageIndigo,
    padding: 22,
    marginTop: 18,
  },
  goalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '800',
  },
  goalRate: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  goalDistanceRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    marginTop: 14,
  },
  goalDistanceValue: {
    color: colors.navy,
    fontSize: 28,
    fontWeight: '900',
  },
  goalDistanceTarget: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
  },
  goalProgressTrack: {
    height: 9,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.white,
    marginTop: 16,
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.lime,
  },
  goalEmptyTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 13,
  },
  goalEmptyDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  menuCard: {
    backgroundColor: 'transparent',
    marginTop: 18,
  },
  menuRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: 10,
  },
  menuRowBorder: {
    borderBottomWidth: 0,
  },
  settingsMenu: {
    borderTopWidth: 1,
    borderTopColor: '#EEF0F4',
    marginTop: 10,
  },
  settingRow: {
    minHeight: 54,
    borderRadius: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 0,
  },
  menuTextGroup: {
    flex: 1,
  },
  menuTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
  },
  menuDescription: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  chevron: {
    color: '#C5CBD5',
    fontSize: 21,
    marginLeft: 10,
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 16,
    marginLeft: 4,
  },
  dangerText: {
    color: '#D84A4A',
  },
  errorCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F2C8C8',
    borderRadius: 14,
    backgroundColor: '#FFF8F8',
    padding: 18,
    marginBottom: 18,
  },
  errorText: { color: '#D84A4A', fontSize: 13, textAlign: 'center' },
  retryText: { color: '#100078', fontSize: 13, fontWeight: '800', marginTop: 12 },
  pressed: {
    opacity: 0.65,
  },
  disabled: {
    opacity: 0.45,
  },
});
