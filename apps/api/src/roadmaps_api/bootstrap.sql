-- ADR-015's database roles (STY-091, STY-103), made by a bootstrap outside Alembic.
--
-- Run it as one transaction, once for each database and again at will: locally the
-- runner `apps/api/tools/bootstrap_database.py` does, and where the API is hosted
-- EPC-023 does (`psql --single-transaction --set ON_ERROR_STOP=1 --file …`). Its runner
-- is a superuser or a non-superuser with CREATEROLE and CREATEDB that owns the database,
-- as Cloud SQL's administrator is. It holds no credential and makes no login: each login
-- is made before it and granted exactly one of the four caller roles (roadmaps_migrator,
-- roadmaps_app, roadmaps_platform, roadmaps_purge) after it.
--
-- It grants a non-superuser runner roadmaps_owner with SET and without INHERIT, which
-- `ALTER DATABASE … OWNER TO` needs, so that runner's credential is the owner's. It
-- grants each dedicated definer owner role (roadmaps_auth_definer,
-- roadmaps_history_definer, roadmaps_platform_definer) to roadmaps_owner with SET and
-- without INHERIT so migrations can transfer routine ownership without ever giving a
-- runtime caller role access to them. It stops, naming what it found, on a state it did
-- not make or cannot correct, and the transaction then changes nothing.

-- The cluster's roles, shared by every database on it.
DO $roles$
DECLARE
    runner pg_roles%ROWTYPE;
    role_name text;
    attributes text[];
    found text;
    caller_roles CONSTANT text[] := ARRAY[
        'roadmaps_migrator',
        'roadmaps_app',
        'roadmaps_platform',
        'roadmaps_purge'
    ];
    caller_role_oids regrole[];
    definer_roles CONSTANT text[] := ARRAY[
        'roadmaps_auth_definer',
        'roadmaps_history_definer',
        'roadmaps_platform_definer'
    ];
    inert_roles CONSTANT text[] := ARRAY[
        'roadmaps_app',
        'roadmaps_platform',
        'roadmaps_purge',
        'roadmaps_auth_definer',
        'roadmaps_history_definer',
        'roadmaps_platform_definer'
    ];
