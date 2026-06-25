-- 002: Canonical stations + product lines (groundwork for station_id normalization)
--
-- Today "stations" are free-text strings in route_template_steps.station_name and
-- station_kiosks.station_name, and they disagree (e.g. kiosk "Welding Bay" vs route
-- step "Welding"), which breaks operator scoping and the station queue. This migration
-- introduces a canonical `stations` table and links both sides to it via a new
-- station_id FK. It is ADDITIVE — the existing station_name columns are kept so nothing
-- breaks before the follow-up code change switches to station_id.
--
-- Product lines: per the "a mix" decision, stations carry an OPTIONAL product_line_id
-- (NULL = shared across lines). The product_lines table starts empty; populate it and
-- tag dedicated stations later. Routing stays independent of physical resources.

CREATE TABLE IF NOT EXISTS product_lines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  product_line_id INTEGER REFERENCES product_lines(id),  -- NULL = shared across product lines
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Canonical station names use the ROUTE-STEP spelling (that's where work actually happens).
-- Seed from the distinct route_template_steps.station_name values.
INSERT INTO stations (name)
SELECT DISTINCT TRIM(station_name)
FROM route_template_steps
WHERE station_name IS NOT NULL AND TRIM(station_name) <> ''
ON CONFLICT (name) DO NOTHING;

-- Safety net: also create a station for any kiosk name that is NOT a known alias and
-- does not already exist (none expected given current data, but keeps the backfill total).
INSERT INTO stations (name)
SELECT DISTINCT canonical FROM (
  SELECT CASE TRIM(station_name)
           WHEN 'Welding Bay'  THEN 'Welding'
           WHEN 'Howick Line'  THEN 'Howick Frame'
           WHEN 'Laser'        THEN 'Laser Cut'
           ELSE TRIM(station_name)
         END AS canonical
  FROM station_kiosks
  WHERE station_name IS NOT NULL AND TRIM(station_name) <> ''
) k
ON CONFLICT (name) DO NOTHING;

-- Link route_template_steps -> stations (exact name match; route-step spelling is canonical).
ALTER TABLE route_template_steps ADD COLUMN IF NOT EXISTS station_id INTEGER REFERENCES stations(id);
UPDATE route_template_steps rts
SET station_id = s.id
FROM stations s
WHERE s.name = TRIM(rts.station_name) AND rts.station_id IS NULL;

-- Link station_kiosks -> stations (apply the confirmed alias mapping).
ALTER TABLE station_kiosks ADD COLUMN IF NOT EXISTS station_id INTEGER REFERENCES stations(id);
UPDATE station_kiosks sk
SET station_id = s.id
FROM stations s
WHERE s.name = CASE TRIM(sk.station_name)
                 WHEN 'Welding Bay'  THEN 'Welding'
                 WHEN 'Howick Line'  THEN 'Howick Frame'
                 WHEN 'Laser'        THEN 'Laser Cut'
                 ELSE TRIM(sk.station_name)
               END
  AND sk.station_id IS NULL;
