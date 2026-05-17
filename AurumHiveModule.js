export const hiveData = [
  {
    inviteId: 'AUR-ROOT-001',
    name: 'Main Account',
    email: '',
    amount: 25000,
    rank: 'VANGUARD PRO',
    type: 'main',
    parentInviteId: null,
    children: [
      {
        inviteId: 'SUB-001',
        name: 'Sub Account 1',
        email: '',
        amount: 5000,
        rank: 'VANGUARD',
        type: 'sub',
        parentInviteId: 'AUR-ROOT-001',
        children: [
          {
            inviteId: 'MAIN-001-A',
            name: 'Nested Main 1',
            email: '',
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
        email: '',
        amount: 4500,
        rank: 'VANGUARD',
        type: 'sub',
        parentInviteId: 'AUR-ROOT-001',
        children: [
          {
            inviteId: 'MAIN-002-A',
            name: 'Nested Main 2',
            email: '',
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
        email: '',
        amount: 7000,
        rank: 'VANGUARD',
        type: 'sub',
        parentInviteId: 'AUR-ROOT-001',
        children: [
          {
            inviteId: 'MAIN-003-A',
            name: 'Nested Main 3',
            email: '',
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
let hiveEditLocked = false;
let hiveZoom = 0.85;
let hiveFullscreen = true;
let hiveFocusMode = false;
let highlightedInviteId = '';
let hiveBranchHighlightMode = false;
let isolatedRootInviteId = '';
let hivePanelCollapsed = false;
let hivePanX = 0;
let hivePanY = 0;
let lastHiveLayout = null;
const collapsedInviteIds = new Set();
const HIVE_LOCAL_KEY = 'aurum_hive_database_v1';
const HIVE_LAST_INVITE_KEY = 'aurum_hive_last_invite_id_v1';
const HIVE_ZOOM_KEY = 'aurum_hive_zoom_v1';
const HIVE_OVERLAY_POSITIONS_KEY = 'aurum_hive_overlay_positions_v1';
const HIVE_OVERLAY_COLLAPSED_KEY = 'aurum_hive_overlay_collapsed_v1';
const HIVE_PANEL_COLLAPSED_KEY = 'aurum_hive_panel_collapsed_v1';
const HIVE_SYNC_LOG_KEY = 'aurum_hive_sync_log_v1';
const HIVE_REOPEN_AFTER_RELOAD_KEY = 'aurum_hive_reopen_after_reload_v1';
const HIVE_UPDATE_REQUESTED_KEY = 'aurum_hive_update_requested_version_v1';
const HIVE_SYNC_LOG_LIMIT = 40;
const HIVE_AUTO_REFRESH_MS = 180000;
const HIVE_MIN_ZOOM = 0.1;
const HIVE_MAX_ZOOM = 1.2;
const HIVE_APP_VERSION = '2026.05.16.56';
const HIVE_MOBILE_PANEL_MAX_WIDTH = 1180;
const HIVE_VERSION_URL = 'hive-version.json';
const HIVE_CLOUD_TABLE = 'aurum_hive_accounts';
const HIVE_SUPPORTED_SUB_LIMIT = 3;
const HIVE_PIN_PATTERN = /^\d{4}$/;
const AURUM_REFERRAL_BASE_URL = 'https://backoffice.aurum.foundation/u/';
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
let hiveAutoRefreshTimer = null;
let hiveSyncToastTimer = null;
let hiveUpdatePromptedVersion = '';
let hivePendingCloudSync = false;
const hiveAccessPins = new Map();
const copyFeedbackTimers = new WeakMap();

export function configureHiveSupabase(config) {
  Object.assign(supabaseConfig, config || {});
  supabaseClientPromise = null;
  updateSyncStatus(isCloudConfigured() ? 'Cloud sync configured. Local cache active.' : 'Local database active. Cloud sync not configured.', isCloudConfigured() ? 'cloud' : 'local');
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
    .hive-header-actions { display:flex; align-items:center; gap:10px; }
    .hive-version-badge { border:1px solid rgba(37,82,231,.18); border-radius:999px; background:var(--blue-light); color:var(--blue-mid); padding:6px 9px; font:900 11px 'Inter',sans-serif; white-space:nowrap; }
    .hive-update-banner { display:none; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; padding:10px 12px; border:1px solid rgba(37,82,231,.22); border-radius:12px; background:#eff6ff; color:var(--text); box-shadow:0 8px 18px rgba(25,45,110,.08); }
    .hive-update-banner.visible { display:flex; }
    .hive-update-text { display:grid; gap:2px; font-size:12px; color:var(--text-mid); }
    .hive-update-text strong { color:var(--text); font-size:13px; }
    .hive-update-btn { border:1px solid rgba(37,82,231,.24); border-radius:9px; background:var(--blue); color:#fff; padding:8px 11px; font:900 11px 'Inter',sans-serif; cursor:pointer; white-space:nowrap; }
    .hive-update-btn:hover { filter:brightness(1.05); }
    .hive-sync-toast { position:fixed; top:18px; right:18px; z-index:10050; display:flex; align-items:center; gap:10px; max-width:min(360px, calc(100vw - 36px)); padding:13px 14px; border:1px solid rgba(22,163,74,.26); border-radius:12px; background:#f0fdf4; color:#14532d; box-shadow:0 18px 42px rgba(15,23,42,.18); font:800 13px 'Inter',sans-serif; opacity:0; transform:translateY(-10px); pointer-events:none; transition:opacity .18s ease, transform .18s ease; }
    .hive-sync-toast.visible { opacity:1; transform:translateY(0); }
    .hive-sync-toast .material-symbols-rounded { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:999px; background:#16a34a; color:#fff; font-size:18px; flex:0 0 auto; }
    .hive-sync-toast.error { border-color:rgba(220,38,38,.26); background:#fef2f2; color:#7f1d1d; }
    .hive-sync-toast.error .material-symbols-rounded { background:#dc2626; }
    .hive-pin-overlay { position:fixed; inset:0; z-index:10060; display:none; align-items:center; justify-content:center; padding:20px; background:rgba(15,23,42,.46); backdrop-filter:blur(10px); }
    .hive-pin-overlay.visible { display:flex; }
    .hive-pin-card { width:min(360px, calc(100vw - 34px)); border:1px solid rgba(255,255,255,.64); border-radius:18px; background:linear-gradient(180deg,#ffffff 0%,#eef4ff 100%); box-shadow:0 26px 70px rgba(15,23,42,.30); padding:18px; color:var(--text); }
    .hive-pin-head { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
    .hive-pin-icon { display:inline-flex; align-items:center; justify-content:center; width:46px; height:46px; border-radius:14px; background:#173fcf; color:#fff; box-shadow:0 12px 28px rgba(37,82,231,.28); flex:0 0 auto; }
    .hive-pin-icon .material-symbols-rounded { font-size:27px; }
    .hive-pin-title { margin:0; font:900 18px 'Inter',sans-serif; color:var(--text); line-height:1.15; }
    .hive-pin-subtitle { margin:3px 0 0; font:700 12px 'Inter',sans-serif; color:var(--text-muted); line-height:1.35; overflow-wrap:anywhere; }
    .hive-pin-slots { display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin:16px 0 14px; }
    .hive-pin-slot { height:52px; border:1px solid rgba(37,82,231,.22); border-radius:12px; background:#fff; box-shadow:inset 0 1px 0 rgba(255,255,255,.8), 0 8px 18px rgba(25,45,110,.08); display:flex; align-items:center; justify-content:center; }
    .hive-pin-slot.filled::before { content:''; width:13px; height:13px; border-radius:999px; background:#173fcf; box-shadow:0 0 0 5px rgba(37,82,231,.12); }
    .hive-pin-error { min-height:17px; margin-bottom:10px; color:#b91c1c; font:800 12px 'Inter',sans-serif; text-align:center; }
    .hive-pin-keypad { display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; }
    .hive-pin-key { height:54px; border:1px solid rgba(37,82,231,.18); border-radius:14px; background:#fff; color:var(--text); font:900 20px 'Inter',sans-serif; cursor:pointer; box-shadow:0 9px 18px rgba(25,45,110,.08); }
    .hive-pin-key:hover { border-color:#2752e7; background:#eff6ff; color:#173fcf; }
    .hive-pin-key:active { transform:translateY(1px); }
    .hive-pin-key.action { font-size:18px; color:var(--text-mid); background:#f8fbff; }
    .hive-pin-actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:13px; }
    .hive-pin-actions button { height:42px; border-radius:11px; font:900 12px 'Inter',sans-serif; cursor:pointer; }
    .hive-pin-cancel { border:1px solid var(--border); background:#fff; color:var(--text-mid); }
    .hive-pin-unlock { border:1px solid #173fcf; background:#173fcf; color:#fff; box-shadow:0 10px 24px rgba(37,82,231,.22); }
    .hive-pin-unlock:disabled { opacity:.58; cursor:not-allowed; }
    .hive-pin-warning { margin:0 0 12px; padding:9px 10px; border:1px solid rgba(245,158,11,.28); border-radius:11px; background:#fffbeb; color:#92400e; font:800 11px/1.4 'Inter',sans-serif; }
    .hive-layout { display:grid; grid-template-columns:360px minmax(0,1fr); gap:18px; }
    .hive-layout.panel-collapsed { grid-template-columns:minmax(0,1fr); }
    .hive-panel { border:1px solid var(--border); border-radius:16px; background:#fff; padding:14px; }
    .hive-layout.panel-collapsed .hive-panel { display:none; }
    .hive-panel-title { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; font-size:13px; font-weight:800; color:var(--text); }
    .hive-panel-title-actions { display:flex; align-items:center; gap:8px; }
    .hive-panel-toggle { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border:1px solid var(--border); border-radius:8px; background:var(--surface-2); color:var(--text-mid); cursor:pointer; }
    .hive-panel-toggle:hover { border-color:var(--blue); color:var(--blue-mid); background:var(--blue-light); }
    .hive-summary-rollup { margin-bottom:12px; border:1px solid rgba(37,82,231,.30); border-radius:12px; background:linear-gradient(180deg,#eef4ff 0%,#ffffff 100%); overflow:hidden; box-shadow:0 10px 24px rgba(25,45,110,.10); }
    .hive-summary-rollup summary { list-style:none; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 13px; color:#173fcf; background:linear-gradient(135deg,#dbeafe 0%,#eff6ff 58%,#ffffff 100%); border-bottom:1px solid rgba(37,82,231,.12); font:900 12px 'Inter',sans-serif; cursor:pointer; user-select:none; }
    .hive-summary-rollup summary::-webkit-details-marker { display:none; }
    .hive-summary-rollup summary::after { content:'expand_more'; display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:999px; background:#fff; border:1px solid rgba(37,82,231,.18); font-family:'Material Symbols Rounded'; font-size:20px; color:#173fcf; transition:transform .15s; box-shadow:0 4px 10px rgba(25,45,110,.08); }
    .hive-summary-rollup[open] summary::after { transform:rotate(180deg); }
    .hive-summary-rollup-hint { margin-left:auto; color:#2752e7; font-size:10px; font-weight:900; letter-spacing:.04em; text-transform:uppercase; white-space:nowrap; }
    .hive-summary { display:grid; gap:8px; padding:0 12px 12px; font-size:13px; color:var(--text-mid); line-height:1.45; }
    .hive-summary-static { padding:0; margin-bottom:12px; }
    .hive-summary-grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:8px; }
    .hive-summary-card { border:1px solid var(--border); border-radius:12px; background:linear-gradient(180deg,#fff 0%,#f3f6ff 100%); padding:10px; box-shadow:0 6px 16px rgba(25,45,110,.07); min-width:0; }
    .hive-summary-card.wide { grid-column:1 / -1; }
    .hive-summary-label { font-size:10px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; color:var(--text-muted); margin-bottom:3px; }
    .hive-summary-value { font-size:16px; font-weight:900; color:var(--text); line-height:1.2; overflow-wrap:anywhere; }
    .hive-summary-note { margin-top:3px; font-size:11px; color:var(--text-muted); overflow-wrap:anywhere; }
    .hive-leg-list { display:grid; gap:7px; margin-top:6px; }
    .hive-leg-row { display:grid; grid-template-columns:52px 1fr auto; gap:8px; align-items:center; padding:7px 8px; border:1px solid rgba(37,82,231,.12); border-radius:10px; background:rgba(255,255,255,.72); }
    .hive-leg-index { font-size:10px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; color:var(--text-muted); }
    .hive-leg-name { min-width:0; font-size:12px; font-weight:800; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .hive-leg-volume { font-size:12px; font-weight:900; color:#173fcf; white-space:nowrap; }
    .hive-leg-empty .hive-leg-name, .hive-leg-empty .hive-leg-volume { color:var(--text-muted); }
    .hive-copy-row { display:grid; grid-template-columns:1fr repeat(3, auto); gap:8px; align-items:center; }
    .hive-copy-link { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; color:var(--blue-mid); }
    .hive-copy-btn { border:1px solid var(--border); border-radius:8px; background:var(--blue-light); color:var(--blue-mid); padding:7px 9px; font:800 11px 'Inter',sans-serif; cursor:pointer; }
    .hive-copy-btn:hover { border-color:var(--blue); background:#fff; }
    .hive-copy-btn.copied { border-color:rgba(22,163,74,.34); background:#dcfce7; color:#15803d; }
    .hive-qr-panel { display:none; margin-top:10px; justify-items:center; gap:8px; padding:12px; border:1px solid rgba(37,82,231,.16); border-radius:12px; background:#fff; }
    .hive-qr-panel.visible { display:grid; }
    .hive-qr-panel img { width:168px; height:168px; border:1px solid var(--border); border-radius:10px; background:#fff; padding:7px; box-shadow:0 8px 18px rgba(25,45,110,.08); }
    .hive-qr-note { max-width:230px; text-align:center; font:800 10px/1.35 'Inter',sans-serif; color:var(--text-muted); overflow-wrap:anywhere; }
    .hive-qr-fallback { display:none; color:#b45309; }
    .hive-qr-panel.qr-error .hive-qr-fallback { display:block; }
    .hive-health-card { border-color:rgba(37,82,231,.28); background:linear-gradient(135deg,#edf3ff 0%,#ffffff 100%); }
    .hive-health-score { color:#173fcf; font-size:20px; }
    .hive-action-rollup { margin-top:12px; border:1px solid rgba(37,82,231,.30); border-radius:12px; background:linear-gradient(180deg,#eef4ff 0%,#ffffff 100%); overflow:hidden; box-shadow:0 10px 24px rgba(25,45,110,.10); }
    .hive-action-rollup summary { list-style:none; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 13px; color:#173fcf; background:linear-gradient(135deg,#dbeafe 0%,#eff6ff 58%,#ffffff 100%); border-bottom:1px solid rgba(37,82,231,.12); font:900 12px 'Inter',sans-serif; cursor:pointer; user-select:none; }
    .hive-action-rollup summary::-webkit-details-marker { display:none; }
    .hive-action-rollup summary::after { content:'expand_more'; display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:999px; background:#fff; border:1px solid rgba(37,82,231,.18); font-family:'Material Symbols Rounded'; font-size:20px; color:#173fcf; transition:transform .15s; box-shadow:0 4px 10px rgba(25,45,110,.08); }
    .hive-action-rollup[open] summary::after { transform:rotate(180deg); }
    .hive-action-rollup-hint { margin-left:auto; color:#2752e7; font-size:10px; font-weight:900; letter-spacing:.04em; text-transform:uppercase; white-space:nowrap; }
    .hive-actions { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:8px; padding:0 12px 12px; }
    .hive-danger-btn { background:#dc2626 !important; border-color:#b91c1c !important; color:#fff !important; box-shadow:0 8px 18px rgba(220,38,38,.22); }
    .hive-danger-btn:hover { background:#b91c1c !important; border-color:#991b1b !important; color:#fff !important; }
    .hive-file-input { display:none; }
    .hive-sync-log { margin-top:12px; border:1px solid var(--border); border-radius:12px; background:rgba(255,255,255,.76); overflow:hidden; }
    .hive-sync-log-head { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:9px 10px; border-bottom:1px solid var(--border); font-size:11px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; color:var(--text-muted); }
    .hive-sync-log-clear { border:1px solid var(--border); border-radius:8px; background:var(--surface-2); color:var(--text-mid); padding:5px 7px; font:800 10px 'Inter',sans-serif; cursor:pointer; }
    .hive-sync-log-list { display:grid; gap:0; max-height:170px; overflow:auto; }
    .hive-sync-log-item { padding:9px 10px; border-top:1px solid rgba(103,123,185,.12); font-size:11px; line-height:1.42; color:var(--text-mid); }
    .hive-sync-log-item:first-child { border-top:none; }
    .hive-sync-log-item strong { color:var(--text); font-size:12px; }
    .hive-sync-log-time { display:block; margin-bottom:2px; color:var(--text-muted); font-size:10px; font-weight:800; }
    .hive-sync-log-empty { padding:10px; font-size:11px; color:var(--text-muted); }
    .hive-lookup { display:grid; gap:8px; margin-bottom:14px; padding-bottom:14px; border-bottom:1px solid var(--border); }
    .hive-lookup-row { display:grid; grid-template-columns:1fr auto; gap:8px; }
    .hive-lookup input { width:100%; border:1px solid var(--border); border-radius:10px; padding:10px 11px; color:var(--text); background:#fff; font-family:'Inter',sans-serif; font-size:13px; outline:none; }
    .hive-lookup input:focus { border-color:var(--blue); box-shadow:0 0 0 3px rgba(37,82,231,.12); }
    .hive-lookup-loading { display:inline-flex; align-items:center; justify-content:center; gap:5px; }
    .hive-lookup-loading .material-symbols-rounded { font-size:16px; line-height:1; }
    .hive-search-row { display:grid; grid-template-columns:1fr auto; gap:8px; }
    .hive-search-results { display:none; border:1px solid rgba(37,82,231,.18); border-radius:12px; background:#f8fbff; overflow:hidden; }
    .hive-search-results.visible { display:grid; }
    .hive-search-results-head { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 10px; border-bottom:1px solid rgba(37,82,231,.10); color:var(--text-muted); font:900 10px 'Inter',sans-serif; letter-spacing:.08em; text-transform:uppercase; }
    .hive-search-clear-btn { border:1px solid rgba(37,82,231,.18); border-radius:8px; background:#fff; color:var(--text-mid); padding:5px 7px; font:900 10px 'Inter',sans-serif; cursor:pointer; }
    .hive-search-clear-btn:hover { border-color:#2752e7; color:#173fcf; background:#eff6ff; }
    .hive-search-result { display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; padding:9px 10px; border-top:1px solid rgba(37,82,231,.10); }
    .hive-search-results-head + .hive-search-result { border-top:none; }
    .hive-search-result-title { font:900 12px 'Inter',sans-serif; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .hive-search-result-meta { margin-top:2px; font:800 10px 'Inter',sans-serif; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; }
    .hive-search-result-btn { border:1px solid rgba(37,82,231,.22); border-radius:9px; background:#fff; color:#173fcf; padding:7px 9px; font:900 11px 'Inter',sans-serif; cursor:pointer; }
    .hive-search-result-btn:hover { background:#eff6ff; border-color:#2752e7; }
    .hive-search-more { margin:0 10px 10px; border:1px solid rgba(37,82,231,.18); border-radius:9px; background:#fff; color:#173fcf; padding:8px 9px; font:900 11px 'Inter',sans-serif; cursor:pointer; }
    .hive-search-more:hover { border-color:#2752e7; background:#eff6ff; }
    .hive-status { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-muted); border:1px solid rgba(103,123,185,.18); border-radius:11px; background:#f8fbff; padding:8px 9px; }
    .hive-status-dot { width:8px; height:8px; border-radius:50%; background:var(--text-dim); flex:0 0 auto; }
    .hive-status.cloud .hive-status-dot { background:var(--green); }
    .hive-status.local .hive-status-dot { background:#f59e0b; }
    .hive-status-label { color:var(--text); font-weight:900; white-space:nowrap; }
    .hive-status-text { min-width:0; overflow-wrap:anywhere; }
    .hive-form { display:grid; gap:10px; margin-top:14px; }
    .hive-form-actions { display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; }
    .hive-form-actions .crypto-action-btn { margin:0; }
    .hive-editor-panel { margin-top:14px; padding:14px; border:1px solid rgba(39,82,231,.24); border-radius:16px; background:#d4dced; box-shadow:inset 0 1px 0 rgba(255,255,255,.52); }
    .hive-editor-panel .hive-form { margin-top:0; }
    .hive-field label { display:block; margin-bottom:5px; font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--text-muted); }
    .hive-field input, .hive-field select { width:100%; border:1px solid var(--border); border-radius:10px; padding:10px 11px; color:var(--text); background:#fff; font-family:'Inter',sans-serif; font-size:13px; outline:none; }
    .hive-field input:focus, .hive-field select:focus { border-color:var(--blue); box-shadow:0 0 0 3px rgba(37,82,231,.12); }
    .hive-field input:disabled { background:var(--surface-3); color:var(--text-muted); cursor:not-allowed; }
    .hive-field input[readonly] { background:#fff; color:var(--text); cursor:text; }
    .hive-form-actions button:disabled { opacity:.62; cursor:not-allowed; }
    .hive-pin-control { display:grid; gap:8px; border:1px solid rgba(37,82,231,.16); border-radius:12px; background:rgba(248,251,255,.78); padding:10px; }
    .hive-pin-control-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
    .hive-pin-control-label { font-size:10px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; color:var(--text-muted); }
    .hive-pin-status { display:inline-flex; align-items:center; gap:5px; border-radius:999px; padding:4px 7px; background:#e5e7eb; color:#475569; font:900 10px 'Inter',sans-serif; white-space:nowrap; }
    .hive-pin-status.protected { background:#dcfce7; color:#15803d; }
    .hive-pin-control-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .hive-pin-control-actions button { border:1px solid var(--border); border-radius:9px; background:#fff; color:var(--text-mid); padding:8px 9px; font:900 11px 'Inter',sans-serif; cursor:pointer; }
    .hive-pin-control-actions button:hover { border-color:#2752e7; color:#173fcf; background:#eff6ff; }
    .hive-pin-control-actions button.danger:hover { border-color:#dc2626; color:#b91c1c; background:#fef2f2; }
    .hive-checkbox-row { display:none; align-items:center; gap:8px; border:1px solid rgba(37,82,231,.16); border-radius:10px; background:rgba(237,243,255,.72); padding:9px 10px; color:var(--text-mid); font-size:12px; font-weight:800; line-height:1.35; }
    .hive-checkbox-row.visible { display:flex; }
    .hive-checkbox-row input { width:16px; height:16px; accent-color:var(--blue); flex:0 0 auto; }
    .hive-mode-tabs { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .hive-mode-tab { border:1px solid var(--border); border-radius:10px; background:var(--surface-2); color:var(--text-mid); padding:9px 10px; font:800 12px 'Inter',sans-serif; cursor:pointer; }
    .hive-mode-tab.active { border-color:var(--blue); background:var(--blue-light); color:var(--blue-mid); }
    .hive-account-card-rollup { margin-top:12px; border:1px solid rgba(37,82,231,.30); border-radius:12px; background:linear-gradient(180deg,#eef4ff 0%,#ffffff 100%); overflow:hidden; box-shadow:0 10px 24px rgba(25,45,110,.10); }
    .hive-account-card-rollup summary { list-style:none; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 13px; color:#173fcf; background:linear-gradient(135deg,#dbeafe 0%,#eff6ff 58%,#ffffff 100%); border-bottom:1px solid rgba(37,82,231,.12); font:900 12px 'Inter',sans-serif; cursor:pointer; user-select:none; }
    .hive-account-card-rollup summary::-webkit-details-marker { display:none; }
    .hive-account-card-rollup summary::after { content:'expand_more'; display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:999px; background:#fff; border:1px solid rgba(37,82,231,.18); font-family:'Material Symbols Rounded'; font-size:20px; color:#173fcf; transition:transform .15s; box-shadow:0 4px 10px rgba(25,45,110,.08); }
    .hive-account-card-rollup[open] summary::after { transform:rotate(180deg); }
    .hive-account-card-hint { margin-left:auto; min-width:0; max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#2752e7; font-size:10px; font-weight:900; letter-spacing:.04em; text-transform:uppercase; }
    .hive-account-card-body { padding:12px; }
    .hive-message { min-height:18px; margin-top:10px; font-size:12px; color:var(--text-muted); }
    .hive-message.error { color:var(--red); }
    .hive-message.warning { color:#b45309; }
    .hive-message.ok { color:var(--green); }
    .hive-view-shell { min-width:0; border-radius:18px; background:linear-gradient(135deg,#13203d,#173fcf 58%,#06b6d4); color:#fff; overflow:hidden; }
    .hive-view-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border-bottom:1px solid rgba(255,255,255,.16); background:rgba(15,23,42,.26); }
    .hive-view-heading { display:flex; align-items:center; gap:10px; min-width:max-content; }
    .hive-view-title { font-size:12px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:rgba(255,255,255,.78); }
    .hive-view-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .hive-icon-btn { display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border:1px solid rgba(255,255,255,.24); border-radius:8px; background:rgba(255,255,255,.10); color:#fff; cursor:pointer; }
    .hive-icon-btn:hover { background:rgba(255,255,255,.18); }
    .hive-icon-btn.active { border-color:#bef264; background:rgba(190,242,100,.22); color:#ecfccb; }
    .hive-mini-action { width:auto; min-width:34px; padding:0 9px; font:900 11px 'Inter',sans-serif; }
    .hive-show-panel-btn { display:none; width:auto; min-width:86px; gap:6px; padding:0 10px; font:900 11px 'Inter',sans-serif; background:rgba(190,242,100,.22); border-color:rgba(190,242,100,.7); color:#ecfccb; }
    .hive-show-panel-btn.visible { display:inline-flex; }
    .hive-show-panel-btn .material-symbols-rounded { font-size:18px; }
    .hive-zoom-wrap { display:flex; align-items:center; gap:8px; min-width:230px; color:rgba(255,255,255,.86); font-size:12px; font-weight:800; }
    .hive-zoom-wrap input { width:140px; accent-color:#bef264; }
    .hive-canvas { position:relative; height:560px; padding:24px; color:#fff; overflow:auto; cursor:grab; }
    .hive-canvas.panning { cursor:grabbing; user-select:none; }
    .hive-modal-card.fullscreen .hive-canvas { height:calc(100vh - 190px); }
    .hive-tree { position:relative; min-width:700px; min-height:520px; transform-origin:top left; transition:transform .16s ease; }
    .hive-tooltip-layer { position:absolute; inset:0; z-index:30; pointer-events:none; }
    .hive-floating-tooltip { position:absolute; width:220px; transform:translate(-50%, 16px); border:1px solid #d8e0f2; border-radius:13px; background:#fff; color:#172033; padding:12px; text-align:left; box-shadow:0 18px 36px rgba(15,23,42,.18); font:12px/1.45 'Inter',sans-serif; pointer-events:none; }
    .hive-floating-tooltip strong { color:#111827; font-weight:900; }
    .hive-tooltip-rank { color:#173fcf; font-size:14px; font-weight:900; }
    .hive-map-overlay { position:absolute; z-index:20; pointer-events:auto; border:1px solid rgba(255,255,255,.22); border-radius:12px; background:rgba(15,23,42,.76); color:#fff; box-shadow:0 14px 32px rgba(0,0,0,.24); backdrop-filter:blur(12px); cursor:grab; touch-action:none; user-select:none; }
    .hive-map-overlay.dragging { cursor:grabbing; opacity:.94; }
    .hive-overlay-header { display:flex; align-items:center; gap:6px; padding:6px 8px; border-bottom:1px solid rgba(255,255,255,.14); cursor:grab; min-width:0; }
    .hive-overlay-header-icon { font-size:16px; color:rgba(255,255,255,.72); flex:0 0 auto; }
    .hive-overlay-header-label { font:900 10px 'Inter',sans-serif; color:rgba(255,255,255,.78); flex:1; letter-spacing:.06em; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .hive-overlay-toggle { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border:1px solid rgba(255,255,255,.22); border-radius:6px; background:rgba(255,255,255,.08); color:rgba(255,255,255,.8); cursor:pointer; flex:0 0 auto; pointer-events:auto; }
    .hive-overlay-toggle:hover { background:rgba(255,255,255,.20); color:#fff; }
    .hive-overlay-toggle .material-symbols-rounded { font-size:14px; line-height:1; }
    .hive-map-overlay.collapsed { width:auto !important; }
    .hive-map-overlay.collapsed .hive-overlay-header { border-bottom:none; padding:4px; gap:0; cursor:pointer; }
    .hive-map-overlay.collapsed .hive-overlay-header-label { display:none; }
    .hive-map-overlay.collapsed .hive-overlay-header-icon { font-size:20px; color:#fff; opacity:.9; }
    .hive-map-overlay.collapsed .hive-overlay-toggle { display:none; }
    .hive-map-overlay.collapsed .hive-overlay-body { display:none; }
    .hive-legend { width:190px; font:800 11px 'Inter',sans-serif; }
    .hive-legend .hive-overlay-body { display:grid; gap:6px; padding:8px 10px 10px; }
    .hive-legend-row { display:flex; align-items:center; gap:8px; color:rgba(255,255,255,.9); }
    .hive-legend-dot { width:13px; height:13px; border-radius:50%; border:2px solid rgba(255,255,255,.8); flex:0 0 auto; }
    .hive-legend-placeholder { display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:50%; border:2px solid #dbeafe; background:#fff; color:#173fcf; font:900 12px 'Inter',sans-serif; flex:0 0 auto; }
    .hive-legend-badge { border-radius:999px; background:rgba(255,255,255,.18); color:#fff; padding:2px 6px; font-size:10px; }
    .hive-minimap { width:190px; }
    .hive-minimap .hive-overlay-body { height:130px; padding:8px; }
    .hive-minimap svg { display:block; width:100%; height:100%; }
    .hive-minimap-node { opacity:.95; stroke:rgba(255,255,255,.72); stroke-width:2; }
    .hive-minimap-link { stroke:rgba(190,242,100,.55); stroke-width:1; fill:none; }
    .hive-minimap-viewport { fill:rgba(255,255,255,.13); stroke:#fff; stroke-width:1.5; }
    .hive-link-layer { position:absolute; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none; }
    .hive-link-layer path { fill:none; stroke:rgba(190,242,100,.82); stroke-width:2; vector-effect:non-scaling-stroke; }
    .hive-link-layer path.in-selected-branch { stroke:#ef4444; stroke-width:5; filter:drop-shadow(0 0 8px rgba(239,68,68,.65)); }
    .hive-node-wrapper { position:absolute; display:flex; flex-direction:column; align-items:center; width:120px; transform:translate(-50%, -50%); }
    .hive-node-dot-row { display:flex; align-items:center; justify-content:center; gap:7px; }
    .hive-rank-badge { max-width:92px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; border:1px solid rgba(255,255,255,.45); border-radius:999px; background:rgba(15,23,42,.58); color:#fff; padding:5px 8px; font:900 10px 'Inter',sans-serif; letter-spacing:.04em; box-shadow:0 10px 22px rgba(0,0,0,.18); }
    .hive-collapse-btn { position:absolute; left:50%; top:40px; transform:translateX(-50%); z-index:4; width:24px; height:24px; border:1px solid rgba(255,255,255,.65); border-radius:999px; background:rgba(15,23,42,.72); color:#fff; font:900 14px 'Inter',sans-serif; line-height:1; cursor:pointer; box-shadow:0 8px 18px rgba(0,0,0,.2); }
    .hive-collapse-btn:hover { background:rgba(37,82,231,.9); }
    .hive-dot-main, .hive-dot-sub { position:relative; display:flex; align-items:center; justify-content:center; width:58px; height:58px; border-radius:50%; border:4px solid rgba(255,255,255,.86); box-shadow:0 14px 28px rgba(0,0,0,.24); cursor:pointer; }
    .hive-dot-main.selected, .hive-dot-sub.selected { outline:4px solid rgba(250,204,21,.95); outline-offset:4px; }
    .hive-dot-main.in-selected-branch, .hive-dot-sub.in-selected-branch { box-shadow:0 14px 28px rgba(0,0,0,.24), 0 0 0 7px rgba(239,68,68,.20), 0 0 22px rgba(239,68,68,.70); }
    .hive-dot-main.search-hit, .hive-dot-sub.search-hit { z-index:6; animation:hiveSearchPulse .88s ease-in-out infinite; }
    @keyframes hiveSearchPulse {
      0%, 100% { transform:scale(1.16); box-shadow:0 18px 34px rgba(0,0,0,.30), 0 0 0 7px rgba(250,204,21,.65), 0 0 28px rgba(250,204,21,.92); }
      50% { transform:scale(1.34); box-shadow:0 22px 42px rgba(0,0,0,.34), 0 0 0 22px rgba(250,204,21,.18), 0 0 48px rgba(250,204,21,1); }
    }
    .hive-dot-main { background:#dc2626; }
    .hive-dot-sub { background:#16a34a; }
    .hive-dot-main.unfunded { background:#2563eb; }
    .hive-dot-sub.unfunded { background:#facc15; }
    .hive-dot-sub.unsupported { background:#9ca3af; }
    .hive-dot-sub.placeholder { background:#fff; border-color:#dbeafe; box-shadow:0 14px 28px rgba(0,0,0,.22), 0 0 0 5px rgba(37,99,235,.16); }
    .hive-dot-sub.unfunded::before { color:#111827; }
    .hive-dot-sub.unsupported::before { color:#fff; }
    .hive-dot-main.selected, .hive-dot-sub.selected { outline:4px solid rgba(250,204,21,.95); outline-offset:4px; }
    .hive-dot-main::before, .hive-dot-sub::before { color:#fff; font:900 18px 'Inter',sans-serif; }
    .hive-dot-main::before { content:'M'; }
    .hive-dot-sub::before { content:'S'; }
    .hive-dot-sub.placeholder::before { content:'?'; color:#173fcf; font-size:25px; }
    .hive-mobile-back { display:none; align-items:center; gap:8px; padding:10px 12px 8px; border-bottom:1px solid var(--border); margin-bottom:4px; background:#fff; }
    .hive-mobile-back-btn { display:inline-flex; align-items:center; gap:6px; border:none; background:none; color:var(--blue-mid); font:800 13px 'Inter',sans-serif; cursor:pointer; padding:4px 0; }
    .hive-mobile-back-btn .material-symbols-rounded { font-size:20px; }
    .hive-mobile-back-title { font:800 13px 'Inter',sans-serif; color:var(--text); margin-left:auto; }
    @media (max-width: 1180px) {
      .hive-modal-card { width:calc(100vw - 18px); }
      .hive-modal-card.fullscreen .tool-body { min-height:calc(100vh - 82px); }
      .hive-layout { grid-template-columns:1fr; position:relative; overflow:hidden; }
      .hive-panel { position:absolute; inset:0; transform:translateX(-110%); transition:transform .3s cubic-bezier(.4,0,.2,1); overflow-y:auto; z-index:20; border-radius:0; padding:10px; }
      .hive-layout.panel-collapsed .hive-panel { display:block; }
      .hive-layout.mobile-panel-open .hive-panel { transform:translateX(0); box-shadow:6px 0 32px rgba(0,0,0,.18); }
      .hive-layout.mobile-panel-open .hive-map-overlay { display:none; }
      .hive-mobile-back { position:sticky; top:0; z-index:30; display:flex; box-shadow:0 8px 18px rgba(15,23,42,.08); }
      .hive-view-toolbar { align-items:flex-start; flex-direction:column; gap:10px; padding:10px; }
      .hive-view-actions { width:100%; display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:7px; }
      .hive-icon-btn, .hive-mini-action { width:100%; min-width:0; height:40px; }
      .hive-show-panel-btn { grid-column:span 2; min-width:0; }
      .hive-zoom-wrap { grid-column:1 / -1; width:100%; min-width:0; justify-content:space-between; }
      .hive-zoom-wrap input { flex:1; width:auto; }
      .hive-modal-card.fullscreen .hive-canvas { height:calc(100vh - 238px); padding:16px; }
      .hive-search-result { grid-template-columns:1fr; }
      .hive-search-result-btn { width:100%; min-height:38px; }
      .hive-pin-control-actions, .hive-form-actions { grid-template-columns:1fr; }
    }
    @media (max-width: 560px) {
      .hive-header-actions { gap:6px; }
      .hive-version-badge { display:none; }
      .hive-view-actions { grid-template-columns:repeat(4, minmax(0, 1fr)); }
      .hive-actions { grid-template-columns:1fr; }
      .hive-summary-grid { grid-template-columns:1fr; }
      .hive-pin-card { padding:14px; }
      .hive-pin-key { height:50px; }
    }
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
        <div class="hive-header-actions">
          <span class="hive-version-badge">Hive v${HIVE_APP_VERSION}</span>
          <button class="tool-close" type="button" onclick="closeToolModal('hiveModal')" aria-label="Close Hive"><span class="material-symbols-rounded">close</span></button>
        </div>
      </div>
      <div class="tool-body">
        <div class="hive-update-banner" id="hiveUpdateBanner">
          <div class="hive-update-text">
            <strong>Updated Hive version available</strong>
            <span id="hiveUpdateText">Refresh to load the newest Hive map.</span>
          </div>
          <button class="hive-update-btn" type="button" id="hiveUpdateReloadBtn">Reload</button>
        </div>
        <div class="hive-sync-toast" id="hiveSyncToast" role="status" aria-live="polite">
          <span class="material-symbols-rounded">check</span>
          <span id="hiveSyncToastText">Hive action completed.</span>
        </div>
        <div class="hive-pin-overlay" id="hivePinOverlay" role="dialog" aria-modal="true" aria-labelledby="hivePinTitle">
          <div class="hive-pin-card">
            <div class="hive-pin-head">
              <span class="hive-pin-icon"><span class="material-symbols-rounded">lock</span></span>
              <div>
                <h3 class="hive-pin-title" id="hivePinTitle">Enter PIN</h3>
                <p class="hive-pin-subtitle" id="hivePinSubtitle">This Referral ID is protected.</p>
              </div>
            </div>
            <div class="hive-pin-slots" id="hivePinSlots" aria-label="4 digit PIN">
              <span class="hive-pin-slot"></span>
              <span class="hive-pin-slot"></span>
              <span class="hive-pin-slot"></span>
              <span class="hive-pin-slot"></span>
            </div>
            <div class="hive-pin-warning" id="hivePinWarning"></div>
            <div class="hive-pin-error" id="hivePinError"></div>
            <div class="hive-pin-keypad" id="hivePinKeypad">
              <button class="hive-pin-key" type="button" data-pin-key="1">1</button>
              <button class="hive-pin-key" type="button" data-pin-key="2">2</button>
              <button class="hive-pin-key" type="button" data-pin-key="3">3</button>
              <button class="hive-pin-key" type="button" data-pin-key="4">4</button>
              <button class="hive-pin-key" type="button" data-pin-key="5">5</button>
              <button class="hive-pin-key" type="button" data-pin-key="6">6</button>
              <button class="hive-pin-key" type="button" data-pin-key="7">7</button>
              <button class="hive-pin-key" type="button" data-pin-key="8">8</button>
              <button class="hive-pin-key" type="button" data-pin-key="9">9</button>
              <button class="hive-pin-key action" type="button" data-pin-action="clear">Clear</button>
              <button class="hive-pin-key" type="button" data-pin-key="0">0</button>
              <button class="hive-pin-key action" type="button" data-pin-action="backspace" aria-label="Backspace"><span class="material-symbols-rounded">backspace</span></button>
            </div>
            <div class="hive-pin-actions">
              <button class="hive-pin-cancel" type="button" id="hivePinCancelBtn">Cancel</button>
              <button class="hive-pin-unlock" type="button" id="hivePinUnlockBtn" disabled>Unlock</button>
            </div>
          </div>
        </div>
        <div class="hive-layout" id="hiveLayout">
          <section class="hive-panel">
            <div class="hive-mobile-back">
              <button class="hive-mobile-back-btn" type="button" id="hiveMobileBackBtn" aria-label="Back to canvas">
                <span class="material-symbols-rounded">arrow_back</span>Back to canvas
              </button>
              <span class="hive-mobile-back-title" id="hiveMobileBackTitle"></span>
            </div>
            <div class="hive-panel-title">
              <span>Account editor</span>
              <div class="hive-panel-title-actions">
                <button class="hive-panel-toggle" type="button" id="hiveCollapsePanelBtn" title="Collapse account panel" aria-label="Collapse account panel"><span class="material-symbols-rounded" style="font-size:18px;">left_panel_close</span></button>
              </div>
            </div>
            <div class="hive-lookup">
              <div class="hive-field"><label for="hiveLookupInviteId">Find by Referral ID</label></div>
              <div class="hive-lookup-row">
                <input id="hiveLookupInviteId" autocomplete="off" placeholder="Enter Referral ID">
                <button class="planner-small-btn secondary" type="button" id="hiveLookupBtn">Load</button>
              </div>
              <div class="hive-field"><label for="hiveNameSearch">Search by name or Referral ID</label></div>
              <div class="hive-search-row">
                <input id="hiveNameSearch" autocomplete="off" placeholder="Enter name or Referral ID">
                <button class="planner-small-btn secondary" type="button" id="hiveNameSearchBtn">Find</button>
              </div>
              <div class="hive-search-results" id="hiveSearchResults"></div>
              <div class="hive-status" id="hiveSyncStatus"><span class="hive-status-dot"></span><span class="hive-status-label">Cloud sync</span><span class="hive-status-text">Local database active. Cloud sync not configured.</span></div>
            </div>
            <div class="hive-summary hive-summary-static" id="hiveSummaryStatic"></div>
            <details class="hive-summary-rollup">
              <summary>
                Hive summary
                <span class="hive-summary-rollup-hint">Health, size, legs</span>
              </summary>
              <div class="hive-summary" id="hiveSummary"></div>
            </details>
            <details class="hive-account-card-rollup" id="hiveAccountCardRollup" open>
              <summary>
                Account card
                <span class="hive-account-card-hint" id="hiveAccountCardHint">Selected account</span>
              </summary>
              <div class="hive-account-card-body">
                <div class="hive-mode-tabs">
                  <button class="hive-mode-tab active" type="button" id="hiveEditTab">Edit selected</button>
                  <button class="hive-mode-tab" type="button" id="hiveAddTab">Add child</button>
                </div>
                <div class="hive-editor-panel">
                  <div class="hive-form">
                    <div class="hive-field"><label for="hiveInviteId">Referral ID</label><input id="hiveInviteId" autocomplete="off"></div>
                    <div class="hive-field"><label for="hiveName">Name</label><input id="hiveName" autocomplete="off"></div>
                    <div class="hive-field"><label for="hiveEmail">Email</label><input id="hiveEmail" type="email" autocomplete="email"></div>
                    <div class="hive-field"><label for="hiveCountry">Country</label><select id="hiveCountry"></select></div>
                    <div class="hive-field"><label for="hiveAmount">Personal investment</label><input id="hiveAmount" type="number" min="0" step="any"></div>
                    <div class="hive-field"><label for="hiveTotalTurnover">Total turnover</label><input id="hiveTotalTurnover" type="number" min="0" step="any"></div>
                    <div class="hive-field"><label for="hiveRank">Rank</label><select id="hiveRank"></select></div>
                    <div class="hive-field"><label for="hiveType">Type</label><input id="hiveType" disabled></div>
                    <div class="hive-field"><label for="hiveParent">Invited By ID</label><input id="hiveParent" autocomplete="off"></div>
                    <div class="hive-pin-control" id="hivePinControl">
                      <div class="hive-pin-control-head">
                        <span class="hive-pin-control-label">Account PIN</span>
                        <span class="hive-pin-status" id="hivePinStatus">No PIN</span>
                      </div>
                      <div class="hive-pin-control-actions">
                        <button type="button" id="hiveChangePinBtn">Change PIN</button>
                        <button type="button" class="danger" id="hiveRemovePinBtn">Remove PIN</button>
                      </div>
                    </div>
                    <label class="hive-checkbox-row" id="hiveAutoSubWrap" for="hiveAutoSubAccounts">
                      <input id="hiveAutoSubAccounts" type="checkbox">
                      Auto-create 3 linked subaccounts
                    </label>
                    <div class="hive-form-actions">
                      <button class="crypto-action-btn" type="button" id="hiveSaveBtn">Save edit</button>
                      <button class="planner-small-btn secondary" type="button" id="hiveCancelAddBtn">Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            </details>
            <div class="hive-message" id="hiveMessage"></div>
            <details class="hive-action-rollup">
              <summary>
                Hive actions
                <span class="hive-action-rollup-hint">Export, import, sync</span>
              </summary>
              <div class="hive-actions">
                <button class="planner-small-btn secondary" type="button" id="hiveExportPdfBtn">Export PDF</button>
                <button class="planner-small-btn secondary" type="button" id="hiveExportJsonBtn">Export JSON</button>
                <button class="planner-small-btn secondary" type="button" id="hiveImportJsonBtn">Import JSON</button>
                <button class="planner-small-btn secondary" type="button" id="hiveRefreshBtn">Sync now</button>
                <button class="planner-small-btn secondary" type="button" id="hiveStarterSetupBtn">Starter setup</button>
                <button class="planner-small-btn secondary" type="button" id="hiveResetBtn">Reset sample</button>
                <button class="planner-small-btn secondary" type="button" id="hiveClearSampleBtn">Clear sample</button>
                <button class="planner-small-btn secondary hive-danger-btn" type="button" id="hiveDeleteUnfundedSubsBtn">Delete selected unfunded sub</button>
                <input class="hive-file-input" id="hiveImportJsonInput" type="file" accept="application/json,.json">
              </div>
            </details>
            <div class="hive-sync-log">
              <div class="hive-sync-log-head">
                <span>Sync log</span>
                <button class="hive-sync-log-clear" type="button" id="hiveClearSyncLogBtn">Clear</button>
              </div>
              <div class="hive-sync-log-list" id="hiveSyncLogList"></div>
            </div>
          </section>
          <section class="hive-view-shell">
            <div class="hive-view-toolbar">
              <div class="hive-view-heading">
                <button class="hive-icon-btn hive-show-panel-btn" type="button" id="hiveShowPanelBtn" title="Show account panel" aria-label="Show account panel"><span class="material-symbols-rounded">left_panel_open</span>Panel</button>
                <div class="hive-view-title">Hive map</div>
              </div>
              <div class="hive-view-actions">
                <label class="hive-zoom-wrap" for="hiveZoomRange">
                  Zoom <input id="hiveZoomRange" type="range" min="10" max="120" step="5" value="85">
                  <span id="hiveZoomValue">85%</span>
                </label>
                <button class="hive-icon-btn" type="button" id="hiveZoomOutBtn" title="Zoom out" aria-label="Zoom out"><span class="material-symbols-rounded">remove</span></button>
                <button class="hive-icon-btn" type="button" id="hiveZoomInBtn" title="Zoom in" aria-label="Zoom in"><span class="material-symbols-rounded">add</span></button>
                <button class="hive-icon-btn" type="button" id="hiveFocusBtn" title="Focus selected tree" aria-label="Focus selected tree"><span class="material-symbols-rounded">center_focus_strong</span></button>
                <button class="hive-icon-btn hive-mini-action" type="button" id="hiveCollapseAllBtn" title="Collapse all" aria-label="Collapse all">All -</button>
                <button class="hive-icon-btn hive-mini-action" type="button" id="hiveExpandAllBtn" title="Expand all" aria-label="Expand all">All +</button>
                <button class="hive-icon-btn hive-mini-action" type="button" id="hiveCollapseBelowBtn" title="Collapse below selected" aria-label="Collapse below selected">Below</button>
                <button class="hive-icon-btn" type="button" id="hiveBranchHighlightBtn" title="Highlight selected branch" aria-label="Highlight selected branch"><span class="material-symbols-rounded">conversion_path</span></button>
                <button class="hive-icon-btn" type="button" id="hiveFullscreenBtn" title="Fullscreen" aria-label="Toggle fullscreen"><span class="material-symbols-rounded">fullscreen</span></button>
              </div>
            </div>
            <div class="hive-canvas">
              <div id="hiveTooltipLayer" class="hive-tooltip-layer"></div>
              <div id="hiveMiniMap" class="hive-map-overlay hive-minimap" data-overlay-id="minimap" data-default-x="12" data-default-y="12">
                <div class="hive-overlay-header">
                  <span class="hive-overlay-header-icon material-symbols-rounded">map</span>
                  <span class="hive-overlay-header-label">Minimap</span>
                  <button class="hive-overlay-toggle" type="button" id="hiveMinimapToggleBtn" title="Collapse minimap" aria-label="Toggle minimap"><span class="material-symbols-rounded">unfold_less</span></button>
                </div>
                <div class="hive-overlay-body" id="hiveMiniMapBody"></div>
              </div>
              <div id="hiveLegendMap" class="hive-map-overlay hive-legend" data-overlay-id="legend" data-default-x="12" data-default-y="170">
                <div class="hive-overlay-header">
                  <span class="hive-overlay-header-icon material-symbols-rounded">info</span>
                  <span class="hive-overlay-header-label">Legend</span>
                  <button class="hive-overlay-toggle" type="button" id="hiveLegendToggleBtn" title="Collapse legend" aria-label="Toggle legend"><span class="material-symbols-rounded">unfold_less</span></button>
                </div>
                <div class="hive-overlay-body">
                  <div class="hive-legend-row"><span class="hive-legend-dot" style="background:#dc2626;"></span>Funded main</div>
                  <div class="hive-legend-row"><span class="hive-legend-dot" style="background:#16a34a;"></span>Funded sub</div>
                  <div class="hive-legend-row"><span class="hive-legend-dot" style="background:#2563eb;"></span>Unfunded main</div>
                  <div class="hive-legend-row"><span class="hive-legend-dot" style="background:#facc15;"></span>Unfunded sub</div>
                  <div class="hive-legend-row"><span class="hive-legend-placeholder">?</span>Placeholder sub</div>
                  <div class="hive-legend-row"><span class="hive-legend-dot" style="background:#9ca3af;"></span>Unsupported extra sub</div>
                  <div class="hive-legend-row"><span class="hive-legend-badge">RANK</span>Rank badge</div>
                </div>
              </div>
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
    if (event.target === modal) event.stopPropagation();
  });

  document.getElementById('hiveEditTab').addEventListener('click', () => handleHiveEditTabClick().catch((error) => {
    console.warn('Hive edit unlock failed.', error);
    setMessage('Could not unlock this account for editing.', 'error');
  }));
  document.getElementById('hiveAddTab').addEventListener('click', () => handleHiveAddTabClick().catch((error) => {
    console.warn('Hive add unlock failed.', error);
    setMessage('Could not unlock this account for adding.', 'error');
  }));
  document.getElementById('hiveSaveBtn').addEventListener('click', submitHiveForm);
  document.getElementById('hiveCancelAddBtn').addEventListener('click', cancelHiveFormMode);
  document.getElementById('hiveCollapsePanelBtn').addEventListener('click', () => {
    if (isMobileHive()) closeMobileHivePanel();
    else setHivePanelCollapsed(true);
  });
  document.getElementById('hiveShowPanelBtn').addEventListener('click', () => {
    if (isMobileHive()) openMobileHivePanel(getSelectedHiveNode());
    else setHivePanelCollapsed(false);
  });
  document.getElementById('hiveUpdateReloadBtn').addEventListener('click', reloadHiveApp);
  document.getElementById('hiveZoomRange').addEventListener('input', (event) => setHiveZoom(Number(event.target.value) / 100));
  document.getElementById('hiveZoomOutBtn').addEventListener('click', () => setHiveZoom(hiveZoom - 0.1));
  document.getElementById('hiveZoomInBtn').addEventListener('click', () => setHiveZoom(hiveZoom + 0.1));
  document.getElementById('hiveFocusBtn').addEventListener('click', toggleHiveFocusMode);
  document.getElementById('hiveCollapseAllBtn').addEventListener('click', collapseAllBranches);
  document.getElementById('hiveExpandAllBtn').addEventListener('click', expandAllBranches);
  document.getElementById('hiveCollapseBelowBtn').addEventListener('click', collapseBelowSelected);
  document.getElementById('hiveBranchHighlightBtn').addEventListener('click', toggleHiveBranchHighlightMode);
  document.getElementById('hiveFullscreenBtn').addEventListener('click', toggleHiveFullscreen);
  document.getElementById('hiveLookupBtn').addEventListener('click', loadHiveFromLookup);
  document.getElementById('hiveLookupInviteId').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') loadHiveFromLookup();
  });
  document.getElementById('hiveNameSearchBtn').addEventListener('click', searchHiveByName);
  document.getElementById('hiveNameSearch').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') searchHiveByName();
  });
  document.getElementById('hiveSearchResults').addEventListener('click', (event) => {
    if (event.target.closest('[data-clear-search-results]')) {
      clearHiveSearchResults();
      return;
    }
    if (event.target.closest('[data-show-all-search-results]')) {
      const query = document.getElementById('hiveNameSearch')?.value || '';
      const matches = getHiveSearchMatches(query);
      renderHiveSearchResults(matches, { showAll: true });
      return;
    }
    const button = event.target.closest('[data-search-invite-id]');
    if (button) selectHiveSearchResult(button.dataset.searchInviteId);
  });
  document.getElementById('hiveChangePinBtn').addEventListener('click', () => changeSelectedHivePin().catch((error) => {
    console.warn('Hive PIN change failed.', error);
    setMessage('Could not change the account PIN.', 'error');
  }));
  document.getElementById('hiveRemovePinBtn').addEventListener('click', () => removeSelectedHivePin().catch((error) => {
    console.warn('Hive PIN removal failed.', error);
    setMessage('Could not remove the account PIN.', 'error');
  }));
  const hiveCanvas = document.querySelector('#hiveModal .hive-canvas');
  hiveCanvas?.addEventListener('scroll', () => {
    syncFloatingHiveOverlays();
    renderMiniMap(lastHiveLayout);
  });
  initHiveCanvasPan(hiveCanvas);
  initFloatingHiveOverlays();
  initHiveOverlayCollapseToggles();
  document.getElementById('hiveExportPdfBtn').addEventListener('click', () => exportSelectedHivePdf().catch((error) => {
    console.warn('Hive PDF export failed.', error);
    setMessage('PDF export failed. Try again after refreshing.', 'error');
  }));
  document.getElementById('hiveExportJsonBtn').addEventListener('click', exportHiveJson);
  document.getElementById('hiveImportJsonBtn').addEventListener('click', () => document.getElementById('hiveImportJsonInput')?.click());
  document.getElementById('hiveImportJsonInput').addEventListener('change', importHiveJson);
  document.getElementById('hiveStarterSetupBtn').addEventListener('click', () => runHiveStarterSetup().catch((error) => {
    console.warn('Hive starter setup failed.', error);
    setMessage('Starter setup could not be completed.', 'error');
  }));
  document.getElementById('hiveRefreshBtn').addEventListener('click', () => syncLoadedHiveWithCloud().catch((error) => {
    console.warn('Manual Hive sync failed.', error);
    const message = getHiveErrorMessage(error);
    setMessage(message, 'error');
    showHiveStatusToast(message, 'error');
    updateSyncStatus('Manual cloud sync failed.', 'local');
  }));
  document.getElementById('hiveResetBtn').addEventListener('click', () => {
    hiveData.splice(0, hiveData.length, createDefaultHive()[0]);
    selectedInviteId = hiveData[0]?.inviteId || '';
    rememberInviteId(selectedInviteId);
    isolatedRootInviteId = '';
    collapsedInviteIds.clear();
    setMessage('Sample hive restored.', 'ok');
    persistHive();
    renderHive();
  });
  document.getElementById('hiveClearSampleBtn').addEventListener('click', clearSampleHive);
  document.getElementById('hiveDeleteUnfundedSubsBtn').addEventListener('click', deleteUnfundedSubAccounts);
  document.getElementById('hiveClearSyncLogBtn').addEventListener('click', clearHiveSyncLog);
  document.getElementById('hiveMobileBackBtn').addEventListener('click', closeMobileHivePanel);
  renderHiveSyncLog();
}

function getHiveOverlayPositions() {
  try {
    return JSON.parse(localStorage.getItem(HIVE_OVERLAY_POSITIONS_KEY) || '{}');
  } catch (error) {
    return {};
  }
}

function saveHiveOverlayPosition(id, position) {
  if (!id || !position) return;
  const positions = getHiveOverlayPositions();
  positions[id] = position;
  localStorage.setItem(HIVE_OVERLAY_POSITIONS_KEY, JSON.stringify(positions));
}

function getHiveOverlayViewportPosition(overlay) {
  const positions = getHiveOverlayPositions();
  const id = overlay.dataset.overlayId;
  const saved = positions[id];
  return {
    x: Number.isFinite(saved?.x) ? saved.x : Number(overlay.dataset.defaultX || 12),
    y: Number.isFinite(saved?.y) ? saved.y : Number(overlay.dataset.defaultY || 12)
  };
}

function clampHiveOverlayPosition(canvas, overlay, position) {
  const maxX = Math.max(0, canvas.clientWidth - overlay.offsetWidth - 12);
  const maxY = Math.max(0, canvas.clientHeight - overlay.offsetHeight - 12);
  return {
    x: Math.min(Math.max(8, position.x), maxX),
    y: Math.min(Math.max(8, position.y), maxY)
  };
}

function applyHiveOverlayPosition(overlay, position) {
  const canvas = overlay.closest('.hive-canvas');
  if (!canvas) return;
  const clamped = clampHiveOverlayPosition(canvas, overlay, position || getHiveOverlayViewportPosition(overlay));
  overlay.style.left = `${canvas.scrollLeft + clamped.x}px`;
  overlay.style.top = `${canvas.scrollTop + clamped.y}px`;
}

function syncFloatingHiveOverlays() {
  document.querySelectorAll('#hiveModal .hive-map-overlay').forEach((overlay) => {
    applyHiveOverlayPosition(overlay);
  });
}

function initHiveCanvasPan(canvas) {
  if (!canvas) return;

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('.hive-map-overlay, .hive-node-wrapper, button, input, select, label')) return;

    event.preventDefault();
    hideHiveTooltip();
    canvas.classList.add('panning');
    canvas.setPointerCapture(event.pointerId);

    const start = {
      x: event.clientX,
      y: event.clientY,
      panX: hivePanX,
      panY: hivePanY
    };

    function moveCanvas(moveEvent) {
      hivePanX = start.panX + (moveEvent.clientX - start.x);
      hivePanY = start.panY + (moveEvent.clientY - start.y);
      applyHiveTransform();
    }

    function stopPan() {
      canvas.classList.remove('panning');
      canvas.releasePointerCapture(event.pointerId);
      canvas.removeEventListener('pointermove', moveCanvas);
      canvas.removeEventListener('pointerup', stopPan);
      canvas.removeEventListener('pointercancel', stopPan);
    }

    canvas.addEventListener('pointermove', moveCanvas);
    canvas.addEventListener('pointerup', stopPan);
    canvas.addEventListener('pointercancel', stopPan);
  });
}

function isMobileHive() {
  return window.innerWidth <= HIVE_MOBILE_PANEL_MAX_WIDTH;
}

function openMobileHivePanel(node) {
  const layout = document.getElementById('hiveLayout');
  if (!layout) return;
  const selectedNode = node || getSelectedHiveNode();
  const showBtn = document.getElementById('hiveShowPanelBtn');
  layout.classList.remove('panel-collapsed');
  layout.classList.add('mobile-panel-open');
  showBtn?.classList.remove('visible');
  hivePanelCollapsed = false;
  const titleEl = document.getElementById('hiveMobileBackTitle');
  if (titleEl && selectedNode) titleEl.textContent = selectedNode.name || selectedNode.inviteId || '';
}

function closeMobileHivePanel() {
  document.getElementById('hiveLayout')?.classList.remove('mobile-panel-open');
  setHivePanelCollapsed(true);
}

function setDefaultMobileAccountCardState() {
  const accountCard = document.getElementById('hiveAccountCardRollup');
  if (!accountCard) return;
  if (isMobileHive()) accountCard.removeAttribute('open');
  else accountCard.setAttribute('open', '');
}

function initFloatingHiveOverlays() {
  const overlays = document.querySelectorAll('#hiveModal .hive-map-overlay');
  overlays.forEach((overlay) => {
    applyHiveOverlayPosition(overlay);
    overlay.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      if (event.target.closest('button')) return;
      const canvas = overlay.closest('.hive-canvas');
      if (!canvas) return;

      event.preventDefault();
      overlay.classList.add('dragging');
      overlay.setPointerCapture(event.pointerId);

      const start = getHiveOverlayViewportPosition(overlay);
      const startPointer = { x: event.clientX, y: event.clientY };

      function moveOverlay(moveEvent) {
        const nextPosition = clampHiveOverlayPosition(canvas, overlay, {
          x: start.x + (moveEvent.clientX - startPointer.x),
          y: start.y + (moveEvent.clientY - startPointer.y)
        });
        applyHiveOverlayPosition(overlay, nextPosition);
        overlay.dataset.dragX = String(nextPosition.x);
        overlay.dataset.dragY = String(nextPosition.y);
      }

      function stopDrag() {
        overlay.classList.remove('dragging');
        overlay.releasePointerCapture(event.pointerId);
        const finalPosition = {
          x: Number(overlay.dataset.dragX || start.x),
          y: Number(overlay.dataset.dragY || start.y)
        };
        saveHiveOverlayPosition(overlay.dataset.overlayId, finalPosition);
        delete overlay.dataset.dragX;
        delete overlay.dataset.dragY;
        overlay.removeEventListener('pointermove', moveOverlay);
        overlay.removeEventListener('pointerup', stopDrag);
        overlay.removeEventListener('pointercancel', stopDrag);
      }

      overlay.addEventListener('pointermove', moveOverlay);
      overlay.addEventListener('pointerup', stopDrag);
      overlay.addEventListener('pointercancel', stopDrag);
    });
  });

  window.addEventListener('resize', syncFloatingHiveOverlays);
}

function getHiveOverlayCollapsed() {
  try { return JSON.parse(localStorage.getItem(HIVE_OVERLAY_COLLAPSED_KEY) || '{}'); } catch { return {}; }
}

function saveHiveOverlayCollapsed(id, collapsed) {
  const state = getHiveOverlayCollapsed();
  state[id] = collapsed;
  try { localStorage.setItem(HIVE_OVERLAY_COLLAPSED_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function applyHiveOverlayCollapsed(overlay, collapsed) {
  const btn = overlay.querySelector('.hive-overlay-toggle .material-symbols-rounded');
  overlay.classList.toggle('collapsed', collapsed);
  if (btn) btn.textContent = collapsed ? 'unfold_more' : 'unfold_less';
  overlay.title = collapsed ? 'Click icon to expand' : '';
  applyHiveOverlayPosition(overlay);
}

function initHiveOverlayCollapseToggles() {
  const collapsed = getHiveOverlayCollapsed();
  const pairs = [
    { overlayId: 'hiveMiniMap', btnId: 'hiveMinimapToggleBtn', key: 'minimap' },
    { overlayId: 'hiveLegendMap', btnId: 'hiveLegendToggleBtn', key: 'legend' }
  ];
  pairs.forEach(({ overlayId, btnId, key }) => {
    const overlay = document.getElementById(overlayId);
    const btn = document.getElementById(btnId);
    if (!overlay || !btn) return;
    applyHiveOverlayCollapsed(overlay, !!collapsed[key]);
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      applyHiveOverlayCollapsed(overlay, true);
      saveHiveOverlayCollapsed(key, true);
    });
    overlay.querySelector('.hive-overlay-header').addEventListener('click', (event) => {
      if (!overlay.classList.contains('collapsed')) return;
      event.stopPropagation();
      applyHiveOverlayCollapsed(overlay, false);
      saveHiveOverlayCollapsed(key, false);
    });
  });
}

function createDefaultHive() {
  return JSON.parse(JSON.stringify([
    {
      inviteId: 'AUR-ROOT-001',
      name: 'Main Account',
      email: '',
      amount: 25000,
      rank: 'VANGUARD PRO',
      type: 'main',
      parentInviteId: null,
      children: [
        { inviteId: 'SUB-001', name: 'Sub Account 1', email: '', amount: 5000, rank: 'VANGUARD', type: 'sub', parentInviteId: 'AUR-ROOT-001', children: [{ inviteId: 'MAIN-001-A', name: 'Nested Main 1', email: '', amount: 3000, rank: 'VOYAGER', type: 'main', parentInviteId: 'SUB-001', children: [] }] },
        { inviteId: 'SUB-002', name: 'Sub Account 2', email: '', amount: 4500, rank: 'VANGUARD', type: 'sub', parentInviteId: 'AUR-ROOT-001', children: [{ inviteId: 'MAIN-002-A', name: 'Nested Main 2', email: '', amount: 2000, rank: 'NOVA', type: 'main', parentInviteId: 'SUB-002', children: [] }] },
        { inviteId: 'SUB-003', name: 'Sub Account 3', email: '', amount: 7000, rank: 'VANGUARD', type: 'sub', parentInviteId: 'AUR-ROOT-001', children: [{ inviteId: 'MAIN-003-A', name: 'Nested Main 3', email: '', amount: 3500, rank: 'VOYAGER', type: 'main', parentInviteId: 'SUB-003', children: [] }] }
      ]
    }
  ]));
}

function createBlankHive() {
  return [{
    inviteId: 'ROOT-001',
    name: 'Main Account',
    email: '',
    country: DEFAULT_HIVE_COUNTRY,
    amount: 0,
    totalTurnover: 0,
    rank: DEFAULT_HIVE_RANK,
    type: 'main',
    parentInviteId: null,
    children: []
  }];
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

function forgetInviteId() {
  activeLookupInviteId = '';
  try {
    localStorage.removeItem(HIVE_LAST_INVITE_KEY);
  } catch (error) {
    console.warn('Aurum Hive Referral ID could not be cleared.', error);
  }
}

function readSavedZoom() {
  try {
    const saved = Number(localStorage.getItem(HIVE_ZOOM_KEY));
    return Number.isFinite(saved) ? Math.min(HIVE_MAX_ZOOM, Math.max(HIVE_MIN_ZOOM, saved)) : hiveZoom;
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

function readPanelCollapsed() {
  try {
    return localStorage.getItem(HIVE_PANEL_COLLAPSED_KEY) === 'true';
  } catch (error) {
    return false;
  }
}

function rememberPanelCollapsed() {
  try {
    localStorage.setItem(HIVE_PANEL_COLLAPSED_KEY, String(hivePanelCollapsed));
  } catch (error) {
    console.warn('Aurum Hive panel state could not be remembered.', error);
  }
}

function persistHive() {
  saveLocalHive();
  hivePendingCloudSync = true;
  updateSyncStatus('Local changes saved. Cloud sync pending...', 'local');
  saveHiveToCloud().then(() => {
    hivePendingCloudSync = false;
  }).catch((error) => {
    hivePendingCloudSync = true;
    console.warn('Aurum Hive cloud sync failed.', error);
    setMessage(getHiveErrorMessage(error), 'error');
    showHiveStatusToast(getHiveErrorMessage(error), 'error');
    updateSyncStatus('Local changes saved. Cloud sync still pending.', 'local');
  });
}

function compareVersionParts(current, latest) {
  const currentParts = String(current || '').match(/\d+/g)?.map(Number) || [];
  const latestParts = String(latest || '').match(/\d+/g)?.map(Number) || [];
  const length = Math.max(currentParts.length, latestParts.length);
  for (let index = 0; index < length; index += 1) {
    const currentPart = currentParts[index] || 0;
    const latestPart = latestParts[index] || 0;
    if (latestPart > currentPart) return 1;
    if (latestPart < currentPart) return -1;
  }
  return 0;
}

function showHiveUpdateBanner(latestVersion) {
  const banner = document.getElementById('hiveUpdateBanner');
  const text = document.getElementById('hiveUpdateText');
  if (!banner) return;
  hiveUpdatePromptedVersion = latestVersion;
  if (text) {
    text.textContent = `You are using ${HIVE_APP_VERSION}. Version ${latestVersion} is available.`;
  }
  banner.classList.add('visible');
}

async function checkHiveAppVersion() {
  try {
    const response = await fetch(`${HIVE_VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    const latestVersion = String(data?.version || '').trim();
    if (latestVersion && sessionStorage.getItem(HIVE_UPDATE_REQUESTED_KEY) === latestVersion) return;
    if (latestVersion && compareVersionParts(HIVE_APP_VERSION, latestVersion) > 0) {
      showHiveUpdateBanner(latestVersion);
    }
  } catch (error) {
    console.warn('Aurum Hive version check failed.', error);
  }
}

function reloadHiveApp() {
  const version = hiveUpdatePromptedVersion || HIVE_APP_VERSION;
  try {
    sessionStorage.setItem(HIVE_REOPEN_AFTER_RELOAD_KEY, '1');
    sessionStorage.setItem(HIVE_UPDATE_REQUESTED_KEY, version);
    sessionStorage.setItem('aurum_update_requested_version', version);
  } catch (error) {}
  const url = new URL(window.location.href);
  url.searchParams.set('appv', version);
  url.searchParams.set('hivev', version);
  url.searchParams.set('reload', String(Date.now()));
  window.location.replace(url.toString());
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
      if (!getHiveRefreshInviteId()) return;
      if (isHiveEditorLocked()) {
        updateSyncStatus('Sync paused while editing an account.', 'local');
        return;
      }
      clearTimeout(realtimeReloadTimer);
      realtimeReloadTimer = setTimeout(() => {
        refreshLoadedHiveFromCloud('Realtime update received. Hive refreshed.', { quietMissing: true }).catch((error) => {
          console.warn('Aurum Hive realtime reload failed.', error);
          updateSyncStatus('Realtime update received, but reload failed.', 'local');
        });
      }, 450);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') updateSyncStatus('Live cloud sync connected.', 'cloud');
    });
}

function startHiveAutoRefresh() {
  if (hiveAutoRefreshTimer) {
    runHiveAutoRefresh();
    return;
  }
  hiveAutoRefreshTimer = setInterval(() => {
    runHiveAutoRefresh();
  }, HIVE_AUTO_REFRESH_MS);
  runHiveAutoRefresh();
  window.addEventListener('focus', runHiveAutoRefresh);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) runHiveAutoRefresh();
  });
}

function runHiveAutoRefresh() {
  if (!document.getElementById('hiveModal')?.classList.contains('open')) return;
  if (!getHiveRefreshInviteId()) return;
  if (isHiveEditorLocked()) {
    updateSyncStatus('Auto-sync paused while editing an account.', 'local');
    return;
  }
  refreshLoadedHiveFromCloud('Hive refreshed from the cloud database.', { silent: true, quietMissing: true, auto: true }).catch((error) => {
    console.warn('Aurum Hive scheduled refresh failed.', error);
    updateSyncStatus('Scheduled cloud refresh failed. Local cache active.', 'local');
  });
}

async function saveHiveToCloud() {
  const validation = validateHiveStructureForSync(hiveData);
  const supabase = await getSupabaseClient();
  if (!supabase) {
    updateSyncStatus('Local database active. Cloud sync not configured.', 'local');
    return;
  }

  const rows = flattenNodes(hiveData);
  await validateExternalCloudParents(supabase, rows);
  const { error } = await supabase
    .from(HIVE_CLOUD_TABLE)
    .upsert(rows.map(toSupabaseRow), { onConflict: 'invite_id' });
  if (error && (String(error.message || '').includes('total_turnover') || String(error.message || '').includes('access_pin') || String(error.message || '').includes('email'))) {
    const fallbackRows = rows.map(toSupabaseRow).map(({ total_turnover, access_pin, email, ...row }) => row);
    const { error: fallbackError } = await supabase
      .from(HIVE_CLOUD_TABLE)
      .upsert(fallbackRows, { onConflict: 'invite_id' });
    if (fallbackError) throw fallbackError;
    updateSyncStatus('Saved locally. Cloud database synced without one optional schema column. Apply the latest Hive schema to sync every field.', 'cloud');
    return;
  }
  if (error) throw error;
  updateSyncStatus(`Saved ${validation.total} account${validation.total !== 1 ? 's' : ''} locally and synced to the cloud database.`, 'cloud');
}

async function validateExternalCloudParents(supabase, rows) {
  const localIds = new Set(rows.map((node) => node.inviteId));
  const externalParentIds = [...new Set(rows
    .map((node) => node.parentInviteId)
    .filter((parentInviteId) => parentInviteId && !localIds.has(parentInviteId)))];
  if (!externalParentIds.length) return;

  const { data, error } = await supabase
    .from(HIVE_CLOUD_TABLE)
    .select('invite_id,type')
    .in('invite_id', externalParentIds);
  if (error) throw error;

  const parentTypes = new Map((data || []).map((row) => [row.invite_id, row.type]));

  rows.forEach((node) => {
    if (!node.parentInviteId || localIds.has(node.parentInviteId)) return;
    const parentType = parentTypes.get(node.parentInviteId);
    if (!parentType) return;
    if (parentType === 'main' && node.type !== 'sub') {
      throw new Error(`Invited By ID ${node.parentInviteId} is a main account, so ${node.inviteId} must be a sub account.`);
    }
    if (parentType === 'sub' && node.type !== 'main') {
      throw new Error(`Invited By ID ${node.parentInviteId} is a sub account, so ${node.inviteId} must be a main account.`);
    }
  });
}

async function loadHiveFromLookup() {
  const input = document.getElementById('hiveLookupInviteId');
  const inviteId = String(input?.value || '').trim();
  if (!inviteId) {
    setMessage('Enter a Referral ID to load.', 'error');
    return;
  }

  setHiveLookupLoading(true);
  try {
    setMessage('Looking up Referral ID...', '');
    const accessPin = await requestHiveAccessPinIfNeeded(inviteId);
    if (accessPin === null) {
      forgetInviteId();
      setMessage('PIN required to load this Referral ID.', 'error');
      return;
    }

    const cloudNode = await loadHiveFromCloud(inviteId, { accessPin });
    if (cloudNode) {
      hiveData.splice(0, hiveData.length, cloudNode);
      selectedInviteId = inviteId;
      isolatedRootInviteId = '';
      collapsedInviteIds.clear();
      hiveMode = 'edit';
      rememberInviteId(inviteId);
      saveLocalHive();
      renderHive();
      setMessage('Loaded from the cloud database.', 'ok');
      showHiveStatusToast('Hive loaded from the cloud database.', 'ok');
      updateSyncStatus('Loaded from the cloud database and cached locally.', 'cloud');
      return;
    }

    const localNode = findNode(hiveData[0], inviteId);
    if (localNode) {
      const localAccessPin = await requestLocalHiveAccessPinIfNeeded(localNode);
      if (localAccessPin === null) {
        forgetInviteId();
        setMessage('PIN required to load this local Referral ID.', 'error');
        return;
      }
      const topLocalNode = findTopLocalNode(inviteId) || localNode;
      hiveData.splice(0, hiveData.length, cloneNode(topLocalNode));
      selectedInviteId = inviteId;
      isolatedRootInviteId = '';
      collapsedInviteIds.clear();
      hiveMode = 'edit';
      rememberInviteId(inviteId);
      renderHive();
      setMessage('Loaded from local database.', 'ok');
      showHiveStatusToast('Hive loaded from local cache.', 'ok');
      updateSyncStatus(isCloudConfigured() ? 'Local match loaded. Cloud database did not return this Referral ID.' : 'Loaded locally. Cloud sync not configured.', isCloudConfigured() ? 'local' : 'local');
      return;
    }

    setMessage('Referral ID was not found locally or in the configured cloud database.', 'error');
    showHiveStatusToast('Referral ID was not found.', 'error');
  } finally {
    setHiveLookupLoading(false);
  }
}

function setHiveLookupLoading(isLoading) {
  const button = document.getElementById('hiveLookupBtn');
  const input = document.getElementById('hiveLookupInviteId');
  if (!button) return;
  button.disabled = Boolean(isLoading);
  if (input) input.disabled = Boolean(isLoading);
  button.innerHTML = isLoading
    ? '<span class="hive-lookup-loading"><span class="material-symbols-rounded">hourglass_top</span>Loading</span>'
    : 'Load';
}

function normalizeHiveAccessPin(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 4);
}

function isValidHiveAccessPin(value) {
  return value === '' || HIVE_PIN_PATTERN.test(value);
}

function getRememberedHiveAccessPin(inviteId) {
  return hiveAccessPins.get(String(inviteId || '').trim()) || '';
}

function rememberHiveAccessPin(inviteId, pin) {
  const key = String(inviteId || '').trim();
  if (!key) return;
  if (pin) hiveAccessPins.set(key, pin);
  else hiveAccessPins.delete(key);
}

function promptForHiveAccessPin(inviteId, options = {}) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('hivePinOverlay');
    const title = document.getElementById('hivePinTitle');
    const subtitle = document.getElementById('hivePinSubtitle');
    const warning = document.getElementById('hivePinWarning');
    const slots = [...(document.getElementById('hivePinSlots')?.querySelectorAll('.hive-pin-slot') || [])];
    const keypad = document.getElementById('hivePinKeypad');
    const cancelBtn = document.getElementById('hivePinCancelBtn');
    const unlockBtn = document.getElementById('hivePinUnlockBtn');
    const error = document.getElementById('hivePinError');
    if (!overlay || !keypad || !cancelBtn || !unlockBtn || !slots.length) {
      const fallback = window.prompt(`Enter the 4-digit PIN for Referral ID ${inviteId}.`);
      resolve(fallback === null ? null : String(fallback || '').trim());
      return;
    }

    let pin = '';
    let settled = false;
    if (title) title.textContent = options.title || 'Enter PIN';
    if (subtitle) subtitle.textContent = options.subtitle || `Referral ID ${inviteId} is protected.`;
    if (warning) {
      warning.textContent = options.warning || '';
      warning.style.display = options.warning ? '' : 'none';
    }
    if (error) error.textContent = '';

    function renderPin() {
      slots.forEach((slot, index) => slot.classList.toggle('filled', index < pin.length));
      unlockBtn.disabled = pin.length !== 4;
      if (error && pin.length) error.textContent = '';
    }

    function cleanup(value) {
      if (settled) return;
      settled = true;
      overlay.classList.remove('visible');
      keypad.removeEventListener('click', onKeypadClick);
      cancelBtn.removeEventListener('click', onCancel);
      unlockBtn.removeEventListener('click', onUnlock);
      document.removeEventListener('keydown', onKeydown);
      resolve(value);
    }

    function onCancel() {
      cleanup(null);
    }

    function onUnlock() {
      if (!HIVE_PIN_PATTERN.test(pin)) {
        if (error) error.textContent = 'Enter all 4 digits.';
        return;
      }
      cleanup(pin);
    }

    function onKeypadClick(event) {
      const button = event.target.closest('button');
      if (!button) return;
      const digit = button.dataset.pinKey;
      const action = button.dataset.pinAction;
      if (digit && pin.length < 4) pin += digit;
      if (action === 'clear') pin = '';
      if (action === 'backspace') pin = pin.slice(0, -1);
      renderPin();
      if (pin.length === 4) onUnlock();
    }

    function onKeydown(event) {
      if (/^\d$/.test(event.key) && pin.length < 4) {
        event.preventDefault();
        pin += event.key;
        renderPin();
        if (pin.length === 4) onUnlock();
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        pin = pin.slice(0, -1);
        renderPin();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cleanup(null);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        onUnlock();
      }
    }

    renderPin();
    overlay.classList.add('visible');
    keypad.addEventListener('click', onKeypadClick);
    cancelBtn.addEventListener('click', onCancel);
    unlockBtn.addEventListener('click', onUnlock);
    document.addEventListener('keydown', onKeydown);
    requestAnimationFrame(() => keypad.querySelector('[data-pin-key="1"]')?.focus());
  });
}

async function requestHiveAccessPinIfNeeded(inviteId) {
  const supabase = await getSupabaseClient();
  if (!supabase) return '';

  const requestedInviteId = String(inviteId || '').trim();
  if (!requestedInviteId) return '';

  const { data, error } = await supabase
    .from(HIVE_CLOUD_TABLE)
    .select('invite_id,access_pin')
    .eq('invite_id', requestedInviteId)
    .maybeSingle();
  if (error && !String(error.message || '').includes('access_pin')) throw error;
  if (error || !data) return '';

  const storedPin = normalizeHiveAccessPin(data.access_pin);
  if (!storedPin) return '';

  const rememberedPin = getRememberedHiveAccessPin(requestedInviteId);
  if (rememberedPin === storedPin) return rememberedPin;

  const enteredPin = await promptForHiveAccessPin(requestedInviteId);
  if (enteredPin === storedPin) {
    rememberHiveAccessPin(requestedInviteId, enteredPin);
    return enteredPin;
  }

  if (enteredPin !== null) {
    setMessage('Incorrect PIN for this Referral ID.', 'error');
    showHiveStatusToast('Incorrect PIN for this Referral ID.', 'error');
  }
  return null;
}

async function requestLocalHiveAccessPinIfNeeded(node) {
  const storedPin = normalizeHiveAccessPin(node?.accessPin);
  if (!storedPin) return '';

  const inviteId = String(node?.inviteId || '').trim();
  const rememberedPin = getRememberedHiveAccessPin(inviteId);
  if (rememberedPin === storedPin) return rememberedPin;

  const enteredPin = await promptForHiveAccessPin(inviteId);
  if (enteredPin === storedPin) {
    rememberHiveAccessPin(inviteId, enteredPin);
    return enteredPin;
  }

  if (enteredPin !== null) {
    setMessage('Incorrect PIN for this local Referral ID.', 'error');
    showHiveStatusToast('Incorrect PIN for this local Referral ID.', 'error');
  }
  return null;
}

async function changeSelectedHivePin() {
  const selected = findNode(hiveData[0], selectedInviteId);
  if (!selected) {
    setMessage('Select an account before changing its PIN.', 'error');
    return;
  }
  if (!await unlockHiveAccountForChange(selected, 'change the PIN for')) return;

  const nextPin = await promptForHiveAccessPin(selected.inviteId, {
    title: selected.accessPin ? 'Change PIN' : 'Set PIN',
    subtitle: `Enter a new 4-digit PIN for ${selected.inviteId}.`,
    warning: 'Keep this PIN safe. It cannot be recovered from this screen.'
  });
  if (nextPin === null) {
    setMessage('PIN change cancelled.', 'warning');
    return;
  }
  const confirmedPin = await promptForHiveAccessPin(selected.inviteId, {
    title: 'Confirm PIN',
    subtitle: `Re-enter the new PIN for ${selected.inviteId}.`
  });
  if (confirmedPin === null) {
    setMessage('PIN change cancelled.', 'warning');
    return;
  }
  if (confirmedPin !== nextPin) {
    setMessage('PINs did not match. The account PIN was not changed.', 'error');
    showHiveStatusToast('PINs did not match.', 'error');
    return;
  }

  selected.accessPin = nextPin;
  rememberHiveAccessPin(selected.inviteId, nextPin);
  persistHive();
  renderHive();
  setMessage('Account PIN updated.', 'ok');
  showHiveStatusToast('Account PIN updated.', 'ok');
}

async function removeSelectedHivePin() {
  const selected = findNode(hiveData[0], selectedInviteId);
  if (!selected) {
    setMessage('Select an account before removing its PIN.', 'error');
    return;
  }
  if (!selected.accessPin) {
    setMessage('This account does not have a PIN.', 'warning');
    return;
  }
  if (!await unlockHiveAccountForChange(selected, 'remove the PIN for')) return;
  if (!window.confirm(`Remove the PIN from ${selected.inviteId}?`)) return;

  selected.accessPin = '';
  rememberHiveAccessPin(selected.inviteId, '');
  persistHive();
  renderHive();
  setMessage('Account PIN removed.', 'ok');
  showHiveStatusToast('Account PIN removed.', 'ok');
}

function searchHiveByName() {
  const input = document.getElementById('hiveNameSearch');
  const query = String(input?.value || '').trim().toLowerCase();
  if (!query) {
    setMessage('Enter a name or Referral ID to search.', 'error');
    renderHiveSearchResults([]);
    return;
  }

  const matches = getHiveSearchMatches(query);
  if (!matches.length) {
    setMessage('No account matched that name or Referral ID in the loaded Hive.', 'error');
    renderHiveSearchResults([]);
    return;
  }

  renderHiveSearchResults(matches);
  selectHiveSearchResult(matches[0].inviteId, { keepResults: true });
  setMessage(matches.length === 1 ? 'Found 1 account.' : `Found ${matches.length} accounts. Showing the first match.`, 'ok');
}

function getHiveSearchMatches(query) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return [];
  return flattenNodes(hiveData).filter((node) => {
    const name = String(node.name || '').toLowerCase();
    const inviteId = String(node.inviteId || '').toLowerCase();
    return name.includes(normalizedQuery) || inviteId.includes(normalizedQuery);
  });
}

function renderHiveSearchResults(matches, options = {}) {
  const list = document.getElementById('hiveSearchResults');
  if (!list) return;
  if (!matches?.length) {
    list.classList.remove('visible');
    list.innerHTML = '';
    return;
  }

  list.classList.add('visible');
  const visibleMatches = options.showAll ? matches : matches.slice(0, 8);
  list.innerHTML = `
    <div class="hive-search-results-head">
      <span>${matches.length === 1 ? '1 result' : `${matches.length} results`}</span>
      <button class="hive-search-clear-btn" type="button" data-clear-search-results>Clear</button>
    </div>
  ` + visibleMatches.map((node) => `
    <div class="hive-search-result">
      <div>
        <div class="hive-search-result-title">${escapeHtml(node.name || 'Unnamed account')}</div>
        <div class="hive-search-result-meta">${escapeHtml(node.inviteId)} · ${escapeHtml(node.type === 'sub' ? 'Sub' : 'Main')} · ${escapeHtml(normalizeHiveCountry(node.country))}</div>
      </div>
      <button class="hive-search-result-btn" type="button" data-search-invite-id="${escapeHtml(node.inviteId)}">Go to</button>
    </div>
  `).join('') + (!options.showAll && matches.length > 8
    ? `<button class="hive-search-more" type="button" data-show-all-search-results>Show all ${matches.length} results</button>`
    : '');
}

function clearHiveSearchResults() {
  highlightedInviteId = '';
  renderHiveSearchResults([]);
  const input = document.getElementById('hiveNameSearch');
  if (input) input.value = '';
  renderHive();
  setMessage('Search results cleared.', 'ok');
}

function selectHiveSearchResult(inviteId, options = {}) {
  const node = findNode(hiveData[0], inviteId);
  if (!node) return;
  selectedInviteId = node.inviteId;
  highlightedInviteId = node.inviteId;
  getPathToRoot(node.inviteId).forEach((pathNode) => collapsedInviteIds.delete(pathNode.inviteId));
  hiveMode = 'edit';
  hiveEditLocked = false;
  renderHive();
  if (!options.keepResults) {
    const results = document.getElementById('hiveSearchResults');
    results?.classList.remove('visible');
  }
  if (isMobileHive()) closeMobileHivePanel();
  scrollSelectedNodeIntoView({ focusNode: true });
}

function exportHiveJson() {
  if (!hiveData.length) {
    setMessage('No Hive structure is loaded to export.', 'error');
    return;
  }

  const rootId = hiveData[0]?.inviteId || 'hive';
  const exportData = {
    format: 'aurum-hive-structure',
    version: 1,
    appVersion: HIVE_APP_VERSION,
    exportedAt: new Date().toISOString(),
    activeReferralId: selectedInviteId || rootId,
    hiveData: cloneHiveForExport(hiveData)
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `aurum-hive-structure-${safeFilePart(rootId)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  setMessage('Hive structure exported for offline editing.', 'ok');
}

async function importHiveJson(event) {
  const input = event.target;
  const file = input?.files?.[0];
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text());
    const importedRoots = extractImportedHiveRoots(parsed);
    const normalizedRoots = normalizeImportedHiveRoots(importedRoots);
    const validation = validateHiveStructureForSync(normalizedRoots);
    hiveData.splice(0, hiveData.length, ...normalizedRoots);
    selectedInviteId = normalizedRoots[0]?.inviteId || '';
    highlightedInviteId = '';
    isolatedRootInviteId = '';
    hiveFocusMode = false;
    hiveMode = 'edit';
    collapsedInviteIds.clear();
    rememberInviteId(selectedInviteId);
    saveLocalHive();
    renderHive();
    setMessage(`Hive structure imported: ${validation.total} account${validation.total !== 1 ? 's' : ''} (${validation.main} main, ${validation.sub} sub). Review it, then use Sync now to publish changes to the cloud database.`, 'ok');
    showHiveStatusToast('Hive import validated and loaded.', 'ok');
    updateSyncStatus('Imported offline Hive structure into local cache.', 'local');
  } catch (error) {
    console.warn('Hive JSON import failed.', error);
    setMessage(error?.message || 'That JSON file could not be imported.', 'error');
  } finally {
    if (input) input.value = '';
  }
}

function extractImportedHiveRoots(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.hiveData)) return parsed.hiveData;
  if (parsed?.inviteId) return [parsed];
  throw new Error('Import file must contain a Hive structure or hiveData array.');
}

function normalizeImportedHiveRoots(roots) {
  if (!Array.isArray(roots) || !roots.length) throw new Error('Import file does not contain any Hive accounts.');
  const seen = new Set();

  function normalizeNode(node, parentInviteId = null, expectedType = null) {
    if (!node || typeof node !== 'object') throw new Error('Import file contains an invalid account.');
    const inviteId = String(node.inviteId || node.invite_id || '').trim();
    if (!inviteId) throw new Error('Every imported account needs a Referral ID.');
    if (seen.has(inviteId)) throw new Error(`Duplicate Referral ID found: ${inviteId}`);
    seen.add(inviteId);

    const type = node.type === 'sub' ? 'sub' : 'main';
    if (expectedType && type !== expectedType) {
      throw new Error(`Account ${inviteId} must be a ${expectedType} account based on its parent.`);
    }

    const amount = normalizeHiveMoney(node.amount, 'Personal investment', inviteId);
    const totalTurnover = normalizeHiveMoney(node.totalTurnover ?? node.total_turnover, 'Total turnover', inviteId);
    const childExpectedType = type === 'main' ? 'sub' : 'main';
    const children = Array.isArray(node.children) ? node.children : [];
    return {
      inviteId,
      name: String(node.name || '').trim(),
      email: normalizeHiveEmail(node.email),
      country: normalizeHiveCountry(node.country),
      amount,
      totalTurnover,
      rank: amount > 0 ? normalizeHiveRank(node.rank) : DEFAULT_HIVE_RANK,
      type,
      parentInviteId: parentInviteId || normalizeParentInviteId(node.parentInviteId ?? node.parent_invite_id),
      accessPin: normalizeHiveAccessPin(node.accessPin ?? node.access_pin),
      needsSetup: node.needsSetup === true,
      children: children.map((child) => normalizeNode(child, inviteId, childExpectedType))
    };
  }

  return roots.map((root) => normalizeNode(root));
}

async function exportSelectedHivePdf() {
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

  const referralLink = getReferralLink(selected.inviteId);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Referral link: ${referralLink}`, margin, y);
  const qrDataUrl = await loadReferralQrDataUrl(selected.inviteId);
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 72, margin, 72, 72);
  }
  y += 18;

  const stats = getHiveStats(selected);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Accounts: ${stats.total}   Main: ${stats.main}   Sub: ${stats.sub}   Personal investment: $${stats.amount.toLocaleString()}   Total turnover: $${stats.totalTurnover.toLocaleString()}`, margin, y);
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
    const totalTurnover = `$${Number(node.totalTurnover || 0).toLocaleString()}`;
    const rank = normalizeHiveRank(node.rank);
    const type = node.type === 'main' ? 'MAIN' : 'SUB';
    const marker = node.type === 'main' ? '[M]' : '[S]';
    addLine(`${marker} ${node.name || 'Unnamed'} | ${node.inviteId} | ${type} | ${normalizeHiveCountry(node.country)} | Investment: ${amount} | Turnover: ${totalTurnover} | ${rank}`, depth, node.type === 'main' ? 'bold' : 'normal');
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
    amount: rows.reduce((sum, node) => sum + Number(node.amount || 0), 0),
    totalTurnover: rows.reduce((sum, node) => sum + Number(node.totalTurnover || 0), 0)
  };
}

function loadReferralQrDataUrl(referralId) {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || 180;
        canvas.height = image.naturalHeight || 180;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        console.warn('Referral QR could not be embedded in PDF.', error);
        resolve('');
      }
    };
    image.onerror = () => resolve('');
    image.src = getReferralQrUrl(referralId);
  });
}

async function loadHiveFromCloud(inviteId, options = {}) {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;

  const requestedInviteId = String(inviteId || '').trim();
  if (!requestedInviteId) return null;
  const enteredAccessPin = options.accessPin || getRememberedHiveAccessPin(requestedInviteId);

  async function buildSubtree(nodeId) {
    const { data, error } = await supabase
      .from(HIVE_CLOUD_TABLE)
      .select('*')
      .eq('invite_id', nodeId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const storedAccessPin = normalizeHiveAccessPin(data.access_pin);
    if (nodeId === requestedInviteId && storedAccessPin && enteredAccessPin !== storedAccessPin) return null;

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

  return buildSubtree(requestedInviteId);
}

async function reloadActiveHiveFromCloud(statusMessage) {
  return refreshLoadedHiveFromCloud(statusMessage);
}

function getHiveRefreshInviteId() {
  return activeLookupInviteId || hiveData[0]?.inviteId || selectedInviteId || '';
}

async function syncLoadedHiveWithCloud() {
  if (isHiveEditorLocked()) {
    setMessage('Save or cancel the current account changes before syncing.', 'error');
    updateSyncStatus('Sync paused while editing an account.', 'local');
    return false;
  }
  const refreshInviteId = getHiveRefreshInviteId();
  if (!refreshInviteId) {
    setMessage('Enter or save a Referral ID before syncing.', 'error');
    return false;
  }

  setMessage('Syncing with the cloud database...', '');
  const pulled = await refreshLoadedHiveFromCloud('Hive refreshed from the cloud database.', { manual: true, quietMissing: true });
  if (pulled) {
    showHiveStatusToast('Hive synced. Latest cloud structure loaded.', 'ok');
    return true;
  }

  if (!isCloudConfigured()) {
    setMessage('Cloud sync is not configured, so this Hive is only saved locally.', 'error');
    updateSyncStatus('Local database active. Cloud sync not configured.', 'local');
    return false;
  }

  saveLocalHive();
  rememberInviteId(hiveData[0]?.inviteId || refreshInviteId);
  await saveHiveToCloud();
  appendHiveSyncLog('Pushed local Hive to cloud database', diffHiveTrees([], hiveData), 'manual push');
  setMessage('No cloud copy existed yet, so the loaded Hive was saved to the cloud database.', 'ok');
  showHiveStatusToast('Hive synced. Local structure saved to the cloud database.', 'ok');
  updateSyncStatus('Saved loaded Hive to the cloud database.', 'cloud');
  return true;
}

async function refreshLoadedHiveFromCloud(statusMessage, options = {}) {
  if (isHiveEditorLocked()) {
    if (options.manual) setMessage('Save or cancel the current account changes before syncing.', 'error');
    updateSyncStatus('Sync paused while editing an account.', 'local');
    return false;
  }
  const refreshInviteId = getHiveRefreshInviteId();
  if (!refreshInviteId) {
    if (options.manual) setMessage('No loaded Referral ID is available to sync.', 'error');
    return false;
  }

  const cloudNode = await loadHiveFromCloud(refreshInviteId);
  if (!cloudNode) {
    if (options.manual && !options.quietMissing) setMessage('No cloud structure found for this loaded Referral ID.', 'error');
    if (!options.quietMissing) updateSyncStatus(isCloudConfigured() ? 'No cloud structure found for the loaded Referral ID.' : 'Local database active. Cloud sync not configured.', 'local');
    return false;
  }

  const previousHive = cloneNode(hiveData);
  hiveData.splice(0, hiveData.length, cloudNode);
  selectedInviteId = findNode(cloudNode, selectedInviteId) ? selectedInviteId : refreshInviteId;
  if (isolatedRootInviteId && !findNode(cloudNode, isolatedRootInviteId)) isolatedRootInviteId = '';
  collapsedInviteIds.clear();
  hiveMode = 'edit';
  rememberInviteId(refreshInviteId);
  saveLocalHive();
  renderHive();
  appendHiveSyncLog(options.silent ? 'Auto-refreshed from cloud database' : 'Pulled latest Hive from cloud database', diffHiveTrees(previousHive, hiveData), options.auto ? 'auto' : (options.manual ? 'manual pull' : 'realtime'));
  if (!options.silent) setMessage(statusMessage || 'Hive refreshed from the cloud database.', 'ok');
  const syncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  updateSyncStatus(options.silent ? `Auto-synced from the cloud database at ${syncTime}.` : 'Synced from the cloud database.', 'cloud');
  return true;
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

async function getExistingCloudInviteIds(inviteIds) {
  const ids = [...new Set((inviteIds || []).map((inviteId) => String(inviteId || '').trim()).filter(Boolean))];
  if (!ids.length) return new Set();
  const supabase = await getSupabaseClient();
  if (!supabase) return new Set();

  const { data, error } = await supabase
    .from(HIVE_CLOUD_TABLE)
    .select('invite_id')
    .in('invite_id', ids);
  if (error) throw error;
  return new Set((data || []).map((row) => row.invite_id));
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
  const totalTurnover = Number(node.totalTurnover || 0);
  return {
    invite_id: String(node.inviteId || '').trim(),
    name: String(node.name || '').trim(),
    email: normalizeHiveEmail(node.email),
    country: normalizeHiveCountry(node.country),
    amount,
    total_turnover: totalTurnover,
    rank: amount > 0 ? normalizeHiveRank(node.rank) : DEFAULT_HIVE_RANK,
    type: node.type === 'sub' ? 'sub' : 'main',
    parent_invite_id: node.parentInviteId || null,
    access_pin: normalizeHiveAccessPin(node.accessPin),
    updated_at: new Date().toISOString()
  };
}

function fromSupabaseRow(row) {
  const amount = Number(row.amount || 0);
  return {
    inviteId: String(row.invite_id || '').trim(),
    name: String(row.name || '').trim(),
    email: normalizeHiveEmail(row.email),
    country: normalizeHiveCountry(row.country),
    amount,
    totalTurnover: Number(row.total_turnover || 0),
    rank: amount > 0 ? normalizeHiveRank(row.rank) : DEFAULT_HIVE_RANK,
    type: row.type === 'sub' ? 'sub' : 'main',
    parentInviteId: row.parent_invite_id || null,
    accessPin: normalizeHiveAccessPin(row.access_pin),
    children: []
  };
}

function updateSyncStatus(text, mode) {
  const status = document.getElementById('hiveSyncStatus');
  if (!status) return;
  status.className = `hive-status ${mode || 'local'}`;
  status.innerHTML = `<span class="hive-status-dot"></span><span class="hive-status-label">Cloud sync</span><span class="hive-status-text">${escapeHtml(text)}</span>`;
}

function readHiveSyncLog() {
  try {
    const saved = JSON.parse(localStorage.getItem(HIVE_SYNC_LOG_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function saveHiveSyncLog(entries) {
  try {
    localStorage.setItem(HIVE_SYNC_LOG_KEY, JSON.stringify(entries.slice(0, HIVE_SYNC_LOG_LIMIT)));
  } catch (error) {
    console.warn('Aurum Hive sync log could not be saved.', error);
  }
}

function appendHiveSyncLog(title, diff, source) {
  if (!diff || (!diff.added.length && !diff.removed.length && !diff.edited.length)) return;
  const entries = readHiveSyncLog();
  entries.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    title,
    source,
    added: diff.added,
    removed: diff.removed,
    edited: diff.edited
  });
  saveHiveSyncLog(entries);
  renderHiveSyncLog();
}

function clearHiveSyncLog() {
  saveHiveSyncLog([]);
  renderHiveSyncLog();
  setMessage('Sync log cleared.', 'ok');
}

function renderHiveSyncLog() {
  const list = document.getElementById('hiveSyncLogList');
  if (!list) return;
  const entries = readHiveSyncLog();
  if (!entries.length) {
    list.innerHTML = '<div class="hive-sync-log-empty">No sync changes recorded yet.</div>';
    return;
  }
  list.innerHTML = entries.slice(0, 8).map((entry) => {
    const added = entry.added?.length || 0;
    const removed = entry.removed?.length || 0;
    const edited = entry.edited?.length || 0;
    const details = renderHiveSyncLogDetails(entry);
    return `
      <div class="hive-sync-log-item">
        <span class="hive-sync-log-time">${escapeHtml(new Date(entry.at).toLocaleString())} · ${escapeHtml(entry.source || 'sync')}</span>
        <strong>${escapeHtml(entry.title || 'Hive sync')}</strong><br>
        ${added} added · ${removed} removed · ${edited} edited${details ? `<br>${details}` : ''}
      </div>
    `;
  }).join('');
}

function renderHiveSyncLogDetails(entry) {
  const parts = [];
  if (entry.added?.length) parts.push(`Added: ${entry.added.slice(0, 4).map(formatHiveLogAccount).join(', ')}${entry.added.length > 4 ? '...' : ''}`);
  if (entry.removed?.length) parts.push(`Removed: ${entry.removed.slice(0, 4).map(formatHiveLogAccount).join(', ')}${entry.removed.length > 4 ? '...' : ''}`);
  if (entry.edited?.length) {
    const edited = entry.edited.slice(0, 3).map((item) => `${formatHiveLogAccount(item)} (${item.fields.map(escapeHtml).join(', ')})`);
    parts.push(`Edited: ${edited.join(', ')}${entry.edited.length > 3 ? '...' : ''}`);
  }
  return parts.join('<br>');
}

function formatHiveLogAccount(item) {
  if (typeof item === 'string') return escapeHtml(item);
  const inviteId = escapeHtml(item?.inviteId || 'Unknown ID');
  const name = String(item?.name || '').trim();
  return name ? `${inviteId} (${escapeHtml(name)})` : `${inviteId} (No name)`;
}

function diffHiveTrees(beforeNodes, afterNodes) {
  const before = mapHiveSnapshot(beforeNodes);
  const after = mapHiveSnapshot(afterNodes);
  const added = [];
  const removed = [];
  const edited = [];

  after.forEach((afterNode, inviteId) => {
    const beforeNode = before.get(inviteId);
    if (!beforeNode) {
      added.push({ inviteId, name: afterNode.name });
      return;
    }
    const fields = ['name', 'country', 'amount', 'totalTurnover', 'rank', 'type', 'parentInviteId']
      .filter((field) => String(beforeNode[field] ?? '') !== String(afterNode[field] ?? ''));
    if (fields.length) edited.push({ inviteId, name: afterNode.name || beforeNode.name, fields });
  });

  before.forEach((beforeNode, inviteId) => {
    if (!after.has(inviteId)) removed.push({ inviteId, name: beforeNode.name });
  });

  return { added, removed, edited };
}

function mapHiveSnapshot(nodes) {
  const map = new Map();
  flattenNodes(nodes || []).forEach((node) => {
    map.set(node.inviteId, {
      name: node.name || '',
      email: normalizeHiveEmail(node.email),
      country: normalizeHiveCountry(node.country),
      amount: Number(node.amount || 0),
      totalTurnover: Number(node.totalTurnover || 0),
      rank: normalizeHiveRank(node.rank),
      type: node.type || '',
      parentInviteId: node.parentInviteId || ''
    });
  });
  return map;
}

function cloneNode(node) {
  return JSON.parse(JSON.stringify(node));
}

function cloneHiveForExport(nodes) {
  return cloneNode(nodes).map(stripHiveAccessPins);
}

function stripHiveAccessPins(node) {
  if (!node || typeof node !== 'object') return node;
  delete node.accessPin;
  node.children = (node.children || []).map(stripHiveAccessPins);
  return node;
}

function normalizeHiveRank(rank) {
  const value = String(rank || DEFAULT_HIVE_RANK).trim().toUpperCase();
  return HIVE_RANKS.includes(value) ? value : DEFAULT_HIVE_RANK;
}

function normalizeHiveCountry(country) {
  const value = String(country || DEFAULT_HIVE_COUNTRY).trim();
  return HIVE_COUNTRIES.includes(value) ? value : DEFAULT_HIVE_COUNTRY;
}

function normalizeHiveEmail(email) {
  return String(email || '').trim();
}

function getMainRankBadge(node) {
  if (!node || node.type !== 'main') return '';
  const rank = normalizeHiveRank(node.rank);
  return rank && rank !== DEFAULT_HIVE_RANK ? rank : '';
}

function normalizeParentInviteId(value) {
  const parentInviteId = String(value || '').trim();
  return parentInviteId && parentInviteId.toLowerCase() !== 'root' ? parentInviteId : null;
}

function normalizeHiveMoney(value, fieldLabel, inviteId) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${fieldLabel} for ${inviteId || 'an imported account'} must be 0 or higher.`);
  }
  return amount;
}

function validateHiveStructureForSync(roots) {
  if (!Array.isArray(roots) || !roots.length) throw new Error('Hive structure does not contain any accounts.');

  const seen = new Set();
  let total = 0;
  let main = 0;
  let sub = 0;

  function visit(node, parent = null) {
    if (!node || typeof node !== 'object') throw new Error('Hive structure contains an invalid account.');
    const inviteId = String(node.inviteId || '').trim();
    if (!inviteId) throw new Error('Every Hive account needs a Referral ID before syncing.');
    if (seen.has(inviteId)) throw new Error(`Duplicate Referral ID found before sync: ${inviteId}`);
    seen.add(inviteId);

    const type = node.type === 'sub' ? 'sub' : node.type === 'main' ? 'main' : '';
    if (!type) throw new Error(`Account ${inviteId} must be either a main or sub account.`);
    if (parent) {
      const expectedType = parent.type === 'main' ? 'sub' : 'main';
      if (type !== expectedType) throw new Error(`Account ${inviteId} must be a ${expectedType} account under ${parent.inviteId}.`);
      if (node.parentInviteId !== parent.inviteId) throw new Error(`Account ${inviteId} has an Invited By ID mismatch. Expected ${parent.inviteId}.`);
    }

    normalizeHiveMoney(node.amount, 'Personal investment', inviteId);
    normalizeHiveMoney(node.totalTurnover, 'Total turnover', inviteId);
    if (!isValidHiveAccessPin(normalizeHiveAccessPin(node.accessPin))) {
      throw new Error(`Optional PIN for ${inviteId} must be exactly 4 digits, or blank.`);
    }

    total += 1;
    if (type === 'main') main += 1;
    if (type === 'sub') sub += 1;
    (node.children || []).forEach((child) => visit(child, node));
  }

  roots.forEach((root) => visit(root));
  return { total, main, sub };
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

function getLegStrengthRows(mainNode, legCount = 4) {
  if (!mainNode || mainNode.type !== 'main') return [];

  const subLegs = (mainNode.children || []).filter((child) => child.type === 'sub');
  return Array.from({ length: legCount }, (_, index) => {
    const leg = subLegs[index];
    const nodes = leg ? flattenNodes([leg]) : [];
    const volume = nodes.reduce((sum, node) => sum + Number(node.amount || 0), 0);
    return {
      index: index + 1,
      leg,
      volume,
      accounts: nodes.length
    };
  });
}

function getLegStrengthOwner(node) {
  if (!node) return null;
  if (node.type === 'main') return node;
  return node.parentInviteId ? findNode(hiveData[0], node.parentInviteId) : null;
}

function renderLegStrengthCard(selected) {
  const owner = getLegStrengthOwner(selected);
  if (!owner || owner.type !== 'main') return '';

  const rows = getLegStrengthRows(owner);
  const strongest = rows.reduce((best, row) => (row.volume > best.volume ? row : best), rows[0] || { volume: 0 });
  const ownerNote = selected?.inviteId === owner.inviteId
    ? 'Selected main account'
    : `Parent main: ${escapeHtml(owner.name)} (${escapeHtml(owner.inviteId)})`;

  return `
    <div class="hive-summary-card wide">
      <div class="hive-summary-label">Leg strength</div>
      <div class="hive-summary-value" style="font-size:14px;">${strongest?.leg ? `Strongest: Leg ${strongest.index}` : 'No legs yet'}</div>
      <div class="hive-summary-note">${ownerNote}</div>
      <div class="hive-leg-list">
        ${rows.map((row) => `
          <div class="hive-leg-row${row.leg ? '' : ' hive-leg-empty'}">
            <div class="hive-leg-index">Leg ${row.index}</div>
            <div class="hive-leg-name" title="${escapeHtml(row.leg?.name || 'Open leg')}">${escapeHtml(row.leg?.name || 'Open leg')}</div>
            <div class="hive-leg-volume">$${row.volume.toLocaleString()}</div>
          </div>
        `).join('')}
      </div>
      <div class="hive-summary-note">Each direct sub account under this main account counts as one leg.</div>
    </div>
  `;
}

function getReferralLink(referralId) {
  return `${AURUM_REFERRAL_BASE_URL}${encodeURIComponent(String(referralId || '').trim())}`;
}

function getReferralQrUrl(referralId) {
  const link = getReferralLink(referralId);
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(link)}`;
}

function handleReferralQrError(image) {
  const panel = image?.closest('.hive-qr-panel');
  panel?.classList.add('qr-error');
}

function showCopyFeedback(button) {
  if (!button) return;

  const originalText = button.dataset.originalText || button.textContent || 'Copy';
  button.dataset.originalText = originalText;
  button.textContent = '\u2713 Copied';
  button.classList.add('copied');

  const existingTimer = copyFeedbackTimers.get(button);
  if (existingTimer) clearTimeout(existingTimer);

  const resetTimer = setTimeout(() => {
    button.textContent = button.dataset.originalText || 'Copy';
    button.classList.remove('copied');
    copyFeedbackTimers.delete(button);
  }, 2500);

  copyFeedbackTimers.set(button, resetTimer);
}

async function copyReferralLink(referralId, button) {
  const link = getReferralLink(referralId);
  try {
    await navigator.clipboard.writeText(link);
    showCopyFeedback(button);
    setMessage('Referral link copied.', 'ok');
  } catch (error) {
    setMessage(link, 'ok');
  }
}

async function shareReferralLink(referralId) {
  const link = getReferralLink(referralId);
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Aurum referral link',
        text: `Open this Aurum referral link: ${referralId}`,
        url: link
      });
      setMessage('Referral link shared.', 'ok');
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(link);
    setMessage('Sharing is not available here, so the referral link was copied.', 'ok');
  } catch (error) {
    setMessage(link, 'ok');
  }
}

function toggleReferralQr(button) {
  const panel = document.getElementById('hiveReferralQrPanel');
  if (!panel) return;
  const isVisible = panel.classList.toggle('visible');
  if (button) button.textContent = isVisible ? 'Hide QR' : 'QR';
}

export function renderHive(containerId = 'hiveContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;
  hideHiveTooltip();

  if (!findNode(hiveData[0], selectedInviteId)) {
    selectedInviteId = hiveData[0]?.inviteId || '';
  }
  if (isolatedRootInviteId && !findNode(hiveData[0], isolatedRootInviteId)) {
    isolatedRootInviteId = '';
  }

  container.innerHTML = '';
  const rootInviteId = isolatedRootInviteId || (hiveFocusMode ? selectedInviteId : '');
  const renderRoots = rootInviteId ? [findNode(hiveData[0], rootInviteId)].filter(Boolean) : hiveData;

  renderTreeMap(container, renderRoots);
  resetHiveCanvasScroll();
  requestAnimationFrame(syncFloatingHiveOverlays);
  renderHiveSummary();
  populateHiveForm();
  updateHiveFocusButton();
  updateHiveBranchHighlightButton();
}

function renderTreeMap(container, roots) {
  const layout = layoutHiveTree(roots);
  lastHiveLayout = layout;
  container.style.width = `${layout.width}px`;
  container.style.height = `${layout.height}px`;
  container.innerHTML = '';
  const selectedBranchIds = getDescendantIds(findNode(hiveData[0], selectedInviteId));

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('hive-link-layer');
  svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  layout.links.forEach((link) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const midY = link.parent.y + ((link.child.y - link.parent.y) / 2);
    path.setAttribute('d', `M ${link.parent.x} ${link.parent.y} V ${midY} H ${link.child.x} V ${link.child.y}`);
    if (hiveBranchHighlightMode && selectedBranchIds.has(link.parent.node.inviteId) && selectedBranchIds.has(link.child.node.inviteId)) {
      path.classList.add('in-selected-branch');
    }
    svg.appendChild(path);
  });
  container.appendChild(svg);

  layout.nodes.forEach((item) => {
    container.appendChild(createHiveNode(item.node, item.x, item.y, selectedBranchIds));
  });
  applyHiveTransform();
  renderMiniMap(layout);
}

function layoutHiveTree(roots) {
  const nodeGapX = 138;
  const levelGapY = 128;
  const paddingX = 260;
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

function createHiveNode(node, x, y, selectedBranchIds) {
  const wrapper = document.createElement('div');
  wrapper.className = 'hive-node-wrapper';
  wrapper.style.left = `${x}px`;
  wrapper.style.top = `${y}px`;

  const dot = document.createElement('div');
  const isSelected = node.inviteId === selectedInviteId;
  const isSearchHit = node.inviteId === highlightedInviteId;
  const isInSelectedBranch = hiveBranchHighlightMode && selectedBranchIds.has(node.inviteId);
  const isUnfunded = Number(node.amount || 0) <= 0;
  const isUnsupportedSub = isUnsupportedSubAccount(node);
  const isPlaceholderSub = isAutoPlaceholderSub(node);
  dot.className = `${node.type === 'main' ? 'hive-dot-main' : 'hive-dot-sub'}${isSelected ? ' selected' : ''}${isInSelectedBranch ? ' in-selected-branch' : ''}${isSearchHit ? ' search-hit' : ''}${isUnfunded ? ' unfunded' : ''}${isUnsupportedSub ? ' unsupported' : ''}${isPlaceholderSub ? ' placeholder' : ''}`;
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
    if (isHiveEditorLocked()) {
      setMessage('Save or cancel the current account changes before selecting another account.', 'error');
      return;
    }
    selectedInviteId = node.inviteId;
    if (highlightedInviteId !== node.inviteId) highlightedInviteId = '';
    hiveMode = 'edit';
    renderHive();
    if (isMobileHive()) openMobileHivePanel(node);
  });
  dot.addEventListener('dblclick', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isHiveEditorLocked()) {
      setMessage('Save or cancel the current account changes before changing the view.', 'error');
      return;
    }
    toggleHiveBranchIsolation(node.inviteId);
  });
  dot.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isHiveEditorLocked()) {
        setMessage('Save or cancel the current account changes before selecting another account.', 'error');
        return;
      }
      selectedInviteId = node.inviteId;
      if (highlightedInviteId !== node.inviteId) highlightedInviteId = '';
      hiveMode = 'edit';
      renderHive();
      if (isMobileHive()) openMobileHivePanel(node);
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
      Email: ${escapeHtml(node.email || 'Not specified')}<br>
      Country: ${escapeHtml(normalizeHiveCountry(node.country))}<br>
      Personal investment: $${Number(node.amount || 0).toLocaleString()}<br>
      Total turnover: $${Number(node.totalTurnover || 0).toLocaleString()}<br>
      Rank: ${rankHtml}<br>
      Type: ${escapeHtml(node.type)}${isUnsupportedSubAccount(node) ? '<br>Status: Unsupported extra sub account' : ''}${isAutoPlaceholderSub(node) ? '<br>Status: Placeholder - update name and Referral ID' : ''}
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

function collapseAllBranches() {
  collapsedInviteIds.clear();
  flattenNodes(hiveData)
    .filter((node) => (node.children || []).length > 0)
    .forEach((node) => collapsedInviteIds.add(node.inviteId));
  renderHive();
}

function expandAllBranches() {
  collapsedInviteIds.clear();
  renderHive();
}

function collapseBelowSelected() {
  const selected = findNode(hiveData[0], selectedInviteId);
  if (!selected) return;
  (selected.children || []).forEach((child) => {
    getDescendantIds(child).forEach((id) => collapsedInviteIds.add(id));
  });
  renderHive();
}

function toggleHiveBranchHighlightMode() {
  hiveBranchHighlightMode = !hiveBranchHighlightMode;
  renderHive();
}

function scrollSelectedNodeIntoView(options = {}) {
  requestAnimationFrame(() => {
    const selectedDot = document.querySelector(`[data-invite-id="${cssEscape(selectedInviteId)}"]`);
    selectedDot?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    if (options.focusNode) selectedDot?.focus({ preventScroll: true });
  });
}

function resetHiveCanvasScroll() {
  requestAnimationFrame(() => {
    const canvas = document.querySelector('#hiveModal .hive-canvas');
    if (!canvas) return;
    canvas.scrollLeft = 0;
    canvas.scrollTop = 0;
  });
}

function getDescendantIds(root) {
  const ids = new Set();
  function walk(node) {
    if (!node) return;
    ids.add(node.inviteId);
    (node.children || []).forEach(walk);
  }
  walk(root);
  return ids;
}

function getLoadedHiveAmount() {
  return flattenNodes(hiveData).reduce((sum, node) => sum + Number(node.amount || 0), 0);
}

function renderMiniMap(layout) {
  const miniBody = document.getElementById('hiveMiniMapBody');
  const canvas = document.querySelector('#hiveModal .hive-canvas');
  if (!miniBody || !canvas || !layout) return;

  const zoom = Math.max(HIVE_MIN_ZOOM, hiveZoom);
  const viewLeft = canvas.scrollLeft / zoom;
  const viewTop = canvas.scrollTop / zoom;
  const viewWidth = canvas.clientWidth / zoom;
  const viewHeight = canvas.clientHeight / zoom;
  const selectedBranchIds = getDescendantIds(findNode(hiveData[0], selectedInviteId));

  miniBody.innerHTML = `
    <svg viewBox="0 0 ${layout.width} ${layout.height}" preserveAspectRatio="xMidYMid meet">
      ${layout.links.map((link) => `<path class="hive-minimap-link" d="M ${link.parent.x} ${link.parent.y} L ${link.child.x} ${link.child.y}" />`).join('')}
      ${layout.nodes.map((item) => `<circle class="hive-minimap-node" cx="${item.x}" cy="${item.y}" r="${selectedBranchIds.has(item.node.inviteId) ? 8 : 6}" fill="${getMiniMapColor(item.node)}" />`).join('')}
      <rect class="hive-minimap-viewport" x="${viewLeft}" y="${viewTop}" width="${viewWidth}" height="${viewHeight}" rx="16" />
    </svg>
  `;
}

function getMiniMapColor(node) {
  if (isAutoPlaceholderSub(node)) return '#ffffff';
  if (isUnsupportedSubAccount(node)) return '#9ca3af';
  if (Number(node.amount || 0) <= 0) return node.type === 'main' ? '#2563eb' : '#facc15';
  return node.type === 'main' ? '#dc2626' : '#16a34a';
}

function getAutoPlaceholderInviteId(parentInviteId, index) {
  return `${String(parentInviteId || '').trim()}-${index}`;
}

function isGeneratedPlaceholderInviteId(node) {
  if (!node || !node.parentInviteId) return false;
  return [1, 2, 3].some((index) => node.inviteId === getAutoPlaceholderInviteId(node.parentInviteId, index));
}

function isAutoPlaceholderSub(node) {
  if (!node || node.type !== 'sub') return false;
  return node.needsSetup === true || (isGeneratedPlaceholderInviteId(node) && !String(node.name || '').trim());
}

function getDirectSubCount(node) {
  if (!node || node.type !== 'main') return 0;
  return (node.children || []).filter((child) => child.type === 'sub').length;
}

function isUnsupportedSubAccount(node) {
  if (!node || node.type !== 'sub' || !node.parentInviteId) return false;
  const parent = findNode(hiveData[0], node.parentInviteId);
  if (!parent || parent.type !== 'main') return false;
  const subSiblings = (parent.children || []).filter((child) => child.type === 'sub');
  return subSiblings.findIndex((child) => child.inviteId === node.inviteId) >= HIVE_SUPPORTED_SUB_LIMIT;
}

function getUnsupportedSubWarning(parent) {
  if (!parent || parent.type !== 'main' || getDirectSubCount(parent) < HIVE_SUPPORTED_SUB_LIMIT) return '';
  return 'Warning: a 4th sub account is not supported by the standard Hive structure rules. You can still add it, but it will be shown in grey.';
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
    email: normalizeHiveEmail(newItem.email),
    country: normalizeHiveCountry(newItem.country),
    totalTurnover: Number(newItem.totalTurnover || 0),
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

function createAutoSubAccounts(mainNode) {
  if (!mainNode || mainNode.type !== 'main') return { created: 0, duplicates: [] };
  if (!mainNode.children) mainNode.children = [];
  const existingIds = new Set(flattenNodes(hiveData).map((node) => node.inviteId));
  const duplicates = [];
  let created = 0;

  for (let index = 1; index <= 3; index += 1) {
    const inviteId = getAutoPlaceholderInviteId(mainNode.inviteId, index);
    if (existingIds.has(inviteId)) {
      duplicates.push(inviteId);
      continue;
    }
    mainNode.children.push({
      inviteId,
      name: '',
      email: '',
      country: normalizeHiveCountry(mainNode.country),
      amount: 0,
      totalTurnover: 0,
      rank: DEFAULT_HIVE_RANK,
      type: 'sub',
      parentInviteId: mainNode.inviteId,
      needsSetup: true,
      children: []
    });
    existingIds.add(inviteId);
    created += 1;
  }

  return { created, duplicates };
}

export function editHiveItem(inviteId, updatedData) {
  const node = findNode(hiveData[0], inviteId);
  if (!node) return false;

  const nextInviteId = String(updatedData.inviteId || '').trim();
  if (!nextInviteId) return false;
  const duplicate = flattenNodes(hiveData).some((item) => item.inviteId === nextInviteId && item !== node);
  if (duplicate) return false;

  const previousInviteId = node.inviteId;
  const nextName = String(updatedData.name || '').trim();
  const stillNeedsSetup = isAutoPlaceholderSub(node) && !(nextName && nextInviteId !== previousInviteId);
  Object.assign(node, {
    inviteId: nextInviteId,
    name: nextName,
    email: normalizeHiveEmail(updatedData.email),
    country: normalizeHiveCountry(updatedData.country),
    amount: Number(updatedData.amount || 0),
    totalTurnover: Number(updatedData.totalTurnover || 0),
    rank: Number(updatedData.amount || 0) > 0 ? normalizeHiveRank(updatedData.rank) : DEFAULT_HIVE_RANK,
    parentInviteId: node === hiveData[0] ? normalizeParentInviteId(updatedData.parentInviteId) : node.parentInviteId,
    accessPin: normalizeHiveAccessPin(updatedData.accessPin ?? node.accessPin),
    needsSetup: stillNeedsSetup
  });
  rememberHiveAccessPin(nextInviteId, node.accessPin);
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

function deleteUnfundedSubAccounts() {
  if (isHiveEditorLocked()) {
    setMessage('Save or cancel the current account changes before deleting an unfunded sub account.', 'error');
    return;
  }

  const selected = findNode(hiveData[0], selectedInviteId);
  if (!selected) {
    setMessage('Select an unfunded sub account before deleting.', 'error');
    return;
  }
  if (selected.type !== 'sub' || Number(selected.amount || 0) > 0) {
    setMessage('Only the selected unfunded sub account can be deleted with this action.', 'error');
    return;
  }

  const accountName = selected.name || 'Unnamed';
  if (!window.confirm(`Delete this unfunded sub account?\n\nReferral ID: ${selected.inviteId}\nName: ${accountName}`)) return;

  const beforeHive = cloneNode(hiveData);
  const targetIds = new Set([selected.inviteId]);
  removeUnfundedSubsRecursive(hiveData[0], targetIds);
  selectedInviteId = selected.parentInviteId && findNode(hiveData[0], selected.parentInviteId) ? selected.parentInviteId : (hiveData[0]?.inviteId || '');
  collapsedInviteIds.clear();
  persistHive();
  deleteCloudInvite(selected.inviteId).catch((error) => {
    console.warn('Cloud unfunded sub account could not be removed.', error);
  });
  renderHive();
  appendHiveSyncLog('Deleted selected unfunded sub account', diffHiveTrees(beforeHive, hiveData), 'cleanup');
  setMessage(`Deleted unfunded sub account ${selected.inviteId} - ${accountName}.`, 'ok');
  showHiveStatusToast(`Deleted ${selected.inviteId} - ${accountName}.`, 'ok');
}

function removeUnfundedSubsRecursive(parent, targetIds) {
  if (!parent?.children) return;
  parent.children = parent.children.filter((child) => {
    if (targetIds.has(child.inviteId)) return false;
    removeUnfundedSubsRecursive(child, targetIds);
    return true;
  });
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

function setHiveMode(mode, options = {}) {
  hiveMode = mode === 'add' ? 'add' : 'edit';
  hiveEditLocked = hiveMode === 'edit' && Boolean(options.lock);
  setMessage('', '');
  populateHiveForm();
  if (hiveMode === 'add' || hiveEditLocked) {
    requestAnimationFrame(() => document.getElementById('hiveInviteId')?.focus());
  }
}

function isHiveEditorLocked() {
  return hiveMode === 'add' || hiveEditLocked;
}

function getSelectedHiveNode() {
  for (const root of hiveData) {
    const found = findNode(root, selectedInviteId);
    if (found) return found;
  }
  return hiveData[0] || null;
}

async function unlockHiveAccountForChange(node, actionLabel) {
  if (!node) return false;
  if (node === hiveData[0]) return true;
  const accessPin = await requestLocalHiveAccessPinIfNeeded(node);
  if (accessPin === null) {
    setMessage(`PIN required to ${actionLabel} this account.`, 'error');
    return false;
  }
  return true;
}

async function handleHiveEditTabClick() {
  if (hiveMode === 'add') {
    setMessage('Save or cancel the new account before editing another account.', 'error');
    return;
  }
  const selected = findNode(hiveData[0], selectedInviteId);
  if (!selected) {
    setMessage('Select an account before editing.', 'error');
    return;
  }
  if (!await unlockHiveAccountForChange(selected, 'edit')) return;
  setHiveMode('edit', { lock: true });
}

async function handleHiveAddTabClick() {
  if (hiveEditLocked) {
    setMessage('Save or cancel the current edit before adding a new account.', 'error');
    return;
  }
  const selected = findNode(hiveData[0], selectedInviteId);
  if (!selected) {
    setMessage('Select an account before adding a child account.', 'error');
    return;
  }
  if (!await unlockHiveAccountForChange(selected, 'add under')) return;
  setHiveMode('add');
  const warning = getUnsupportedSubWarning(selected);
  if (warning && getAllowedChildType(selected) === 'sub') setMessage(warning, 'warning');
}

function cancelHiveFormMode() {
  if (!isHiveEditorLocked()) return;
  const wasAddMode = hiveMode === 'add';
  hiveMode = 'edit';
  hiveEditLocked = false;
  setMessage(wasAddMode ? 'New account entry cancelled.' : 'Account edit cancelled.', 'ok');
  populateHiveForm();
  runHiveAutoRefresh();
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
  const cancelBtn = document.getElementById('hiveCancelAddBtn');
  const inviteInput = document.getElementById('hiveInviteId');
  const nameInput = document.getElementById('hiveName');
  const emailInput = document.getElementById('hiveEmail');
  const countryInput = document.getElementById('hiveCountry');
  const amountInput = document.getElementById('hiveAmount');
  const totalTurnoverInput = document.getElementById('hiveTotalTurnover');
  const rankInput = document.getElementById('hiveRank');
  const typeInput = document.getElementById('hiveType');
  const parentInput = document.getElementById('hiveParent');
  const pinStatus = document.getElementById('hivePinStatus');
  const removePinBtn = document.getElementById('hiveRemovePinBtn');
  const accountCardHint = document.getElementById('hiveAccountCardHint');
  const autoSubWrap = document.getElementById('hiveAutoSubWrap');
  const autoSubInput = document.getElementById('hiveAutoSubAccounts');
  if (!selected || !inviteInput || !nameInput || !emailInput || !countryInput || !amountInput || !totalTurnoverInput || !rankInput || !typeInput || !parentInput || !saveBtn) return;

  const childType = getAllowedChildType(selected);
  if (hiveMode === 'add' && !childType) hiveMode = 'edit';

  const editorActive = hiveMode === 'add' || hiveEditLocked;
  editTab?.classList.toggle('active', hiveEditLocked);
  addTab?.classList.toggle('active', hiveMode === 'add');
  if (addTab) {
    addTab.textContent = childType ? `Add ${childType}` : 'Add child';
    addTab.disabled = !childType;
  }

  if (hiveMode === 'edit') {
    const isLoadedRoot = selected === hiveData[0];
    inviteInput.value = selected.inviteId || '';
    nameInput.value = selected.name || '';
    emailInput.value = normalizeHiveEmail(selected.email);
    countryInput.value = normalizeHiveCountry(selected.country);
    amountInput.value = selected.amount ?? '';
    totalTurnoverInput.value = selected.totalTurnover ?? '';
    rankInput.value = normalizeHiveRank(selected.rank);
    typeInput.value = selected.type || '';
    parentInput.value = selected.parentInviteId || '';
    parentInput.disabled = false;
    parentInput.readOnly = !editorActive || !isLoadedRoot;
    parentInput.placeholder = isLoadedRoot ? 'Optional inviter Referral ID' : 'Managed by parent account';
    autoSubWrap?.classList.remove('visible');
    if (autoSubInput) autoSubInput.checked = false;
    if (cancelBtn) cancelBtn.style.display = hiveEditLocked ? '' : 'none';
    saveBtn.textContent = editorActive ? 'Save edit' : 'Save turnover';
  } else {
    inviteInput.value = '';
    nameInput.value = '';
    emailInput.value = '';
    countryInput.value = normalizeHiveCountry(selected.country);
    amountInput.value = '';
    totalTurnoverInput.value = '';
    rankInput.value = DEFAULT_HIVE_RANK;
    typeInput.value = childType;
    parentInput.value = selected.inviteId;
    parentInput.disabled = false;
    parentInput.readOnly = true;
    parentInput.placeholder = 'Managed by selected parent';
    autoSubWrap?.classList.toggle('visible', childType === 'main');
    if (autoSubInput && childType !== 'main') autoSubInput.checked = false;
    if (cancelBtn) cancelBtn.style.display = '';
    saveBtn.textContent = `Add ${childType} account`;
  }

  inviteInput.disabled = false;
  nameInput.disabled = false;
  emailInput.disabled = false;
  countryInput.disabled = false;
  amountInput.disabled = false;
  totalTurnoverInput.disabled = false;
  rankInput.disabled = false;
  inviteInput.readOnly = !editorActive;
  nameInput.readOnly = !editorActive;
  emailInput.readOnly = !editorActive;
  amountInput.readOnly = !editorActive;
  totalTurnoverInput.readOnly = false;
  typeInput.disabled = true;
  saveBtn.disabled = hiveMode === 'add' ? !editorActive : false;
  if (pinStatus) {
    const protectedAccount = Boolean(selected.accessPin);
    pinStatus.textContent = protectedAccount ? 'PIN protected' : 'No PIN';
    pinStatus.classList.toggle('protected', protectedAccount);
  }
  if (removePinBtn) removePinBtn.disabled = !selected.accessPin;
  if (accountCardHint) accountCardHint.textContent = selected.name || selected.inviteId || 'Selected account';
}

function applyHiveTransform() {
  const tree = document.getElementById('hiveContainer');
  if (!tree) return;
  tree.style.transform = `translate(${hivePanX}px, ${hivePanY}px) scale(${hiveZoom})`;
  tree.style.marginBottom = `${Math.max(0, 560 * (hiveZoom - 1))}px`;
}

function setHiveZoom(value) {
  hiveZoom = Math.min(HIVE_MAX_ZOOM, Math.max(HIVE_MIN_ZOOM, Number(value || 0.85)));
  const range = document.getElementById('hiveZoomRange');
  const valueLabel = document.getElementById('hiveZoomValue');
  applyHiveTransform();
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

function setHivePanelCollapsed(value) {
  hivePanelCollapsed = Boolean(value);
  const layout = document.getElementById('hiveLayout');
  const showBtn = document.getElementById('hiveShowPanelBtn');
  layout?.classList.toggle('panel-collapsed', hivePanelCollapsed);
  showBtn?.classList.toggle('visible', hivePanelCollapsed);
  rememberPanelCollapsed();
  requestAnimationFrame(() => {
    syncFloatingHiveOverlays();
    renderMiniMap(lastHiveLayout);
  });
}

function toggleHiveFullscreen() {
  setHiveFullscreen(!hiveFullscreen);
}

function toggleHiveFocusMode() {
  isolatedRootInviteId = '';
  hiveFocusMode = !hiveFocusMode;
  renderHive();
}

function toggleHiveBranchIsolation(inviteId) {
  const isSameIsolatedRoot = isolatedRootInviteId === inviteId;
  selectedInviteId = inviteId;
  highlightedInviteId = '';
  hiveMode = 'edit';
  hiveFocusMode = false;
  isolatedRootInviteId = isSameIsolatedRoot ? '' : inviteId;
  renderHive();
}

function updateHiveFocusButton() {
  const btn = document.getElementById('hiveFocusBtn');
  if (!btn) return;
  btn.classList.toggle('active', hiveFocusMode);
  btn.title = hiveFocusMode ? 'Show full loaded Hive' : 'Focus selected tree';
  btn.setAttribute('aria-label', btn.title);
}

function updateHiveBranchHighlightButton() {
  const btn = document.getElementById('hiveBranchHighlightBtn');
  if (!btn) return;
  btn.classList.toggle('active', hiveBranchHighlightMode);
  btn.title = hiveBranchHighlightMode ? 'Hide selected branch highlight' : 'Highlight selected branch';
  btn.setAttribute('aria-label', btn.title);
}

function clearSampleHive() {
  if (!window.confirm('Clear the sample Hive and start with one blank main account? This only changes your local Hive until you save new accounts.')) return;
  const blankHive = createBlankHive();
  hiveData.splice(0, hiveData.length, blankHive[0]);
  selectedInviteId = blankHive[0].inviteId;
  isolatedRootInviteId = '';
  highlightedInviteId = '';
  hiveFocusMode = false;
  hiveMode = 'edit';
  collapsedInviteIds.clear();
  forgetInviteId();
  const lookupInput = document.getElementById('hiveLookupInviteId');
  if (lookupInput) lookupInput.value = '';
  saveLocalHive();
  renderHive();
  setMessage('Sample cleared. Edit the root account, then add your own child accounts.', 'ok');
  updateSyncStatus('Local starter Hive ready. Save edits to sync it to the cloud database.', 'local');
}

async function runHiveStarterSetup() {
  const root = hiveData[0];
  if (!root || root.type !== 'main') {
    setMessage('Starter setup needs a loaded main root account.', 'error');
    return;
  }
  if (isHiveEditorLocked()) {
    setMessage('Save or cancel the current account changes before starter setup.', 'error');
    return;
  }
  if ((root.children || []).length && !window.confirm('Starter setup can replace the current root child accounts with three placeholders. Continue?')) return;

  const nextInviteId = String(window.prompt('Enter the root Referral ID for this Hive.', root.inviteId || '') || '').trim();
  if (!nextInviteId) {
    setMessage('Starter setup cancelled. Root Referral ID is required.', 'error');
    return;
  }
  const duplicate = flattenNodes(hiveData).some((node) => node !== root && node.inviteId === nextInviteId);
  if (duplicate || (nextInviteId !== root.inviteId && await cloudInviteExists(nextInviteId))) {
    setMessage('That root Referral ID already exists. Choose a different ID or load it instead.', 'error');
    return;
  }

  const nextName = String(window.prompt('Enter the root account name.', root.name || '') || '').trim();
  if (!nextName) {
    setMessage('Starter setup cancelled. Account name is required.', 'error');
    return;
  }

  let nextPin = '';
  if (window.confirm('Add a 4-digit PIN to protect this root account?')) {
    nextPin = await promptForHiveAccessPin(nextInviteId, {
      title: 'Set Root PIN',
      subtitle: `Enter a 4-digit PIN for ${nextInviteId}.`,
      warning: 'Keep this PIN safe. It cannot be recovered from this screen.'
    });
    if (nextPin === null) {
      setMessage('Starter setup cancelled before PIN was set.', 'warning');
      return;
    }
    const confirmedPin = await promptForHiveAccessPin(nextInviteId, {
      title: 'Confirm Root PIN',
      subtitle: `Re-enter the new PIN for ${nextInviteId}.`
    });
    if (confirmedPin !== nextPin) {
      setMessage('PINs did not match. Starter setup was not applied.', 'error');
      return;
    }
  }

  const previousInviteId = root.inviteId;
  Object.assign(root, {
    inviteId: nextInviteId,
    name: nextName,
    email: normalizeHiveEmail(root.email),
    country: normalizeHiveCountry(root.country),
    type: 'main',
    parentInviteId: null,
    accessPin: nextPin,
    needsSetup: false,
    children: []
  });
  if (previousInviteId !== nextInviteId) {
    deleteCloudInvite(previousInviteId).catch((error) => {
      console.warn('Old cloud Referral ID could not be removed during starter setup.', error);
    });
  }
  createAutoSubAccounts(root);
  selectedInviteId = root.inviteId;
  rememberInviteId(root.inviteId);
  rememberHiveAccessPin(root.inviteId, nextPin);
  hiveMode = 'edit';
  hiveEditLocked = false;
  persistHive();
  renderHive();
  setMessage('Starter Hive setup complete with three placeholder subaccounts.', 'ok');
  showHiveStatusToast('Starter Hive ready.', 'ok');
}

async function submitHiveForm() {
  if (!isHiveEditorLocked()) {
    saveSelectedTotalTurnoverOnly();
    return;
  }
  const selected = findNode(hiveData[0], selectedInviteId);
  if (!selected) {
    setMessage('Select an account first.', 'error');
    return;
  }

  const formData = {
    inviteId: document.getElementById('hiveInviteId').value.trim(),
    name: document.getElementById('hiveName').value.trim(),
    email: normalizeHiveEmail(document.getElementById('hiveEmail').value),
    country: document.getElementById('hiveCountry').value.trim(),
    amount: Number(document.getElementById('hiveAmount').value || 0),
    totalTurnover: Number(document.getElementById('hiveTotalTurnover').value || 0),
    parentInviteId: normalizeParentInviteId(document.getElementById('hiveParent').value),
    rank: document.getElementById('hiveRank').value.trim()
  };

  if (!formData.inviteId) {
    setMessage('Referral ID is required.', 'error');
    return;
  }

  if (hiveMode === 'edit' && formData.parentInviteId === formData.inviteId) {
    setMessage('An account cannot invite itself.', 'error');
    return;
  }

  if (hiveMode === 'edit') {
    if (formData.inviteId !== selected.inviteId && await cloudInviteExists(formData.inviteId)) {
      setMessage('That Referral ID already exists in the cloud database.', 'error');
      return;
    }
    const saved = editHiveItem(selected.inviteId, formData);
    if (saved) {
      hiveEditLocked = false;
      populateHiveForm();
      rememberInviteId(findTopLocalNode(formData.inviteId)?.inviteId || formData.inviteId);
    }
    setMessage(saved ? 'Account updated.' : 'Could not update account. Check for duplicate Referral ID.', saved ? 'ok' : 'error');
    return;
  }

  const childType = getAllowedChildType(selected);
  if (!childType) {
    setMessage('This account cannot add a child account.', 'error');
    return;
  }
  const addingUnsupportedSub = childType === 'sub' && getDirectSubCount(selected) >= HIVE_SUPPORTED_SUB_LIMIT;

  const autoCreateSubs = childType === 'main' && document.getElementById('hiveAutoSubAccounts')?.checked;
  const idsToCreate = [formData.inviteId];
  if (autoCreateSubs) {
    const subIds = [1, 2, 3].map((index) => `${formData.inviteId}-${index}`);
    idsToCreate.push(...subIds);
    const localIds = new Set(flattenNodes(hiveData).map((node) => node.inviteId));
    const localDuplicate = idsToCreate.find((inviteId) => localIds.has(inviteId));
    if (localDuplicate) {
      setMessage(`Could not add account because ${localDuplicate} already exists locally.`, 'error');
      return;
    }
  }
  const cloudDuplicates = await getExistingCloudInviteIds(idsToCreate);
  if (cloudDuplicates.size) {
    const duplicateId = [...cloudDuplicates][0];
    setMessage(`Could not add account because ${duplicateId} already exists in the cloud database. Load it instead of creating a duplicate.`, 'error');
    return;
  }

  const added = addHiveItem(selected.inviteId, {
    ...formData,
    type: childType,
    parentInviteId: selected.inviteId
  });
  let autoSubResult = { created: 0, duplicates: [] };
  if (added && autoCreateSubs) {
    const mainNode = findNode(hiveData[0], formData.inviteId);
    autoSubResult = createAutoSubAccounts(mainNode);
    persistHive();
    renderHive();
  }
  if (added) rememberInviteId(findTopLocalNode(formData.inviteId)?.inviteId || formData.inviteId);
  const successMessage = autoSubResult.created
    ? `Main account added with ${autoSubResult.created} linked placeholder subaccounts. Update each ? node with a real name and Referral ID.`
    : addingUnsupportedSub
      ? 'Sub account added as an unsupported extra sub and shown in grey.'
    : `${childType === 'main' ? 'Main' : 'Sub'} account added.`;
  setMessage(added ? successMessage : 'Could not add account. Check the Referral ID and account rule.', added ? (addingUnsupportedSub ? 'warning' : 'ok') : 'error');
}

function saveSelectedTotalTurnoverOnly() {
  if (hiveMode !== 'edit') {
    setMessage('Click Edit selected or Add child before changing account details.', 'error');
    return;
  }
  const selected = findNode(hiveData[0], selectedInviteId);
  const input = document.getElementById('hiveTotalTurnover');
  if (!selected || !input) {
    setMessage('Select an account before saving total turnover.', 'error');
    return;
  }
  let nextTurnover;
  try {
    nextTurnover = normalizeHiveMoney(input.value, 'Total turnover', selected.inviteId);
  } catch (error) {
    setMessage(getHiveErrorMessage(error), 'error');
    return;
  }
  selected.totalTurnover = nextTurnover;
  persistHive();
  renderHive();
  setMessage('Total turnover saved without unlocking the account.', 'ok');
  showHiveStatusToast('Total turnover saved.', 'ok');
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

function showHiveStatusToast(text, type = 'ok') {
  const toast = document.getElementById('hiveSyncToast');
  const toastText = document.getElementById('hiveSyncToastText');
  const icon = toast?.querySelector('.material-symbols-rounded');
  if (!toast) return;
  const isError = type === 'error';
  if (toastText) toastText.textContent = text || (isError ? 'Hive action failed.' : 'Hive action completed.');
  if (icon) icon.textContent = isError ? 'error' : 'check';
  toast.classList.toggle('error', isError);
  toast.classList.add('visible');
  clearTimeout(hiveSyncToastTimer);
  hiveSyncToastTimer = setTimeout(() => {
    toast.classList.remove('visible');
  }, isError ? 6500 : 3200);
}

function getHiveErrorMessage(error) {
  const raw = String(error?.message || error?.details || error?.hint || error || '').trim();
  if (!raw) return 'Cloud sync failed. Check the Invited By ID and database connection.';
  if (raw.includes('violates foreign key constraint')) {
    return 'Cloud sync failed because the Invited By ID parent was not found in the database.';
  }
  if (raw.includes('Parent InviteID')) return raw.replace('InviteID', 'Invited By ID');
  if (raw.includes('Main accounts can only add sub accounts') || raw.includes('Sub accounts can only add main accounts')) return raw;
  if (raw.includes('total_turnover')) return 'The cloud database needs the latest schema update for Total turnover before syncing.';
  if (raw.includes('email')) return 'The cloud database needs the latest schema update for Email before syncing.';
  return `Cloud sync failed: ${raw}`;
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
  const staticSummary = document.getElementById('hiveSummaryStatic');
  if (!summary) return;

  const selected = findNode(hiveData[0], selectedInviteId);
  const selectedNodes = selected ? flattenNodes([selected]) : [];
  const loadedNodes = flattenNodes(hiveData);
  const mainCount = selectedNodes.filter((node) => node.type === 'main').length;
  const subCount = selectedNodes.filter((node) => node.type === 'sub').length;
  const totalAmount = selectedNodes.reduce((sum, node) => sum + Number(node.amount || 0), 0);
  const totalTurnover = selectedNodes.reduce((sum, node) => sum + Number(node.totalTurnover || 0), 0);
  const loadedAmount = loadedNodes.reduce((sum, node) => sum + Number(node.amount || 0), 0);
  const accountShare = loadedNodes.length ? (selectedNodes.length / loadedNodes.length) * 100 : 0;
  const amountShare = loadedAmount ? (totalAmount / loadedAmount) * 100 : 0;
  const pathToRoot = selected ? getPathToRoot(selected.inviteId).map((node) => node.inviteId).join(' -> ') : '';
  const openSlots = selected ? getOpenSlotStats(selected) : { subSlots: 0, mainSlots: 0, total: 0 };
  const health = selected ? getBranchHealth(selected, loadedAmount) : null;

  if (staticSummary) {
    staticSummary.innerHTML = `
      <div class="hive-summary-grid">
        <div class="hive-summary-card wide">
          <div class="hive-summary-label">Selected</div>
          <div class="hive-summary-value">${escapeHtml(selected?.name || 'None')}</div>
          <div class="hive-summary-note">${escapeHtml([selected?.inviteId, selected?.email].filter(Boolean).join(' · '))}</div>
        </div>
        ${selected ? `
          <div class="hive-summary-card wide">
            <div class="hive-summary-label">Referral link</div>
            <div class="hive-copy-row">
              <div class="hive-copy-link" title="${escapeHtml(getReferralLink(selected.inviteId))}">${escapeHtml(getReferralLink(selected.inviteId))}</div>
              <button class="hive-copy-btn" type="button" data-copy-referral="${escapeHtml(selected.inviteId)}">Copy</button>
              <button class="hive-copy-btn" type="button" data-toggle-referral-qr="${escapeHtml(selected.inviteId)}">QR</button>
              <button class="hive-copy-btn" type="button" data-share-referral="${escapeHtml(selected.inviteId)}">Share</button>
            </div>
            <div class="hive-qr-panel" id="hiveReferralQrPanel">
              <img src="${escapeHtml(getReferralQrUrl(selected.inviteId))}" alt="QR code for referral link ${escapeHtml(selected.inviteId)}" data-referral-qr-img>
              <div class="hive-qr-note">Scan to open ${escapeHtml(getReferralLink(selected.inviteId))}</div>
              <div class="hive-qr-note hive-qr-fallback">QR code could not be loaded. Use Copy or Share instead.</div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  summary.innerHTML = `
    <div class="hive-summary-grid">
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
        <div class="hive-summary-label">Personal investment</div>
        <div class="hive-summary-value">$${totalAmount.toLocaleString()}</div>
        <div class="hive-summary-note">${amountShare.toFixed(1)}% of loaded amount</div>
      </div>
      <div class="hive-summary-card">
        <div class="hive-summary-label">Total turnover</div>
        <div class="hive-summary-value">$${totalTurnover.toLocaleString()}</div>
        <div class="hive-summary-note">selected branch</div>
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
      ${renderLegStrengthCard(selected)}
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
        <div class="hive-summary-note">${isolatedRootInviteId ? `Isolated branch root: ${escapeHtml(isolatedRootInviteId)}` : (hiveFocusMode ? 'Focused selected tree' : 'Full loaded Hive')}</div>
      </div>
    </div>
  `;
  document.querySelectorAll('#hiveSummaryStatic [data-copy-referral], #hiveSummary [data-copy-referral]').forEach((button) => {
    button.addEventListener('click', () => copyReferralLink(button.dataset.copyReferral, button));
  });
  document.querySelectorAll('#hiveSummaryStatic [data-toggle-referral-qr], #hiveSummary [data-toggle-referral-qr]').forEach((button) => {
    button.addEventListener('click', () => toggleReferralQr(button));
  });
  document.querySelectorAll('#hiveSummaryStatic [data-share-referral], #hiveSummary [data-share-referral]').forEach((button) => {
    button.addEventListener('click', () => shareReferralLink(button.dataset.shareReferral));
  });
  document.querySelectorAll('#hiveSummaryStatic [data-referral-qr-img], #hiveSummary [data-referral-qr-img]').forEach((image) => {
    image.addEventListener('error', () => handleReferralQrError(image), { once: true });
  });
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

export function openHiveManager() {
  loadLocalHive();
  hiveZoom = readSavedZoom();
  hivePanelCollapsed = readPanelCollapsed();
  hiveFullscreen = true;
  ensureHiveUi();
  document.getElementById('hiveModal').classList.add('open');
  setHiveFullscreen(true);
  setHivePanelCollapsed(hivePanelCollapsed);
  setDefaultMobileAccountCardState();
  updateSyncStatus(isCloudConfigured() ? 'Cloud sync configured. Local cache active.' : 'Local database active. Cloud sync not configured.', isCloudConfigured() ? 'cloud' : 'local');
  const rememberedInviteId = readLastInviteId();
  const lookupInput = document.getElementById('hiveLookupInviteId');
  if (lookupInput && rememberedInviteId) lookupInput.value = rememberedInviteId;
  renderHiveSyncLog();
  renderHive();
  if (isMobileHive()) openMobileHivePanel(getSelectedHiveNode());
  setHiveZoom(hiveZoom);
  checkHiveAppVersion();
  subscribeToHiveRealtime().catch((error) => {
    console.warn('Aurum Hive realtime could not be started.', error);
    updateSyncStatus('Cloud sync configured. Live updates could not connect.', 'local');
  });
  startHiveAutoRefresh();
  if (rememberedInviteId) {
    loadHiveFromLookup().catch((error) => {
      console.warn('Remembered Referral ID could not be loaded.', error);
      setMessage('Saved Referral ID could not be loaded. You can enter it again.', 'error');
    });
  }
}

window.openHiveManager = openHiveManager;

try {
  if (sessionStorage.getItem(HIVE_REOPEN_AFTER_RELOAD_KEY) === '1') {
    sessionStorage.removeItem(HIVE_REOPEN_AFTER_RELOAD_KEY);
    requestAnimationFrame(() => openHiveManager());
  }
} catch (error) {}

window.AurumHiveModule = {
  hiveData,
  configureHiveSupabase,
  configureHiveCloud,
  openHiveManager,
  renderHive,
  addHiveItem,
  editHiveItem,
  removeHiveItem
};
