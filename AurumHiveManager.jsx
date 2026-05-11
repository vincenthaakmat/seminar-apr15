import React, { useMemo, useState } from "react";

/**
 * AurumHiveManager_v2_visual.jsx
 * Separate React screen for building and visualizing the AURUM Hive structure.
 *
 * Linking rule:
 * - Every record has an InviteID.
 * - A child node links to its parent by parentInviteId.
 * - Main account can have max 3 sub accounts.
 * - Each sub account can have max 1 main account linked under it.
 */

const emptyForm = {
  inviteId: "",
  name: "",
  amount: "",
  rank: "",
  parentInviteId: "",
  accountType: "sub", // main | sub
};

const sampleNodes = [
  { inviteId: "AUR-ROOT", name: "Main Account", amount: 5000, rank: "Leader", parentInviteId: null, accountType: "main" },
  { inviteId: "AUR-SUB-1", name: "Sub Account 1", amount: 1200, rank: "Starter", parentInviteId: "AUR-ROOT", accountType: "sub" },
  { inviteId: "AUR-SUB-2", name: "Sub Account 2", amount: 900, rank: "Starter", parentInviteId: "AUR-ROOT", accountType: "sub" },
  { inviteId: "AUR-SUB-3", name: "Sub Account 3", amount: 1500, rank: "Builder", parentInviteId: "AUR-ROOT", accountType: "sub" },
  { inviteId: "AUR-MAIN-1", name: "Main Under Sub 1", amount: 3000, rank: "Builder", parentInviteId: "AUR-SUB-1", accountType: "main" },
  { inviteId: "AUR-MAIN-2", name: "Main Under Sub 2", amount: 2500, rank: "Builder", parentInviteId: "AUR-SUB-2", accountType: "main" },
];

function money(value) {
  const n = Number(value || 0);
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function NodeTooltip({ node }) {
  if (!node) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-3 w-64 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xl">
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${node.accountType === "main" ? "bg-red-500" : "bg-emerald-500"}`} />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {node.accountType === "main" ? "Main Account" : "Sub Account"}
        </span>
      </div>
      <div className="text-base font-extrabold text-slate-900">{node.name || "Unnamed"}</div>
      <div className="mt-2 space-y-1 text-sm text-slate-600">
        <div><b>InviteID:</b> {node.inviteId}</div>
        <div><b>Amount:</b> {money(node.amount)}</div>
        <div><b>Rank:</b> {node.rank || "—"}</div>
        <div><b>Linked to:</b> {node.parentInviteId || "Root"}</div>
      </div>
    </div>
  );
}

function HiveNode({ node, selectedId, setSelectedId }) {
  const isMain = node?.accountType === "main";
  const [hovered, setHovered] = useState(false);

  if (!node) {
    return (
      <div className="flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-white/60 text-xs font-bold text-slate-400">
          Empty
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setSelectedId(node.inviteId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col items-center outline-none"
    >
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full border-4 text-white shadow-xl transition hover:scale-110 ${
          isMain
            ? "border-red-200 bg-gradient-to-br from-red-400 to-red-700"
            : "border-emerald-200 bg-gradient-to-br from-emerald-400 to-emerald-800"
        } ${selectedId === node.inviteId ? "ring-4 ring-yellow-300" : ""}`}
      >
        <span className="text-lg font-black">{isMain ? "M" : "S"}</span>
      </div>
      <div className="mt-2 max-w-[120px] truncate text-center text-xs font-bold text-slate-700">{node.name || node.inviteId}</div>
      <div className="max-w-[120px] truncate text-center text-[10px] text-slate-500">{node.inviteId}</div>
      {hovered && <NodeTooltip node={node} />}
    </button>
  );
}

