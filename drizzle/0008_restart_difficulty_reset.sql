-- one-time correction after a months-long break. most reviewed cards sat at
-- FSRS difficulty ~8/10 because Hard was used as "barely failed", which kept
-- intervals short. halve each card's distance from 5 so the relative signal
-- survives but relearning isn't throttled. stability and review logs are kept.
UPDATE `cards` SET `difficulty` = 5 + (`difficulty` - 5) * 0.5 WHERE `reps` > 0;--> statement-breakpoint
-- older rows came from the single-question query (Easy/Medium/Hard); the app
-- stores the uppercase form everywhere else.
UPDATE `problems` SET `difficulty` = upper(`difficulty`);
