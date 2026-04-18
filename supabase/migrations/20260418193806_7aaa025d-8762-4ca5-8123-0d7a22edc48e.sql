CREATE SCHEMA IF NOT EXISTS archive;

CREATE TABLE archive.nela_sessions_backup_20260418 AS SELECT * FROM public.nela_sessions;
CREATE TABLE archive.nela_reminders_backup_20260418 AS SELECT * FROM public.nela_reminders;
CREATE TABLE archive.ai_recommendation_actions_backup_20260418 AS SELECT * FROM public.ai_recommendation_actions;
CREATE TABLE archive.search_synonyms_backup_20260418 AS SELECT * FROM public.search_synonyms;

DROP FUNCTION IF EXISTS public.expand_search_query(text) CASCADE;
DROP FUNCTION IF EXISTS public.add_synonym(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.add_synonym(text, text[], text) CASCADE;
DROP FUNCTION IF EXISTS public.delete_synonym(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_all_synonyms() CASCADE;
DROP FUNCTION IF EXISTS public.test_expand_query(text) CASCADE;

DROP TABLE IF EXISTS public.nela_reminders CASCADE;
DROP TABLE IF EXISTS public.nela_sessions CASCADE;
DROP TABLE IF EXISTS public.ai_recommendation_actions CASCADE;
DROP TABLE IF EXISTS public.search_synonyms CASCADE;

-- ROLLBACK:
-- CREATE TABLE public.nela_sessions AS SELECT * FROM archive.nela_sessions_backup_20260418;
-- CREATE TABLE public.nela_reminders AS SELECT * FROM archive.nela_reminders_backup_20260418;
-- CREATE TABLE public.ai_recommendation_actions AS SELECT * FROM archive.ai_recommendation_actions_backup_20260418;
-- CREATE TABLE public.search_synonyms AS SELECT * FROM archive.search_synonyms_backup_20260418;