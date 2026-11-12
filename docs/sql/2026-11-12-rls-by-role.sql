-- Emputors: RLS by role (proposal, 12 Nov 2026). NOT APPLIED until Javier approves.
-- One DO block: guards first (RAISE EXCEPTION aborts everything), then backups, then changes.
--
-- Role check: public.current_discord_username() reads the Discord username from auth.identities
-- (written by Discord on each login; users cannot edit it, unlike user_metadata) and
-- public.current_clan_role() matches it against clan_roles (case-insensitive).

DO $migration$
DECLARE
  v_policies text;
  v_expected text := 'build_orders:Lectura publica build_orders|build_orders:Lectura publica de builds|build_orders:Permitir escritura a autenticados|'
                  || 'clan_roles:Escritura autenticada clan_roles|clan_roles:Lectura publica clan_roles|'
                  || 'cw7_draft_plans:Edicion de planes para usuarios autenticados|cw7_draft_plans:Lectura publica de planes|'
                  || 'cw7_rival_drafts:logged-in users add rival drafts|cw7_rival_drafts:logged-in users delete rival drafts|cw7_rival_drafts:read rival drafts|'
                  || 'cw7_rival_profiles:logged-in users add rival profiles|cw7_rival_profiles:logged-in users update rival profiles|cw7_rival_profiles:read rival profiles|'
                  || 'match_results:Escritura autenticada match_results|match_results:Lectura publica match_results';
  t text;
