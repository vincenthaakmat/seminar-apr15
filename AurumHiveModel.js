export const hiveData = [
{
inviteId: "AUR-ROOT-001",
name: "Main Account",
amount: 25000,
rank: "Diamond",
type: "main",
parentInviteId: null,
children: [
{
inviteId: "SUB-001",
name: "Sub Account 1",
amount: 5000,
rank: "Gold",
type: "sub",
parentInviteId: "AUR-ROOT-001",
children: [
{
inviteId: "MAIN-001-A",
name: "Nested Main 1",
amount: 3000,
rank: "Silver",
type: "main",
parentInviteId: "SUB-001",
children: []
}
]
},
{
inviteId: "SUB-002",
name: "Sub Account 2",
amount: 4500,
rank: "Gold",
type: "sub",
parentInviteId: "AUR-ROOT-001",
children: [
{
inviteId: "MAIN-002-A",
name: "Nested Main 2",
amount: 2000,
rank: "Bronze",
type: "main",
parentInviteId: "SUB-002",
children: []
}
]
},
{
inviteId: "SUB-003",
name: "Sub Account 3",
amount: 7000,
rank: "Platinum",
type: "sub",
parentInviteId: "AUR-ROOT-001",
children: [
{
inviteId: "MAIN-003-A",
name: "Nested Main 3",
amount: 3500,
rank: "Silver",
type: "main",
parentInviteId: "SUB-003",
children: []
}
]
}
]
}
];

export function renderHive(containerId = "hiveContainer") {
const container = document.getElementById(containerId);

if (!container) return;

container.innerHTML = "";

hiveData.forEach(node => {
container.appendChild(createHiveNode(node));
});
}

function createHiveNode(node) {
const wrapper = document.createElement("div");
wrapper.className = "hive-node-wrapper";

const dot = document.createElement("div");
dot.className = node.type === "main"
? "hive-dot-main"
: "hive-dot-sub";

dot.innerHTML = `     <div class="hive-tooltip">       <strong>${node.name}</strong><br>
      InviteID: ${node.inviteId}<br>
      Amount: $${node.amount.toLocaleString()}<br>
      Rank: ${node.rank}<br>
      Type: ${node.type}     </div>
  `;

wrapper.appendChild(dot);

if (node.children && node.children.length > 0) {
const childrenWrap = document.createElement("div");
childrenWrap.className = "hive-children";

```
node.children.forEach(child => {
  childrenWrap.appendChild(createHiveNode(child));
});

wrapper.appendChild(childrenWrap);
```

}

return wrapper;
}

export function addHiveItem(parentInviteId, newItem) {
const parent = findNode(hiveData[0], parentInviteId);

if (!parent) return false;

if (!parent.children) {
parent.children = [];
}

parent.children.push({
...newItem,
children: []
});

return true;
}

export function editHiveItem(inviteId, updatedData) {
const node = findNode(hiveData[0], inviteId);

if (!node) return false;

Object.assign(node, updatedData);

return true;
}

export function removeHiveItem(inviteId) {
return removeNodeRecursive(hiveData[0], inviteId);
}

function findNode(node, inviteId) {
if (node.inviteId === inviteId) return node;

if (!node.children) return null;

for (const child of node.children) {
const found = findNode(child, inviteId);

```
if (found) return found;
```

}

return null;
}

function removeNodeRecursive(parent, inviteId) {
if (!parent.children) return false;

const index = parent.children.findIndex(
c => c.inviteId === inviteId
);

if (index !== -1) {
parent.children.splice(index, 1);
return true;
}

for (const child of parent.children) {
const removed = removeNodeRecursive(child, inviteId);

```
if (removed) return true;
```

}

return false;
}
