export const up = (pgm) => {
  pgm.sql('ALTER TABLE service.running_sessions ADD COLUMN track_analysis jsonb;');
};

export const down = (pgm) => {
  pgm.sql('ALTER TABLE service.running_sessions DROP COLUMN track_analysis;');
};
