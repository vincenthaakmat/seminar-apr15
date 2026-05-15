/* Extracted from aurum-calc.html. Keep dependency scripts loaded before this file. */

const PKGS = [
  { key:'basic',    label:'Basic',    min:100,   max:249.99,   daily:0.0035,            monthly:0.105  },
  { key:'standard', label:'Standard', min:250,   max:999.99,   daily:0.00379,           monthly:0.1137 },
  { key:'comfort',  label:'Comfort',  min:1000,  max:2499.99,  daily:0.004083333333333, monthly:0.1225 },
  { key:'optimal',  label:'Optimal',  min:2500,  max:4999.99,  daily:0.004373333333333, monthly:0.1312 },
  { key:'business', label:'Business', min:5000,  max:9999.99,  daily:0.004666666666667, monthly:0.14   },
  { key:'vip',      label:'VIP',      min:10000, max:24999.99, daily:0.00496,           monthly:0.1488 },
  { key:'luxury',   label:'Luxury',   min:25000, max:49999.99, daily:0.00525,           monthly:0.1575 },
  { key:'ultimate', label:'Ultimate', min:50000, max:99999,    daily:0.00554,           monthly:0.1662 }
];

function getPkg(balance) {
  for (let i = PKGS.length - 1; i >= 0; i--) {
    if (balance >= PKGS[i].min) return PKGS[i];
  }
  return PKGS[0];
}

