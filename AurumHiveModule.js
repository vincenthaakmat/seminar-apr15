export const hiveData = [
  {
    inviteId: 'AUR-ROOT-001',
    name: 'Main Account',
    amount: 25000,
    rank: 'VANGUARD PRO',
    type: 'main',
    parentInviteId: null,
    children: [
      {
        inviteId: 'SUB-001',
        name: 'Sub Account 1',
        amount: 5000,
        rank: 'VANGUARD',
        type: 'sub',
        parentInviteId: 'AUR-ROOT-001',
        children: [
          {
            inviteId: 'MAIN-001-A',
            name: 'Nested Main 1',
            amount: 3000,
            rank: 'VOYAGER',
            type: 'main',
            parentInviteId: 'SUB-001',
            children: []
          }
        ]
      },
      {
        inviteId: 'SUB-002',
        name: 'Sub Account 2',
        amount: 4500,
        rank: 'VANGUARD',
        type: 'sub',
        parentInviteId: 'AUR-ROOT-001',
        children: [
          {
            inviteId: 'MAIN-002-A',
            name: 'Nested Main 2',
            amount: 2000,
            rank: 'NOVA',
            type: 'main',
            parentInviteId: 'SUB-002',
            children: []
          }
        ]
      },
      {
        inviteId: 'SUB-003',
        name: 'Sub Account 3',
        amount: 7000,
        rank: 'VANGUARD',
        type: 'sub',
        parentInviteId: 'AUR-ROOT-001',
        children: [
          {
            inviteId: 'MAIN-003-A',
            name: 'Nested Main 3',
            amount: 3500,
            rank: 'VOYAGER',
            type: 'main',
            parentInviteId: 'SUB-003',
            children: []
          }
        ]
      }
    ]
  }
];

let selectedInviteId = 'AUR-ROOT-001';
let hiveMode = 'edit';
let hiveZoom = 0.85;
let hiveFullscreen = true;
let hiveFocusMode = false;
let highlightedInviteId = '';
const collapsedInviteIds = new Set();
const HIVE_LOCAL_KEY = 'aurum_hive_database_v1';
const HIVE_LAST_INVITE_KEY = 'aurum_hive_last_invite_id_v1';
const HIVE_ZOOM_KEY = 'aurum_hive_zoom_v1';
const HIVE_CLOUD_TABLE = 'aurum_hive_accounts';
const HIVE_RANKS = ['NOVA', 'VOYAGER', 'VANGUARD', 'VANGUARD PRO', 'NEXUS', 'ORACLE', 'PRIME', 'ELITE', 'MAGNAT', 'MYTHOS', 'LEGEND'];
const DEFAULT_HIVE_RANK = 'NOVA';
const DEFAULT_HIVE_COUNTRY = 'Not specified';
const HIVE_COUNTRIES = [
  'Not specified', 'Aruba', 'Bahamas', 'Barbados', 'Belgium', 'Brazil', 'Canada', 'Colombia', 'Curacao',
  'Dominican Republic', 'France', 'Germany', 'Guyana', 'Haiti', 'Jamaica', 'Netherlands', 'Panama',
  'Sint Maarten', 'Suriname', 'Trinidad and Tobago', 'United Kingdom', 'United States', 'Venezuela'
];

const supabaseConfig = {
  url: 'https://mwjavyzunvqylmuvsnmy.supabase.co',
  anonKey: 'sb_publishable_c5vwKhjLw-f9SQywQV3oIQ__wJiilfo'
};

let supabaseClientPromise = null;
let activeLookupInviteId = '';
let hiveRealtimeChannel = null;
let realtimeReloadTimer = null;

export function configureHiveSupabase(config) {
  Object.assign(supabaseConfig, config || {});
  supabaseClientPromise = null;
  updateSyncStatus(isCloudConfigured() ? 'Supabase configured. Local cache active.' : 'Local database active. Supabase not configured.', isCloudConfigured() ? 'cloud' : 'local');
}

export const configureHiveCloud = configureHiveSupabase;

