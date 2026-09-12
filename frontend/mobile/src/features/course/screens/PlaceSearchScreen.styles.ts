import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F7F8FA',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    color: '#100078',
    fontSize: 38,
    lineHeight: 40,
  },
  title: {
    color: '#100078',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: '#667085',
    fontSize: 12,
    marginTop: 3,
  },
  searchBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D9DDEA',
    borderRadius: 14,
    borderWidth: 1,
    color: '#101828',
    flex: 1,
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  clearQueryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -42,
    width: 42,
    zIndex: 1,
  },
  clearQueryText: {
    color: '#98A2B3',
    fontSize: 24,
    lineHeight: 27,
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: '#100078',
    borderRadius: 14,
    justifyContent: 'center',
    minWidth: 64,
    paddingHorizontal: 12,
  },
  searchButtonText: {
    color: '#C8FF30',
    fontSize: 14,
    fontWeight: '800',
  },
  content: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    color: '#182230',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionHint: {
    color: '#667085',
    fontSize: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  favoriteRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 8,
    padding: 14,
  },
  favoriteStar: {
    color: '#100078',
    fontSize: 18,
    marginRight: 10,
  },
  rowCopy: {
    flex: 1,
  },
  placeName: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '700',
  },
  coordinateText: {
    color: '#98A2B3',
    fontSize: 12,
    marginTop: 3,
  },
  resultRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 10,
    minHeight: 90,
  },
  resultMain: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  addressText: {
    color: '#667085',
    fontSize: 12,
    marginTop: 5,
  },
  categoryText: {
    color: '#8F92B5',
    fontSize: 11,
    marginTop: 3,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    width: 50,
  },
  saveButtonText: {
    color: '#667085',
    fontSize: 28,
  },
  savedButton: {
    opacity: 0.85,
  },
  savedButtonText: {
    color: '#100078',
  },
  message: {
    color: '#D92D20',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyText: {
    color: '#667085',
    fontSize: 14,
    paddingTop: 16,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.7,
  },
});