function fmt(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtRange(min, max) {
  return {
    lo: '$' + min.toLocaleString('en-US'),
    hi: max >= 99999 ? '$99,999+' : '$' + max.toLocaleString('en-US')
  };
}

function getTodayLocalISO() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

function getStartDateValue() {
  return document.getElementById('startDate')?.value || getTodayLocalISO();
}

function getStartDateObj() {
  const value = getStartDateValue();
  const date = new Date(value + 'T00:00:00');
  return isNaN(date.getTime()) ? new Date(getTodayLocalISO() + 'T00:00:00') : date;
}

function formatDateDisplay(value) {
  const date = new Date(value + 'T00:00:00');
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(value) {
  const date = new Date(value + 'T00:00:00');
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDateForDay(day) {
  const date = getStartDateObj();
  const offset = Math.max(0, (parseInt(day, 10) || 1) - 1);
  date.setDate(date.getDate() + offset);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

function getDayFromDate(value) {
  const start = getStartDateObj();
  const target = new Date(value + 'T00:00:00');
  if (isNaN(target.getTime())) return 1;
  const diff = Math.round((target - start) / 86400000);
  return Math.max(1, diff + 1);
}

function onStartDateChange() {
  renderSwitchList();
  renderDepositList();
  if (allRows.length) {
    updateChartLabels();
    setView(curView);
  }
}

let chartLabelMode = 'day';

function getChartPointLabel(row) {
  if (!row) return '';
  if (chartLabelMode === 'date') return formatDateShort(getDateForDay(row.day));
  return 'Day ' + row.day;
}

function updateChartModeButtons() {
  const dayBtn = document.getElementById('chartModeDayBtn');
  const dateBtn = document.getElementById('chartModeDateBtn');
  if (dayBtn) dayBtn.classList.toggle('active', chartLabelMode === 'day');
  if (dateBtn) dateBtn.classList.toggle('active', chartLabelMode === 'date');
}

function updateChartLabels() {
  updateChartModeButtons();
  if (!allRows.length) return;
  if (!chartInst || typeof Chart === 'undefined') {
    buildChart(Object.keys(buildSwitchMap()).length > 0 || Object.keys(buildDepositMap()).length > 0);
    return;
  }

  const maxPts = 120;
  const step = Math.max(1, Math.floor(allRows.length / maxPts));
  const pts = allRows.filter((_, i) => i % step === 0 || i === allRows.length - 1);
  const labels = pts.map(r => getChartPointLabel(r));
  chartInst.data.labels = labels;

  if (chartInst.data?.datasets?.[1]) {
    const packageUpgradePts = pts.filter((r, i) => i > 0 && r.pkgKey !== pts[i - 1].pkgKey);
    chartInst.data.datasets[1].data = packageUpgradePts.map(p => ({ x: getChartPointLabel(p), y: +p.projectedValue.toFixed(2), pkg: p.pkgLabel, day: p.day }));
  }
  if (chartInst.data?.datasets?.[2]) {
    const milestonePts = [];
    [10000, 25000, 50000, 100000].forEach(target => {
      const hit = pts.find(p => p.projectedValue >= target);
      if (hit) milestonePts.push(hit);
    });
    chartInst.data.datasets[2].data = milestonePts.map(p => ({ x: getChartPointLabel(p), y: +p.projectedValue.toFixed(2), day: p.day }));
  }

  chartInst.update();
}

function setChartLabelMode(mode) {
  chartLabelMode = mode === 'date' ? 'date' : 'day';
  updateChartLabels();
  if (allRows.length) setView(curView);
}

function getRateTrend(index) {
  if (index <= 0) return { cls: 'flat', arrow: '→', label: 'Base rate' };

  const prev = PKGS[index - 1]?.daily ?? PKGS[index].daily;
  const curr = PKGS[index].daily;

  if (curr > prev) return { cls: 'up', arrow: '▲', label: 'Higher than previous tier' };
  if (curr < prev) return { cls: 'down', arrow: '▼', label: 'Lower than previous tier' };
  return { cls: 'flat', arrow: '→', label: 'Same as previous tier' };
}

function getRateTrendBadge(index, short = false) {
  const trend = getRateTrend(index);
  const text = short ? trend.arrow : `${trend.arrow} ${trend.label}`;
  return `<span class="rate-trend ${trend.cls}" title="${trend.label}">${text}</span>`;
}

function getRateDeltaBadge(currRate, prevRate, short = false) {
  if (typeof currRate !== 'number') {
    return `<span class="rate-trend flat">—</span>`;
  }
  if (typeof prevRate !== 'number') {
    return `<span class="rate-trend flat" title="First visible rate">${short ? '→' : '→ First rate'}</span>`;
  }
  if (currRate > prevRate) {
    return `<span class="rate-trend up" title="Higher than previous visible rate">${short ? '▲' : '▲ Higher'}</span>`;
  }
  if (currRate < prevRate) {
    return `<span class="rate-trend down" title="Lower than previous visible rate">${short ? '▼' : '▼ Lower'}</span>`;
  }
  return `<span class="rate-trend flat" title="Same as previous visible rate">${short ? '→' : '→ Same'}</span>`;
}

function rnd(variance) {
  const f = variance / 100;
  return 1 - Math.random() * f;
}

function onAmountInput() {
  const val  = parseFloat(document.getElementById('amount').value);
  const info = document.getElementById('pkg-info');
  const btn  = document.getElementById('calcBtn');

  if (!val || val < 100) {
    info.className = 'pkg-info warn';
    document.getElementById('pkg-name').textContent  = 'Minimum $100 required';
    document.getElementById('pkg-rates').textContent = '';
    document.getElementById('pkg-range').innerHTML   = '';
    btn.disabled = true;
    return;
  }

  btn.disabled = false;
  const p = getPkg(val);
  const r = fmtRange(p.min, p.max);
  info.className = 'pkg-info';
  document.getElementById('pkg-name').textContent  = p.label;
  const pkgIndex = PKGS.findIndex(x => x.key === p.key);
  document.getElementById('pkg-rates').innerHTML = `${(p.daily*100).toFixed(4)}%/day · ${(p.monthly*100).toFixed(2)}%/month<br><span class="pkg-rate-detail">vs previous tier: ${getRateTrendBadge(pkgIndex)}</span>`;
  document.getElementById('pkg-range').innerHTML   = `Qualifies for balances from <span>${r.lo}</span> to <span>${r.hi}</span>`;
}

function onCompoundToggle() {
  const on = document.getElementById('compoundToggle').checked;
  document.getElementById('compound-sublabel').textContent = on
    ? 'Compounding on — profits re-invested daily'
    : 'Compounding off — profits set aside, principal fixed';
  renderSwitchList();
}

/* ── Switch schedule management ── */
let switches = []; // [{day, mode: 'on'|'off', monthsAfterPrev?: number}]

function addSwitch() {
  const startOn  = document.getElementById('compoundToggle').checked;
  const lastMode = switches.length ? switches[switches.length - 1].mode : (startOn ? 'on' : 'off');
  const nextMode = lastMode === 'on' ? 'off' : 'on';
  const lastDay  = switches.length ? switches[switches.length - 1].day : 1;
  const nextDay  = lastDay + 30;
  switches.push({ day: nextDay, mode: nextMode, monthsAfterPrev: 1 });
  renderSwitchList();
}

function removeSwitch(i) {
  switches.splice(i, 1);
  renderSwitchList();
}

function setSwitchMode(i, mode) {
  switches[i].mode = mode;
  renderSwitchList();
}

function setSwitchDay(i, val) {
  const d = parseInt(val);
  if (!isNaN(d) && d >= 1) {
    switches[i].day = d;
    // Manual day entry becomes an absolute switch point.
    delete switches[i].monthsAfterPrev;
    recalcRelativeSwitchesFrom(i);
  }
}

function setSwitchDate(i, value) {
  if (!value) return;
  switches[i].day = getDayFromDate(value);
  // Manual date entry becomes an absolute switch point.
  delete switches[i].monthsAfterPrev;
  recalcRelativeSwitchesFrom(i);
}

function getBaseDateForSwitch(i) {
  if (i > 0 && switches[i - 1]) return getDateForDay(switches[i - 1].day);
  return getStartDateValue();
}

function getBaseDayForSwitch(i) {
  return (i > 0 && switches[i - 1]) ? switches[i - 1].day : 1;
}

function setSwitchMonths(i, val) {
  const months = parseInt(val, 10);
  if (isNaN(months) || months < 1) return;

  switches[i].monthsAfterPrev = months;
  switches[i].day = calculateDayAfterMonthsFromBase(i, months);

  // Any later switches that were also selected by months should move with this one.
  recalcRelativeSwitchesFrom(i);
}

function calculateDayAfterMonthsFromBase(i, months) {
  const baseDateStr = getBaseDateForSwitch(i);
  if (!baseDateStr) return switches[i]?.day || 1;

  const baseDate = new Date(baseDateStr + 'T00:00:00');
  const targetDate = new Date(baseDate);
  targetDate.setMonth(targetDate.getMonth() + months);

  return Math.max(getBaseDayForSwitch(i) + 1, getDayFromDate(targetDate.toISOString().slice(0, 10)));
}

function recalcRelativeSwitchesFrom(startIndex) {
  for (let j = startIndex + 1; j < switches.length; j++) {
    const months = parseInt(switches[j].monthsAfterPrev, 10);
    if (!isNaN(months) && months >= 1) {
      switches[j].day = calculateDayAfterMonthsFromBase(j, months);
    }
  }
}

function getSelectedMonthValue(sw, i) {
  const saved = parseInt(sw.monthsAfterPrev, 10);
  if (!isNaN(saved) && saved >= 1) return String(saved);

  const monthOptions = [1,2,3,4,5,6,9,12,18,24,36];
  const switchDate = getDateForDay(sw.day);
  const baseDateStr = getBaseDateForSwitch(i);
  if (!switchDate || !baseDateStr) return '';

  for (const m of monthOptions) {
    const d = new Date(baseDateStr + 'T00:00:00');
    d.setMonth(d.getMonth() + m);
    const expected = d.toISOString().slice(0, 10);
    if (expected === switchDate) return String(m);
  }
  return '';
}

function renderSwitchList() {
  const list    = document.getElementById('switchList');
  const hint    = document.getElementById('switchHint');
  const startOn = document.getElementById('compoundToggle').checked;

  switches.sort((a, b) => a.day - b.day);

  list.innerHTML = '';
  hint.style.display = switches.length ? 'none' : '';

  // Show/hide save wrap
  document.getElementById('switchSaveWrap').style.display = (switches.length || deposits.length) ? '' : 'none';

  switches.forEach((sw, i) => {
    const row = document.createElement('div');
    row.className = 'switch-row';

    const toOnCls  = sw.mode === 'on'  ? 'mode-btn active-on'  : 'mode-btn';
    const toOffCls = sw.mode === 'off' ? 'mode-btn active-off' : 'mode-btn';
    const switchDate = getDateForDay(sw.day);

    row.innerHTML = `
      <div class="switch-row-top">
        <span class="switch-row-label">From day</span>
        <input type="number" min="1" value="${sw.day}"
          onchange="setSwitchDay(${i}, this.value); renderSwitchList()"
          oninput="setSwitchDay(${i}, this.value)">
        <span class="switch-row-label">Date</span>
        <input type="date" value="${switchDate}" min="${getStartDateValue()}"
          onchange="setSwitchDate(${i}, this.value); renderSwitchList()">
        <span class="switch-row-label">after ${i === 0 ? 'start' : 'previous switch'}</span>
        <select class="switch-months" onchange="setSwitchMonths(${i}, this.value); renderSwitchList()">
          <option value="">Choose months</option>
          <option value="1" ${getSelectedMonthValue(sw, i) === '1' ? 'selected' : ''}>1 month</option>
          <option value="2" ${getSelectedMonthValue(sw, i) === '2' ? 'selected' : ''}>2 months</option>
          <option value="3" ${getSelectedMonthValue(sw, i) === '3' ? 'selected' : ''}>3 months</option>
          <option value="4" ${getSelectedMonthValue(sw, i) === '4' ? 'selected' : ''}>4 months</option>
          <option value="5" ${getSelectedMonthValue(sw, i) === '5' ? 'selected' : ''}>5 months</option>
          <option value="6" ${getSelectedMonthValue(sw, i) === '6' ? 'selected' : ''}>6 months</option>
          <option value="9" ${getSelectedMonthValue(sw, i) === '9' ? 'selected' : ''}>9 months</option>
          <option value="12" ${getSelectedMonthValue(sw, i) === '12' ? 'selected' : ''}>12 months</option>
          <option value="18" ${getSelectedMonthValue(sw, i) === '18' ? 'selected' : ''}>18 months</option>
          <option value="24" ${getSelectedMonthValue(sw, i) === '24' ? 'selected' : ''}>24 months</option>
          <option value="36" ${getSelectedMonthValue(sw, i) === '36' ? 'selected' : ''}>36 months</option>
        </select>
        <span class="switch-date-pill">${formatDateShort(switchDate)}</span>
      </div>
      <div class="switch-row-bottom">
        <div class="switch-row-mode">
          <button class="${toOnCls}"  onclick="setSwitchMode(${i},'on')">↑ Compound</button>
          <button class="${toOffCls}" onclick="setSwitchMode(${i},'off')">→ Simple</button>
        </div>
        <button class="switch-remove" onclick="removeSwitch(${i})" title="Remove">✕</button>
      </div>
    `;
    list.appendChild(row);
  });

  renderSavedSchedules();
updateChartModeButtons();
try { applyTheme(localStorage.getItem('aurum_theme') || 'light'); } catch (e) { applyTheme('light'); }
}

/* ── Schedule persistence ── */
const SCHED_KEY = 'aurum_switch_schedules';

function loadSchedulesFromStorage() {
  try { return JSON.parse(localStorage.getItem(SCHED_KEY)) || []; }
  catch(e) { return []; }
}

function saveSchedulesToStorage(schedules) {
  try { localStorage.setItem(SCHED_KEY, JSON.stringify(schedules)); } catch(e) {}
}

function saveSchedule() {
  const name = document.getElementById('scheduleName').value.trim();
  if (!name) { document.getElementById('scheduleName').focus(); return; }
  if (!switches.length && !deposits.length) return;

  const startOn   = document.getElementById('compoundToggle').checked;
  const schedules = loadSchedulesFromStorage();
  schedules.push({
    id: Date.now(),
    name,
    startOn,
    switches: switches.map(s => ({ ...s })),
    deposits: deposits.map(d => ({ day: Number(d.day) || 1, amount: normalizeDepositAmount(d.amount) }))
  });
  saveSchedulesToStorage(schedules);
  document.getElementById('scheduleName').value = '';
  renderSavedSchedules();
}

function loadSchedule(id) {
  const schedules = loadSchedulesFromStorage();
  const sched = schedules.find(s => s.id === id);
  if (!sched) return;

  switches = Array.isArray(sched.switches) ? sched.switches.map(s => ({ ...s })) : [];
  deposits = Array.isArray(sched.deposits) ? sched.deposits.map(d => ({ day: Number(d.day) || 1, amount: normalizeDepositAmount(d.amount) })) : [];
  document.getElementById('compoundToggle').checked = sched.startOn;
  onCompoundToggle();  // updates sublabel + re-renders list
  renderDepositList();
}

function deleteSchedule(id) {
  const schedules = loadSchedulesFromStorage().filter(s => s.id !== id);
  saveSchedulesToStorage(schedules);
  renderSavedSchedules();
}

function renderSavedSchedules() {
  const schedules = loadSchedulesFromStorage();
  const wrap = document.getElementById('savedSchedulesWrap');
  const list = document.getElementById('savedSchedulesList');

  if (!schedules.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  list.innerHTML = '';

  schedules.forEach(sched => {
    const row = document.createElement('div');
    row.className = 'saved-schedule-row';
    const switchCount = sched.switches?.length || 0;
    const depositCount = sched.deposits?.length || 0;
    const firstDay = sched.switches?.[0]?.day || sched.deposits?.[0]?.day || 1;
    const meta = `${switchCount} switch${switchCount !== 1 ? 'es' : ''} · ${depositCount} deposit${depositCount !== 1 ? 's' : ''} · starts ${sched.startOn ? '↑ compound' : '→ simple'} · first ${formatDateShort(getDateForDay(firstDay))}`;
    row.innerHTML = `
      <span class="saved-schedule-name" title="${sched.name}">${sched.name}</span>
      <span class="saved-schedule-meta">${meta}</span>
      <button class="ss-btn load" onclick="loadSchedule(${sched.id})">Load</button>
      <button class="ss-btn del"  onclick="deleteSchedule(${sched.id})">✕</button>
    `;
    list.appendChild(row);
  });
}

/* ── Deposit schedule management ── */
let deposits = []; // [{day, amount}]

function normalizeDepositAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function addDeposit() {
  const lastDay = deposits.length ? deposits[deposits.length - 1].day : 1;
  deposits.push({ day: lastDay + 30, amount: 1000 });
  renderDepositList();
}

function removeDeposit(i) {
  deposits.splice(i, 1);
  renderDepositList();
}

function setDepositDay(i, val) {
  const d = parseInt(val, 10);
  if (!isNaN(d) && d >= 1 && deposits[i]) deposits[i].day = d;
}

function setDepositDate(i, value) {
  if (!value || !deposits[i]) return;
  deposits[i].day = getDayFromDate(value);
}

function setDepositAmount(i, val) {
  if (!deposits[i]) return;
  deposits[i].amount = normalizeDepositAmount(val);
}

function renderDepositList() {
  const list = document.getElementById('depositList');
  const hint = document.getElementById('depositHint');
  if (!list) return;

  deposits.sort((a, b) => a.day - b.day);
  list.innerHTML = '';
  if (hint) hint.style.display = deposits.length ? 'none' : '';
  const saveWrap = document.getElementById('switchSaveWrap');
  if (saveWrap) saveWrap.style.display = (switches.length || deposits.length) ? '' : 'none';

  deposits.forEach((dep, i) => {
    const row = document.createElement('div');
    row.className = 'switch-row deposit-row';
    const depositDate = getDateForDay(dep.day);
    row.innerHTML = `
      <div class="switch-row-top">
        <span class="switch-row-label">On day</span>
        <input type="number" min="1" value="${dep.day}"
          onchange="setDepositDay(${i}, this.value); renderDepositList()"
          oninput="setDepositDay(${i}, this.value)">
        <span class="switch-row-label">Date</span>
        <input type="date" value="${depositDate}" min="${getStartDateValue()}"
          onchange="setDepositDate(${i}, this.value); renderDepositList()">
        <span class="switch-row-label">Deposit</span>
        <input class="deposit-amount-input" type="number" min="0" step="0.01" value="${normalizeDepositAmount(dep.amount)}"
          onchange="setDepositAmount(${i}, this.value); renderDepositList()"
          oninput="setDepositAmount(${i}, this.value)">
        <span class="switch-date-pill">+${fmt(normalizeDepositAmount(dep.amount))}</span>
      </div>
      <div class="switch-row-bottom">
        <button class="switch-remove" onclick="removeDeposit(${i})" title="Remove">✕</button>
      </div>
    `;
    list.appendChild(row);
  });

  try { applyTheme(localStorage.getItem('aurum_theme') || 'light'); } catch (e) { applyTheme('light'); }
}

let allRows   = [];
let chartInst = null;
let curView   = 'daily';
let lastCalcSummary = null;
let lastCompareSummary = null;
let lastMilestones = [];

function applyAmountPreset(amount) {
  document.getElementById('amount').value = amount;
  onAmountInput();
}

function applyYearPreset(years) {
  document.getElementById('years').value = years;
}

function resetCalculator() {
  document.getElementById('amount').value = 7700;
  document.getElementById('startDate').value = getTodayLocalISO();
  document.getElementById('years').value = 1;
  document.getElementById('variance').value = 30;
  document.getElementById('compoundToggle').checked = true;
  switches = [];
  deposits = [];
  document.getElementById('scheduleName').value = '';
  document.getElementById('results').className = 'results';
  lastCalcSummary = null;
  lastCompareSummary = null;
  lastMilestones = [];
  if (chartInst) { chartInst.destroy(); chartInst = null; }
  onCompoundToggle();
  renderDepositList();
  onAmountInput();
}

function animateValue(el, endValue, formatter, duration = 1800, startValue = 0) {
  if (!el) return;
  const start = performance.now();
  const safeEnd = Number(endValue) || 0;
  const safeStart = Number(startValue) || 0;
  el.classList.add('rolling-number');

  function frame(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 4);
    const slotBoost = p < 0.82 ? Math.sin(p * 24) * (safeEnd - safeStart) * 0.01 : 0;
    const value = safeStart + ((safeEnd - safeStart) * eased) + slotBoost;
    el.textContent = formatter(value);
    if (p < 1) {
      requestAnimationFrame(frame);
    } else {
      el.textContent = formatter(safeEnd);
      el.classList.remove('rolling-number');
    }
  }

  requestAnimationFrame(frame);
}

function animateTextNumber(el, valueText, duration = 1800) {
  if (!el) return;
  const match = String(valueText).match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    el.textContent = valueText;
    return;
  }
  const end = parseFloat(match[1]);
  const decimals = (match[1].split('.')[1] || '').length;
  const prefix = valueText.slice(0, match.index);
  const suffix = valueText.slice(match.index + match[1].length);
  animateValue(el, end, v => `${prefix}${v.toFixed(decimals)}${suffix}`, duration);
}

function simulateMode(initial, numDays, forceCompound, offsets, depositMap = {}) {
  let balance = initial;
  let totalProfit = 0;
  let simplePrincipal = initial;
  let cumulativeDeposits = 0;
  let cumulativeValue = initial;
  let crossoverDay = null;
  for (let d = 1; d <= numDays; d++) {
    const depositToday = normalizeDepositAmount(depositMap[d]);
    if (depositToday > 0) {
      cumulativeDeposits += depositToday;
      if (forceCompound) balance += depositToday;
      else simplePrincipal += depositToday;
    }
    const principal = forceCompound ? balance : simplePrincipal;
    const pkg = getPkg(principal);
    const offset = offsets[d - 1];
    const profit = principal * pkg.daily * offset;
    totalProfit += profit;
    if (forceCompound) {
      balance += profit;
      cumulativeValue = balance;
    } else {
      cumulativeValue = initial + cumulativeDeposits + totalProfit;
    }
    if (crossoverDay === null && cumulativeValue >= (initial + cumulativeDeposits) * 2) crossoverDay = d;
  }
  return {
    finalValue: forceCompound ? balance : initial + cumulativeDeposits + totalProfit,
    totalProfit,
    crossoverDay
  };
}

function setCompare(summary) {
  lastCompareSummary = summary;
  animateValue(document.getElementById('compare-compound-final'), summary.compound.finalValue, fmt, 2200);
  document.getElementById('compare-compound-note').textContent = `Profit ${fmt(summary.compound.totalProfit)} · ${summary.compound.crossoverDay ? 'Doubles on day ' + summary.compound.crossoverDay : 'No double within period'}`;
  animateValue(document.getElementById('compare-simple-final'), summary.simple.finalValue, fmt, 2300);
  document.getElementById('compare-simple-note').textContent = `Profit ${fmt(summary.simple.totalProfit)} · ${summary.simple.crossoverDay ? 'Doubles on day ' + summary.simple.crossoverDay : 'No double within period'}`;
  const diff = summary.compound.finalValue - summary.simple.finalValue;
  animateValue(document.getElementById('compare-difference'), diff, fmt, 2400);
  if (summary.simple.finalValue > 0) {
    animateValue(document.getElementById('compare-difference-pct'), (diff / summary.simple.finalValue) * 100, v => v.toFixed(1) + '%', 2500);
  } else {
    document.getElementById('compare-difference-pct').textContent = '—';
  }
  document.getElementById('compare-best-mode').textContent = diff >= 0 ? 'Compound' : 'Simple';
  if (summary.compound.crossoverDay) {
    animateTextNumber(document.getElementById('compare-crossover-day'), 'Day ' + summary.compound.crossoverDay, 2100);
  } else {
    document.getElementById('compare-crossover-day').textContent = '—';
  }
}

function setMilestones(milestones) {
  lastMilestones = milestones;
  const list = document.getElementById('milestonesList');
  list.innerHTML = '';
  if (!milestones.length) {
    list.innerHTML = '<span class="milestone-chip"><span class="material-symbols-rounded">flag</span>No milestone crossed within this projection yet</span>';
    return;
  }
  milestones.slice(0, 12).forEach(item => {
    const chip = document.createElement('span');
    chip.className = 'milestone-chip';
    chip.innerHTML = `<span class="material-symbols-rounded">${item.icon || 'flag'}</span>${item.label}`;
    list.appendChild(chip);
  });
}

function applyTheme(mode) {
  const dark = mode === 'dark';
  document.body.classList.toggle('dark-mode', dark);
  document.getElementById('themeToggleLabel').textContent = dark ? 'Light mode' : 'Dark mode';
  document.getElementById('themeToggleIcon').textContent = dark ? 'light_mode' : 'dark_mode';
  try { localStorage.setItem('aurum_theme', mode); } catch (e) {}
}

function toggleTheme() {
  applyTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark');
}

function setInsights(initial, numDays, totalProfit, finalBalance, startOn, switchCount, compoundDays, simpleDays) {
  const bestPkg = allRows.reduce((best, row) => {
    const bestIdx = PKGS.findIndex(p => p.key === best.pkgKey);
    const rowIdx  = PKGS.findIndex(p => p.key === row.pkgKey);
    return rowIdx > bestIdx ? row : best;
  }, allRows[0]);
  const highestProfitRow = allRows.reduce((best, row) => row.profit > best.profit ? row : best, allRows[0]);
  const avgDailyProfit = totalProfit / numDays;

  let doubledRow = allRows.find(row => {
    const investedToDate = initial + allRows.slice(0, row.day).reduce((s, r) => s + (r.deposit || 0), 0);
    return row.projectedValue >= investedToDate * 2;
  });
  if (!doubledRow) {
    let sum = 0, deposited = 0;
    for (const row of allRows) {
      sum += row.profit;
      deposited += row.deposit || 0;
      if (!row.isCompound && initial + deposited + sum >= (initial + deposited) * 2) { doubledRow = row; break; }
    }
  }

  const firstBestDay = allRows.find(r => r.pkgKey === bestPkg.pkgKey)?.day || 1;
  document.getElementById('insight-best-package').textContent = bestPkg.pkgLabel;
  document.getElementById('insight-best-package-note').textContent = `Reached on day ${firstBestDay} · Final balance ${fmt(finalBalance)}`;

  animateValue(document.getElementById('insight-high-profit'), highestProfitRow.profit, fmt, 2000);
  document.getElementById('insight-high-profit-note').textContent = `Day ${highestProfitRow.day} · ${highestProfitRow.pkgLabel} · ${(highestProfitRow.rate * 100).toFixed(4)}% daily`; 

  if (doubledRow) {
    const investedAtDouble = initial + allRows.slice(0, doubledRow.day).reduce((s, r) => s + (r.deposit || 0), 0);
    animateTextNumber(document.getElementById('insight-double'), `Day ${doubledRow.day}`, 2100);
    document.getElementById('insight-double-note').textContent = `Your projected value crosses ${fmt(investedAtDouble * 2)} on day ${doubledRow.day}`;
  } else {
    document.getElementById('insight-double').textContent = 'Not reached';
    document.getElementById('insight-double-note').textContent = `Projection ends at ${fmt(finalBalance)} total projected value`;
  }

  animateValue(document.getElementById('insight-avg-profit'), avgDailyProfit, fmt, 2200);
  document.getElementById('insight-avg-profit-note').textContent = switchCount
    ? `${compoundDays} days compound · ${simpleDays} days simple`
    : `${startOn ? 'Compounding' : 'Simple'} mode for all ${numDays} days`;
}



function buildSwitchMap() {
  const map = {};
  (switches || []).forEach(sw => {
    const day = parseInt(sw?.day, 10);
    const mode = sw?.mode === 'off' ? 'off' : 'on';
    if (!isNaN(day) && day >= 1) map[day] = mode;
  });
  return map;
}

function buildDepositMap(source = deposits) {
  const map = {};
  (source || []).forEach(dep => {
    const day = parseInt(dep?.day, 10);
    const amount = normalizeDepositAmount(dep?.amount);
    if (!isNaN(day) && day >= 1 && amount > 0) map[day] = (map[day] || 0) + amount;
  });
  return map;
}

function calculate() {
  const initial  = parseFloat(document.getElementById('amount').value);
  const years    = Math.min(10, Math.max(0.0833, parseFloat(document.getElementById('years').value) || 1));
  const numDays  = Math.round(years * 365);
  const variance = Math.min(60, Math.max(0, parseFloat(document.getElementById('variance').value) || 0));
  const startOn  = document.getElementById('compoundToggle').checked;
  if (!initial || initial < 100) return;

  const switchMap = buildSwitchMap();
  Object.keys(switchMap).forEach(day => { if (+day > numDays) delete switchMap[day]; });
  const hasSwitches = Object.keys(switchMap).length > 0;
  const depositMap = buildDepositMap();
  Object.keys(depositMap).forEach(day => { if (+day > numDays) delete depositMap[day]; });
  const hasDeposits = Object.keys(depositMap).length > 0;

  allRows = [];
  let balance = initial, profitPool = 0, simplePrincipal = initial, isCompound = startOn;
  let switchCount = 0, compoundDays = 0, simpleDays = 0, cumulativeProfit = 0, cumulativeDeposits = 0;
  const offsets = [];

  for (let d = 1; d <= numDays; d++) {
    const switched = switchMap[d] !== undefined;
    if (switched) {
      const newMode = switchMap[d] === 'on';
      if (!isCompound && newMode) { balance = simplePrincipal; profitPool = 0; }
      else if (isCompound && !newMode) { simplePrincipal = balance; profitPool = 0; }
      isCompound = newMode;
      switchCount++;
    }
    const depositToday = normalizeDepositAmount(depositMap[d]);
    if (depositToday > 0) {
      cumulativeDeposits += depositToday;
      if (isCompound) balance += depositToday;
      else simplePrincipal += depositToday;
    }
    const pkg = getPkg(isCompound ? balance : simplePrincipal);
    const offset = rnd(variance);
    offsets.push(offset);
    let actualProfit, startBal, endBal;
    if (isCompound) {
      compoundDays++;
      actualProfit = balance * pkg.daily * offset;
      startBal = balance;
      balance += actualProfit;
      endBal = balance;
    } else {
      simpleDays++;
      actualProfit = simplePrincipal * pkg.daily * offset;
      profitPool += actualProfit;
      startBal = simplePrincipal;
      endBal = simplePrincipal;
    }
    cumulativeProfit += actualProfit;
    allRows.push({
      day: d,
      pkgKey: pkg.key, pkgLabel: pkg.label,
      start: startBal, profit: actualProfit, end: endBal,
      rate: pkg.daily * offset,
      isCompound, switched,
      deposit: depositToday,
      deposited: depositToday > 0,
      projectedValue: isCompound ? endBal : initial + cumulativeDeposits + cumulativeProfit
    });
  }

  const finalBalance = allRows[allRows.length - 1].projectedValue;
  const totalProfit  = allRows.reduce((sum, r) => sum + r.profit, 0);
  const totalDeposits = Object.values(depositMap).reduce((sum, amount) => sum + amount, 0);
  const totalInvested = initial + totalDeposits;
  const roi          = (totalProfit / totalInvested) * 100;
  const yLabel       = years === 1 ? '1 year' : years + ' years';

  animateValue(document.getElementById('m-start'), initial, fmt, 1700);
  animateValue(document.getElementById('m-profit'), totalProfit, fmt, 2100);
  animateValue(document.getElementById('m-final'), finalBalance, fmt, 2350);
  animateValue(document.getElementById('m-roi'), roi, v => v.toFixed(1) + '%', 2550);
  document.getElementById('m-sub').textContent = `${yLabel} · ${numDays} days`;
  document.getElementById('chart-label').textContent = `Portfolio growth · ${yLabel} · start ${fmt(initial)}` + (hasDeposits ? ` · deposits ${fmt(totalDeposits)}` : '') + (hasSwitches ? ` · ${switchCount} switch${switchCount !== 1 ? 'es' : ''}` : '');

  const badge = document.getElementById('mode-badge');
  if (hasSwitches) {
    badge.className = 'mode-badge simple';
    badge.textContent = `${switchCount} compounding switch${switchCount !== 1 ? 'es' : ''}`;
  } else {
    badge.className = startOn ? 'mode-badge compound' : 'mode-badge simple';
    badge.textContent = startOn ? 'Compounding' : 'Simple (no compounding)';
  }

  setInsights(initial, numDays, totalProfit, finalBalance, startOn, switchCount, compoundDays, simpleDays);

  const switchCard = document.getElementById('m-switches-card');
  const banner = document.getElementById('summaryBanner');
  if (hasSwitches) {
    switchCard.style.display = '';
    banner.classList.add('has-switches');
    animateValue(document.getElementById('m-switches'), switchCount, v => Math.round(v).toString(), 1600);
    document.getElementById('m-switches-sub').textContent = `${compoundDays}d compound · ${simpleDays}d simple`;
  } else {
    switchCard.style.display = 'none';
    banner.classList.remove('has-switches');
  }

  setCompare({
    compound: simulateMode(initial, numDays, true, offsets, depositMap),
    simple: simulateMode(initial, numDays, false, offsets, depositMap)
  });

  const milestones = [];
  const seenPkg = new Set();
  allRows.forEach(row => {
    if (!seenPkg.has(row.pkgKey)) {
      seenPkg.add(row.pkgKey);
      const idx = PKGS.findIndex(p => p.key === row.pkgKey);
      if (idx > 0) milestones.push({ day: row.day, label: `${row.pkgLabel} reached on day ${row.day}`, icon: 'workspace_premium' });
    }
  });
  [10000, 25000, 50000, 100000, totalInvested * 2].forEach(target => {
    const hit = allRows.find(r => r.projectedValue >= target);
    if (hit) milestones.push({ day: hit.day, label: target === totalInvested * 2 ? `Invested capital doubled by day ${hit.day}` : `${fmt(target)} reached on day ${hit.day}`, icon: target === totalInvested * 2 ? 'bolt' : 'flag' });
  });
  const highProfitRow = allRows.reduce((best, row) => row.profit > best.profit ? row : best, allRows[0]);
  milestones.push({ day: highProfitRow.day, label: `Highest daily profit ${fmt(highProfitRow.profit)} on day ${highProfitRow.day}`, icon: 'trending_up' });
  milestones.sort((a, b) => a.day - b.day);
  setMilestones(milestones);

  lastCalcSummary = { initial, years, numDays, variance, startOn, switchCount, compoundDays, simpleDays, finalBalance, totalProfit, totalDeposits, totalInvested, roi, yLabel, offsets };

  document.getElementById('results').className = 'results visible';
  try { buildChart(hasSwitches || hasDeposits); } catch (e) { console.error('Chart build failed', e); }
  setView(curView);
  setTimeout(() => document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
}

function buildChart(randomMode) {
  const canvas = document.getElementById('growthChart');
  const legend = document.getElementById('chartLegend');
  if (!canvas) return;
  if (chartInst) { try { chartInst.destroy(); } catch(e) {} chartInst = null; }
  if (typeof Chart === 'undefined') {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
      ctx.save();
      ctx.fillStyle = '#64748B';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Chart unavailable, but calculations are ready below.', (canvas.width || 600) / 2, 40);
      ctx.fillText('Core calculator works fully inside this HTML file.', (canvas.width || 600) / 2, 64);
      ctx.restore();
    }
    if (legend) legend.style.display = 'none';
    return;
  }
  const maxPts = 120;
  const step   = Math.max(1, Math.floor(allRows.length / maxPts));
  const pts    = allRows.filter((_, i) => i % step === 0 || i === allRows.length - 1);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const grad = ctx.createLinearGradient(0, 0, 0, 270);
  grad.addColorStop(0, 'rgba(37,99,235,0.22)');
  grad.addColorStop(1, 'rgba(37,99,235,0.02)');
  const pointColors = pts.map(r => r.deposited ? '#0EA5E9' : (r.isCompound ? '#16A34A' : '#D97706'));
  const pointRadii  = pts.map(r => (r.switched || r.deposited) ? 5 : 0);
  const packageUpgradePts = pts.filter((r, i) => i > 0 && r.pkgKey !== pts[i - 1].pkgKey);
  const milestonePts = [];
  [10000, 25000, 50000, 100000].forEach(target => {
    const hit = pts.find(p => p.projectedValue >= target);
    if (hit) milestonePts.push(hit);
  });
  chartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels: pts.map(r => getChartPointLabel(r)),
      datasets: [{
        data: pts.map(r => +r.projectedValue.toFixed(2)),
        borderColor: randomMode ? pts.map(r => r.isCompound ? '#2563EB' : '#D97706') : '#2563EB',
        backgroundColor: grad,
        borderWidth: 2.5,
        pointRadius: randomMode ? pointRadii : 0,
        pointBackgroundColor: pointColors,
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
        fill: true,
        tension: 0.35,
        segment: randomMode ? { borderColor: c => pts[c.p0DataIndex] && pts[c.p0DataIndex].isCompound ? '#2563EB' : '#D97706' } : undefined
      }, {
        type: 'scatter', label: 'Package upgrade',
        data: packageUpgradePts.map(p => ({ x: getChartPointLabel(p), y: +p.projectedValue.toFixed(2), pkg: p.pkgLabel, day: p.day })),
        pointRadius: 5, pointHoverRadius: 6, pointBackgroundColor: '#8B5CF6', pointBorderColor: '#fff', pointBorderWidth: 2
      }, {
        type: 'scatter', label: 'Milestone',
        data: milestonePts.map(p => ({ x: getChartPointLabel(p), y: +p.projectedValue.toFixed(2), day: p.day })),
        pointRadius: 4, pointHoverRadius: 5, pointBackgroundColor: '#06B6D4', pointBorderColor: '#fff', pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => items?.[0]?.label || '',
            label: c => fmt(c.parsed.y),
            afterLabel: c => {
              if (c.dataset.label === 'Package upgrade') return `Package upgrade · ${c.raw.pkg}`;
              if (c.dataset.label === 'Milestone') return `Milestone hit around ${chartLabelMode === 'date' ? formatDateShort(getDateForDay(c.raw.day)) : 'day ' + c.raw.day}`;
              const ri = Math.min(Math.round(c.dataIndex * step), allRows.length - 1);
              const r = allRows[ri];
              const lines = ['Package: ' + r.pkgLabel, 'Projected value: ' + fmt(r.projectedValue)];
              if (randomMode) lines.push('Mode: ' + (r.isCompound ? '⬆ Compounding' : '➡ Simple'));
              if (r.deposited) lines.push('Deposit: +' + fmt(r.deposit || 0));
              if (r.switched) lines.push('⚡ Switch ' + (chartLabelMode === 'date' ? formatDateShort(getDateForDay(r.day)) : 'day ' + r.day));
              return lines;
            }
          },
          backgroundColor: '#0F172A', borderColor: '#334155', borderWidth: 1, titleColor: '#94A3B8', bodyColor: '#FFFFFF', padding: 10, cornerRadius: 8
        }
      },
      scales: {
        x: { grid: { color: 'rgba(148,163,184,0.14)' }, ticks: { color: '#94A3B8', font: { size: 11, family: 'Inter' }, maxTicksLimit: 8 } },
        y: { grid: { color: 'rgba(148,163,184,0.14)' }, ticks: { color: '#94A3B8', font: { size: 11, family: 'Inter' }, callback: v => v >= 1e6 ? '$'+(v/1e6).toFixed(1)+'M' : v >= 1000 ? '$'+(v/1000).toFixed(0)+'k' : '$'+v.toFixed(0) } }
      }
    }
  });
  document.getElementById('chartLegend').style.display = 'flex';
}

