import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  stepText: {
    color: '#7B858A',
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    color: '#172E38',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 8,
  },
  description: {
    color: '#7B858A',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 20,
  },
  map: {
    height: 320,
  },
  statusCard: {
    borderWidth: 1,
    borderColor: '#E3E7E9',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 16,
  },
  statusLabel: {
    color: '#59676D',
    fontSize: 12,
    fontWeight: '600',
  },
  statusText: {
    color: '#172E38',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  errorText: {
    color: '#E5484D',
  },
  locationButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#172E38',
    paddingHorizontal: 18,
    marginTop: 16,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  nextButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: '#100078',
    paddingHorizontal: 18,
    marginTop: 12,
  },
  nextButtonText: {
    color: '#C8FF30',
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
});
