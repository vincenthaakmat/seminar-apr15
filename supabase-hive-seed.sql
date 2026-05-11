insert into public.aurum_hive_accounts
  (invite_id, name, country, amount, rank, type, parent_invite_id)
values
  ('AUR-ROOT-001', 'Main Account', 'Suriname', 25000, 'VANGUARD PRO', 'main', null),
  ('SUB-001', 'Sub Account 1', 'Netherlands', 5000, 'VANGUARD', 'sub', 'AUR-ROOT-001'),
  ('MAIN-001-A', 'Nested Main 1', 'United States', 3000, 'VOYAGER', 'main', 'SUB-001'),
  ('SUB-002', 'Sub Account 2', 'Curacao', 4500, 'VANGUARD', 'sub', 'AUR-ROOT-001'),
  ('MAIN-002-A', 'Nested Main 2', 'Aruba', 2000, 'NOVA', 'main', 'SUB-002'),
  ('SUB-003', 'Sub Account 3', 'Brazil', 7000, 'VANGUARD', 'sub', 'AUR-ROOT-001'),
  ('MAIN-003-A', 'Nested Main 3', 'Colombia', 3500, 'VOYAGER', 'main', 'SUB-003')
on conflict (invite_id) do update set
  name = excluded.name,
  country = excluded.country,
  amount = excluded.amount,
  rank = excluded.rank,
  type = excluded.type,
  parent_invite_id = excluded.parent_invite_id,
  updated_at = now();
