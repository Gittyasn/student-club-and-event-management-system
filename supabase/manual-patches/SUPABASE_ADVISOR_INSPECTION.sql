-- Supabase Advisor Inspection Helper
-- Run this in Supabase SQL Editor.
-- It gives a compact view of common security/performance issues so you do not
-- need to manually copy hundreds of advisor warnings one by one.

-- ============================================================================
-- 1. SECURITY CHECKS
-- ============================================================================

-- Public tables without RLS
select
  'security' as category,
  'table_without_rls' as issue_type,
  schemaname as schema_name,
  tablename as object_name,
  'Enable RLS on this table' as recommendation
from pg_tables
where schemaname = 'public'
  and not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = pg_tables.schemaname
      and c.relname = pg_tables.tablename
      and c.relrowsecurity = true
  )
order by object_name;

-- RLS enabled tables with no policies
select
  'security' as category,
  'rls_enabled_but_no_policies' as issue_type,
  n.nspname as schema_name,
  c.relname as object_name,
  'Create SELECT/INSERT/UPDATE/DELETE policies' as recommendation
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = true
  and not exists (
    select 1
    from pg_policies p
    where p.schemaname = n.nspname
      and p.tablename = c.relname
  )
order by object_name;

-- SECURITY DEFINER functions
select
  'security' as category,
  'security_definer_function' as issue_type,
  n.nspname as schema_name,
  p.proname as object_name,
  'Verify function is intentional and has safe search_path' as recommendation
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
order by object_name;

-- SECURITY DEFINER functions missing explicit search_path
select
  'security' as category,
  'security_definer_without_search_path' as issue_type,
  n.nspname as schema_name,
  p.proname as object_name,
  'Add SET search_path = public (or stricter)' as recommendation
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
  and not exists (
    select 1
    from unnest(coalesce(p.proconfig, '{}'::text[])) cfg
    where cfg like 'search_path=%'
  )
order by object_name;

-- Views not using security_invoker
select
  'security' as category,
  'view_without_security_invoker' as issue_type,
  schemaname as schema_name,
  viewname as object_name,
  'Consider ALTER VIEW ... SET (security_invoker = on)' as recommendation
from pg_views
where schemaname = 'public'
  and viewname not like 'pg_%'
  and definition is not null
  and not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = pg_views.schemaname
      and c.relname = pg_views.viewname
      and coalesce(array_to_string(c.reloptions, ','), '') like '%security_invoker=on%'
  )
order by object_name;

-- ============================================================================
-- 2. PERFORMANCE CHECKS
-- ============================================================================

-- Duplicate / overlapping indexes
with idx as (
  select
    schemaname,
    tablename,
    indexname,
    indexdef
  from pg_indexes
  where schemaname = 'public'
)
select
  'performance' as category,
  'possible_duplicate_index' as issue_type,
  a.schemaname as schema_name,
  a.tablename || ' -> ' || a.indexname as object_name,
  'Compare with ' || b.indexname || ' and drop only if truly redundant' as recommendation
from idx a
join idx b
  on a.schemaname = b.schemaname
 and a.tablename = b.tablename
 and a.indexname < b.indexname
 and (
   a.indexdef = b.indexdef
   or a.indexdef like '%' || split_part(split_part(b.indexdef, '(', 2), ')', 1) || '%'
   or b.indexdef like '%' || split_part(split_part(a.indexdef, '(', 2), ')', 1) || '%'
 )
order by schema_name, object_name;

-- Unused indexes
select
  'performance' as category,
  'unused_index' as issue_type,
  schemaname as schema_name,
  indexrelname as object_name,
  'Review before dropping. Ignore primary/unique indexes used for constraints.' as recommendation
from pg_stat_user_indexes
where schemaname = 'public'
  and idx_scan = 0
  and indexrelname not like '%_pkey'
order by object_name;

-- Tables with high sequential scans
select
  'performance' as category,
  'high_seq_scan' as issue_type,
  schemaname as schema_name,
  relname as object_name,
  'Check filtering columns and consider indexes for common WHERE/JOIN clauses' as recommendation
from pg_stat_user_tables
where schemaname = 'public'
  and seq_scan > 100
order by seq_scan desc, object_name;

-- Foreign keys without supporting indexes
with fk_cols as (
  select
    n.nspname as schema_name,
    c.relname as table_name,
    con.conname as constraint_name,
    array_agg(att.attname order by arr.ord) as columns
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  join unnest(con.conkey) with ordinality as arr(attnum, ord) on true
  join pg_attribute att on att.attrelid = c.oid and att.attnum = arr.attnum
  where con.contype = 'f'
    and n.nspname = 'public'
  group by n.nspname, c.relname, con.conname
),
indexed_prefixes as (
  select
    schemaname as schema_name,
    tablename as table_name,
    split_part(split_part(indexdef, '(', 2), ')', 1) as indexed_cols
  from pg_indexes
  where schemaname = 'public'
)
select
  'performance' as category,
  'foreign_key_without_index' as issue_type,
  fk.schema_name,
  fk.table_name || ' -> ' || fk.constraint_name as object_name,
  'Create an index on (' || array_to_string(fk.columns, ', ') || ')' as recommendation
from fk_cols fk
where not exists (
  select 1
  from indexed_prefixes ip
  where ip.schema_name = fk.schema_name
    and ip.table_name = fk.table_name
    and replace(ip.indexed_cols, ' ', '') like replace(array_to_string(fk.columns, ', '), ' ', '') || '%'
)
order by object_name;

-- Large tables with many indexes
select
  'performance' as category,
  'many_indexes_on_table' as issue_type,
  schemaname as schema_name,
  tablename as object_name,
  'Review if all indexes are still needed' as recommendation
from (
  select schemaname, tablename, count(*) as index_count
  from pg_indexes
  where schemaname = 'public'
  group by schemaname, tablename
) t
where index_count >= 8
order by object_name;

-- ============================================================================
-- 3. QUICK COUNTS
-- ============================================================================

select 'security_tables_without_rls' as metric, count(*)::text as value
from pg_tables
where schemaname = 'public'
  and not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = pg_tables.schemaname
      and c.relname = pg_tables.tablename
      and c.relrowsecurity = true
  )
union all
select 'security_definer_without_search_path', count(*)::text
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
  and not exists (
    select 1
    from unnest(coalesce(p.proconfig, '{}'::text[])) cfg
    where cfg like 'search_path=%'
  )
union all
select 'unused_indexes', count(*)::text
from pg_stat_user_indexes
where schemaname = 'public'
  and idx_scan = 0
  and indexrelname not like '%_pkey'
union all
select 'high_seq_scan_tables', count(*)::text
from pg_stat_user_tables
where schemaname = 'public'
  and seq_scan > 100;