const VIEW_SIZE   = { daily:1, weekly:7, monthly:30, quarterly:91, yearly:365 };
const VIEW_LABELS = { daily:'Day', weekly:'Week', monthly:'Month', quarterly:'Quarter', yearly:'Year' };

function getDetailPeriodHeader(view) {
  if (chartLabelMode !== 'date') return VIEW_LABELS[view];
  return view === 'daily' ? 'Date' : 'Date range';
}

function getDetailRateHeader(view) {
  const label = view === 'quarterly' ? 'Quarterly' : `${VIEW_LABELS[view]}ly`;
  return `${label} percentage`;
}

function getDetailBucketLabel(view, startDay, endDay, num) {
  if (chartLabelMode !== 'date') {
    const prefix = view === 'quarterly' ? 'Q' : VIEW_LABELS[view] + ' ';
    return prefix + num;
  }

  const startLabel = formatDateShort(getDateForDay(startDay));
  const endLabel = formatDateShort(getDateForDay(endDay));
  if (view === 'daily' || startDay === endDay) return startLabel;
  return `${startLabel} – ${endLabel}`;
}

function aggregate(rows, view) {
  if (view === 'daily') {
    return rows.map(r => ({
      label: getDetailBucketLabel('daily', r.day, r.day, r.day),
      pkgKey: r.pkgKey, pkgLabel: r.pkgLabel,
      start: r.start, profit: r.profit, end: r.projectedValue,
      rate: r.start ? r.profit / r.start : r.rate,
      isCompound: r.isCompound, switched: r.switched,
      deposit: r.deposit || 0,
      deposited: !!r.deposited,
      startDay: r.day,
      endDay: r.day
    }));
  }

  const size    = VIEW_SIZE[view];
  const buckets = [];
  let num = 1;

  for (let i = 0; i < rows.length; i += size) {
    const chunk  = rows.slice(i, i + size);
    const start  = chunk[0].start;
    const end    = chunk[chunk.length - 1].projectedValue;
    const profit = chunk.reduce((s, r) => s + r.profit, 0);
    const deposit = chunk.reduce((s, r) => s + (r.deposit || 0), 0);
    const hasSwitches = chunk.some(r => r.switched);
    const hasDeposits = deposit > 0;
    const compoundDays = chunk.filter(r => r.isCompound).length;
    const startDay = chunk[0].day;
    const endDay = chunk[chunk.length - 1].day;

    const counts = {};
    chunk.forEach(r => { counts[r.pkgKey] = (counts[r.pkgKey] || 0) + 1; });
    const topKey = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const pkg    = PKGS.find(p => p.key === topKey);

    const intervalRate = start ? profit / start : 0;

    buckets.push({
      label: getDetailBucketLabel(view, startDay, endDay, num),
      pkgKey: pkg.key, pkgLabel: pkg.label,
      start, profit, end,
      rate: intervalRate,
      switched: hasSwitches,
      deposit,
      deposited: hasDeposits,
      isCompound: compoundDays > chunk.length / 2,
      startDay,
      endDay
    });
    num++;
  }

  return buckets;
}

