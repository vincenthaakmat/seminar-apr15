delete from public.aurum_hive_accounts
where invite_id = 'AUR-DEPTH-ROOT';

insert into public.aurum_hive_accounts
  (invite_id, name, country, amount, rank, type, parent_invite_id)
values
  ('AUR-DEPTH-ROOT', 'Depth Level 1 Main', 'Suriname', 18000, 'VANGUARD PRO', 'main', null),

  ('D-L1-SUB-001', 'Level 1 Sub 1', 'Netherlands', 3500, 'NOVA', 'sub', 'AUR-DEPTH-ROOT'),
  ('D-L1-SUB-002', 'Level 1 Sub 2', 'United States', 2800, 'NOVA', 'sub', 'AUR-DEPTH-ROOT'),
  ('D-L1-SUB-003', 'Level 1 Sub 3', 'Curacao', 0, 'NOVA', 'sub', 'AUR-DEPTH-ROOT'),

  ('D-L2-MAIN-001', 'Depth Level 2 Main 1', 'Aruba', 8200, 'VANGUARD', 'main', 'D-L1-SUB-001'),
  ('D-L2-MAIN-002', 'Depth Level 2 Main 2', 'Brazil', 7600, 'VOYAGER', 'main', 'D-L1-SUB-002'),

  ('D-L2A-SUB-001', 'Level 2A Sub 1', 'Colombia', 1900, 'NOVA', 'sub', 'D-L2-MAIN-001'),
  ('D-L2A-SUB-002', 'Level 2A Sub 2', 'Panama', 0, 'NOVA', 'sub', 'D-L2-MAIN-001'),
  ('D-L2A-SUB-003', 'Level 2A Sub 3', 'Suriname', 1600, 'NOVA', 'sub', 'D-L2-MAIN-001'),

  ('D-L2B-SUB-001', 'Level 2B Sub 1', 'Netherlands', 1750, 'NOVA', 'sub', 'D-L2-MAIN-002'),
  ('D-L2B-SUB-002', 'Level 2B Sub 2', 'United States', 1450, 'NOVA', 'sub', 'D-L2-MAIN-002'),
  ('D-L2B-SUB-003', 'Level 2B Sub 3', 'Curacao', 0, 'NOVA', 'sub', 'D-L2-MAIN-002'),

  ('D-L3-MAIN-001', 'Depth Level 3 Main 1', 'Aruba', 5200, 'NOVA', 'main', 'D-L2A-SUB-001'),
  ('D-L3-MAIN-002', 'Depth Level 3 Main 2', 'Brazil', 4800, 'NOVA', 'main', 'D-L2B-SUB-001'),

  ('D-L3A-SUB-001', 'Level 3A Sub 1', 'Colombia', 950, 'NOVA', 'sub', 'D-L3-MAIN-001'),
  ('D-L3A-SUB-002', 'Level 3A Sub 2', 'Panama', 0, 'NOVA', 'sub', 'D-L3-MAIN-001'),
  ('D-L3A-SUB-003', 'Level 3A Sub 3', 'Suriname', 875, 'NOVA', 'sub', 'D-L3-MAIN-001'),

  ('D-L3B-SUB-001', 'Level 3B Sub 1', 'Netherlands', 1050, 'NOVA', 'sub', 'D-L3-MAIN-002'),
  ('D-L3B-SUB-002', 'Level 3B Sub 2', 'United States', 0, 'NOVA', 'sub', 'D-L3-MAIN-002'),
  ('D-L3B-SUB-003', 'Level 3B Sub 3', 'Curacao', 925, 'NOVA', 'sub', 'D-L3-MAIN-002'),

  ('D-L4-MAIN-001', 'Depth Level 4 Main 1', 'Aruba', 3600, 'NOVA', 'main', 'D-L3A-SUB-001'),
  ('D-L4-MAIN-002', 'Depth Level 4 Main 2', 'Brazil', 3400, 'NOVA', 'main', 'D-L3B-SUB-001'),

  ('D-L4A-SUB-001', 'Level 4A Sub 1', 'Colombia', 700, 'NOVA', 'sub', 'D-L4-MAIN-001'),
  ('D-L4A-SUB-002', 'Level 4A Sub 2', 'Panama', 0, 'NOVA', 'sub', 'D-L4-MAIN-001'),
  ('D-L4A-SUB-003', 'Level 4A Sub 3', 'Suriname', 650, 'NOVA', 'sub', 'D-L4-MAIN-001'),

  ('D-L4B-SUB-001', 'Level 4B Sub 1', 'Netherlands', 725, 'NOVA', 'sub', 'D-L4-MAIN-002'),
  ('D-L4B-SUB-002', 'Level 4B Sub 2', 'United States', 0, 'NOVA', 'sub', 'D-L4-MAIN-002'),
  ('D-L4B-SUB-003', 'Level 4B Sub 3', 'Curacao', 675, 'NOVA', 'sub', 'D-L4-MAIN-002')
on conflict (invite_id) do update set
  name = excluded.name,
  country = excluded.country,
  amount = excluded.amount,
  total_turnover = excluded.total_turnover,
  rank = excluded.rank,
  type = excluded.type,
  parent_invite_id = excluded.parent_invite_id,
  updated_at = now();
