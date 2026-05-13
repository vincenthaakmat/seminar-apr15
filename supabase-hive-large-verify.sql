with recursive large_tree as (
  select invite_id, type, parent_invite_id
  from public.aurum_hive_accounts
  where invite_id = 'AUR-LARGE-ROOT'

  union all

  select child.invite_id, child.type, child.parent_invite_id
  from public.aurum_hive_accounts child
  join large_tree parent on child.parent_invite_id = parent.invite_id
),
main_child_counts as (
  select
    main.invite_id,
    count(child.invite_id) filter (where child.type = 'sub') as sub_count
  from large_tree main
  left join large_tree child on child.parent_invite_id = main.invite_id
  where main.type = 'main'
  group by main.invite_id
)
select *
from main_child_counts
where sub_count <> 3
order by invite_id;

with recursive large_tree as (
  select invite_id, type, parent_invite_id, amount, total_turnover
  from public.aurum_hive_accounts
  where invite_id = 'AUR-LARGE-ROOT'

  union all

  select child.invite_id, child.type, child.parent_invite_id, child.amount, child.total_turnover
  from public.aurum_hive_accounts child
  join large_tree parent on child.parent_invite_id = parent.invite_id
)
select
  count(*) as total_accounts,
  count(*) filter (where type = 'main') as main_accounts,
  count(*) filter (where type = 'sub') as sub_accounts,
  count(*) filter (where type = 'main' and amount = 0) as unfunded_mains,
  count(*) filter (where type = 'sub' and amount = 0) as unfunded_subs,
  sum(total_turnover) as total_turnover
from large_tree;
