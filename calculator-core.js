(function initAurumCalculatorCore(root) {
  function normalizeAmount(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  }

  function getPackageForBalance(packages, balance) {
    const tiers = Array.isArray(packages) ? packages : [];
    for (let index = tiers.length - 1; index >= 0; index -= 1) {
      if (Number(balance || 0) >= Number(tiers[index].min || 0)) return tiers[index];
    }
    return tiers[0] || { key: '', label: '', daily: 0 };
  }

  function simulateProjection(options) {
    const packages = options.packages || [];
    const initial = Number(options.initial || 0);
    const numDays = Math.max(0, Math.round(Number(options.numDays || 0)));
    const startOn = options.startOn !== false;
    const switchMap = options.switchMap || {};
    const depositMap = options.depositMap || {};
    const offsets = Array.isArray(options.offsets) ? options.offsets : null;
    const variance = Math.min(60, Math.max(0, Number(options.variance || 0)));
    const random = typeof options.random === 'function' ? options.random : Math.random;

    let balance = initial;
    let simplePrincipal = initial;
    let profitPool = 0;
    let isCompound = startOn;
    let switchCount = 0;
    let compoundDays = 0;
    let simpleDays = 0;
    let totalProfit = 0;
    let totalDeposits = 0;
    const usedOffsets = [];
    const rows = [];

    for (let day = 1; day <= numDays; day += 1) {
      const switched = switchMap[day] !== undefined;
      if (switched) {
        const newMode = switchMap[day] === 'on';
        if (!isCompound && newMode) balance = simplePrincipal;
        else if (isCompound && !newMode) simplePrincipal = balance;
        isCompound = newMode;
        switchCount += 1;
      }

      const depositToday = normalizeAmount(depositMap[day]);
      if (depositToday > 0) {
        totalDeposits += depositToday;
        if (isCompound) balance += depositToday;
        else simplePrincipal += depositToday;
      }

      const principal = isCompound ? balance : simplePrincipal;
      const pkg = getPackageForBalance(packages, principal);
      const offset = offsets ? Number(offsets[day - 1] ?? 1) : 1 - (random() * (variance / 100));
      usedOffsets.push(offset);

      const profit = principal * Number(pkg.daily || 0) * offset;
      let endBal;
      if (isCompound) {
        compoundDays += 1;
        balance += profit;
        endBal = balance;
      } else {
        simpleDays += 1;
        profitPool += profit;
        endBal = simplePrincipal;
      }

      totalProfit += profit;
      rows.push({
        day,
        pkgKey: pkg.key,
        pkgLabel: pkg.label,
        start: principal,
        profit,
        end: endBal,
        rate: Number(pkg.daily || 0) * offset,
        isCompound,
        switched,
        deposit: depositToday,
        deposited: depositToday > 0,
        activeValue: endBal,
        withdrawnProfit: profitPool,
        projectedValue: endBal + profitPool
      });
    }

    return {
      rows,
      offsets: usedOffsets,
      finalValue: rows.length ? rows[rows.length - 1].projectedValue : initial,
      totalProfit,
      totalDeposits,
      switchCount,
      compoundDays,
      simpleDays
    };
  }

  const api = { getPackageForBalance, simulateProjection };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AurumCalculatorCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
