import { StyleSheet } from 'react-native';

/** 최종 색상과 폰트 적용 전, 마이페이지 구조를 확인하기 위한 기본 스타일입니다. */
export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImagePlaceholder: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#172E38',
  },
  profileImageText: {
    color: '#7BE0A4',
    fontSize: 18,
    fontWeight: '800',
  },
  profileCopy: {
    flex: 1,
    marginLeft: 14,
  },
  nickname: {
    color: '#172E38',
    fontSize: 21,
    fontWeight: '800',
  },
  loginId: {
    color: '#7B858A',
    fontSize: 12,
    marginTop: 4,
  },
  levelText: {
    color: '#59676D',
    fontSize: 11,
    marginTop: 6,
  },
  editText: {
    color: '#59676D',
    fontSize: 13,
    fontWeight: '600',
  },
  expHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  expLabel: {
    color: '#59676D',
    fontSize: 12,
  },
  expValue: {
    color: '#59676D',
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E3E7E9',
    marginTop: 8,
  },
  progressHelp: {
    color: '#8A9499',
    fontSize: 12,
    marginTop: 8,
  },
  goalCard: {
    borderWidth: 1,
    borderColor: '#E3E7E9',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 18,
    marginTop: 24,
  },
  cardLabel: {
    color: '#59676D',
    fontSize: 13,
    fontWeight: '700',
  },
  goalEmptyTitle: {
    color: '#172E38',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  goalButton: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: '#E8F8EE',
    paddingHorizontal: 15,
    marginTop: 15,
  },
  goalButtonText: {
    color: '#218653',
    fontSize: 13,
    fontWeight: '700',
  },
  menuCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E3E7E9',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 20,
  },
  menuRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F1',
  },
  menuTextGroup: {
    flex: 1,
  },
  menuTitle: {
    color: '#172E38',
    fontSize: 15,
    fontWeight: '700',
  },
  menuDescription: {
    color: '#8A9499',
    fontSize: 12,
    marginTop: 5,
  },
  chevron: {
    color: '#8A9499',
    fontSize: 24,
    marginLeft: 12,
  },
  sectionTitle: {
    color: '#59676D',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 28,
    marginLeft: 4,
  },
  dangerText: {
    color: '#D84A4A',
  },
  pressed: {
    opacity: 0.65,
  },
  disabled: {
    opacity: 0.45,
  },
});
