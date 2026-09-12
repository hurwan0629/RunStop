import type { LocationPoint } from '@/features/course/types';

export type RunningTrackpoint = LocationPoint & {
  clientTrackpointId: string;
  recordedAt: string;
  accuracy?: number;
};

export type RunningStartResponse = {
  sessionIdx: number;
  status: 'IN_PROGRESS';
};

export type RunningFinishResponse = {
  sessionIdx: number;
  status: 'COMPLETED';
  distance: number;
  averagePace: number | null;
};

export type RunningPaceResponse = {
  sessionIdx: number;
  averagePace: number | null;
  segments: {
    distanceFrom: number;
    distanceTo: number;
    pace: number;
  }[];
};
