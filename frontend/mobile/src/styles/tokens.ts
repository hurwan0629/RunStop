/**
 * RunStop mobile design tokens.
 *
 * Figma에서 추출한 웹 CSS 토큰을 React Native에서 재사용할 수 있도록
 * 색상과 반경 값만 분리했습니다. 폰트 파일은 아직 프로젝트에 없어서
 * 각 화면은 시스템 글꼴의 굵기와 기울임으로 우선 표현합니다.
 */
export const colors = {
  navy: '#04045E',
  navySoft: '#10106D',
  lime: '#B9FA3C',
  pageIndigo: '#F0F4FF',
  cardBg: '#F8F9FF',
  cardBorder: '#DDE1F3',
  inactive: '#ECEEF5',
  border: '#E5E7EB',
  muted: '#8F96A8',
  textSub: '#6B7280',
  textBody: '#374151',
  danger: '#EF4444',
  white: '#FFFFFF',
} as const;

export const radii = {
  small: 12,
  medium: 20,
  large: 24,
  pill: 999,
} as const;