export default function AurumHiveManager() {
  const [nodes, setNodes] = useState(sampleNodes);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState("AUR-ROOT");

  const nodeMap = useMemo(() => {
    const map = new Map();
    nodes.forEach((n) => map.set(n.inviteId, n));
    return map;
  }, [nodes]);

  const root = useMemo(() => nodes.find((n) => !n.parentInviteId && n.accountType === "main") || nodes[0], [nodes]);

  const childrenByParent = useMemo(() => {
    const map = new Map();
    nodes.forEach((n) => {
      if (!n.parentInviteId) return;
      if (!map.has(n.parentInviteId)) map.set(n.parentInviteId, []);
      map.get(n.parentInviteId).push(n);
    });
    return map;
  }, [nodes]);

  const rootSubs = root ? (childrenByParent.get(root.inviteId) || []).filter((n) => n.accountType === "sub").slice(0, 3) : [];
  const selectedNode = selectedId ? nodeMap.get(selectedId) : null;

  function validateNewNode(next) {
    if (!next.inviteId.trim()) return "InviteID is required.";
    if (nodeMap.has(next.inviteId.trim())) return "InviteID already exists.";
    if (!next.name.trim()) return "Name is required.";
    if (!next.rank.trim()) return "Rank is required.";
    if (Number(next.amount) < 0 || next.amount === "") return "Amount is required.";

    if (!next.parentInviteId && next.accountType !== "main") return "Only a main account can be the root.";
    if (next.parentInviteId && !nodeMap.has(next.parentInviteId)) return "Parent InviteID was not found.";

    const parent = next.parentInviteId ? nodeMap.get(next.parentInviteId) : null;
    if (parent?.accountType === "main") {
      const subs = (childrenByParent.get(parent.inviteId) || []).filter((n) => n.accountType === "sub");
      if (next.accountType !== "sub") return "A main account can only receive sub accounts directly.";
      if (subs.length >= 3) return "This main account already has the maximum 3 sub accounts.";
    }

    if (parent?.accountType === "sub") {
      const linkedMain = (childrenByParent.get(parent.inviteId) || []).filter((n) => n.accountType === "main");
      if (next.accountType !== "main") return "A sub account can only receive 1 main account underneath it.";
      if (linkedMain.length >= 1) return "This sub account already has 1 linked main account.";
    }

    return null;
  }

  function addNode() {
    const next = {
      inviteId: form.inviteId.trim(),
      name: form.name.trim(),
      amount: Number(form.amount || 0),
      rank: form.rank.trim(),
      parentInviteId: form.parentInviteId.trim() || null,
      accountType: form.accountType,
    };

    const error = validateNewNode(next);
    if (error) {
      alert(error);
      return;
    }

    setNodes((prev) => [...prev, next]);
    setSelectedId(next.inviteId);
    setForm(emptyForm);
  }

  function clearSample() {
    setNodes([]);
    setSelectedId("");
  }

  function loadSample() {
    setNodes(sampleNodes);
    setSelectedId("AUR-ROOT");
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-gradient-to-br from-blue-950 via-blue-800 to-sky-500 p-6 text-white shadow-2xl md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.25em] text-blue-100">AURUM Hive Builder</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Build the hive by InviteID</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-blue-100 md:text-base">
                Red dots are main accounts. Green dots are sub accounts. Hover over any dot to quickly see InviteID, Name, Amount, and Rank.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-sm backdrop-blur">
              <div><b>Rule 1:</b> Main account → max 3 sub accounts</div>
              <div><b>Rule 2:</b> Sub account → max 1 main account</div>
              <div><b>Link key:</b> InviteID</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <section className="rounded-3xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-extrabold">Add / Link Account</h2>
            <p className="mt-1 text-sm text-slate-500">Fill in the required placeholders and link using Parent InviteID.</p>

            <div className="mt-5 space-y-3">
              <input className="w-full rounded-2xl border border-slate-200 p-3 font-semibold outline-none focus:border-blue-500" placeholder="InviteID" value={form.inviteId} onChange={(e) => setForm({ ...form, inviteId: e.target.value })} />
              <input className="w-full rounded-2xl border border-slate-200 p-3 font-semibold outline-none focus:border-blue-500" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="w-full rounded-2xl border border-slate-200 p-3 font-semibold outline-none focus:border-blue-500" placeholder="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <input className="w-full rounded-2xl border border-slate-200 p-3 font-semibold outline-none focus:border-blue-500" placeholder="Rank" value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} />

              <select className="w-full rounded-2xl border border-slate-200 p-3 font-semibold outline-none focus:border-blue-500" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}>
                <option value="main">Main Account</option>
                <option value="sub">Sub Account</option>
              </select>

              <input className="w-full rounded-2xl border border-slate-200 p-3 font-semibold outline-none focus:border-blue-500" placeholder="Parent InviteID (blank only for root main account)" value={form.parentInviteId} onChange={(e) => setForm({ ...form, parentInviteId: e.target.value })} />

              <button onClick={addNode} className="w-full rounded-2xl bg-blue-700 p-3 font-extrabold text-white shadow-lg transition hover:bg-blue-800">
                Add to Hive
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={loadSample} className="rounded-2xl border border-slate-200 p-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Load sample</button>
                <button onClick={clearSample} className="rounded-2xl border border-red-200 p-3 text-sm font-bold text-red-600 hover:bg-red-50">Clear</button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">Selected account</div>
              {selectedNode ? (
                <div className="mt-3 space-y-1 text-sm">
                  <div className="text-lg font-black text-slate-900">{selectedNode.name}</div>
                  <div><b>InviteID:</b> {selectedNode.inviteId}</div>
                  <div><b>Amount:</b> {money(selectedNode.amount)}</div>
                  <div><b>Rank:</b> {selectedNode.rank}</div>
                  <div><b>Type:</b> {selectedNode.accountType}</div>
                  <div><b>Parent:</b> {selectedNode.parentInviteId || "Root"}</div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Click or hover a dot to inspect it.</p>
              )}
            </div>
          </section>

          <section className="overflow-x-auto rounded-3xl bg-white p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold">Visual Hive Structure</h2>
                <p className="text-sm text-slate-500">Hover any dot to see who is where.</p>
              </div>
              <div className="flex gap-3 text-xs font-bold">
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-500" /> Main</span>
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-600" /> Sub</span>
              </div>
            </div>

            <div className="min-w-[760px] rounded-3xl bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 p-8 text-white">
              <div className="relative flex flex-col items-center">
                {root ? <HiveNode node={root} selectedId={selectedId} setSelectedId={setSelectedId} /> : <HiveNode node={null} />}

                <div className="mt-6 h-10 w-px bg-lime-300" />
                <div className="relative grid w-full grid-cols-3 gap-10">
                  <div className="absolute left-[16.66%] right-[16.66%] top-0 h-px bg-lime-300" />

                  {[0, 1, 2].map((slot) => {
                    const sub = rootSubs[slot] || null;
                    const linkedMain = sub ? (childrenByParent.get(sub.inviteId) || []).find((n) => n.accountType === "main") : null;
                    const nextSubs = linkedMain ? (childrenByParent.get(linkedMain.inviteId) || []).filter((n) => n.accountType === "sub").slice(0, 3) : [];

                    return (
                      <div key={slot} className="flex flex-col items-center">
                        <div className="h-10 w-px bg-lime-300" />
                        <HiveNode node={sub} selectedId={selectedId} setSelectedId={setSelectedId} />

                        <div className="mt-5 h-8 w-px bg-lime-300/80" />
                        <HiveNode node={linkedMain || null} selectedId={selectedId} setSelectedId={setSelectedId} />

                        <div className="mt-5 grid w-full grid-cols-3 gap-3">
                          {[0, 1, 2].map((subSlot) => (
                            <div key={subSlot} className="flex flex-col items-center">
                              <div className="h-7 w-px bg-lime-300/60" />
                              <HiveNode node={nextSubs[subSlot] || null} selectedId={selectedId} setSelectedId={setSelectedId} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