BEGIN
    SELECT * INTO runner FROM pg_roles WHERE rolname = current_user;

    FOREACH role_name IN ARRAY ARRAY[
        'roadmaps_owner',
        'roadmaps_migrator',
        'roadmaps_app',
        'roadmaps_platform',
        'roadmaps_purge',
        'roadmaps_auth_definer',
        'roadmaps_history_definer',
        'roadmaps_platform_definer'
    ] LOOP
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = role_name) THEN
            EXECUTE format('CREATE ROLE %I NOLOGIN', role_name);
        ELSIF NOT runner.rolsuper AND NOT EXISTS (
            SELECT FROM pg_auth_members
            WHERE roleid = role_name::regrole AND member = runner.oid AND admin_option
        ) THEN
            RAISE EXCEPTION 'bootstrap: % exists and % cannot administer it',
                role_name, current_user;
        END IF;

        -- Each attribute the runner may set, on every run.
        attributes := ARRAY['NOLOGIN', 'NOCREATEROLE', 'PASSWORD NULL'];
        IF runner.rolsuper THEN
            attributes := attributes || ARRAY['NOSUPERUSER'];
        END IF;
        IF runner.rolsuper OR runner.rolcreatedb THEN
            attributes := attributes || ARRAY['NOCREATEDB'];
        END IF;
        IF runner.rolsuper OR runner.rolreplication THEN
            attributes := attributes || ARRAY['NOREPLICATION'];
        END IF;
        IF runner.rolsuper OR runner.rolbypassrls THEN
            attributes := attributes || ARRAY['NOBYPASSRLS'];
        END IF;
        EXECUTE format('ALTER ROLE %I %s', role_name, array_to_string(attributes, ' '));

        SELECT string_agg(attribute, ', ') INTO found
        FROM pg_roles,
            LATERAL (VALUES
                ('LOGIN', rolcanlogin), ('SUPERUSER', rolsuper), ('CREATEDB', rolcreatedb),
                ('CREATEROLE', rolcreaterole), ('REPLICATION', rolreplication),
                ('BYPASSRLS', rolbypassrls)
            ) AS held (attribute, is_held)
        WHERE rolname = role_name AND is_held;
        IF found IS NOT NULL THEN
            RAISE EXCEPTION 'bootstrap: % has % and % cannot clear it',
                role_name, found, current_user;
        END IF;
    END LOOP;

    -- A revision run without switching to the owner can create nothing.
    GRANT roadmaps_owner TO roadmaps_migrator WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;
    IF NOT runner.rolsuper THEN
        EXECUTE format(
            'GRANT roadmaps_owner TO %I WITH INHERIT FALSE, SET TRUE', current_user
        );
    END IF;

    -- Only roadmaps_owner may switch to a definer owner role (to transfer routine
    -- ownership during migrations), with SET and without INHERIT.
    FOREACH role_name IN ARRAY definer_roles LOOP
        EXECUTE format(
            'GRANT %I TO roadmaps_owner WITH INHERIT FALSE, SET TRUE, ADMIN FALSE',
            role_name
        );
    END LOOP;

    SELECT string_agg(format('%s (granted by %s)', member::regrole, grantor::regrole), ', ')
    INTO found
    FROM pg_auth_members
    WHERE roleid = 'roadmaps_owner'::regrole
        AND NOT (
            member = 'roadmaps_migrator'::regrole
            AND set_option AND NOT inherit_option AND NOT admin_option
        )
        AND NOT (member = runner.oid AND NOT runner.rolsuper);
    IF found IS NOT NULL THEN
        RAISE EXCEPTION 'bootstrap: roadmaps_owner has a member it did not grant: %', found;
    END IF;

    FOREACH role_name IN ARRAY definer_roles LOOP
        SELECT string_agg(format('%s (granted by %s)', member::regrole, grantor::regrole), ', ')
        INTO found
        FROM pg_auth_members
        WHERE roleid = role_name::regrole
            AND NOT (
                member = 'roadmaps_owner'::regrole
                AND set_option AND NOT inherit_option AND NOT admin_option
            )
            AND NOT (member = runner.oid AND NOT runner.rolsuper);
        IF found IS NOT NULL THEN
            RAISE EXCEPTION 'bootstrap: % has a member it did not grant: %', role_name, found;
        END IF;
    END LOOP;

    -- The owner and migration roles hold nothing the file did not grant them.
    SELECT string_agg(format('%s holds %s', member::regrole, roleid::regrole), ', ')
    INTO found
    FROM pg_auth_members
    WHERE (
            member = 'roadmaps_owner'::regrole
            AND roleid <> ALL (ARRAY[
                'roadmaps_auth_definer'::regrole,
                'roadmaps_history_definer'::regrole,
                'roadmaps_platform_definer'::regrole
            ])
        )
        OR (member = 'roadmaps_migrator'::regrole AND roleid <> 'roadmaps_owner'::regrole);
    IF found IS NOT NULL THEN
        RAISE EXCEPTION 'bootstrap: a role holds one the file did not grant: %', found;
    END IF;

    FOREACH role_name IN ARRAY inert_roles LOOP
        SELECT string_agg(roleid::regrole::text, ', ') INTO found
        FROM pg_auth_members WHERE member = role_name::regrole;
        IF found IS NOT NULL THEN
            RAISE EXCEPTION 'bootstrap: % is a member of %', role_name, found;
        END IF;
    END LOOP;

    -- Pairwise mutual exclusivity across all four caller roles.
    SELECT array_agg(name::regrole) INTO caller_role_oids FROM unnest(caller_roles) AS name;
    SELECT string_agg(
        format('%s is a member of both %s and %s', member_name, first_role, second_role),
        ', '
    ) INTO found
    FROM (
        SELECT DISTINCT
            first_m.member::regrole::text AS member_name,
            first_m.roleid::regrole::text AS first_role,
            second_m.roleid::regrole::text AS second_role
        FROM pg_auth_members AS first_m
        JOIN pg_auth_members AS second_m ON second_m.member = first_m.member
        WHERE first_m.roleid = ANY (caller_role_oids)
            AND second_m.roleid = ANY (caller_role_oids)
            AND first_m.roleid::regrole::text < second_m.roleid::regrole::text
            -- A non-superuser runner administers each role it creates.
            AND NOT (first_m.member = runner.oid AND NOT runner.rolsuper)
        ORDER BY 1, 2, 3
    ) AS overlap;
    IF found IS NOT NULL THEN
        RAISE EXCEPTION 'bootstrap: %', found;
    END IF;
END
$roles$;

-- roadmaps:database-scoped
-- The database's own part, from here to the end, which a database cloned from a template
-- does not take from it.
DO $database$
DECLARE
    found text;
    role_name text;
