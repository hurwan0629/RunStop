import { StyleSheet } from 'react-native';

/** 최종 디자인 적용 전, 문의 화면의 배치와 상태를 확인하기 위한 기본 스타일입니다. */
export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardArea: {
    flex: 1,
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 32,
    color: '#0A145A',
    fontSize: 38,
    lineHeight: 40,
  },
  screenTitle: {
    color: '#0A145A',
    fontSize: 22,
    fontWeight: '800',
    marginLeft: 8,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E6E8EF',
    paddingHorizontal: 20,
  },
  tabButton: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#100078',
  },
  tabText: {
    color: '#9299A8',
    fontSize: 15,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#100078',
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 48,
  },
  label: {
    color: '#22283A',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  contentLabel: {
    color: '#22283A',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 10,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#D9DCE5',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#161A27',
    fontSize: 15,
    paddingHorizontal: 15,
  },
  textArea: {
    minHeight: 220,
    borderWidth: 1,
    borderColor: '#D9DCE5',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#161A27',
    fontSize: 15,
    lineHeight: 22,
    padding: 15,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  counter: {
    alignSelf: 'flex-end',
    color: '#9299A8',
    fontSize: 12,
    marginTop: 8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    marginTop: 7,
  },
  submitError: {
    color: '#FF3B30',
    fontSize: 13,
    marginTop: 18,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#100078',
    marginTop: 32,
  },
  primaryButtonText: {
    color: '#C8FF30',
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.68,
  },
  disabled: {
    opacity: 0.5,
  },
  historyContent: {
    flexGrow: 1,
    padding: 20,
  },
  noticeText: {
    color: '#218653',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  loader: {
    marginTop: 50,
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    borderWidth: 1,
    borderColor: '#E3E6EF',
    borderRadius: 14,
    backgroundColor: '#F9FAFD',
    padding: 18,
  },
  historyTitle: {
    color: '#0A145A',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  historyDate: {
    color: '#9299A8',
    fontSize: 13,
  },
  statusText: {
    color: '#6E7482',
    fontSize: 12,
    fontWeight: '700',
  },
  answeredStatus: {
    color: '#218653',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E3E6EF',
    borderRadius: 14,
    backgroundColor: '#F9FAFD',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyTitle: {
    color: '#0A145A',
    fontSize: 17,
    fontWeight: '800',
  },
  emptyText: {
    color: '#7C8494',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  retryText: {
    color: '#100078',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 18,
  },
});