BEGIN
  ---------------------------------------------------------------- GUARDS
  SELECT string_agg(tablename || ':' || policyname, '|' ORDER BY tablename, policyname)
    INTO v_policies FROM pg_policies WHERE schemaname = 'public';
  IF v_policies IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'Guard: current policies differ from the reviewed set: %', v_policies;
  END IF;

  IF (SELECT count(*) FROM public.clan_roles) <> 9 THEN
    RAISE EXCEPTION 'Guard: clan_roles is expected to have 9 rows';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clan_roles WHERE lower(discord_username) = 'luciocornelio' AND role = 'admin') THEN
    RAISE EXCEPTION 'Guard: luciocornelio must be admin (otherwise nobody could manage roles)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider = 'discord' AND provider_id = '481515668433534996'
                 AND split_part(identity_data->>'name', '#', 1) = 'luciocornelio') THEN
    RAISE EXCEPTION 'Guard: Discord identity of luciocornelio not found with the expected name';
  END IF;

  IF to_regclass('public.leat11_team_members') IS NOT NULL THEN
    RAISE EXCEPTION 'Guard: public.leat11_team_members already exists';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname IN ('current_discord_username','current_clan_role','is_admin','is_member','is_team_player')) THEN
    RAISE EXCEPTION 'Guard: one of the role functions already exists';
  END IF;
  FOREACH t IN ARRAY ARRAY['clan_roles','build_orders','cw7_draft_plans','cw7_rival_drafts','cw7_rival_profiles','match_results','policies'] LOOP
    IF to_regclass('backup.' || t || '_20261112_rls') IS NOT NULL THEN
      RAISE EXCEPTION 'Guard: backup.%_20261112_rls already exists', t;
    END IF;
  END LOOP;

  ---------------------------------------------------------------- BACKUPS
  FOREACH t IN ARRAY ARRAY['clan_roles','build_orders','cw7_draft_plans','cw7_rival_drafts','cw7_rival_profiles','match_results'] LOOP
    EXECUTE format('CREATE TABLE backup.%I AS TABLE public.%I', t || '_20261112_rls', t);
  END LOOP;
  CREATE TABLE backup.policies_20261112_rls AS
    SELECT * FROM pg_policies WHERE schemaname = 'public';

  ---------------------------------------------------------------- ROLE FUNCTIONS
  EXECUTE $f$
    CREATE FUNCTION public.current_discord_username() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $b$
      SELECT lower(split_part(i.identity_data->>'name', '#', 1))
      FROM auth.identities i
      WHERE i.user_id = auth.uid() AND i.provider = 'discord'
      LIMIT 1
    $b$ $f$;
  EXECUTE $f$
    CREATE FUNCTION public.current_clan_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $b$
      SELECT r.role FROM public.clan_roles r
      WHERE lower(r.discord_username) = public.current_discord_username()
      LIMIT 1
    $b$ $f$;
  EXECUTE $f$
    CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $b$
      SELECT coalesce(public.current_clan_role() = 'admin', false)
    $b$ $f$;
  EXECUTE $f$
    CREATE FUNCTION public.is_member() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $b$
      SELECT coalesce(public.current_clan_role() IN ('admin', 'member'), false)
    $b$ $f$;

  ---------------------------------------------------------------- LEAT 11 TEAMS
  CREATE TABLE public.leat11_team_members (
    discord_username text PRIMARY KEY CHECK (discord_username = lower(discord_username)),
    team text NOT NULL,
    display_name text NOT NULL,
    slot smallint NOT NULL CHECK (slot IN (1, 2)),
    UNIQUE (team, slot)
  );
  INSERT INTO public.leat11_team_members (team, discord_username, display_name, slot) VALUES
    ('CostalCanela', 'ruizcanela',    'Ruizcanela',    1),
    ('CostalCanela', 'costalceleste', 'Costalceleste', 2),
    ('RaiSquad',     'ryzenvelos',    'Ryzenvelos',    1),
    ('RaiSquad',     'squadrano',     'Squadrano',     2),
    ('Sabaronte',    'caronte5865',   'Caronte',       1),
    ('Sabaronte',    'ersabo',        'Ersabo',        2),
    ('SarCornelio',  'luciocornelio', 'LucioCornelio', 1),
    ('SarCornelio',  'panete6033',    'Panete',        2);
  ALTER TABLE public.leat11_team_members ENABLE ROW LEVEL SECURITY;

  EXECUTE $f$
    CREATE FUNCTION public.is_team_player(p_team_a text, p_team_b text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $b$
      SELECT EXISTS (
        SELECT 1 FROM public.leat11_team_members m
        WHERE m.discord_username = public.current_discord_username()
          AND m.team IN (p_team_a, p_team_b)
      )
    $b$ $f$;

  REVOKE ALL ON FUNCTION public.current_discord_username(), public.current_clan_role(), public.is_admin(),
                         public.is_member(), public.is_team_player(text, text) FROM PUBLIC, anon;
  GRANT EXECUTE ON FUNCTION public.current_discord_username(), public.current_clan_role(), public.is_admin(),
                            public.is_member(), public.is_team_player(text, text) TO authenticated;

  ---------------------------------------------------------------- DROP OLD POLICIES
  DROP POLICY "Lectura publica build_orders" ON public.build_orders;
  DROP POLICY "Lectura publica de builds" ON public.build_orders;
  DROP POLICY "Permitir escritura a autenticados" ON public.build_orders;
  DROP POLICY "Escritura autenticada clan_roles" ON public.clan_roles;
  DROP POLICY "Lectura publica clan_roles" ON public.clan_roles;
  DROP POLICY "Edicion de planes para usuarios autenticados" ON public.cw7_draft_plans;
  DROP POLICY "Lectura publica de planes" ON public.cw7_draft_plans;
  DROP POLICY "logged-in users add rival drafts" ON public.cw7_rival_drafts;
  DROP POLICY "logged-in users delete rival drafts" ON public.cw7_rival_drafts;
  DROP POLICY "read rival drafts" ON public.cw7_rival_drafts;
  DROP POLICY "logged-in users add rival profiles" ON public.cw7_rival_profiles;
  DROP POLICY "logged-in users update rival profiles" ON public.cw7_rival_profiles;
  DROP POLICY "read rival profiles" ON public.cw7_rival_profiles;
  DROP POLICY "Escritura autenticada match_results" ON public.match_results;
  DROP POLICY "Lectura publica match_results" ON public.match_results;

  ---------------------------------------------------------------- NEW POLICIES
  -- clan_roles: logged-in users read; only admins write
  CREATE POLICY "clan_roles read (logged in)"  ON public.clan_roles FOR SELECT TO authenticated USING (true);
  CREATE POLICY "clan_roles insert (admin)"    ON public.clan_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
  CREATE POLICY "clan_roles update (admin)"    ON public.clan_roles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  CREATE POLICY "clan_roles delete (admin)"    ON public.clan_roles FOR DELETE TO authenticated USING (public.is_admin());

  -- build_orders: public read; only admins insert and update (soft delete via is_deleted, no DELETE)
  CREATE POLICY "build_orders read (public)"   ON public.build_orders FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "build_orders insert (admin)"  ON public.build_orders FOR INSERT TO authenticated WITH CHECK (public.is_admin());
  CREATE POLICY "build_orders update (admin)"  ON public.build_orders FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

  -- cw7_draft_plans: members read; only admins write
  CREATE POLICY "cw7_draft_plans read (member)"   ON public.cw7_draft_plans FOR SELECT TO authenticated USING (public.is_member());
  CREATE POLICY "cw7_draft_plans insert (admin)"  ON public.cw7_draft_plans FOR INSERT TO authenticated WITH CHECK (public.is_admin());
  CREATE POLICY "cw7_draft_plans update (admin)"  ON public.cw7_draft_plans FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  CREATE POLICY "cw7_draft_plans delete (admin)"  ON public.cw7_draft_plans FOR DELETE TO authenticated USING (public.is_admin());

  -- cw7_rival_drafts: members read, add and delete
  CREATE POLICY "cw7_rival_drafts read (member)"    ON public.cw7_rival_drafts FOR SELECT TO authenticated USING (public.is_member());
  CREATE POLICY "cw7_rival_drafts insert (member)"  ON public.cw7_rival_drafts FOR INSERT TO authenticated WITH CHECK (public.is_member());
  CREATE POLICY "cw7_rival_drafts delete (member)"  ON public.cw7_rival_drafts FOR DELETE TO authenticated USING (public.is_member());

  -- cw7_rival_profiles: members read, add and update
  CREATE POLICY "cw7_rival_profiles read (member)"    ON public.cw7_rival_profiles FOR SELECT TO authenticated USING (public.is_member());
  CREATE POLICY "cw7_rival_profiles insert (member)"  ON public.cw7_rival_profiles FOR INSERT TO authenticated WITH CHECK (public.is_member());
  CREATE POLICY "cw7_rival_profiles update (member)"  ON public.cw7_rival_profiles FOR UPDATE TO authenticated USING (public.is_member()) WITH CHECK (public.is_member());

  -- match_results: public read; admins or players of either team log a match; only admins edit or delete
  CREATE POLICY "match_results read (public)"         ON public.match_results FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "match_results insert (admin or team)" ON public.match_results FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR public.is_team_player(team_a, team_b));
  CREATE POLICY "match_results update (admin)"        ON public.match_results FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  CREATE POLICY "match_results delete (admin)"        ON public.match_results FOR DELETE TO authenticated USING (public.is_admin());

  -- leat11_team_members: public read; only admins write
  CREATE POLICY "leat11_team_members read (public)"   ON public.leat11_team_members FOR SELECT TO anon, authenticated USING (true);
  CREATE POLICY "leat11_team_members insert (admin)"  ON public.leat11_team_members FOR INSERT TO authenticated WITH CHECK (public.is_admin());
  CREATE POLICY "leat11_team_members update (admin)"  ON public.leat11_team_members FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
  CREATE POLICY "leat11_team_members delete (admin)"  ON public.leat11_team_members FOR DELETE TO authenticated USING (public.is_admin());

  ---------------------------------------------------------------- GRANTS
  -- TRUNCATE ignores RLS: remove it (and other unused privileges) from the API roles
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.clan_roles, public.build_orders, public.cw7_draft_plans,
         public.cw7_rival_drafts, public.cw7_rival_profiles, public.match_results, public.leat11_team_members
    FROM anon, authenticated;

  ---------------------------------------------------------------- FINAL CHECK
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') <> 25 THEN
    RAISE EXCEPTION 'Final check: expected 25 policies, found %', (SELECT count(*) FROM pg_policies WHERE schemaname = 'public');
  END IF;
  IF (SELECT count(*) FROM public.leat11_team_members) <> 8 THEN
    RAISE EXCEPTION 'Final check: expected 8 team members';
  END IF;
END
$migration$;

-- Tests after applying (read only, each one simulates a user inside a transaction that is rolled back):
-- BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', '{"sub":"0933b87b-6589-4cd6-b1e4-c2fbd2b8da78","role":"authenticated"}', true);
--   SELECT public.current_discord_username(), public.current_clan_role(), public.is_admin(), public.is_member(); ROLLBACK;
--   Expected: luciocornelio, admin, true, true
-- BEGIN; SET LOCAL role authenticated; SELECT set_config('request.jwt.claims', '{"sub":"7ec0e9c2-0f1e-4890-8a49-69cd185f8dae","role":"authenticated"}', true);
--   SELECT public.current_clan_role(), public.is_admin(); UPDATE public.clan_roles SET role = 'admin' WHERE discord_username = '.ruizk' RETURNING *; ROLLBACK;
--   Expected: member, false, and the UPDATE returns 0 rows
-- BEGIN; SET LOCAL role anon; SELECT count(*) FROM public.cw7_draft_plans; ROLLBACK;
--   Expected: 0