BEGIN
    SELECT nspowner::regrole::text INTO found FROM pg_namespace WHERE nspname = 'public';
    IF found IS DISTINCT FROM 'pg_database_owner' AND found IS DISTINCT FROM 'roadmaps_owner'
    THEN
        RAISE EXCEPTION 'bootstrap: schema public is owned by %', coalesce(found, 'no role');
    END IF;

    IF EXISTS (
        SELECT FROM pg_namespace,
            aclexplode(coalesce(nspacl, acldefault('n', nspowner))) AS granted
        WHERE nspname = 'public' AND granted.grantee = 0 AND granted.privilege_type = 'CREATE'
    ) THEN
        RAISE EXCEPTION 'bootstrap: PUBLIC can create in schema public';
    END IF;

    -- Non-routine objects in public must be owned by roadmaps_owner; routines may be owned
    -- by roadmaps_owner or one of the three dedicated definer owner roles (STY-103 D6).
    SELECT string_agg(format('%s (owned by %s)', object, owner::regrole), ', ') INTO found
    FROM (
        SELECT format('relation %s', oid::regclass), relowner, false AS is_routine
        FROM pg_class WHERE relnamespace = 'public'::regnamespace
        UNION ALL SELECT format('routine %s', oid::regprocedure), proowner, true AS is_routine
        FROM pg_proc WHERE pronamespace = 'public'::regnamespace
        -- A relation's row type and an array type follow their relation or element.
        UNION ALL SELECT format('type %s', oid::regtype), typowner, false
        FROM pg_type
        WHERE typnamespace = 'public'::regnamespace AND typrelid = 0 AND typcategory <> 'A'
        UNION ALL SELECT format('operator %s', oid::regoperator), oprowner, false
        FROM pg_operator WHERE oprnamespace = 'public'::regnamespace
        UNION ALL SELECT format('collation %s', collname), collowner, false
        FROM pg_collation WHERE collnamespace = 'public'::regnamespace
        UNION ALL SELECT format('conversion %s', conname), conowner, false
        FROM pg_conversion WHERE connamespace = 'public'::regnamespace
        UNION ALL SELECT format('operator class %s', opcname), opcowner, false
        FROM pg_opclass WHERE opcnamespace = 'public'::regnamespace
        UNION ALL SELECT format('operator family %s', opfname), opfowner, false
        FROM pg_opfamily WHERE opfnamespace = 'public'::regnamespace
        UNION ALL SELECT format('statistics %s', stxname), stxowner, false
        FROM pg_statistic_ext WHERE stxnamespace = 'public'::regnamespace
        UNION ALL SELECT format('text search configuration %s', cfgname), cfgowner, false
        FROM pg_ts_config WHERE cfgnamespace = 'public'::regnamespace
        UNION ALL SELECT format('text search dictionary %s', dictname), dictowner, false
        FROM pg_ts_dict WHERE dictnamespace = 'public'::regnamespace
        UNION ALL SELECT format('extension %s', extname), extowner, false
        FROM pg_extension WHERE extnamespace = 'public'::regnamespace
    ) AS objects (object, owner, is_routine)
    WHERE owner <> 'roadmaps_owner'::regrole
        AND NOT (
            is_routine
            AND owner = ANY (ARRAY[
                'roadmaps_auth_definer'::regrole,
                'roadmaps_history_definer'::regrole,
                'roadmaps_platform_definer'::regrole
            ])
        );
    IF found IS NOT NULL THEN
        RAISE EXCEPTION 'bootstrap: schema public holds objects of another role: %', found;
    END IF;

    -- No caller or definer role holds CREATE on the database or schema public.
    FOREACH role_name IN ARRAY ARRAY[
        'roadmaps_migrator',
        'roadmaps_app',
        'roadmaps_platform',
        'roadmaps_purge',
        'roadmaps_auth_definer',
        'roadmaps_history_definer',
        'roadmaps_platform_definer'
    ] LOOP
        IF has_database_privilege(role_name, current_database(), 'CREATE') THEN
            RAISE EXCEPTION 'bootstrap: % holds CREATE on database', role_name;
        END IF;
        IF has_schema_privilege(role_name, 'public', 'CREATE') THEN
            RAISE EXCEPTION 'bootstrap: % holds CREATE on schema public', role_name;
        END IF;
    END LOOP;

    -- The owner of the database, and so of schema public.
    EXECUTE format('ALTER DATABASE %I OWNER TO roadmaps_owner', current_database());
END
$database$;

-- As the owner, which a non-superuser runner may become but does not inherit.
SET ROLE roadmaps_owner;
DO $privileges$
BEGIN
    -- No login but the owner's creates a temporary table.
    EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
END
$privileges$;
-- A routine a revision creates grants EXECUTE only where the revision says so.
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
SET ROLE roadmaps_auth_definer;
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
SET ROLE roadmaps_history_definer;
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
SET ROLE roadmaps_platform_definer;
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
RESET ROLE;