function ensureHiveUi() {
  if (document.getElementById('hiveModal')) return;

  const style = document.createElement('style');
  style.textContent = `
    .hive-modal-card { width:min(1180px, calc(100vw - 28px)); max-height:92vh; overflow:auto; }
    .hive-modal-card.fullscreen { width:100vw; height:100vh; max-height:100vh; border-radius:0; }
    .hive-modal-card.fullscreen .tool-body { min-height:calc(100vh - 96px); }
    .hive-modal-card.fullscreen .hive-layout { min-height:calc(100vh - 132px); }
    .hive-layout { display:grid; grid-template-columns:360px minmax(0,1fr); gap:18px; }
    .hive-panel { border:1px solid var(--border); border-radius:16px; background:#fff; padding:14px; }
    .hive-panel-title { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; font-size:13px; font-weight:800; color:var(--text); }
    .hive-summary { display:grid; gap:8px; font-size:13px; color:var(--text-mid); line-height:1.45; }
    .hive-summary-grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:8px; }
    .hive-summary-card { border:1px solid var(--border); border-radius:12px; background:linear-gradient(180deg,#fff 0%,#f3f6ff 100%); padding:10px; box-shadow:0 6px 16px rgba(25,45,110,.07); min-width:0; }
    .hive-summary-card.wide { grid-column:1 / -1; }
    .hive-summary-label { font-size:10px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; color:var(--text-muted); margin-bottom:3px; }
    .hive-summary-value { font-size:16px; font-weight:900; color:var(--text); line-height:1.2; overflow-wrap:anywhere; }
    .hive-summary-note { margin-top:3px; font-size:11px; color:var(--text-muted); overflow-wrap:anywhere; }
    .hive-health-card { border-color:rgba(37,82,231,.28); background:linear-gradient(135deg,#edf3ff 0%,#ffffff 100%); }
    .hive-health-score { color:#173fcf; font-size:20px; }
    .hive-actions { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:8px; margin-top:12px; }
    .hive-lookup { display:grid; gap:8px; margin-bottom:14px; padding-bottom:14px; border-bottom:1px solid var(--border); }
    .hive-lookup-row { display:grid; grid-template-columns:1fr auto; gap:8px; }
    .hive-lookup input { width:100%; border:1px solid var(--border); border-radius:10px; padding:10px 11px; color:var(--text); background:#fff; font-family:'Inter',sans-serif; font-size:13px; outline:none; }
    .hive-lookup input:focus { border-color:var(--blue); box-shadow:0 0 0 3px rgba(37,82,231,.12); }
    .hive-search-row { display:grid; grid-template-columns:1fr auto; gap:8px; }
    .hive-status { display:flex; align-items:center; gap:7px; font-size:12px; color:var(--text-muted); }
    .hive-status-dot { width:8px; height:8px; border-radius:50%; background:var(--text-dim); flex:0 0 auto; }
    .hive-status.cloud .hive-status-dot { background:var(--green); }
    .hive-status.local .hive-status-dot { background:#f59e0b; }
    .hive-form { display:grid; gap:10px; margin-top:14px; }
    .hive-editor-panel { margin-top:14px; padding:14px; border:1px solid rgba(39,82,231,.24); border-radius:16px; background:#d4dced; box-shadow:inset 0 1px 0 rgba(255,255,255,.52); }
    .hive-editor-panel .hive-form { margin-top:0; }
    .hive-field label { display:block; margin-bottom:5px; font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--text-muted); }
    .hive-field input, .hive-field select { width:100%; border:1px solid var(--border); border-radius:10px; padding:10px 11px; color:var(--text); background:#fff; font-family:'Inter',sans-serif; font-size:13px; outline:none; }
    .hive-field input:focus, .hive-field select:focus { border-color:var(--blue); box-shadow:0 0 0 3px rgba(37,82,231,.12); }
    .hive-field input:disabled { background:var(--surface-3); color:var(--text-muted); cursor:not-allowed; }
    .hive-mode-tabs { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .hive-mode-tab { border:1px solid var(--border); border-radius:10px; background:var(--surface-2); color:var(--text-mid); padding:9px 10px; font:800 12px 'Inter',sans-serif; cursor:pointer; }
    .hive-mode-tab.active { border-color:var(--blue); background:var(--blue-light); color:var(--blue-mid); }
    .hive-message { min-height:18px; margin-top:10px; font-size:12px; color:var(--text-muted); }
    .hive-message.error { color:var(--red); }
    .hive-message.ok { color:var(--green); }
    .hive-view-shell { min-width:760px; border-radius:18px; background:linear-gradient(135deg,#13203d,#173fcf 58%,#06b6d4); color:#fff; overflow:hidden; }
    .hive-view-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border-bottom:1px solid rgba(255,255,255,.16); background:rgba(15,23,42,.26); }
    .hive-view-title { font-size:12px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:rgba(255,255,255,.78); }
    .hive-view-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .hive-icon-btn { display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border:1px solid rgba(255,255,255,.24); border-radius:8px; background:rgba(255,255,255,.10); color:#fff; cursor:pointer; }
    .hive-icon-btn:hover { background:rgba(255,255,255,.18); }
    .hive-icon-btn.active { border-color:#bef264; background:rgba(190,242,100,.22); color:#ecfccb; }
    .hive-zoom-wrap { display:flex; align-items:center; gap:8px; min-width:230px; color:rgba(255,255,255,.86); font-size:12px; font-weight:800; }
    .hive-zoom-wrap input { width:140px; accent-color:#bef264; }
    .hive-canvas { height:560px; padding:24px; color:#fff; overflow:auto; }
    .hive-modal-card.fullscreen .hive-canvas { height:calc(100vh - 190px); }
    .hive-tree { position:relative; min-width:700px; min-height:520px; transform-origin:top center; transition:transform .16s ease; }
    .hive-tooltip-layer { position:absolute; inset:0; z-index:30; pointer-events:none; }
    .hive-floating-tooltip { position:absolute; width:220px; transform:translate(-50%, 16px); border:1px solid var(--border); border-radius:13px; background:#fff; color:var(--text); padding:12px; text-align:left; box-shadow:var(--shadow-2); font:12px/1.45 'Inter',sans-serif; pointer-events:none; }
    .hive-tooltip-rank { color:#173fcf; font-size:14px; font-weight:900; }
    .hive-link-layer { position:absolute; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none; }
    .hive-link-layer path { fill:none; stroke:rgba(190,242,100,.82); stroke-width:2; vector-effect:non-scaling-stroke; }
    .hive-node-wrapper { position:absolute; display:flex; flex-direction:column; align-items:center; width:120px; transform:translate(-50%, -50%); }
    .hive-node-dot-row { display:flex; align-items:center; justify-content:center; gap:7px; }
    .hive-rank-badge { max-width:92px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; border:1px solid rgba(255,255,255,.45); border-radius:999px; background:rgba(15,23,42,.58); color:#fff; padding:5px 8px; font:900 10px 'Inter',sans-serif; letter-spacing:.04em; box-shadow:0 10px 22px rgba(0,0,0,.18); }
    .hive-collapse-btn { position:absolute; left:50%; top:40px; transform:translateX(-50%); z-index:4; width:24px; height:24px; border:1px solid rgba(255,255,255,.65); border-radius:999px; background:rgba(15,23,42,.72); color:#fff; font:900 14px 'Inter',sans-serif; line-height:1; cursor:pointer; box-shadow:0 8px 18px rgba(0,0,0,.2); }
    .hive-collapse-btn:hover { background:rgba(37,82,231,.9); }
    .hive-dot-main, .hive-dot-sub { position:relative; display:flex; align-items:center; justify-content:center; width:58px; height:58px; border-radius:50%; border:4px solid rgba(255,255,255,.86); box-shadow:0 14px 28px rgba(0,0,0,.24); cursor:pointer; }
    .hive-dot-main.selected, .hive-dot-sub.selected { outline:4px solid rgba(250,204,21,.95); outline-offset:4px; }
    .hive-dot-main.search-hit, .hive-dot-sub.search-hit { animation:hiveSearchPulse 1.05s ease-in-out infinite; }
    @keyframes hiveSearchPulse {
      0%, 100% { box-shadow:0 14px 28px rgba(0,0,0,.24), 0 0 0 0 rgba(250,204,21,.95); }
      50% { box-shadow:0 14px 28px rgba(0,0,0,.24), 0 0 0 16px rgba(250,204,21,.08), 0 0 34px rgba(250,204,21,.95); }
    }
    .hive-dot-main { background:#dc2626; }
    .hive-dot-sub { background:#16a34a; }
    .hive-dot-main.unfunded { background:#2563eb; }
    .hive-dot-sub.unfunded { background:#facc15; }
    .hive-dot-sub.unfunded::before { color:#111827; }
    .hive-dot-main::before, .hive-dot-sub::before { color:#fff; font:900 18px 'Inter',sans-serif; }
    .hive-dot-main::before { content:'M'; }
    .hive-dot-sub::before { content:'S'; }
    @media (max-width: 900px) { .hive-layout { grid-template-columns:1fr; } .hive-modal-card { width:calc(100vw - 18px); } }
  `;
  document.head.appendChild(style);

  const modal = document.createElement('div');
  modal.className = 'tool-modal';
  modal.id = 'hiveModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'hiveModalTitle');
  modal.innerHTML = `
    <div class="tool-card wide hive-modal-card fullscreen">
      <div class="tool-header">
        <div>
          <div class="tool-title" id="hiveModalTitle"><span class="material-symbols-rounded">hub</span>The Hive</div>
          <p class="tool-subtitle">Visual Referral ID structure loaded from AurumHiveModule.js.</p>
        </div>
        <button class="tool-close" type="button" onclick="closeToolModal('hiveModal')" aria-label="Close Hive"><span class="material-symbols-rounded">close</span></button>
      </div>
      <div class="tool-body">
        <div class="hive-layout">
          <section class="hive-panel">
            <div class="hive-panel-title">Account editor</div>
            <div class="hive-lookup">
              <div class="hive-field"><label for="hiveLookupInviteId">Find by Referral ID</label></div>
              <div class="hive-lookup-row">
                <input id="hiveLookupInviteId" autocomplete="off" placeholder="Enter Referral ID">
                <button class="planner-small-btn secondary" type="button" id="hiveLookupBtn">Load</button>
              </div>
              <div class="hive-field"><label for="hiveNameSearch">Search by name</label></div>
              <div class="hive-search-row">
                <input id="hiveNameSearch" autocomplete="off" placeholder="Enter account name">
                <button class="planner-small-btn secondary" type="button" id="hiveNameSearchBtn">Find</button>
              </div>
              <div class="hive-status" id="hiveSyncStatus"><span class="hive-status-dot"></span><span>Local database active. Supabase not configured.</span></div>
            </div>
            <div class="hive-summary" id="hiveSummary"></div>
            <div class="hive-mode-tabs">
              <button class="hive-mode-tab active" type="button" id="hiveEditTab">Edit selected</button>
              <button class="hive-mode-tab" type="button" id="hiveAddTab">Add child</button>
            </div>
            <div class="hive-editor-panel">
              <div class="hive-form">
                <div class="hive-field"><label for="hiveInviteId">Referral ID</label><input id="hiveInviteId" autocomplete="off"></div>
                <div class="hive-field"><label for="hiveName">Name</label><input id="hiveName" autocomplete="off"></div>
                <div class="hive-field"><label for="hiveCountry">Country</label><select id="hiveCountry"></select></div>
                <div class="hive-field"><label for="hiveAmount">Amount</label><input id="hiveAmount" type="number" min="0" step="any"></div>
                <div class="hive-field"><label for="hiveRank">Rank</label><select id="hiveRank"></select></div>
                <div class="hive-field"><label for="hiveType">Type</label><input id="hiveType" disabled></div>
                <div class="hive-field"><label for="hiveParent">Invited By ID</label><input id="hiveParent" disabled></div>
                <button class="crypto-action-btn" type="button" id="hiveSaveBtn">Save edit</button>
              </div>
            </div>
            <div class="hive-message" id="hiveMessage"></div>
            <div class="hive-actions">
              <button class="planner-small-btn secondary" type="button" id="hiveExportPdfBtn">Export PDF</button>
              <button class="planner-small-btn secondary" type="button" id="hiveRefreshBtn">Refresh</button>
              <button class="planner-small-btn secondary" type="button" id="hiveResetBtn">Reset sample</button>
            </div>
          </section>
          <section class="hive-view-shell">
            <div class="hive-view-toolbar">
              <div class="hive-view-title">Hive map</div>
              <div class="hive-view-actions">
                <label class="hive-zoom-wrap" for="hiveZoomRange">
                  Zoom <input id="hiveZoomRange" type="range" min="35" max="120" step="5" value="85">
                  <span id="hiveZoomValue">85%</span>
                </label>
                <button class="hive-icon-btn" type="button" id="hiveZoomOutBtn" title="Zoom out" aria-label="Zoom out"><span class="material-symbols-rounded">remove</span></button>
                <button class="hive-icon-btn" type="button" id="hiveZoomInBtn" title="Zoom in" aria-label="Zoom in"><span class="material-symbols-rounded">add</span></button>
                <button class="hive-icon-btn" type="button" id="hiveFocusBtn" title="Focus selected tree" aria-label="Focus selected tree"><span class="material-symbols-rounded">center_focus_strong</span></button>
                <button class="hive-icon-btn" type="button" id="hiveFullscreenBtn" title="Fullscreen" aria-label="Toggle fullscreen"><span class="material-symbols-rounded">fullscreen</span></button>
              </div>
            </div>
            <div class="hive-canvas">
              <div id="hiveTooltipLayer" class="hive-tooltip-layer"></div>
              <div id="hiveContainer" class="hive-tree"></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  populateRankOptions();
  populateCountryOptions();

  modal.addEventListener('click', (event) => {
    if (event.target === modal && typeof window.closeToolModal === 'function') {
      window.closeToolModal('hiveModal');
    }
  });

  document.getElementById('hiveEditTab').addEventListener('click', () => setHiveMode('edit'));
  document.getElementById('hiveAddTab').addEventListener('click', () => setHiveMode('add'));
  document.getElementById('hiveSaveBtn').addEventListener('click', submitHiveForm);
  document.getElementById('hiveZoomRange').addEventListener('input', (event) => setHiveZoom(Number(event.target.value) / 100));
  document.getElementById('hiveZoomOutBtn').addEventListener('click', () => setHiveZoom(hiveZoom - 0.1));
  document.getElementById('hiveZoomInBtn').addEventListener('click', () => setHiveZoom(hiveZoom + 0.1));
  document.getElementById('hiveFocusBtn').addEventListener('click', toggleHiveFocusMode);
  document.getElementById('hiveFullscreenBtn').addEventListener('click', toggleHiveFullscreen);
  document.getElementById('hiveLookupBtn').addEventListener('click', loadHiveFromLookup);
  document.getElementById('hiveLookupInviteId').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') loadHiveFromLookup();
  });
  document.getElementById('hiveNameSearchBtn').addEventListener('click', searchHiveByName);
  document.getElementById('hiveNameSearch').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') searchHiveByName();
  });
  document.getElementById('hiveExportPdfBtn').addEventListener('click', exportSelectedHivePdf);
  document.getElementById('hiveRefreshBtn').addEventListener('click', () => renderHive());
  document.getElementById('hiveResetBtn').addEventListener('click', () => {
    hiveData.splice(0, hiveData.length, createDefaultHive()[0]);
    selectedInviteId = hiveData[0]?.inviteId || '';
    collapsedInviteIds.clear();
    setMessage('Sample hive restored.', 'ok');
    persistHive();
    renderHive();
  });
}

function createDefaultHive() {
  return JSON.parse(JSON.stringify([
    {
      inviteId: 'AUR-ROOT-001',
      name: 'Main Account',
      amount: 25000,
      rank: 'VANGUARD PRO',
      type: 'main',
      parentInviteId: null,
      children: [
        { inviteId: 'SUB-001', name: 'Sub Account 1', amount: 5000, rank: 'VANGUARD', type: 'sub', parentInviteId: 'AUR-ROOT-001', children: [{ inviteId: 'MAIN-001-A', name: 'Nested Main 1', amount: 3000, rank: 'VOYAGER', type: 'main', parentInviteId: 'SUB-001', children: [] }] },
        { inviteId: 'SUB-002', name: 'Sub Account 2', amount: 4500, rank: 'VANGUARD', type: 'sub', parentInviteId: 'AUR-ROOT-001', children: [{ inviteId: 'MAIN-002-A', name: 'Nested Main 2', amount: 2000, rank: 'NOVA', type: 'main', parentInviteId: 'SUB-002', children: [] }] },
        { inviteId: 'SUB-003', name: 'Sub Account 3', amount: 7000, rank: 'VANGUARD', type: 'sub', parentInviteId: 'AUR-ROOT-001', children: [{ inviteId: 'MAIN-003-A', name: 'Nested Main 3', amount: 3500, rank: 'VOYAGER', type: 'main', parentInviteId: 'SUB-003', children: [] }] }
      ]
    }
  ]));
}

function loadLocalHive() {
  try {
    const saved = JSON.parse(localStorage.getItem(HIVE_LOCAL_KEY));
    if (Array.isArray(saved) && saved.length) {
      hiveData.splice(0, hiveData.length, ...saved);
      selectedInviteId = hiveData[0]?.inviteId || selectedInviteId;
      return true;
    }
  } catch (error) {
    console.warn('Aurum Hive local database could not be read.', error);
  }
  return false;
}

function saveLocalHive() {
  try {
    localStorage.setItem(HIVE_LOCAL_KEY, JSON.stringify(hiveData));
  } catch (error) {
    console.warn('Aurum Hive local database could not be saved.', error);
  }
}

function readLastInviteId() {
  try {
    return localStorage.getItem(HIVE_LAST_INVITE_KEY) || '';
  } catch (error) {
    return '';
  }
}

function rememberInviteId(inviteId) {
  activeLookupInviteId = String(inviteId || '').trim();
  try {
    if (activeLookupInviteId) localStorage.setItem(HIVE_LAST_INVITE_KEY, activeLookupInviteId);
  } catch (error) {
    console.warn('Aurum Hive Referral ID could not be remembered.', error);
  }
}

function readSavedZoom() {
  try {
    const saved = Number(localStorage.getItem(HIVE_ZOOM_KEY));
    return Number.isFinite(saved) ? saved : hiveZoom;
  } catch (error) {
    return hiveZoom;
  }
}

function rememberZoom() {
  try {
    localStorage.setItem(HIVE_ZOOM_KEY, String(hiveZoom));
  } catch (error) {
    console.warn('Aurum Hive zoom level could not be remembered.', error);
  }
}

function persistHive() {
  saveLocalHive();
  saveHiveToCloud().catch((error) => {
    console.warn('Aurum Hive cloud sync failed.', error);
    updateSyncStatus('Local saved. Supabase sync failed.', 'local');
  });
}

function isCloudConfigured() {
  return Boolean(supabaseConfig.url && supabaseConfig.anonKey);
}

async function getSupabaseClient() {
  if (!isCloudConfigured()) return null;
  if (!supabaseClientPromise) {
    supabaseClientPromise = import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) => {
      return createClient(supabaseConfig.url, supabaseConfig.anonKey);
    });
  }
  return supabaseClientPromise;
}

async function subscribeToHiveRealtime() {
  const supabase = await getSupabaseClient();
  if (!supabase || hiveRealtimeChannel) return;

  hiveRealtimeChannel = supabase
    .channel('aurum-hive-accounts')
    .on('postgres_changes', { event: '*', schema: 'public', table: HIVE_CLOUD_TABLE }, () => {
      if (!activeLookupInviteId) return;
      clearTimeout(realtimeReloadTimer);
      realtimeReloadTimer = setTimeout(() => {
        reloadActiveHiveFromCloud('Realtime update received. Hive refreshed.').catch((error) => {
          console.warn('Aurum Hive realtime reload failed.', error);
          updateSyncStatus('Realtime update received, but reload failed.', 'local');
        });
      }, 450);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') updateSyncStatus('Supabase realtime connected.', 'cloud');
    });
}

async function saveHiveToCloud() {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    updateSyncStatus('Local database active. Supabase not configured.', 'local');
    return;
  }

  const rows = flattenNodes(hiveData);
  const { error } = await supabase
    .from(HIVE_CLOUD_TABLE)
    .upsert(rows.map(toSupabaseRow), { onConflict: 'invite_id' });
  if (error) throw error;
  updateSyncStatus('Saved locally and synced to Supabase.', 'cloud');
}

async function loadHiveFromLookup() {
  const input = document.getElementById('hiveLookupInviteId');
  const inviteId = String(input?.value || '').trim();
  if (!inviteId) {
    setMessage('Enter a Referral ID to load.', 'error');
    return;
  }

  rememberInviteId(inviteId);
  setMessage('Looking up Referral ID...', '');
  const cloudNode = await loadHiveFromCloud(inviteId);
  if (cloudNode) {
    hiveData.splice(0, hiveData.length, cloudNode);
    selectedInviteId = inviteId;
    collapsedInviteIds.clear();
    hiveMode = 'edit';
    saveLocalHive();
    renderHive();
    setMessage('Loaded from Supabase database.', 'ok');
    updateSyncStatus('Loaded from Supabase and cached locally.', 'cloud');
    return;
  }

  const localNode = findNode(hiveData[0], inviteId);
  if (localNode) {
    const topLocalNode = findTopLocalNode(inviteId) || localNode;
    hiveData.splice(0, hiveData.length, cloneNode(topLocalNode));
    selectedInviteId = inviteId;
    collapsedInviteIds.clear();
    hiveMode = 'edit';
    renderHive();
    setMessage('Loaded from local database.', 'ok');
    updateSyncStatus(isCloudConfigured() ? 'Local match loaded. Supabase did not return this Referral ID.' : 'Loaded locally. Supabase not configured.', isCloudConfigured() ? 'local' : 'local');
    return;
  }

  setMessage('Referral ID was not found locally or in the configured Supabase database.', 'error');
}

function searchHiveByName() {
  const input = document.getElementById('hiveNameSearch');
  const query = String(input?.value || '').trim().toLowerCase();
  if (!query) {
    setMessage('Enter a name to search.', 'error');
    return;
  }

  const matches = flattenNodes(hiveData).filter((node) => String(node.name || '').toLowerCase().includes(query));
  if (!matches.length) {
    setMessage('No account matched that name in the loaded Hive.', 'error');
    return;
  }

  selectedInviteId = matches[0].inviteId;
  highlightedInviteId = matches[0].inviteId;
  hiveMode = 'edit';
  renderHive();
  scrollSelectedNodeIntoView();
  setMessage(matches.length === 1 ? 'Found 1 account.' : `Found ${matches.length} accounts. Showing the first match.`, 'ok');
}

function exportSelectedHivePdf() {
  const selected = findNode(hiveData[0], selectedInviteId);
  if (!selected) {
    setMessage('Select an account before exporting.', 'error');
    return;
  }

  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) {
    setMessage('PDF export library is not loaded yet. Refresh the page and try again.', 'error');
    return;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Aurum Hive Export', margin, y);
  y += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Exported: ${new Date().toLocaleString()}`, margin, y);
  y += 18;
  doc.text(`Selected root: ${selected.name || selected.inviteId} (${selected.inviteId})`, margin, y);
  y += 24;

  const stats = getHiveStats(selected);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Accounts: ${stats.total}   Main: ${stats.main}   Sub: ${stats.sub}   Total amount: $${stats.amount.toLocaleString()}`, margin, y);
  y += 24;

  doc.setDrawColor(210, 218, 235);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  function addLine(text, depth, style = 'normal') {
    const left = margin + (depth * 18);
    const maxWidth = pageWidth - margin - left;
    const wrapped = doc.splitTextToSize(text, maxWidth);
    const lineHeight = 14;
    const needed = wrapped.length * lineHeight + 4;
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', style);
    doc.setFontSize(depth === 0 ? 11 : 10);
    doc.text(wrapped, left, y);
    y += needed;
  }

  function walk(node, depth = 0) {
    const amount = `$${Number(node.amount || 0).toLocaleString()}`;
    const rank = normalizeHiveRank(node.rank);
    const type = node.type === 'main' ? 'MAIN' : 'SUB';
    const marker = node.type === 'main' ? '[M]' : '[S]';
    addLine(`${marker} ${node.name || 'Unnamed'} | ${node.inviteId} | ${type} | ${normalizeHiveCountry(node.country)} | ${amount} | ${rank}`, depth, node.type === 'main' ? 'bold' : 'normal');
    (node.children || []).forEach((child) => walk(child, depth + 1));
  }

  walk(selected);

  const filename = `aurum-hive-${safeFilePart(selected.inviteId)}.pdf`;
  doc.save(filename);
  setMessage(`Exported ${filename}.`, 'ok');
}

function getHiveStats(root) {
  const rows = flattenNodes([root]);
  return {
    total: rows.length,
    main: rows.filter((node) => node.type === 'main').length,
    sub: rows.filter((node) => node.type === 'sub').length,
    amount: rows.reduce((sum, node) => sum + Number(node.amount || 0), 0)
  };
}

async function loadHiveFromCloud(inviteId) {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;

  const topInviteId = await findTopCloudInviteId(supabase, inviteId);
  if (!topInviteId) return null;

  async function buildSubtree(nodeId) {
    const { data, error } = await supabase
      .from(HIVE_CLOUD_TABLE)
      .select('*')
      .eq('invite_id', nodeId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const node = fromSupabaseRow(data);
    const { data: childRows, error: childError } = await supabase
      .from(HIVE_CLOUD_TABLE)
      .select('invite_id')
      .eq('parent_invite_id', node.inviteId);
    if (childError) throw childError;

    const children = [];
    for (const child of childRows || []) {
      const childTree = await buildSubtree(child.invite_id);
      if (childTree) children.push(childTree);
    }
    return { ...node, children };
  }

  return buildSubtree(topInviteId);
}

async function findTopCloudInviteId(supabase, inviteId) {
  let currentId = inviteId;
  const seen = new Set();

  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const { data, error } = await supabase
      .from(HIVE_CLOUD_TABLE)
      .select('invite_id,parent_invite_id')
      .eq('invite_id', currentId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    if (!data.parent_invite_id) return data.invite_id;
    currentId = data.parent_invite_id;
  }

  return currentId || null;
}

async function reloadActiveHiveFromCloud(statusMessage) {
  if (!activeLookupInviteId) return;
  const cloudNode = await loadHiveFromCloud(activeLookupInviteId);
  if (!cloudNode) return;

  hiveData.splice(0, hiveData.length, cloudNode);
  selectedInviteId = findNode(cloudNode, selectedInviteId) ? selectedInviteId : activeLookupInviteId;
  collapsedInviteIds.clear();
  hiveMode = 'edit';
  saveLocalHive();
  renderHive();
  setMessage(statusMessage || 'Hive refreshed from Supabase.', 'ok');
  updateSyncStatus('Supabase realtime connected.', 'cloud');
}

async function cloudInviteExists(inviteId) {
  const supabase = await getSupabaseClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from(HIVE_CLOUD_TABLE)
    .select('invite_id')
    .eq('invite_id', inviteId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function deleteCloudInvite(inviteId) {
  const supabase = await getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase
    .from(HIVE_CLOUD_TABLE)
    .delete()
    .eq('invite_id', inviteId);
  if (error) throw error;
}

function toSupabaseRow(node) {
  const amount = Number(node.amount || 0);
  return {
    invite_id: String(node.inviteId || '').trim(),
    name: String(node.name || '').trim(),
    country: normalizeHiveCountry(node.country),
    amount,
    rank: amount > 0 ? normalizeHiveRank(node.rank) : DEFAULT_HIVE_RANK,
    type: node.type === 'sub' ? 'sub' : 'main',
    parent_invite_id: node.parentInviteId || null,
    updated_at: new Date().toISOString()
  };
}

function fromSupabaseRow(row) {
  const amount = Number(row.amount || 0);
  return {
    inviteId: String(row.invite_id || '').trim(),
    name: String(row.name || '').trim(),
    country: normalizeHiveCountry(row.country),
    amount,
    rank: amount > 0 ? normalizeHiveRank(row.rank) : DEFAULT_HIVE_RANK,
    type: row.type === 'sub' ? 'sub' : 'main',
    parentInviteId: row.parent_invite_id || null,
    children: []
  };
}

function updateSyncStatus(text, mode) {
  const status = document.getElementById('hiveSyncStatus');
  if (!status) return;
  status.className = `hive-status ${mode || 'local'}`;
  status.innerHTML = `<span class="hive-status-dot"></span><span>${escapeHtml(text)}</span>`;
}

function cloneNode(node) {
  return JSON.parse(JSON.stringify(node));
}

function normalizeHiveRank(rank) {
  const value = String(rank || DEFAULT_HIVE_RANK).trim().toUpperCase();
  return HIVE_RANKS.includes(value) ? value : DEFAULT_HIVE_RANK;
}

function normalizeHiveCountry(country) {
  const value = String(country || DEFAULT_HIVE_COUNTRY).trim();
  return HIVE_COUNTRIES.includes(value) ? value : DEFAULT_HIVE_COUNTRY;
}

function getMainRankBadge(node) {
  if (!node || node.type !== 'main') return '';
  const rank = normalizeHiveRank(node.rank);
  return rank && rank !== DEFAULT_HIVE_RANK ? rank : '';
}

function findTopLocalNode(inviteId) {
  const node = findNode(hiveData[0], inviteId);
  if (!node) return null;

  let top = node;
  let current = node;
  const seen = new Set();
  while (current?.parentInviteId && !seen.has(current.inviteId)) {
    seen.add(current.inviteId);
    const parent = findNode(hiveData[0], current.parentInviteId);
    if (!parent) break;
    top = parent;
    current = parent;
  }
  return top;
}

function getPathToRoot(inviteId) {
  const path = [];
  let current = findNode(hiveData[0], inviteId);
  const seen = new Set();
  while (current && !seen.has(current.inviteId)) {
    path.unshift(current);
    seen.add(current.inviteId);
    current = current.parentInviteId ? findNode(hiveData[0], current.parentInviteId) : null;
  }
  return path;
}

function getOpenSlotStats(root) {
  const rows = flattenNodes([root]);
  let subSlots = 0;
  let mainSlots = 0;

  rows.forEach((node) => {
    const children = node.children || [];
    if (node.type === 'main') {
      subSlots += Math.max(0, 3 - children.filter((child) => child.type === 'sub').length);
    } else {
      mainSlots += Math.max(0, 1 - children.filter((child) => child.type === 'main').length);
    }
  });

  return { subSlots, mainSlots, total: subSlots + mainSlots };
}

function getBranchHealth(root, loadedAmount) {
  const rows = flattenNodes([root]);
  const fundedCount = rows.filter((node) => Number(node.amount || 0) > 0).length;
  const fundedPercent = rows.length ? (fundedCount / rows.length) * 100 : 0;
  const openSlots = getOpenSlotStats(root);
  const possibleSlots = rows.reduce((sum, node) => sum + (node.type === 'main' ? 3 : 1), 0);
  const filledPercent = possibleSlots ? ((possibleSlots - openSlots.total) / possibleSlots) * 100 : 100;
  const mainRows = rows.filter((node) => node.type === 'main');
  const rankedMainPercent = mainRows.length
    ? (mainRows.filter((node) => getMainRankBadge(node)).length / mainRows.length) * 100
    : 0;
  const branchAmount = rows.reduce((sum, node) => sum + Number(node.amount || 0), 0);
  const amountShare = loadedAmount ? Math.min(100, (branchAmount / loadedAmount) * 100) : 0;

  const score = Math.round(
    (fundedPercent * 0.35) +
    (filledPercent * 0.30) +
    (Math.min(100, amountShare * 2) * 0.20) +
    (rankedMainPercent * 0.15)
  );

  let label = 'Needs attention';
  if (score >= 85) label = 'Strong';
  else if (score >= 70) label = 'Healthy';
  else if (score >= 50) label = 'Developing';

  return { score, label, fundedPercent, filledPercent, rankedMainPercent, amountShare };
}

export function renderHive(containerId = 'hiveContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;
  hideHiveTooltip();

  if (!findNode(hiveData[0], selectedInviteId)) {
    selectedInviteId = hiveData[0]?.inviteId || '';
  }

  container.innerHTML = '';
  const renderRoots = hiveFocusMode && selectedInviteId
    ? [findNode(hiveData[0], selectedInviteId)].filter(Boolean)
    : hiveData;

  renderTreeMap(container, renderRoots);
  renderHiveSummary();
  populateHiveForm();
  updateHiveFocusButton();
}

function renderTreeMap(container, roots) {
  const layout = layoutHiveTree(roots);
  container.style.width = `${layout.width}px`;
  container.style.height = `${layout.height}px`;
  container.innerHTML = '';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('hive-link-layer');
  svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  layout.links.forEach((link) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const midY = link.parent.y + ((link.child.y - link.parent.y) / 2);
    path.setAttribute('d', `M ${link.parent.x} ${link.parent.y} V ${midY} H ${link.child.x} V ${link.child.y}`);
    svg.appendChild(path);
  });
  container.appendChild(svg);

  layout.nodes.forEach((item) => {
    container.appendChild(createHiveNode(item.node, item.x, item.y));
  });
}

function layoutHiveTree(roots) {
  const nodeGapX = 138;
  const levelGapY = 128;
  const paddingX = 90;
  const paddingY = 52;
  let leafIndex = 0;
  const nodes = [];
  const links = [];
  let maxDepth = 0;

  function place(node, depth) {
    maxDepth = Math.max(maxDepth, depth);
    const children = collapsedInviteIds.has(node.inviteId) ? [] : (node.children || []);
    const childPositions = children.map((child) => place(child, depth + 1));
    const x = childPositions.length
      ? childPositions.reduce((sum, child) => sum + child.x, 0) / childPositions.length
      : paddingX + (leafIndex++ * nodeGapX);
    const y = paddingY + (depth * levelGapY);
    const position = { node, x, y, depth };
    nodes.push(position);
    childPositions.forEach((childPosition) => {
      links.push({ parent: position, child: childPosition });
    });
    return position;
  }

  roots.forEach((root) => place(root, 0));

  const width = Math.max(700, paddingX * 2 + Math.max(1, leafIndex - 1) * nodeGapX);
  const height = Math.max(520, paddingY * 2 + maxDepth * levelGapY);
  return { nodes, links, width, height };
}

function createHiveNode(node, x, y) {
  const wrapper = document.createElement('div');
  wrapper.className = 'hive-node-wrapper';
  wrapper.style.left = `${x}px`;
  wrapper.style.top = `${y}px`;

  const dot = document.createElement('div');
  const isSelected = node.inviteId === selectedInviteId;
  const isSearchHit = node.inviteId === highlightedInviteId;
  const isUnfunded = Number(node.amount || 0) <= 0;
  dot.className = `${node.type === 'main' ? 'hive-dot-main' : 'hive-dot-sub'}${isSelected ? ' selected' : ''}${isSearchHit ? ' search-hit' : ''}${isUnfunded ? ' unfunded' : ''}`;
  dot.setAttribute('role', 'button');
  dot.setAttribute('tabindex', '0');
  dot.setAttribute('aria-label', `Select ${node.name}`);
  dot.dataset.inviteId = node.inviteId;
  dot.addEventListener('mouseenter', () => showHiveTooltip(node, dot));
  dot.addEventListener('mouseleave', hideHiveTooltip);
  dot.addEventListener('focus', () => showHiveTooltip(node, dot));
  dot.addEventListener('blur', hideHiveTooltip);
  dot.addEventListener('click', (event) => {
    event.stopPropagation();
    selectedInviteId = node.inviteId;
    if (highlightedInviteId !== node.inviteId) highlightedInviteId = '';
    hiveMode = 'edit';
    renderHive();
  });
  dot.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectedInviteId = node.inviteId;
      if (highlightedInviteId !== node.inviteId) highlightedInviteId = '';
      hiveMode = 'edit';
      renderHive();
    }
  });

  const dotRow = document.createElement('div');
  dotRow.className = 'hive-node-dot-row';
  dotRow.appendChild(dot);
  const rankBadge = getMainRankBadge(node);
  if (rankBadge) {
    const badge = document.createElement('span');
    badge.className = 'hive-rank-badge';
    badge.textContent = rankBadge;
    badge.title = rankBadge;
    dotRow.appendChild(badge);
  }
  wrapper.appendChild(dotRow);
  if ((node.children || []).length > 0) {
    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'hive-collapse-btn';
    collapseBtn.textContent = collapsedInviteIds.has(node.inviteId) ? '+' : '-';
    collapseBtn.title = collapsedInviteIds.has(node.inviteId) ? 'Expand branch' : 'Collapse branch';
    collapseBtn.setAttribute('aria-label', collapseBtn.title);
    collapseBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleCollapsedBranch(node.inviteId);
    });
    wrapper.appendChild(collapseBtn);
  }
  return wrapper;
}

function showHiveTooltip(node, anchorEl) {
  const layer = document.getElementById('hiveTooltipLayer');
  const canvas = anchorEl.closest('.hive-canvas');
  if (!layer || !canvas) return;

  const rank = normalizeHiveRank(node.rank);
  const rankHtml = rank === DEFAULT_HIVE_RANK
    ? escapeHtml(rank)
    : `<span class="hive-tooltip-rank">${escapeHtml(rank)}</span>`;
  const anchorRect = anchorEl.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const left = anchorRect.left + (anchorRect.width / 2) - canvasRect.left + canvas.scrollLeft;
  const top = anchorRect.bottom - canvasRect.top + canvas.scrollTop;

  layer.innerHTML = `
    <div class="hive-floating-tooltip" style="left:${left}px; top:${top}px;">
      <strong>${escapeHtml(node.name)}</strong><br>
      Referral ID: ${escapeHtml(node.inviteId)}<br>
      Country: ${escapeHtml(normalizeHiveCountry(node.country))}<br>
      Amount: $${Number(node.amount || 0).toLocaleString()}<br>
      Rank: ${rankHtml}<br>
      Type: ${escapeHtml(node.type)}
    </div>
  `;
}

function hideHiveTooltip() {
  const layer = document.getElementById('hiveTooltipLayer');
  if (layer) layer.innerHTML = '';
}

function toggleCollapsedBranch(inviteId) {
  if (collapsedInviteIds.has(inviteId)) {
    collapsedInviteIds.delete(inviteId);
  } else {
    collapsedInviteIds.add(inviteId);
  }
  hideHiveTooltip();
  renderHive();
}

function scrollSelectedNodeIntoView() {
  requestAnimationFrame(() => {
    const selectedDot = document.querySelector(`[data-invite-id="${cssEscape(selectedInviteId)}"]`);
    selectedDot?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  });
}

export function addHiveItem(parentInviteId, newItem) {
  const parent = findNode(hiveData[0], parentInviteId);
  if (!parent) return false;
  const nextType = getAllowedChildType(parent);

  if (!nextType || newItem.type !== nextType) return false;
  if (findNode(hiveData[0], newItem.inviteId)) return false;

  if (!parent.children) parent.children = [];

  parent.children.push({
    ...newItem,
    country: normalizeHiveCountry(newItem.country),
    rank: Number(newItem.amount || 0) > 0 ? normalizeHiveRank(newItem.rank) : DEFAULT_HIVE_RANK,
    type: nextType,
    parentInviteId: parent.inviteId,
    children: []
  });

  selectedInviteId = newItem.inviteId;
  hiveMode = 'edit';
  persistHive();
  renderHive();
  return true;
}

export function editHiveItem(inviteId, updatedData) {
  const node = findNode(hiveData[0], inviteId);
  if (!node) return false;

  const nextInviteId = String(updatedData.inviteId || '').trim();
  if (!nextInviteId) return false;
  const duplicate = flattenNodes(hiveData).some((item) => item.inviteId === nextInviteId && item !== node);
  if (duplicate) return false;

  const previousInviteId = node.inviteId;
  Object.assign(node, {
    inviteId: nextInviteId,
    name: String(updatedData.name || '').trim(),
    country: normalizeHiveCountry(updatedData.country),
    amount: Number(updatedData.amount || 0),
    rank: Number(updatedData.amount || 0) > 0 ? normalizeHiveRank(updatedData.rank) : DEFAULT_HIVE_RANK
  });
  if (previousInviteId !== nextInviteId) {
    updateChildParentIds(node, previousInviteId, nextInviteId);
    selectedInviteId = nextInviteId;
    deleteCloudInvite(previousInviteId).catch((error) => {
      console.warn('Old cloud Referral ID could not be removed.', error);
    });
  }

  persistHive();
  renderHive();
  return true;
}

export function removeHiveItem(inviteId) {
  const node = findNode(hiveData[0], inviteId);
  const removedIds = node ? flattenNodes([node]).map((item) => item.inviteId) : [];
  const removed = removeNodeRecursive(hiveData[0], inviteId);
  if (removed) {
    selectedInviteId = hiveData[0]?.inviteId || '';
    removedIds.forEach((removedId) => {
      deleteCloudInvite(removedId).catch((error) => {
        console.warn('Cloud Hive account could not be removed.', error);
      });
    });
    persistHive();
    renderHive();
  }
  return removed;
}

function findNode(node, inviteId) {
  if (!node) return null;
  if (node.inviteId === inviteId) return node;
  if (!node.children) return null;

  for (const child of node.children) {
    const found = findNode(child, inviteId);
    if (found) return found;
  }

  return null;
}

function removeNodeRecursive(parent, inviteId) {
  if (!parent.children) return false;

  const index = parent.children.findIndex((child) => child.inviteId === inviteId);
  if (index !== -1) {
    parent.children.splice(index, 1);
    return true;
  }

  for (const child of parent.children) {
    const removed = removeNodeRecursive(child, inviteId);
    if (removed) return true;
  }

  return false;
}

function setHiveMode(mode) {
  hiveMode = mode === 'add' ? 'add' : 'edit';
  setMessage('', '');
  populateHiveForm();
}

function populateRankOptions() {
  const rankInput = document.getElementById('hiveRank');
  if (!rankInput) return;
  rankInput.innerHTML = HIVE_RANKS.map((rank) => `<option value="${escapeHtml(rank)}">${escapeHtml(rank)}</option>`).join('');
  rankInput.value = DEFAULT_HIVE_RANK;
}

function populateCountryOptions() {
  const countryInput = document.getElementById('hiveCountry');
  if (!countryInput) return;
  countryInput.innerHTML = HIVE_COUNTRIES.map((country) => `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`).join('');
  countryInput.value = DEFAULT_HIVE_COUNTRY;
}

function populateHiveForm() {
  const selected = findNode(hiveData[0], selectedInviteId);
  const editTab = document.getElementById('hiveEditTab');
  const addTab = document.getElementById('hiveAddTab');
  const saveBtn = document.getElementById('hiveSaveBtn');
  const inviteInput = document.getElementById('hiveInviteId');
  const nameInput = document.getElementById('hiveName');
  const countryInput = document.getElementById('hiveCountry');
  const amountInput = document.getElementById('hiveAmount');
  const rankInput = document.getElementById('hiveRank');
  const typeInput = document.getElementById('hiveType');
  const parentInput = document.getElementById('hiveParent');
  if (!selected || !inviteInput || !nameInput || !countryInput || !amountInput || !rankInput || !typeInput || !parentInput || !saveBtn) return;

  const childType = getAllowedChildType(selected);
  if (hiveMode === 'add' && !childType) hiveMode = 'edit';

  editTab?.classList.toggle('active', hiveMode === 'edit');
  addTab?.classList.toggle('active', hiveMode === 'add');
  if (addTab) {
    addTab.textContent = childType ? `Add ${childType}` : 'Add child';
    addTab.disabled = !childType;
  }

  if (hiveMode === 'edit') {
    inviteInput.value = selected.inviteId || '';
    nameInput.value = selected.name || '';
    countryInput.value = normalizeHiveCountry(selected.country);
    amountInput.value = selected.amount ?? '';
    rankInput.value = normalizeHiveRank(selected.rank);
    typeInput.value = selected.type || '';
    parentInput.value = selected.parentInviteId || 'Root';
    saveBtn.textContent = 'Save edit';
  } else {
    inviteInput.value = suggestInviteId(childType);
    nameInput.value = childType === 'main' ? 'New Main Account' : 'New Sub Account';
    countryInput.value = DEFAULT_HIVE_COUNTRY;
    amountInput.value = '';
    rankInput.value = DEFAULT_HIVE_RANK;
    typeInput.value = childType;
    parentInput.value = selected.inviteId;
    saveBtn.textContent = `Add ${childType} account`;
  }
}

function setHiveZoom(value) {
  hiveZoom = Math.min(1.2, Math.max(0.35, Number(value || 0.85)));
  const tree = document.getElementById('hiveContainer');
  const range = document.getElementById('hiveZoomRange');
  const valueLabel = document.getElementById('hiveZoomValue');
  if (tree) {
    tree.style.transform = `scale(${hiveZoom})`;
    tree.style.marginBottom = `${Math.max(0, 560 * (hiveZoom - 1))}px`;
  }
  if (range) range.value = String(Math.round(hiveZoom * 100));
  if (valueLabel) valueLabel.textContent = `${Math.round(hiveZoom * 100)}%`;
  rememberZoom();
}

function setHiveFullscreen(value) {
  hiveFullscreen = Boolean(value);
  const card = document.querySelector('#hiveModal .hive-modal-card');
  const icon = document.querySelector('#hiveFullscreenBtn .material-symbols-rounded');
  const btn = document.getElementById('hiveFullscreenBtn');
  card?.classList.toggle('fullscreen', hiveFullscreen);
  if (icon) icon.textContent = hiveFullscreen ? 'fullscreen_exit' : 'fullscreen';
  if (btn) {
    btn.title = hiveFullscreen ? 'Exit fullscreen' : 'Fullscreen';
    btn.setAttribute('aria-label', btn.title);
  }
}

function toggleHiveFullscreen() {
  setHiveFullscreen(!hiveFullscreen);
}

function toggleHiveFocusMode() {
  hiveFocusMode = !hiveFocusMode;
  renderHive();
}

function updateHiveFocusButton() {
  const btn = document.getElementById('hiveFocusBtn');
  if (!btn) return;
  btn.classList.toggle('active', hiveFocusMode);
  btn.title = hiveFocusMode ? 'Show full loaded Hive' : 'Focus selected tree';
  btn.setAttribute('aria-label', btn.title);
}

async function submitHiveForm() {
  const selected = findNode(hiveData[0], selectedInviteId);
  if (!selected) {
    setMessage('Select an account first.', 'error');
    return;
  }

  const formData = {
    inviteId: document.getElementById('hiveInviteId').value.trim(),
    name: document.getElementById('hiveName').value.trim(),
    country: document.getElementById('hiveCountry').value,
    amount: Number(document.getElementById('hiveAmount').value || 0),
    rank: document.getElementById('hiveRank').value.trim()
  };

  if (!formData.inviteId) {
    setMessage('Referral ID is required.', 'error');
    return;
  }

  if (hiveMode === 'edit') {
    if (formData.inviteId !== selected.inviteId && await cloudInviteExists(formData.inviteId)) {
      setMessage('That Referral ID already exists in the cloud database.', 'error');
      return;
    }
    const saved = editHiveItem(selected.inviteId, formData);
    setMessage(saved ? 'Account updated.' : 'Could not update account. Check for duplicate Referral ID.', saved ? 'ok' : 'error');
    return;
  }

  const childType = getAllowedChildType(selected);
  if (!childType) {
    setMessage('This account cannot add a child account.', 'error');
    return;
  }

  if (await cloudInviteExists(formData.inviteId)) {
    setMessage('That Referral ID already exists in the cloud database. Load it instead of creating a duplicate.', 'error');
    return;
  }

  const added = addHiveItem(selected.inviteId, {
    ...formData,
    type: childType,
    parentInviteId: selected.inviteId
  });
  setMessage(added ? `${childType === 'main' ? 'Main' : 'Sub'} account added.` : 'Could not add account. Check the Referral ID and account rule.', added ? 'ok' : 'error');
}

function getAllowedChildType(parent) {
  if (!parent) return null;
  if (parent.type === 'main') return 'sub';
  if (parent.type === 'sub') return 'main';
  return null;
}

function suggestInviteId(type) {
  const allIds = new Set(flattenNodes(hiveData).map((node) => node.inviteId));
  const prefix = type === 'main' ? 'MAIN' : 'SUB';
  let index = allIds.size + 1;
  let next = `${prefix}-${String(index).padStart(3, '0')}`;
  while (allIds.has(next)) {
    index += 1;
    next = `${prefix}-${String(index).padStart(3, '0')}`;
  }
  return next;
}

function setMessage(text, type) {
  const message = document.getElementById('hiveMessage');
  if (!message) return;
  message.textContent = text || '';
  message.className = `hive-message${type ? ` ${type}` : ''}`;
}

function updateChildParentIds(node, previousInviteId, nextInviteId) {
  (node.children || []).forEach((child) => {
    if (child.parentInviteId === previousInviteId) {
      child.parentInviteId = nextInviteId;
    }
  });
}

function renderHiveSummary() {
  const summary = document.getElementById('hiveSummary');
  if (!summary) return;

  const selected = findNode(hiveData[0], selectedInviteId);
  const selectedNodes = selected ? flattenNodes([selected]) : [];
  const loadedNodes = flattenNodes(hiveData);
  const mainCount = selectedNodes.filter((node) => node.type === 'main').length;
  const subCount = selectedNodes.filter((node) => node.type === 'sub').length;
  const totalAmount = selectedNodes.reduce((sum, node) => sum + Number(node.amount || 0), 0);
  const loadedAmount = loadedNodes.reduce((sum, node) => sum + Number(node.amount || 0), 0);
  const accountShare = loadedNodes.length ? (selectedNodes.length / loadedNodes.length) * 100 : 0;
  const amountShare = loadedAmount ? (totalAmount / loadedAmount) * 100 : 0;
  const pathToRoot = selected ? getPathToRoot(selected.inviteId).map((node) => node.inviteId).join(' -> ') : '';
  const openSlots = selected ? getOpenSlotStats(selected) : { subSlots: 0, mainSlots: 0, total: 0 };
  const health = selected ? getBranchHealth(selected, loadedAmount) : null;

  summary.innerHTML = `
    <div class="hive-summary-grid">
      <div class="hive-summary-card wide">
        <div class="hive-summary-label">Selected</div>
        <div class="hive-summary-value">${escapeHtml(selected?.name || 'None')}</div>
        <div class="hive-summary-note">${escapeHtml(selected?.inviteId || '')}</div>
      </div>
      ${health ? `
        <div class="hive-summary-card hive-health-card">
          <div class="hive-summary-label">Branch health</div>
          <div class="hive-summary-value hive-health-score">${health.score}/100</div>
          <div class="hive-summary-note">${escapeHtml(health.label)}</div>
        </div>
      ` : ''}
      <div class="hive-summary-card">
        <div class="hive-summary-label">Tree size</div>
        <div class="hive-summary-value">${selectedNodes.length}</div>
        <div class="hive-summary-note">${mainCount} main · ${subCount} sub</div>
      </div>
      <div class="hive-summary-card">
        <div class="hive-summary-label">Tree amount</div>
        <div class="hive-summary-value">$${totalAmount.toLocaleString()}</div>
        <div class="hive-summary-note">${amountShare.toFixed(1)}% of loaded amount</div>
      </div>
      <div class="hive-summary-card">
        <div class="hive-summary-label">Hive share</div>
        <div class="hive-summary-value">${accountShare.toFixed(1)}%</div>
        <div class="hive-summary-note">of ${loadedNodes.length} loaded accounts</div>
      </div>
      <div class="hive-summary-card">
        <div class="hive-summary-label">Open slots</div>
        <div class="hive-summary-value">${openSlots.total}</div>
        <div class="hive-summary-note">${openSlots.subSlots} sub · ${openSlots.mainSlots} main</div>
      </div>
      ${health ? `
        <div class="hive-summary-card">
          <div class="hive-summary-label">Funded</div>
          <div class="hive-summary-value">${health.fundedPercent.toFixed(1)}%</div>
          <div class="hive-summary-note">selected branch</div>
        </div>
        <div class="hive-summary-card">
          <div class="hive-summary-label">Filled slots</div>
          <div class="hive-summary-value">${health.filledPercent.toFixed(1)}%</div>
          <div class="hive-summary-note">selected branch</div>
        </div>
      ` : ''}
      <div class="hive-summary-card wide">
        <div class="hive-summary-label">Path to root</div>
        <div class="hive-summary-value" style="font-size:12px;">${escapeHtml(pathToRoot || 'None')}</div>
        <div class="hive-summary-note">${hiveFocusMode ? 'Focused selected tree' : 'Full loaded Hive'}</div>
      </div>
    </div>
  `;
}

function flattenNodes(nodes) {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children || [])]);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
  ));
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(String(value));
  return String(value).replace(/["\\]/g, '\\$&');
}

function safeFilePart(value) {
  return String(value || 'selected')
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'selected';
}

window.openHiveManager = function openHiveManager() {
  loadLocalHive();
  hiveZoom = readSavedZoom();
  hiveFullscreen = true;
  ensureHiveUi();
  document.getElementById('hiveModal').classList.add('open');
  setHiveFullscreen(true);
  updateSyncStatus(isCloudConfigured() ? 'Supabase configured. Local cache active.' : 'Local database active. Supabase not configured.', isCloudConfigured() ? 'cloud' : 'local');
  const rememberedInviteId = readLastInviteId();
  const lookupInput = document.getElementById('hiveLookupInviteId');
  if (lookupInput && rememberedInviteId) lookupInput.value = rememberedInviteId;
  renderHive();
  setHiveZoom(hiveZoom);
  subscribeToHiveRealtime().catch((error) => {
    console.warn('Aurum Hive realtime could not be started.', error);
    updateSyncStatus('Supabase configured. Realtime could not connect.', 'local');
  });
  if (rememberedInviteId) {
    loadHiveFromLookup().catch((error) => {
      console.warn('Remembered Referral ID could not be loaded.', error);
      setMessage('Saved Referral ID could not be loaded. You can enter it again.', 'error');
    });
  }
};

window.AurumHiveModule = {
  hiveData,
  configureHiveSupabase,
  configureHiveCloud,
  renderHive,
  addHiveItem,
  editHiveItem,
  removeHiveItem
};
