export const up = (pgm) => {
  pgm.sql(`
    ALTER TYPE service.running_session_status
    ADD VALUE IF NOT EXISTS 'CANCELLED';
  `);

  pgm.sql(`
    ALTER TABLE service.route_requests
    ADD COLUMN IF NOT EXISTS route_type varchar(20);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE service.route_requests
    DROP COLUMN IF EXISTS route_type;
  `);
};