function setView(view) {
  curView = view;
  document.querySelectorAll('.filter-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.v === view)
  );
  document.getElementById('th-period').textContent = getDetailPeriodHeader(view);
  const rateHeader = document.getElementById('th-rate');
  if (rateHeader) rateHeader.textContent = getDetailRateHeader(view);

  const buckets     = aggregate(allRows, view);
  const tbody       = document.getElementById('tableBody');
  tbody.innerHTML   = '';
  let prevPkgKey    = null;
  const hasSwitches = switches.length > 0;
  const hasDeposits = deposits.length > 0;

  let phaseProfit  = 0;
  let phaseStart   = null;   // ending balance at phase start (for compound: to show growth)
  let phaseIsComp  = null;   // current phase mode

  function flushSubtotal(closingMode) {
    if (phaseIsComp === null || phaseProfit === 0) return;
    const sub = document.createElement('tr');
    if (closingMode) {
      // compound phase ending
      sub.className = 'subtotal-row-compound';
      sub.innerHTML =
        `<td colspan="2">↑ Compound phase total profit</td>` +
        `<td>—</td><td>—</td><td>—</td>` +
        `<td>+${fmt(phaseProfit)}</td>` +
        `<td>—</td>`;
    } else {
      // simple phase ending
      sub.className = 'subtotal-row';
      sub.innerHTML =
        `<td colspan="2">→ Simple phase total profit</td>` +
        `<td>—</td><td>—</td><td>—</td>` +
        `<td>+${fmt(phaseProfit)}</td>` +
        `<td>—</td>`;
    }
    tbody.appendChild(sub);
    phaseProfit = 0;
    phaseStart  = null;
  }

  buckets.forEach((b, idx) => {
    const tierChanged = prevPkgKey && b.pkgKey !== prevPkgKey;
    const prevBucket  = idx > 0 ? buckets[idx - 1] : null;
    const modeFlipped = hasSwitches && prevBucket && b.isCompound !== prevBucket.isCompound;

    if (hasSwitches) {
      if (phaseIsComp === null) {
        // First bucket — start tracking
        phaseIsComp = b.isCompound;
        phaseStart  = b.start;
      } else if (modeFlipped) {
        // Phase ended — flush subtotal then start new phase
        flushSubtotal(phaseIsComp);
        phaseIsComp = b.isCompound;
        phaseStart  = b.start;
      }
      phaseProfit += b.profit;
    }

    const tr = document.createElement('tr');
    const classes = [];
    if (tierChanged) classes.push('tier-change');
    if (b.switched) classes.push('switch-day-row');
    if (b.deposited) classes.push('switch-day-row');
    if (classes.length) tr.className = classes.join(' ');

    let modePill = '';
    if (hasSwitches) {
      if (b.isCompound !== undefined) {
        modePill = b.isCompound
          ? '<span class="switch-pill on">↑ C</span>'
          : '<span class="switch-pill off">→ S</span>';
      }
      if (b.switched) {
        modePill += '<span class="switch-pill" style="background:#EFF6FF;color:#2563EB;border-color:#BFDBFE;">⚡</span>';
      }
    }
    if (hasDeposits && b.deposited) {
      modePill += `<span class="switch-pill deposit">+${fmt(b.deposit)}</span>`;
    }

    const prevRate = prevBucket && prevBucket.rate !== undefined ? prevBucket.rate : undefined;
    const rateHtml = b.rate !== undefined
      ? `${(b.rate * 100).toFixed(4)}% ${getRateDeltaBadge(b.rate, prevRate, true)}`
      : '—';

    tr.innerHTML =
      `<td>${b.label}${modePill}</td>` +
      `<td><span class="pkg-pill">${b.pkgLabel}</span></td>` +
      `<td class="col-start">${fmt(b.start)}</td>` +
      `<td class="col-deposit">${b.deposit ? '+' + fmt(b.deposit) : '—'}</td>` +
      `<td class="col-rate">${rateHtml}</td>` +
      `<td class="col-profit">+${fmt(b.profit)}</td>` +
      `<td class="col-end">${fmt(b.end)}</td>`;

    tbody.appendChild(tr);
    prevPkgKey = b.pkgKey;
  });

  // Flush final phase subtotal at end of projection
  if (hasSwitches) flushSubtotal(phaseIsComp);
}

/* ─────────────────────────────────────────
   Package settings panel
───────────────────────────────────────── */
const PKG_DEFAULTS = PKGS.map(p => ({ ...p }));

// Restore any previously saved rates from localStorage
(function loadSavedRates() {
  try {
    const saved = localStorage.getItem('aurum_pkg_rates');
    if (!saved) return;
    const rates = JSON.parse(saved);
    rates.forEach((r, i) => {
      if (PKGS[i] && typeof r.daily === 'number' && typeof r.monthly === 'number') {
        PKGS[i].daily   = r.daily;
        PKGS[i].monthly = r.monthly;
      }
    });
  } catch(e) {}
})();

document.getElementById('startDate').value = getTodayLocalISO();
onAmountInput();
onCompoundToggle();
renderSwitchList();
renderDepositList();
renderSavedSchedules();

function openSettings() {
  buildSettingsRows();
  document.getElementById('overlay').classList.add('open');
  document.getElementById('settingsPanel').classList.add('open');
}

function closeSettings() {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('settingsPanel').classList.remove('open');
}

function buildSettingsRows() {
  const body = document.getElementById('spBody');
  body.innerHTML = '';

  PKGS.forEach((pkg, i) => {
    const def       = PKG_DEFAULTS[i];
    const dailyPct  = +(pkg.daily * 100).toFixed(6);
    const monthlyPct= +(pkg.monthly * 100).toFixed(4);
    const isChanged = Math.abs(pkg.daily - def.daily) > 1e-10;

    const row = document.createElement('div');
    row.className = 'sp-pkg-row';
    row.innerHTML = `
      <div>
        <p class="sp-pkg-name ${isChanged ? 'sp-changed' : ''}">${pkg.label} ${getRateTrendBadge(i)}</p>
        <p class="sp-pkg-range">$${pkg.min.toLocaleString()} – ${pkg.max >= 99999 ? '$99,999+' : '$'+pkg.max.toLocaleString()}</p>
      </div>
      <div class="sp-field">
        <label>Daily %</label>
        <div class="sp-input-wrap">
          <input type="number" id="sp-daily-${i}" value="${dailyPct}" min="0" max="5" step="0.0001"
            oninput="onSpDailyInput(${i})">
          <span class="sp-unit">%</span>
        </div>
        <div class="sp-rate-detail">vs previous tier: ${getRateTrendBadge(i)}</div>
      </div>
      <div class="sp-field">
        <label>Monthly %</label>
        <div class="sp-input-wrap">
          <input type="number" id="sp-monthly-${i}" value="${monthlyPct}" min="0" max="100" step="0.01"
            oninput="onSpMonthlyInput(${i})">
          <span class="sp-unit">%</span>
        </div>
      </div>
    `;
    body.appendChild(row);
  });
}

