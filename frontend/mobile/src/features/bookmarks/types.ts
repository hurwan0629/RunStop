import type { LocationPoint } from '@/features/course/types';

export type CourseBookmarkPreview = {
  id: string;
  courseId: string;
  name: string;
  distanceKm: number;
  totalAscentM: number;
  slopeLabel: string;
  tags: string[];
};

export type PlaceBookmarkPreview = LocationPoint & {
  id: string;
  name: string;
  address: string;
  category: string;
};
