# Kem Trộn — cloud save integration

The normal localStorage save remains functional. Cloud Save is explicitly opt-in via the cloud button.

## Database activation (owner action)
1. Open the Vercel project kem-tron → Storage → Create Database → Neon, choose a free plan when available and connect to the Production environment of the existing project.
2. Confirm that DATABASE_URL or POSTGRES_URL is available to Production Functions. Never paste it in code or GitHub.
3. Redeploy the latest commit. The first authorized cloud request initializes two tables in Neon.
4. Play the game, tap the ☁ button, enable cloud, copy the secret recovery code. Open another browser and restore using that code.

The cloud key is a bearer credential: anyone who knows it can read and change that game save. Do not share the key or put it into a URL.

## Tables
- kem_tron_players: latest SaveState JSON, saved day, timestamps, hashed player identifier.
- kem_tron_events: deduplicated gameplay event rows.

## Useful queries
SELECT COUNT(*) FROM kem_tron_players;
SELECT day, COUNT(*) FROM kem_tron_players GROUP BY day ORDER BY day;
SELECT event_name, COUNT(*) FROM kem_tron_events GROUP BY event_name ORDER BY count(*) DESC;
SELECT day, COUNT(DISTINCT player_id) FROM kem_tron_events WHERE event_name='day_completed' GROUP BY day ORDER BY day;

## Caveats
- No data is uploaded before a player explicitly enables Cloud Save.
- Browsers do not sync automatically without importing the recovery key.
- Simultaneous play across devices is not merged; stale writes receive HTTP 409.
- This is first-party client instrumentation, not fraud-proof analytics.
- Deletion/export controls, a full admin dashboard, database migrations and stronger abuse prevention should be added before a major public launch.