function onSpDailyInput(i) {
  const dailyVal   = parseFloat(document.getElementById(`sp-daily-${i}`).value) || 0;
  const monthlyFld = document.getElementById(`sp-monthly-${i}`);
  // auto-calculate monthly from daily: (1+d)^30 - 1
  const monthly = (Math.pow(1 + dailyVal / 100, 30) - 1) * 100;
  monthlyFld.value = monthly.toFixed(4);
}

function onSpMonthlyInput(i) {
  const monthlyVal = parseFloat(document.getElementById(`sp-monthly-${i}`).value) || 0;
  const dailyFld   = document.getElementById(`sp-daily-${i}`);
  // back-calculate daily from monthly: (1+m)^(1/30) - 1
  const daily = (Math.pow(1 + monthlyVal / 100, 1 / 30) - 1) * 100;
  dailyFld.value = daily.toFixed(6);
}

function saveSettings() {
  PKGS.forEach((pkg, i) => {
    const d = parseFloat(document.getElementById(`sp-daily-${i}`).value);
    const m = parseFloat(document.getElementById(`sp-monthly-${i}`).value);
    if (!isNaN(d) && d >= 0) pkg.daily   = d / 100;
    if (!isNaN(m) && m >= 0) pkg.monthly = m / 100;
  });
  // Persist to localStorage so rates survive page reloads
  try {
    localStorage.setItem('aurum_pkg_rates', JSON.stringify(
      PKGS.map(p => ({ key: p.key, daily: p.daily, monthly: p.monthly }))
    ));
  } catch(e) {}
  closeSettings();
  onAmountInput();
}

function resetDefaults() {
  PKG_DEFAULTS.forEach((def, i) => {
    PKGS[i].daily   = def.daily;
    PKGS[i].monthly = def.monthly;
  });
  // Clear persisted overrides
  try { localStorage.removeItem('aurum_pkg_rates'); } catch(e) {}
  buildSettingsRows();
  onAmountInput();
}

/* ─────────────────────────────────────────
   Export helpers
───────────────────────────────────────── */
function getExportMeta() {
  const initial  = parseFloat(document.getElementById('amount').value);
  const years    = parseFloat(document.getElementById('years').value) || 1;
  const variance = parseFloat(document.getElementById('variance').value) || 0;
  const compound = document.getElementById('compoundToggle').checked;
  const startDate = getStartDateValue();
  const numDays  = Math.round(years * 365);
  const yLabel   = years === 1 ? '1 year' : years + ' years';
  const depositMap = buildDepositMap();
  Object.keys(depositMap).forEach(day => { if (+day > numDays) delete depositMap[day]; });
  const totalDeposits = Object.values(depositMap).reduce((sum, amount) => sum + amount, 0);
  return { initial, years, numDays, variance, compound, startDate, yLabel, totalDeposits, depositCount: Object.keys(depositMap).length };
}

function buildAllViewsData() {
  const views = ['daily','weekly','monthly','quarterly','yearly'];
  const out = {};
  views.forEach(v => { out[v] = aggregate(allRows, v); });
  return out;
}

/* ── Excel export ── */
function exportExcel() {
  if (!allRows.length || !lastCalcSummary) return alert('Run a calculation first.');
  const meta   = getExportMeta();
  const views  = buildAllViewsData();
  const wb     = XLSX.utils.book_new();
  const summaryData = [
    ['Aurum ROI Projection Summary'], [],
    ['Starting amount', fmt(meta.initial)],
    ['Additional deposits', fmt(meta.totalDeposits || 0)],
    ['Starting date', formatDateDisplay(meta.startDate)],
    ['Projection period', meta.yLabel + ' (' + meta.numDays + ' days)'],
    ['Interest mode', meta.compound ? 'Compounding' : 'Simple (no compounding)'],
    ['Daily variance', meta.variance + '%'],
    ['Total profit', document.getElementById('m-profit').textContent],
    ['Final balance', document.getElementById('m-final').textContent],
    ['Overall ROI', document.getElementById('m-roi').textContent], [],
    ['Best package reached', document.getElementById('insight-best-package').textContent],
    ['Highest daily profit', document.getElementById('insight-high-profit').textContent],
    ['Time to double', document.getElementById('insight-double').textContent],
    ['Average daily profit', document.getElementById('insight-avg-profit').textContent], [],
    ['Compound final value', document.getElementById('compare-compound-final').textContent],
    ['Simple total value', document.getElementById('compare-simple-final').textContent],
    ['Compounding edge', document.getElementById('compare-difference').textContent],
    ['Extra return', document.getElementById('compare-difference-pct').textContent],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{wch:24},{wch:24}];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  const wsMilestones = XLSX.utils.aoa_to_sheet([['Milestone', 'Day'], ...lastMilestones.map(m => [m.label, m.day])]);
  wsMilestones['!cols'] = [{wch:48},{wch:12}];
  XLSX.utils.book_append_sheet(wb, wsMilestones, 'Milestones');
  Object.entries(views).forEach(([view, buckets]) => {
    const rows = [['Period','Package','Starting Balance ($)','Deposit ($)',`${getDetailRateHeader(view)} (%)`,'Profit ($)','Ending Balance ($)'], ...buckets.map(b => [b.label, b.pkgLabel, +b.start.toFixed(2), +(b.deposit || 0).toFixed(2), +(b.rate * 100).toFixed(4), +b.profit.toFixed(2), +b.end.toFixed(2)])];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch:14},{wch:12},{wch:22},{wch:14},{wch:16},{wch:16},{wch:22}];
    XLSX.utils.book_append_sheet(wb, ws, view.charAt(0).toUpperCase() + view.slice(1));
  });
  XLSX.writeFile(wb, `aurum-roi-enhanced-${meta.yLabel.replace(' ','-')}-${Date.now()}.xlsx`);
}

/* ── PDF export ── */
function exportPDF() {
  if (!allRows.length || !lastCalcSummary) return alert('Run a calculation first.');
  const { jsPDF } = window.jspdf;
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const meta = getExportMeta();
  const blue = [37, 99, 235], green = [22, 163, 74], W = 210;
  doc.setFillColor(...blue); doc.rect(0, 0, W, 30, 'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.text('AURUM ROI CALCULATOR', 14, 12);
  doc.setFont('helvetica','normal'); doc.setFontSize(11); doc.text('Premium projection report', 14, 20);
  doc.setFontSize(9); doc.setTextColor(214,228,255); doc.text('Generated ' + new Date().toLocaleString(), W - 14, 20, { align: 'right' });
  doc.setTextColor(15,23,42); doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('Projection Summary', 14, 39);
  doc.autoTable({ startY: 42, body: [
    ['Starting amount', fmt(meta.initial)], ['Additional deposits', fmt(meta.totalDeposits || 0)], ['Starting date', formatDateDisplay(meta.startDate)], ['Projection period', meta.yLabel + ' · ' + meta.numDays + ' days'], ['Interest mode', meta.compound ? 'Compounding' : 'Simple (no compounding)'],
    ['Daily variance', meta.variance + '%'], ['Total profit', document.getElementById('m-profit').textContent], ['Final balance', document.getElementById('m-final').textContent], ['Overall ROI', document.getElementById('m-roi').textContent]
  ], theme: 'plain', styles: { fontSize: 9, cellPadding: 2.5 }, columnStyles: { 0: { fontStyle: 'bold', textColor: [100,116,139], cellWidth: 50 }, 1: { textColor: [15,23,42] } }, margin: { left: 14, right: 14 } });
  let y = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('Insights & Comparison', 14, y);
  doc.autoTable({ startY: y + 3, head: [['Item', 'Value', 'Note']], body: [
    ['Best package reached', document.getElementById('insight-best-package').textContent, document.getElementById('insight-best-package-note').textContent],
    ['Highest daily profit', document.getElementById('insight-high-profit').textContent, document.getElementById('insight-high-profit-note').textContent],
    ['Time to double', document.getElementById('insight-double').textContent, document.getElementById('insight-double-note').textContent],
    ['Average daily profit', document.getElementById('insight-avg-profit').textContent, document.getElementById('insight-avg-profit-note').textContent],
    ['Compound final value', document.getElementById('compare-compound-final').textContent, document.getElementById('compare-compound-note').textContent],
    ['Simple total value', document.getElementById('compare-simple-final').textContent, document.getElementById('compare-simple-note').textContent],
    ['Compounding edge', document.getElementById('compare-difference').textContent, document.getElementById('compare-difference-pct').textContent],
  ], theme: 'striped', headStyles: { fillColor: blue, textColor: 255, fontSize: 8, fontStyle: 'bold' }, bodyStyles: { fontSize: 8 }, margin: { left: 14, right: 14 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 38 }, 1: { cellWidth: 30 }, 2: { cellWidth: 100 } } });
  y = doc.lastAutoTable.finalY + 8;
  try { const img = document.getElementById('growthChart').toDataURL('image/png', 1.0); doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('Growth Chart', 14, y); doc.addImage(img, 'PNG', 14, y + 3, 182, 62); y += 70; } catch (e) { y += 3; }
  if (y > 215) { doc.addPage(); y = 18; }
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text('Milestones', 14, y);
  doc.autoTable({ startY: y + 3, head: [['Milestone', 'Day']], body: (lastMilestones.length ? lastMilestones : [{ label: 'No milestone crossed', day: '—' }]).slice(0, 12).map(m => [m.label, 'Day ' + m.day]), theme: 'striped', headStyles: { fillColor: green, textColor: 255, fontSize: 8, fontStyle: 'bold' }, bodyStyles: { fontSize: 8 }, margin: { left: 14, right: 14 }, columnStyles: { 0: { cellWidth: 150 }, 1: { cellWidth: 30, halign: 'right' } } });
  y = doc.lastAutoTable.finalY + 8;
  if (y > 225) { doc.addPage(); y = 18; }
  const viewBuckets = aggregate(allRows, curView);
  const viewLabel = { daily:'Daily', weekly:'Weekly', monthly:'Monthly', quarterly:'Quarterly', yearly:'Yearly' }[curView];
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.text(`Breakdown — ${viewLabel} view`, 14, y);
  doc.autoTable({ startY: y + 3, head: [['Period', 'Package', 'Start', 'Deposit', getDetailRateHeader(curView), 'Profit', 'End']], body: viewBuckets.slice(0, 100).map(b => [b.label, b.pkgLabel, fmt(b.start), b.deposit ? '+' + fmt(b.deposit) : '—', (b.rate * 100).toFixed(4) + '%', '+' + fmt(b.profit), fmt(b.end)]), theme: 'striped', headStyles: { fillColor: blue, textColor: 255, fontSize: 8, fontStyle: 'bold' }, bodyStyles: { fontSize: 7.5 }, margin: { left: 14, right: 14 }, columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 20 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', textColor: green }, 6: { halign: 'right', textColor: blue, fontStyle: 'bold' } } });
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(148,163,184); doc.text('Aurum ROI Calculator · Enhanced export · For illustrative purposes only · Not financial advice', 14, 292); doc.text(`Page ${i} of ${pageCount}`, W - 14, 292, { align: 'right' }); }
  doc.save(`aurum-roi-enhanced-${meta.yLabel.replace(' ','-')}-${Date.now()}.pdf`);
}

function toggleHeroTools() {
  const panel = document.getElementById('heroToolsPanel');
  if (!panel) return;
  panel.classList.toggle('open');
}
function closeHeroTools() {
  const panel = document.getElementById('heroToolsPanel');
  if (panel) panel.classList.remove('open');
}
document.addEventListener('click', function (e) {
  const panel = document.getElementById('heroToolsPanel');
  const tools = document.querySelector('.hero-tools');
  if (!panel || !tools) return;
  if (!tools.contains(e.target)) panel.classList.remove('open');
});
const __origToggleTheme = window.toggleTheme;
window.toggleTheme = function () {
  if (typeof __origToggleTheme === 'function') { __origToggleTheme(); }
  const isDark = document.body.classList.contains('dark-mode');
  const cb = document.getElementById('themeToggleCheckbox');
  const icon = document.getElementById('themeToggleIcon');
  const label = document.getElementById('themeToggleLabel');
  if (cb) cb.checked = isDark;
  if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
  if (label) label.textContent = isDark ? 'Light mode' : 'Dark mode';
};
document.addEventListener('DOMContentLoaded', function () {
  const isDark = document.body.classList.contains('dark-mode');
  const cb = document.getElementById('themeToggleCheckbox');
  const icon = document.getElementById('themeToggleIcon');
  const label = document.getElementById('themeToggleLabel');
  if (cb) cb.checked = isDark;
  if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
  if (label) label.textContent = isDark ? 'Light mode' : 'Dark mode';
});


/* ── Crypto / metals converter ── */
let cryptoRates = [];
let metalRates = [];
let cryptoRatesLoadedAt = null;
let cryptoHistoryChart = null;
let cryptoHistoryRangeDays = 30;
const cryptoHistoryCache = {};

const fallbackCryptoRates = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', current_price: 95000, eur_price: 87000, type: 'crypto' },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum', current_price: 3200, eur_price: 2940, type: 'crypto' },
  { id: 'tether', symbol: 'usdt', name: 'Tether', current_price: 1, eur_price: 0.92, type: 'crypto' },
  { id: 'binancecoin', symbol: 'bnb', name: 'BNB', current_price: 600, eur_price: 552, type: 'crypto' },
  { id: 'solana', symbol: 'sol', name: 'Solana', current_price: 150, eur_price: 138, type: 'crypto' },
  { id: 'ripple', symbol: 'xrp', name: 'XRP', current_price: 0.55, eur_price: 0.51, type: 'crypto' },
  { id: 'cardano', symbol: 'ada', name: 'Cardano', current_price: 0.45, eur_price: 0.41, type: 'crypto' },
  { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', current_price: 0.16, eur_price: 0.147, type: 'crypto' },
  { id: 'tron', symbol: 'trx', name: 'TRON', current_price: 0.12, eur_price: 0.11, type: 'crypto' },
  { id: 'the-open-network', symbol: 'ton', name: 'Toncoin', current_price: 5.2, eur_price: 4.78, type: 'crypto' },
  { id: 'pepe', symbol: 'pepe', name: 'Pepe', current_price: 0.000012, eur_price: 0.000011, type: 'crypto' }
];

