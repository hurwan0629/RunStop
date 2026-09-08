import { StyleSheet } from 'react-native';

/** 최종 디자인 전, 화면 동작 확인을 위한 최소 레이아웃입니다. */
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  form: {
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    marginBottom: 12,
  },
  label: {
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  passwordRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  previewButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#218653',
    borderRadius: 8,
    marginTop: 12,
  },
  previewButtonPressed: {
    opacity: 0.65,
  },
  previewButtonText: {
    color: '#218653',
    fontWeight: '700',
  },
});
