import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  backButton: {
    color: '#0A145A',
    fontSize: 38,
    lineHeight: 38,
  },
  title: {
    color: '#0A145A',
    fontSize: 22,
    fontWeight: '900',
  },
  tabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F2F5',
  },
  activeTab: {
    backgroundColor: '#100078',
  },
  tabText: {
    color: '#727783',
    fontSize: 15,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#C8FF30',
  },
  form: {
    gap: 10,
  },
  description: {
    color: '#666666',
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 18,
  },
  label: {
    color: '#555B6B',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#D9DCE3',
    borderRadius: 8,
    paddingHorizontal: 14,
    color: '#111111',
    backgroundColor: '#FFFFFF',
  },
  rowInput: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#D9DCE3',
    borderRadius: 8,
    paddingHorizontal: 14,
    color: '#111111',
    backgroundColor: '#FFFFFF',
  },
  passwordRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D9DCE3',
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    color: '#111111',
  },
  visibilityButton: {
    color: '#0A145A',
    fontWeight: '600',
    padding: 6,
  },
  smallButton: {
    minWidth: 90,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0A145A',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  smallButtonText: {
    color: '#0A145A',
    fontSize: 13,
    fontWeight: '700',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
  },
  successText: {
    color: '#169B62',
    fontSize: 13,
  },
  resultBox: {
    borderRadius: 12,
    marginTop: 18,
    padding: 20,
    backgroundColor: '#F1F3FF',
  },
  resultLabel: {
    color: '#666C7A',
    fontSize: 13,
    marginBottom: 8,
  },
  resultValue: {
    color: '#0A145A',
    fontSize: 24,
    fontWeight: '700',
  },
  resultDescription: {
    color: '#333846',
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginTop: 18,
    backgroundColor: '#100078',
  },
  primaryButtonText: {
    color: '#C8FF30',
    fontSize: 16,
    fontWeight: '700',
  },
  loginButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginTop: 28,
    backgroundColor: '#100078',
  },
  loginButtonText: {
    color: '#C8FF30',
    fontSize: 16,
    fontWeight: '700',
  },
});