const fallbackMetalRates = [
  { id: 'gold', symbol: 'xau', name: 'Gold', current_price: 2300, eur_price: 2116, type: 'metal', unit: 'troy oz' },
  { id: 'silver', symbol: 'xag', name: 'Silver', current_price: 29, eur_price: 26.68, type: 'metal', unit: 'troy oz' }
];

function getConverterAssets() {
  return [...cryptoRates, ...metalRates];
}

function cryptoMoney(value, fiat) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: fiat.toUpperCase(),
    maximumFractionDigits: value >= 1 ? 2 : 8
  }).format(value);
}

function cryptoAmount(value, symbol) {
  if (!Number.isFinite(value)) return '—';
  const digits = value >= 1 ? 6 : 10;
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value)} ${symbol.toUpperCase()}`;
}

function getCryptoPrice(asset, fiat) {
  if (!asset) return 0;
  if (fiat === 'eur') return Number(asset.eur_price || asset.current_price_eur || 0);
  return Number(asset.current_price || asset.current_price_usd || 0);
}

function setCryptoStatus(message, type) {
  const el = document.getElementById('cryptoStatusText');
  if (!el) return;
  el.textContent = message;
  el.className = 'crypto-status' + (type ? ` ${type}` : '');
}

function populateCryptoList() {
  const select = document.getElementById('cryptoCoin');
  if (!select) return;
  const current = select.value;
  select.innerHTML = '';

  const cryptoGroup = document.createElement('optgroup');
  cryptoGroup.label = 'Top cryptocurrencies + PEPE';
  cryptoRates.forEach((asset) => {
    const option = document.createElement('option');
    option.value = asset.id;
    option.textContent = `${asset.name} (${asset.symbol.toUpperCase()})`;
    cryptoGroup.appendChild(option);
  });
  select.appendChild(cryptoGroup);

  const metalGroup = document.createElement('optgroup');
  metalGroup.label = 'Metals';
  metalRates.forEach((asset) => {
    const option = document.createElement('option');
    option.value = asset.id;
    option.textContent = `${asset.name} (${asset.symbol.toUpperCase()} / ${asset.unit || 'troy oz'})`;
    metalGroup.appendChild(option);
  });
  select.appendChild(metalGroup);

  if (current && getConverterAssets().some(c => c.id === current)) select.value = current;
}

async function loadMetalRates(eurUsdRate) {
  const eurRate = Number(eurUsdRate || 0.92);
  try {
    const res = await fetch('https://api.metals.live/v1/spot', { cache: 'no-store' });
    if (!res.ok) throw new Error('Metals rate request failed');
    const data = await res.json();
    const gold = data.find(x => typeof x.gold === 'number')?.gold;
    const silver = data.find(x => typeof x.silver === 'number')?.silver;
    if (!gold || !silver) throw new Error('Metal spot prices missing');
    metalRates = [
      { id: 'gold', symbol: 'xau', name: 'Gold', current_price: Number(gold), eur_price: Number(gold) * eurRate, type: 'metal', unit: 'troy oz' },
      { id: 'silver', symbol: 'xag', name: 'Silver', current_price: Number(silver), eur_price: Number(silver) * eurRate, type: 'metal', unit: 'troy oz' }
    ];
  } catch (err) {
    console.warn('Metal rates could not be loaded:', err);
    metalRates = fallbackMetalRates;
  }
}

async function loadCryptoRates(force) {
  const now = Date.now();
  if (!force && getConverterAssets().length && cryptoRatesLoadedAt && (now - cryptoRatesLoadedAt < 120000)) return;
  setCryptoStatus('Loading latest crypto and metal rates…');
  try {
    const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h';
    const usdRes = await fetch(url, { cache: 'no-store' });
    if (!usdRes.ok) throw new Error('USD crypto rate request failed');
    let usdData = await usdRes.json();

    // Always include PEPE even when it is not currently in the top-10 market-cap response.
    if (!usdData.some(c => c.id === 'pepe')) {
      const pepeRes = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=pepe&sparkline=false&price_change_percentage=24h', { cache: 'no-store' });
      if (pepeRes.ok) {
        const pepeData = await pepeRes.json();
        if (Array.isArray(pepeData) && pepeData.length) usdData = [...usdData, pepeData[0]];
      }
    }

    const ids = usdData.map(c => c.id).join(',');
    const eurRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=eur`, { cache: 'no-store' });
    if (!eurRes.ok) throw new Error('EUR crypto rate request failed');
    const eurData = await eurRes.json();
    cryptoRates = usdData.map(c => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      current_price: Number(c.current_price),
      eur_price: Number(eurData?.[c.id]?.eur || 0),
      type: 'crypto'
    }));

    const eurUsdRate = cryptoRates.find(c => c.symbol === 'usdt')?.eur_price || 0.92;
    await loadMetalRates(eurUsdRate);

    cryptoRatesLoadedAt = Date.now();
    populateCryptoList();
    setCryptoStatus(`Live crypto rates loaded. Metals use spot prices when available. Last refresh: ${new Date(cryptoRatesLoadedAt).toLocaleTimeString()}.`);
  } catch (err) {
    console.warn('Crypto/metals rates could not be loaded:', err);
    cryptoRates = fallbackCryptoRates;
    metalRates = fallbackMetalRates;
    cryptoRatesLoadedAt = Date.now();
    populateCryptoList();
    setCryptoStatus('Live rates could not be loaded, so estimated fallback rates are being shown. Try again later.', 'warn');
  }
}

function convertCryptoCurrency() {
  const amount = Number(document.getElementById('cryptoAmount')?.value || 0);
  const direction = document.getElementById('cryptoDirection')?.value || 'cryptoToFiat';
  const fiat = document.getElementById('cryptoFiat')?.value || 'usd';
  const assetId = document.getElementById('cryptoCoin')?.value;
  const asset = getConverterAssets().find(c => c.id === assetId) || getConverterAssets()[0];
  const price = getCryptoPrice(asset, fiat);
  const resultEl = document.getElementById('cryptoResultValue');
  const rateEl = document.getElementById('cryptoRateText');
  if (!resultEl || !rateEl || !asset || !amount || amount < 0 || !price) {
    if (resultEl) resultEl.textContent = '—';
    if (rateEl) rateEl.textContent = 'Enter an amount and select a currency pair.';
    return;
  }

  const unitText = asset.type === 'metal' ? ` per ${asset.unit || 'troy oz'}` : '';
  if (direction === 'cryptoToFiat') {
    const result = amount * price;
    resultEl.textContent = cryptoMoney(result, fiat);
    rateEl.textContent = `${cryptoAmount(1, asset.symbol)}${unitText} ≈ ${cryptoMoney(price, fiat)}`;
  } else {
    const result = amount / price;
    resultEl.textContent = cryptoAmount(result, asset.symbol);
    rateEl.textContent = `${cryptoMoney(1, fiat)} ≈ ${cryptoAmount(1 / price, asset.symbol)}`;
  }
}


function isCryptoHistoryAsset(asset) {
  return asset && asset.type === 'crypto';
}

function setCryptoHistoryLoading(message) {
  const note = document.getElementById('cryptoHistoryNote');
  if (note) note.textContent = message;
}

function updateCryptoHistoryTabs() {
  document.querySelectorAll('.crypto-history-tab').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.days) === Number(cryptoHistoryRangeDays));
  });
}

function buildFallbackHistory(asset, fiat, days) {
  const price = getCryptoPrice(asset, fiat) || 1;
  const points = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const t = now - i * 86400000;
    const wave = Math.sin((days - i) / 4) * 0.035;
    const drift = (days - i) / Math.max(days, 1) * 0.05;
    const val = price * (0.94 + drift + wave);
    points.push([t, val]);
  }
  return points;
}

async function loadCryptoHistory() {
  const fiat = document.getElementById('cryptoFiat')?.value || 'usd';
  const assetId = document.getElementById('cryptoCoin')?.value;
  const asset = getConverterAssets().find(c => c.id === assetId);
  const box = document.getElementById('cryptoHistoryBox');
  const title = document.getElementById('cryptoHistoryTitle');

  updateCryptoHistoryTabs();

  if (!box || !title) return;
  if (!isCryptoHistoryAsset(asset)) {
    title.textContent = 'Crypto price history';
    setCryptoHistoryLoading('Price-history chart is available for cryptocurrencies only. Gold and silver are shown in the converter, but not in this crypto-history graph.');
    renderCryptoHistoryChart([], asset, fiat);
    return;
  }

  title.textContent = `${asset.name} price history`;
  setCryptoHistoryLoading(`Loading ${asset.name} ${cryptoHistoryRangeDays} day history…`);

  const cacheKey = `${asset.id}_${fiat}_${cryptoHistoryRangeDays}`;
  try {
    let prices = cryptoHistoryCache[cacheKey];
    if (!prices) {
      const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(asset.id)}/market_chart?vs_currency=${encodeURIComponent(fiat)}&days=${encodeURIComponent(cryptoHistoryRangeDays)}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('History request failed');
      const data = await res.json();
      prices = Array.isArray(data.prices) ? data.prices : [];
      if (!prices.length) throw new Error('No history data returned');
      cryptoHistoryCache[cacheKey] = prices;
    }
    renderCryptoHistoryChart(prices, asset, fiat);
    setCryptoHistoryLoading(`Showing ${cryptoHistoryRangeDays} day history in ${fiat.toUpperCase()}. Live data from CoinGecko when available.`);
  } catch (err) {
    console.warn('Crypto history could not be loaded:', err);
    const fallback = buildFallbackHistory(asset, fiat, cryptoHistoryRangeDays);
    renderCryptoHistoryChart(fallback, asset, fiat);
    setCryptoHistoryLoading('Live history could not be loaded, so an estimated fallback trend is shown. Try again later.');
  }
}

