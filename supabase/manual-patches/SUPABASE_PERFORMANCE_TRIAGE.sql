-- Supabase Performance Triage Helper
-- Run this after the foreign-key index patch.
-- This helps review the remaining advisor noise safely.

-- ============================================================================
-- 1. High sequential scan tables
-- Shows row counts, seq scans, index scans, and scan ratio.
-- Small tables often do not need extra indexes even if seq_scan is high.
-- ============================================================================

select
  schemaname,
  relname as table_name,
  n_live_tup as approx_rows,
  seq_scan,
  idx_scan,
  case
    when (seq_scan + idx_scan) = 0 then 0
    else round((seq_scan::numeric / (seq_scan + idx_scan)) * 100, 2)
  end as seq_scan_pct
from pg_stat_user_tables
where schemaname = 'public'
  and seq_scan > 100
order by seq_scan desc, approx_rows desc, table_name;

-- ============================================================================
-- 2. Unused indexes with size and constraint flag
-- Do not drop unique/primary/constraint-backed indexes blindly.
-- ============================================================================

select
  s.schemaname,
  s.relname as table_name,
  s.indexrelname as index_name,
  pg_size_pretty(pg_relation_size(s.indexrelid)) as index_size,
  s.idx_scan,
  case when c.contype is not null then true else false end as backs_constraint,
  pg_get_indexdef(s.indexrelid) as index_definition
from pg_stat_user_indexes s
left join pg_constraint c
  on c.conindid = s.indexrelid
where s.schemaname = 'public'
  and s.idx_scan = 0
  and s.indexrelname not like '%_pkey'
order by
  case when c.contype is not null then 1 else 0 end,
  pg_relation_size(s.indexrelid) desc,
  s.indexrelname;

-- ============================================================================
-- 3. Tables with many indexes
-- Too many indexes can slow inserts/updates.
-- ============================================================================

select
  schemaname,
  tablename as table_name,
  count(*) as index_count
from pg_indexes
where schemaname = 'public'
group by schemaname, tablename
having count(*) >= 8
order by index_count desc, table_name;

-- ============================================================================
-- 4. Tables with large total index footprint
-- Useful for spotting index-heavy tables.
-- ============================================================================

select
  n.nspname as schema_name,
  t.relname as table_name,
  count(i.indexrelid) as index_count,
  pg_size_pretty(sum(pg_relation_size(i.indexrelid))) as total_index_size
from pg_class t
join pg_namespace n on n.oid = t.relnamespace
join pg_index i on i.indrelid = t.oid
where n.nspname = 'public'
  and t.relkind = 'r'
group by n.nspname, t.relname
order by sum(pg_relation_size(i.indexrelid)) desc, table_name;

-- ============================================================================
-- 5. Suggested interpretation
-- - Small tables + high seq scan: usually safe to ignore
-- - Large tables + high seq scan + low idx_scan: likely worth optimizing
-- - Unused indexes that back constraints: keep them
-- - Unused non-constraint indexes with tiny size: low priority
-- - Large unused non-constraint indexes: review carefully
-- ============================================================================
