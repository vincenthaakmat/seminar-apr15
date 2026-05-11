select
  invite_id,
  name,
  country,
  type,
  parent_invite_id,
  amount,
  rank,
  updated_at
from public.aurum_hive_accounts
order by parent_invite_id nulls first, invite_id;

select
  parent.invite_id as parent_invite_id,
  parent.type as parent_type,
  count(child.invite_id) as child_count
from public.aurum_hive_accounts parent
left join public.aurum_hive_accounts child
  on child.parent_invite_id = parent.invite_id
group by parent.invite_id, parent.type
order by parent.invite_id;