function renderCryptoHistoryChart(prices, asset, fiat) {
  const canvas = document.getElementById('cryptoHistoryChart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  const labels = prices.map(p => {
    const d = new Date(p[0]);
    return cryptoHistoryRangeDays <= 30
      ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  });
  const values = prices.map(p => Number(p[1]));

  if (cryptoHistoryChart) {
    cryptoHistoryChart.destroy();
    cryptoHistoryChart = null;
  }

  cryptoHistoryChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: asset ? `${asset.symbol.toUpperCase()} / ${fiat.toUpperCase()}` : 'History',
        data: values,
        borderWidth: 3,
        tension: 0.35,
        pointRadius: values.length > 45 ? 0 : 2,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${asset?.symbol?.toUpperCase() || ''}: ${cryptoMoney(Number(ctx.parsed.y), fiat)}`
          }
        }
      },
      scales: {
        x: { ticks: { maxTicksLimit: 6 } },
        y: {
          ticks: {
            callback: (value) => cryptoMoney(Number(value), fiat)
          }
        }
      }
    }
  });
}

function setCryptoHistoryRange(days) {
  cryptoHistoryRangeDays = Number(days) || 30;
  loadCryptoHistory();
}

function onCryptoAssetChange() {
  convertCryptoCurrency();
  loadCryptoHistory();
}

function onCryptoFiatChange() {
  convertCryptoCurrency();
  loadCryptoHistory();
}

function onCryptoDirectionChange() { convertCryptoCurrency(); }
function swapCryptoDirection() {
  const dir = document.getElementById('cryptoDirection');
  if (dir) dir.value = dir.value === 'cryptoToFiat' ? 'fiatToCrypto' : 'cryptoToFiat';
  convertCryptoCurrency();
}
async function openCryptoConverter() {
  const modal = document.getElementById('cryptoModal');
  if (modal) modal.classList.add('open');
  await loadCryptoRates(false);
  convertCryptoCurrency();
  loadCryptoHistory();
}
function closeCryptoConverter() {
  const modal = document.getElementById('cryptoModal');
  if (modal) modal.classList.remove('open');
}
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeCryptoConverter();
});
document.addEventListener('click', function (e) {
  const modal = document.getElementById('cryptoModal');
  if (modal && modal.classList.contains('open') && e.target === modal) closeCryptoConverter();
});
document.addEventListener('DOMContentLoaded', function () {
  cryptoRates = fallbackCryptoRates;
  metalRates = fallbackMetalRates;
  populateCryptoList();
  convertCryptoCurrency();
});


/* ── Planning tools: scenarios, comparisons, reverse calculator, price alerts ── */
const AURUM_APP_VERSION = '2026.05.14.26';
const AURUM_VERSION_URL = 'app-version.json';
const AURUM_VERSION_CHECK_MS = 60000;
const AURUM_UPDATE_REQUESTED_KEY = 'aurum_update_requested_version';
const AURUM_SCENARIO_KEY = 'aurum_saved_scenarios_v2';
const AURUM_ALERTS_KEY = 'aurum_price_alerts_v1';
let strategyCompareChart = null;
let reverseLastAmount = null;
let incomeLastAmount = null;
let appUpdatePromptedVersion = '';

function closeToolModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

window.openHiveManager = window.openHiveManager || async function openHiveManagerFallback() {
  try {
    const hiveModule = await import(`./AurumHiveModule.js?v=${Date.now()}`);
    if (typeof hiveModule.openHiveManager === 'function') {
      hiveModule.openHiveManager();
      return;
    }
    if (window.openHiveManager && window.openHiveManager !== openHiveManagerFallback) {
      window.openHiveManager();
      return;
    }
  } catch (error) {
    console.warn('Aurum Hive could not be loaded.', error);
  }
  alert('The Hive is still loading. Please try again in a moment.');
};

function compareAppVersions(current, latest) {
  const currentParts = String(current || '').match(/\d+/g)?.map(Number) || [];
  const latestParts = String(latest || '').match(/\d+/g)?.map(Number) || [];
  const length = Math.max(currentParts.length, latestParts.length);
  for (let i = 0; i < length; i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;
    if (latestPart > currentPart) return 1;
    if (latestPart < currentPart) return -1;
  }
  return 0;
}

function escapeUpdateHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]
  ));
}

function showAppUpdatePrompt(info) {
  const latestVersion = String(info?.version || '').trim();
  if (!latestVersion || appUpdatePromptedVersion === latestVersion) return;
  appUpdatePromptedVersion = latestVersion;

  const subtitle = document.getElementById('appUpdateSubtitle');
  const intro = document.getElementById('appUpdateIntro');
  const notes = document.getElementById('appUpdateNotes');
  if (subtitle) subtitle.textContent = `You are using ${AURUM_APP_VERSION}. Version ${latestVersion} is available.`;
  if (intro) intro.textContent = info?.message || 'Refresh to load the newest features and fixes.';
  if (notes) {
    const releaseNotes = Array.isArray(info?.updates) ? info.updates : [];
    notes.innerHTML = releaseNotes.length
      ? releaseNotes.map(item => `<li>${escapeUpdateHtml(item)}</li>`).join('')
      : '<li>General improvements and fixes.</li>';
  }
  document.getElementById('appUpdateModal')?.classList.add('open');
}

async function checkAppVersion() {
  try {
    const response = await fetch(`${AURUM_VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const info = await response.json();
    const latestVersion = String(info?.version || '').trim();
    if (latestVersion && sessionStorage.getItem(AURUM_UPDATE_REQUESTED_KEY) === latestVersion) return;
    if (latestVersion && compareAppVersions(AURUM_APP_VERSION, latestVersion) > 0) {
      showAppUpdatePrompt(info);
    }
  } catch (error) {
    console.warn('Aurum app version check failed.', error);
  }
}

function startAppVersionWatcher() {
  checkAppVersion();
  setInterval(checkAppVersion, AURUM_VERSION_CHECK_MS);
}

function reloadForAppUpdate() {
  const version = appUpdatePromptedVersion || AURUM_APP_VERSION;
  try {
    sessionStorage.setItem(AURUM_UPDATE_REQUESTED_KEY, version);
  } catch (error) {}
  const url = new URL(window.location.href);
  url.searchParams.set('appv', version);
  url.searchParams.set('reload', String(Date.now()));
  window.location.replace(url.toString());
}

function getCurrentScenarioConfig() {
  return {
    amount: Number(document.getElementById('amount')?.value || 0),
    startDate: document.getElementById('startDate')?.value || getTodayLocalISO(),
    years: Number(document.getElementById('years')?.value || 1),
    variance: Number(document.getElementById('variance')?.value || 0),
    startOn: !!document.getElementById('compoundToggle')?.checked,
    switches: (switches || []).map(s => ({ day: Number(s.day) || 1, mode: s.mode === 'off' ? 'off' : 'on', monthsAfterPrev: Number(s.monthsAfterPrev) || undefined })),
    deposits: (deposits || []).map(d => ({ day: Number(d.day) || 1, amount: normalizeDepositAmount(d.amount) }))
  };
}

function applyScenarioConfig(cfg) {
  if (!cfg) return;
  document.getElementById('amount').value = Number(cfg.amount || 7700).toFixed(2).replace(/\.00$/, '');
  document.getElementById('startDate').value = cfg.startDate || getTodayLocalISO();
  document.getElementById('years').value = cfg.years || 1;
  document.getElementById('variance').value = cfg.variance || 0;
  document.getElementById('compoundToggle').checked = cfg.startOn !== false;
  switches = Array.isArray(cfg.switches) ? cfg.switches.map(s => ({ day: Number(s.day) || 1, mode: s.mode === 'off' ? 'off' : 'on', monthsAfterPrev: Number(s.monthsAfterPrev) || undefined })) : [];
  deposits = Array.isArray(cfg.deposits) ? cfg.deposits.map(d => ({ day: Number(d.day) || 1, amount: normalizeDepositAmount(d.amount) })) : [];
  onCompoundToggle();
  renderDepositList();
  onAmountInput();
}

function readSavedScenarios() {
  try { return JSON.parse(localStorage.getItem(AURUM_SCENARIO_KEY)) || []; } catch(e) { return []; }
}
function writeSavedScenarios(items) {
  try { localStorage.setItem(AURUM_SCENARIO_KEY, JSON.stringify(items)); } catch(e) {}
  renderScenarioSelect();
}
function renderScenarioSelect() {
  const sel = document.getElementById('scenarioSelect');
  if (!sel) return;
  const items = readSavedScenarios();
  sel.innerHTML = items.length ? '' : '<option value="">No saved scenarios yet</option>';
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    const depositCount = item.config.deposits?.length || 0;
    opt.textContent = `${item.name} · ${fmt(Number(item.config.amount || 0))} · ${item.config.years || 1}y${depositCount ? ' · ' + depositCount + ' deposits' : ''}`;
    sel.appendChild(opt);
  });
}
function saveCurrentScenarioFromUI() {
  const input = document.getElementById('scenarioName');
  const typed = input?.value?.trim();
  const fallback = `Scenario ${new Date().toLocaleString()}`;
  const name = typed || prompt('Scenario name:', fallback) || '';
  if (!name.trim()) return;
  const items = readSavedScenarios();
  items.unshift({ id: String(Date.now()), name: name.trim(), createdAt: new Date().toISOString(), config: getCurrentScenarioConfig() });
  writeSavedScenarios(items.slice(0, 25));
  if (input) input.value = '';
}
function loadSelectedScenario() {
  const id = document.getElementById('scenarioSelect')?.value;
  const item = readSavedScenarios().find(x => x.id === id);
  if (!item) return;
  applyScenarioConfig(item.config);
}
function deleteSelectedScenario() {
  const id = document.getElementById('scenarioSelect')?.value;
  if (!id) return;
  writeSavedScenarios(readSavedScenarios().filter(x => x.id !== id));
}

function simulateScenarioConfig(cfg, modeOverride, offsets) {
  const initial = Math.max(100, Number(cfg.amount || 100));
  const years = Math.min(10, Math.max(0.0833, Number(cfg.years || 1)));
  const numDays = Math.round(years * 365);
  const startOn = modeOverride === 'compound' ? true : modeOverride === 'simple' ? false : cfg.startOn !== false;
  const localSwitches = modeOverride ? [] : (cfg.switches || []);
  const switchMap = {};
  const depositMap = buildDepositMap(cfg.deposits || []);
  Object.keys(depositMap).forEach(day => { if (+day > numDays) delete depositMap[day]; });
  localSwitches.forEach(sw => {
    const day = parseInt(sw.day, 10);
    if (!isNaN(day) && day >= 1 && day <= numDays) switchMap[day] = sw.mode === 'off' ? 'off' : 'on';
  });
  let balance = initial, simplePrincipal = initial, profitPool = 0, isCompound = startOn, cumulativeProfit = 0, cumulativeDeposits = 0;
  const rows = [];
  for (let d = 1; d <= numDays; d++) {
    if (switchMap[d] !== undefined) {
      const newMode = switchMap[d] === 'on';
      if (!isCompound && newMode) { balance = simplePrincipal; profitPool = 0; }
      else if (isCompound && !newMode) { simplePrincipal = balance; profitPool = 0; }
      isCompound = newMode;
    }
    const depositToday = normalizeDepositAmount(depositMap[d]);
    if (depositToday > 0) {
      cumulativeDeposits += depositToday;
      if (isCompound) balance += depositToday;
      else simplePrincipal += depositToday;
    }
    const principal = isCompound ? balance : simplePrincipal;
    const pkg = getPkg(principal);
    const offset = offsets?.[d - 1] ?? 1;
    const profit = principal * pkg.daily * offset;
    let endBal;
    if (isCompound) { balance += profit; endBal = balance; }
    else { profitPool += profit; endBal = simplePrincipal; }
    cumulativeProfit += profit;
    rows.push({ day: d, end: endBal, projectedValue: isCompound ? endBal : initial + cumulativeDeposits + cumulativeProfit, profit, deposit: depositToday, pkgLabel: pkg.label, isCompound });
  }
  const finalValue = rows.length ? rows[rows.length - 1].projectedValue : initial;
  const totalProfit = rows.reduce((s,r) => s + r.profit, 0);
  const totalDeposits = Object.values(depositMap).reduce((s, n) => s + n, 0);
  const doubled = rows.find((r, i) => {
    const investedToDate = initial + rows.slice(0, i + 1).reduce((s, x) => s + (x.deposit || 0), 0);
    return r.projectedValue >= investedToDate * 2;
  });
  return { rows, initial, numDays, finalValue, totalProfit, roi: (totalProfit / (initial + totalDeposits)) * 100, doubledDay: doubled?.day || null };
}

function makeSharedOffsets(numDays, variance) {
  const v = Math.min(60, Math.max(0, Number(variance || 0)));
  return Array.from({ length: numDays }, () => rnd(v));
}

function downsampleRows(rows, maxPts = 120) {
  const step = Math.max(1, Math.floor(rows.length / maxPts));
  return rows.filter((_, i) => i % step === 0 || i === rows.length - 1);
}

function openStrategyCompare() {
  const modal = document.getElementById('strategyModal');
  if (modal) modal.classList.add('open');
  const cfg = getCurrentScenarioConfig();
  const days = Math.round(Math.min(10, Math.max(0.0833, Number(cfg.years || 1))) * 365);
  const offsets = makeSharedOffsets(days, cfg.variance);
  const scenarios = [
    { key:'current', label:'Current setup', data: simulateScenarioConfig(cfg, null, offsets) },
    { key:'compound', label:'Full compounding', data: simulateScenarioConfig(cfg, 'compound', offsets) },
    { key:'simple', label:'Simple/no compound', data: simulateScenarioConfig(cfg, 'simple', offsets) }
  ];
  const cards = document.getElementById('strategySummaryCards');
  if (cards) {
    cards.innerHTML = scenarios.map(s => `<div class="compare-summary-card"><div class="label">${s.label}</div><div class="value">${fmt(s.data.finalValue)}</div><div class="planner-sub">Profit ${fmt(s.data.totalProfit)} · ROI ${s.data.roi.toFixed(1)}%${s.data.doubledDay ? ' · doubles day ' + s.data.doubledDay : ''}</div></div>`).join('');
  }
  renderStrategyCompareChart(scenarios);
}

function renderStrategyCompareChart(scenarios) {
  const canvas = document.getElementById('strategyCompareChart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ptsBase = downsampleRows(scenarios[0].data.rows);
  const labels = ptsBase.map(r => chartLabelMode === 'date' ? formatDateShort(getDateForDay(r.day)) : 'Day ' + r.day);
  if (strategyCompareChart) { strategyCompareChart.destroy(); strategyCompareChart = null; }
  strategyCompareChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets: scenarios.map(s => {
      const pts = downsampleRows(s.data.rows);
      return { label: s.label, data: pts.map(r => +r.projectedValue.toFixed(2)), borderWidth: 2.5, tension: .32, pointRadius: 0, fill: false };
    }) },
    options: { responsive:true, maintainAspectRatio:false, interaction:{ intersect:false, mode:'index' }, plugins:{ legend:{ display:true }, tooltip:{ callbacks:{ label:c => `${c.dataset.label}: ${fmt(c.parsed.y)}` } } }, scales:{ y:{ ticks:{ callback:v => v >= 1000000 ? '$'+(v/1000000).toFixed(1)+'M' : v >= 1000 ? '$'+(v/1000).toFixed(0)+'k' : '$'+v } } } }
  });
}

function openReverseCalculator() {
  const cfg = getCurrentScenarioConfig();
  const yearsEl = document.getElementById('reverseYears');
  if (yearsEl) yearsEl.value = cfg.years || 1;
  document.getElementById('reverseModal')?.classList.add('open');
}

function deterministicOffsets(numDays, variance) {
  const v = Math.min(60, Math.max(0, Number(variance || 0)));
  const avgOffset = 1 - (v / 200); // midpoint of downward-only variance
  return Array.from({ length: numDays }, () => avgOffset);
}

function runReverseCalculator() {
  const target = Number(document.getElementById('reverseTarget')?.value || 0);
  const years = Number(document.getElementById('reverseYears')?.value || 1);
  const result = document.getElementById('reverseResultValue');
  const note = document.getElementById('reverseResultNote');
  if (!target || target < 100) { if (result) result.textContent = '—'; if (note) note.textContent = 'Enter a valid target of at least $100.'; return; }
  const base = getCurrentScenarioConfig();
  const cfg = { ...base, years };
  const numDays = Math.round(Math.min(10, Math.max(0.0833, years)) * 365);
  const offsets = deterministicOffsets(numDays, cfg.variance);
  let lo = 100, hi = Math.max(target, 1000);
  for (let i = 0; i < 40; i++) {
    cfg.amount = hi;
    if (simulateScenarioConfig(cfg, null, offsets).finalValue >= target) break;
    hi *= 2;
  }
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    cfg.amount = mid;
    const finalValue = simulateScenarioConfig(cfg, null, offsets).finalValue;
    if (finalValue >= target) hi = mid; else lo = mid;
  }
  reverseLastAmount = hi;
  cfg.amount = hi;
  const sim = simulateScenarioConfig(cfg, null, offsets);
  if (result) result.textContent = fmt(hi);
  if (note) note.textContent = `Estimated to reach ${fmt(target)} in ${numDays} days. Uses your current switches and the average effect of ${cfg.variance || 0}% downward variance. Final projected value: ${fmt(sim.finalValue)}.`;
}

function applyReverseAmount() {
  if (!reverseLastAmount) return;
  document.getElementById('amount').value = Math.ceil(reverseLastAmount);
  onAmountInput();
  closeToolModal('reverseModal');
}

function addDaysISO(baseDateValue, days) {
  const base = new Date((baseDateValue || getTodayLocalISO()) + 'T00:00:00');
  if (isNaN(base.getTime())) return getTodayLocalISO();
  base.setDate(base.getDate() + days);
  const tzOffset = base.getTimezoneOffset() * 60000;
  return new Date(base.getTime() - tzOffset).toISOString().slice(0, 10);
}

function getDayBetweenDates(startDateValue, targetDateValue) {
  const start = new Date((startDateValue || getTodayLocalISO()) + 'T00:00:00');
  const target = new Date((targetDateValue || '') + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(target.getTime())) return 0;
  const diff = Math.round((target - start) / 86400000);
  return diff + 1;
}

function openIncomeCalculator() {
  const startDate = document.getElementById('incomeStartDate');
  const targetDate = document.getElementById('incomeTargetDate');
  if (startDate && !startDate.value) startDate.value = getTodayLocalISO();
  if (targetDate && !targetDate.value) targetDate.value = addDaysISO(startDate?.value || getTodayLocalISO(), 365);
  document.getElementById('incomeModal')?.classList.add('open');
}

function getIncomeTargetDailyAmount(amount, period) {
  if (period === 'weekly') return amount / 7;
  if (period === 'monthly') return amount / 30;
  return amount;
}

function getProjectedIncomeMetric(sim, mode) {
  if (!sim?.rows?.length) return 0;
  if (mode === 'average') return sim.totalProfit / sim.rows.length;
  return sim.rows[sim.rows.length - 1].profit || 0;
}

function getPeriodLabel(period) {
  if (period === 'weekly') return 'week';
  if (period === 'monthly') return 'month';
  return 'day';
}

function runIncomeCalculator() {
  const target = Number(document.getElementById('incomeTarget')?.value || 0);
  const period = document.getElementById('incomePeriod')?.value || 'daily';
  const startDate = document.getElementById('incomeStartDate')?.value || getTodayLocalISO();
  const targetDate = document.getElementById('incomeTargetDate')?.value || '';
  const mode = document.getElementById('incomeMode')?.value || 'profit';
  const result = document.getElementById('incomeResultValue');
  const note = document.getElementById('incomeResultNote');
  const targetDay = getDayBetweenDates(startDate, targetDate);

  if (!target || target <= 0) {
    if (result) result.textContent = '—';
    if (note) note.textContent = 'Enter a valid income target.';
    return;
  }
  if (!targetDate || targetDay < 1) {
    if (result) result.textContent = '—';
    if (note) note.textContent = 'Choose a target date on or after the My income start date.';
    return;
  }

  const dailyGoal = getIncomeTargetDailyAmount(target, period);
  const base = getCurrentScenarioConfig();
  const cfg = { ...base, startDate, years: Math.max(targetDay / 365, 0.01) };
  const offsets = deterministicOffsets(targetDay, cfg.variance);
  let lo = 100;
  let hi = Math.max(1000, dailyGoal / Math.max(PKGS[0].daily, 0.0001));

  for (let i = 0; i < 45; i++) {
    cfg.amount = hi;
    const metric = getProjectedIncomeMetric(simulateScenarioConfig(cfg, null, offsets), mode);
    if (metric >= dailyGoal) break;
    hi *= 2;
  }

  for (let i = 0; i < 65; i++) {
    const mid = (lo + hi) / 2;
    cfg.amount = mid;
    const metric = getProjectedIncomeMetric(simulateScenarioConfig(cfg, null, offsets), mode);
    if (metric >= dailyGoal) hi = mid; else lo = mid;
  }

  incomeLastAmount = hi;
  cfg.amount = hi;
  const sim = simulateScenarioConfig(cfg, null, offsets);
  const achievedDaily = getProjectedIncomeMetric(sim, mode);
  const achievedPeriod = achievedDaily * (period === 'weekly' ? 7 : period === 'monthly' ? 30 : 1);
  const targetDateText = formatDateDisplay(targetDate);
  const startDateText = formatDateDisplay(startDate);
  const modeText = mode === 'average' ? 'average income through that date' : 'income on that date';

  if (result) result.textContent = fmt(hi);
  if (note) {
    note.textContent = `Starting ${startDateText}, to earn about ${fmt(target)} per ${getPeriodLabel(period)} by ${targetDateText}, start with about ${fmt(hi)}. This uses ${modeText}, current package rates, compounding switches, and the average effect of ${cfg.variance || 0}% downward variance. Projected ${getPeriodLabel(period)} income: ${fmt(achievedPeriod)}.`;
  }
}

function applyIncomeAmount() {
  if (!incomeLastAmount) return;
  const startDate = document.getElementById('incomeStartDate')?.value || getTodayLocalISO();
  const targetDate = document.getElementById('incomeTargetDate')?.value || '';
  const targetDay = getDayBetweenDates(startDate, targetDate);

  document.getElementById('amount').value = Math.ceil(incomeLastAmount);
  document.getElementById('startDate').value = startDate;
  const compoundToggle = document.getElementById('compoundToggle');
  if (compoundToggle) compoundToggle.checked = true;
  switches = targetDate && targetDay >= 1 ? [{ day: targetDay, mode: 'off' }] : [];
  onCompoundToggle();
  onAmountInput();
  closeToolModal('incomeModal');
  calculate();
}

function readPriceAlerts() { try { return JSON.parse(localStorage.getItem(AURUM_ALERTS_KEY)) || []; } catch(e) { return []; } }
function writePriceAlerts(items) { try { localStorage.setItem(AURUM_ALERTS_KEY, JSON.stringify(items)); } catch(e) {} renderAlertsList(); }
function populateAlertAssets() {
  const sel = document.getElementById('alertAsset');
  if (!sel) return;
  const current = sel.value;
  const assets = getConverterAssets().length ? getConverterAssets() : [...fallbackCryptoRates, ...fallbackMetalRates];
  sel.innerHTML = assets.map(a => `<option value="${a.id}">${a.name} (${a.symbol.toUpperCase()})</option>`).join('');
  if (current && assets.some(a => a.id === current)) sel.value = current;
}
async function openPriceAlerts() {
  document.getElementById('alertsModal')?.classList.add('open');
  await loadCryptoRates(false);
  populateAlertAssets();
  renderAlertsList();
  checkPriceAlerts(false);
}
function addPriceAlert() {
  const assetId = document.getElementById('alertAsset')?.value;
  const fiat = document.getElementById('alertFiat')?.value || 'usd';
  const condition = document.getElementById('alertCondition')?.value || 'above';
  const target = Number(document.getElementById('alertTarget')?.value || 0);
  const asset = getConverterAssets().find(a => a.id === assetId) || [...fallbackCryptoRates, ...fallbackMetalRates].find(a => a.id === assetId);
  if (!asset || !target || target <= 0) return;
  const items = readPriceAlerts();
  items.unshift({ id:String(Date.now()), assetId, assetName:asset.name, symbol:asset.symbol, fiat, condition, target, triggered:false, createdAt:new Date().toISOString() });
  writePriceAlerts(items.slice(0, 30));
  checkPriceAlerts(false);
}
function deletePriceAlert(id) { writePriceAlerts(readPriceAlerts().filter(a => a.id !== id)); }
function renderAlertsList() {
  const list = document.getElementById('alertsList');
  if (!list) return;
  const items = readPriceAlerts();
  if (!items.length) { list.innerHTML = '<div class="planner-sub">No alerts yet. Add your first alert above.</div>'; return; }
  list.innerHTML = items.map(a => `<div class="alert-row"><span><strong>${a.assetName} (${String(a.symbol).toUpperCase()})</strong><br>${a.condition === 'above' ? 'Above' : 'Below'} ${cryptoMoney(Number(a.target), a.fiat)} ${a.triggered ? ' · triggered' : ''}</span><button type="button" onclick="deletePriceAlert('${a.id}')">Delete</button></div>`).join('');
}
async function checkPriceAlerts(showQuietStatus) {
  let items = readPriceAlerts();
  if (!items.length) return;
  await loadCryptoRates(false);
  let changed = false;
  const assets = getConverterAssets();
  const triggeredMessages = [];
  items = items.map(a => {
    if (a.triggered) return a;
    const asset = assets.find(x => x.id === a.assetId);
    const price = getCryptoPrice(asset, a.fiat);
    if (!asset || !price) return a;
    const hit = a.condition === 'above' ? price >= Number(a.target) : price <= Number(a.target);
    if (hit) {
      changed = true;
      triggeredMessages.push(`${a.assetName} is now ${cryptoMoney(price, a.fiat)} (${a.condition} ${cryptoMoney(Number(a.target), a.fiat)})`);
      return { ...a, triggered:true, triggeredAt:new Date().toISOString(), lastPrice:price };
    }
    return { ...a, lastPrice:price };
  });
  if (changed) {
    writePriceAlerts(items);
    alert('Aurum price alert\n\n' + triggeredMessages.join('\n'));
  } else if (showQuietStatus) {
    const st = document.getElementById('alertsStatus');
    if (st) st.textContent = 'Alerts checked. No triggers yet.';
  }
}

setInterval(() => { checkPriceAlerts(false); }, 60000);
document.addEventListener('DOMContentLoaded', () => {
  renderScenarioSelect();
  renderAlertsList();
  startAppVersionWatcher();
});

