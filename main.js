const storage = {
  usersKey: 'ap_users',
  sessionKey: 'ap_session',
  dataKey: (user) => `ap_data_${user}`
};

const elements = {
  authView: document.getElementById('authView'),
  appView: document.getElementById('appView'),
  logoutBtn: document.getElementById('logoutBtn'),
  registerForm: document.getElementById('registerForm'),
  registerMsg: document.getElementById('registerMsg'),
  loginForm: document.getElementById('loginForm'),
  loginMsg: document.getElementById('loginMsg'),
  regUsername: document.getElementById('regUsername'),
  regPassword: document.getElementById('regPassword'),
  loginUsername: document.getElementById('loginUsername'),
  loginPassword: document.getElementById('loginPassword'),
  sectorForm: document.getElementById('sectorForm'),
  sectorName: document.getElementById('sectorName'),
  sectorTarget: document.getElementById('sectorTarget'),
  sectorId: document.getElementById('sectorId'),
  sectorSubmit: document.getElementById('sectorSubmit'),
  sectorCancel: document.getElementById('sectorCancel'),
  sectorList: document.getElementById('sectorList'),
  assetForm: document.getElementById('assetForm'),
  assetName: document.getElementById('assetName'),
  assetAmount: document.getElementById('assetAmount'),
  assetSector: document.getElementById('assetSector'),
  assetId: document.getElementById('assetId'),
  assetSubmit: document.getElementById('assetSubmit'),
  assetCancel: document.getElementById('assetCancel'),
  mergeSameAsset: document.getElementById('mergeSameAsset'),
  assetList: document.getElementById('assetList'),
  sectorSummary: document.getElementById('sectorSummary'),
  totalAmount: document.getElementById('totalAmount'),
  sectorCount: document.getElementById('sectorCount'),
  assetCount: document.getElementById('assetCount'),
  targetSumBadge: document.getElementById('targetSumBadge'),
  sectorTargetAlert: document.getElementById('sectorTargetAlert')
};

let currentUser = null;
let state = { sectors: [], assets: [] };

const currency = new Intl.NumberFormat('ko-KR');

function loadUsers() {
  return JSON.parse(localStorage.getItem(storage.usersKey) || '{}');
}

function saveUsers(users) {
  localStorage.setItem(storage.usersKey, JSON.stringify(users));
}

async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getSession() {
  return localStorage.getItem(storage.sessionKey);
}

function setSession(user) {
  localStorage.setItem(storage.sessionKey, user);
}

function clearSession() {
  localStorage.removeItem(storage.sessionKey);
}

function loadData(user) {
  const raw = localStorage.getItem(storage.dataKey(user));
  if (!raw) {
    return { sectors: [], assets: [] };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      sectors: parsed.sectors || [],
      assets: parsed.assets || []
    };
  } catch {
    return { sectors: [], assets: [] };
  }
}

function saveData() {
  if (!currentUser) return;
  localStorage.setItem(storage.dataKey(currentUser), JSON.stringify(state));
}

function setMessage(el, text, isError = false) {
  el.textContent = text;
  el.style.color = isError ? '#c84215' : '#1f8a8a';
}

function showApp() {
  elements.authView.hidden = true;
  elements.appView.hidden = false;
  elements.logoutBtn.hidden = false;
}

function showAuth() {
  elements.authView.hidden = false;
  elements.appView.hidden = true;
  elements.logoutBtn.hidden = true;
}

function formatCurrency(value) {
  return `${currency.format(Math.round(value))}원`;
}

function calcTotals() {
  const total = state.assets.reduce((sum, asset) => sum + asset.amount, 0);
  const sectorMap = new Map();

  state.sectors.forEach((sector) => {
    sectorMap.set(sector.id, { ...sector, amount: 0 });
  });

  let unassigned = 0;
  state.assets.forEach((asset) => {
    if (sectorMap.has(asset.sectorId)) {
      sectorMap.get(asset.sectorId).amount += asset.amount;
    } else {
      unassigned += asset.amount;
    }
  });

  return { total, sectorMap, unassigned };
}

function renderSectorOptions() {
  elements.assetSector.innerHTML = '';
  const optNone = document.createElement('option');
  optNone.value = '';
  optNone.textContent = '미분류';
  elements.assetSector.appendChild(optNone);

  state.sectors.forEach((sector) => {
    const opt = document.createElement('option');
    opt.value = sector.id;
    opt.textContent = sector.name;
    elements.assetSector.appendChild(opt);
  });
}

function renderSectors() {
  elements.sectorList.innerHTML = '';
  state.sectors.forEach((sector) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <input type="text" value="${sector.name}" data-id="${sector.id}" class="sector-name" />
      </td>
      <td>
        <input type="number" min="0" max="100" step="0.1" value="${sector.target}" data-id="${sector.id}" class="sector-target" />
      </td>
      <td><button type="button" class="ghost" data-delete="${sector.id}">삭제</button></td>
    `;
    elements.sectorList.appendChild(row);
  });
}

function renderAssets() {
  elements.assetList.innerHTML = '';
  const nameCounts = new Map();
  const nameIndex = new Map();

  state.assets.forEach((asset) => {
    nameCounts.set(asset.name, (nameCounts.get(asset.name) || 0) + 1);
  });

  state.assets.forEach((asset) => {
    const sector = state.sectors.find((s) => s.id === asset.sectorId);
    const totalForName = nameCounts.get(asset.name) || 0;
    const currentIndex = (nameIndex.get(asset.name) || 0) + 1;
    nameIndex.set(asset.name, currentIndex);
    const displayName = totalForName > 1 ? `${asset.name} (${currentIndex})` : asset.name;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${displayName}</td>
      <td>${formatCurrency(asset.amount)}</td>
      <td>${sector ? sector.name : '미분류'}</td>
      <td><button type="button" class="ghost" data-edit="${asset.id}">수정</button></td>
      <td><button type="button" class="ghost" data-delete="${asset.id}">삭제</button></td>
    `;
    elements.assetList.appendChild(row);
  });
}

function renderSummary() {
  const { total, sectorMap, unassigned } = calcTotals();
  elements.sectorSummary.innerHTML = '';

  const totalPct = total === 0 ? 0 : 100;
  let targetSum = 0;

  sectorMap.forEach((sector) => {
    const currentPct = total ? (sector.amount / total) * 100 : 0;
    const diffPct = sector.target - currentPct;
    const targetAmount = (sector.target / 100) * total;
    const moveAmount = targetAmount - sector.amount;

    const diffClass = diffPct >= 0 ? 'diff-positive' : 'diff-negative';
    targetSum += sector.target;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${sector.name}</td>
      <td>${formatCurrency(sector.amount)}</td>
      <td>${currentPct.toFixed(1)}%</td>
      <td>${sector.target.toFixed(1)}%</td>
      <td class="${diffClass}">${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%</td>
      <td class="${diffClass}">${moveAmount >= 0 ? '+' : ''}${formatCurrency(moveAmount)}</td>
    `;
    elements.sectorSummary.appendChild(row);
  });

  if (unassigned > 0 || total === 0) {
    const currentPct = total ? (unassigned / total) * 100 : 0;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>미분류</td>
      <td>${formatCurrency(unassigned)}</td>
      <td>${currentPct.toFixed(1)}%</td>
      <td>-</td>
      <td>-</td>
      <td>-</td>
    `;
    elements.sectorSummary.appendChild(row);
  }

  elements.totalAmount.textContent = formatCurrency(total);
  elements.sectorCount.textContent = `${state.sectors.length}개`;
  elements.assetCount.textContent = `${state.assets.length}개`;

  const roundedTarget = Math.round(targetSum * 10) / 10;
  if (state.sectors.length === 0) {
    elements.targetSumBadge.textContent = '섹터를 추가하세요';
  } else if (Math.abs(roundedTarget - totalPct) < 0.05) {
    elements.targetSumBadge.textContent = `목표 합계 ${roundedTarget}%`;
  } else {
    elements.targetSumBadge.textContent = `목표 합계 ${roundedTarget}% (100% 권장)`;
  }

  if (elements.sectorTargetAlert) {
    if (roundedTarget > 100) {
      elements.sectorTargetAlert.textContent = '목표 수치가 100%센트를 넘었습니다.';
      elements.sectorTargetAlert.classList.add('is-over');
    } else {
      elements.sectorTargetAlert.textContent = `총 목표 비중: ${roundedTarget}%`;
      elements.sectorTargetAlert.classList.remove('is-over');
    }
  }
}

function renderAll() {
  renderSectorOptions();
  renderSectors();
  renderAssets();
  renderSummary();
}

function resetForms() {
  elements.sectorForm.reset();
  elements.assetForm.reset();
}

function setSectorFormMode(isEditing) {
  elements.sectorSubmit.textContent = isEditing ? '저장' : '추가';
  elements.sectorCancel.hidden = !isEditing;
}

function setAssetFormMode(isEditing) {
  elements.assetSubmit.textContent = isEditing ? '저장' : '추가';
  elements.assetCancel.hidden = !isEditing;
}

function startSectorEdit(sector) {
  elements.sectorId.value = sector.id;
  elements.sectorName.value = sector.name;
  elements.sectorTarget.value = sector.target;
  setSectorFormMode(true);
}

function startAssetEdit(asset) {
  elements.assetId.value = asset.id;
  elements.assetName.value = asset.name;
  elements.assetAmount.value = asset.amount;
  elements.assetSector.value = asset.sectorId || '';
  setAssetFormMode(true);
}

function resetSectorForm() {
  elements.sectorForm.reset();
  elements.sectorId.value = '';
  setSectorFormMode(false);
}

function resetAssetForm() {
  elements.assetForm.reset();
  elements.assetId.value = '';
  setAssetFormMode(false);
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function attachEvents() {
  elements.registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = elements.regUsername.value.trim();
    const password = elements.regPassword.value;

    if (!username || !password) return;

    const users = loadUsers();
    if (users[username]) {
      setMessage(elements.registerMsg, '이미 존재하는 아이디입니다.', true);
      return;
    }
    const hash = await hashPassword(password);
    users[username] = hash;
    saveUsers(users);
    setMessage(elements.registerMsg, '가입 완료! 로그인 해주세요.');
    elements.registerForm.reset();
  });

  elements.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = elements.loginUsername.value.trim();
    const password = elements.loginPassword.value;
    const users = loadUsers();
    if (!users[username]) {
      setMessage(elements.loginMsg, '존재하지 않는 아이디입니다.', true);
      return;
    }
    const hash = await hashPassword(password);
    if (users[username] !== hash) {
      setMessage(elements.loginMsg, '비밀번호가 일치하지 않습니다.', true);
      return;
    }
    currentUser = username;
    setSession(username);
    state = loadData(username);
    showApp();
    renderAll();
    elements.loginForm.reset();
    setMessage(elements.loginMsg, '');
  });

  elements.logoutBtn.addEventListener('click', () => {
    currentUser = null;
    clearSession();
    showAuth();
  });

  elements.sectorCancel.addEventListener('click', () => {
    resetSectorForm();
  });

  elements.assetCancel.addEventListener('click', () => {
    resetAssetForm();
  });

  elements.sectorForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = elements.sectorName.value.trim();
    const target = parseFloat(elements.sectorTarget.value);
    if (!name || Number.isNaN(target)) return;
    const editId = elements.sectorId.value;
    if (editId) {
      const sector = state.sectors.find((s) => s.id === editId);
      if (sector) {
        sector.name = name;
        sector.target = Math.min(Math.max(target, 0), 100);
      }
    } else {
      state.sectors.push({ id: generateId('sector'), name, target });
    }
    saveData();
    renderAll();
    resetSectorForm();
  });

  elements.sectorList.addEventListener('input', (event) => {
    const nameInput = event.target.closest('.sector-name');
    const targetInput = event.target.closest('.sector-target');
    if (!nameInput && !targetInput) return;

    const input = nameInput || targetInput;
    const id = input.dataset.id;
    const sector = state.sectors.find((s) => s.id === id);
    if (!sector) return;

    if (nameInput) {
      const name = nameInput.value.trim();
      if (name) sector.name = name;
    }

    if (targetInput) {
      const target = parseFloat(targetInput.value);
      if (!Number.isNaN(target)) {
        sector.target = Math.min(Math.max(target, 0), 100);
      }
    }
    saveData();
    renderSummary();
  });

  elements.sectorList.addEventListener('click', (event) => {
    const deleteBtn = event.target.closest('[data-delete]');
    if (deleteBtn) {
      const id = deleteBtn.dataset.delete;
      state.sectors = state.sectors.filter((sector) => sector.id !== id);
      state.assets = state.assets.map((asset) =>
        asset.sectorId === id ? { ...asset, sectorId: '' } : asset
      );
      if (elements.sectorId.value === id) {
        resetSectorForm();
      }
      saveData();
      renderAll();
    }
  });

  elements.assetForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = elements.assetName.value.trim();
    const amount = parseInt(elements.assetAmount.value, 10);
    const sectorId = elements.assetSector.value;
    if (!name || Number.isNaN(amount)) return;
    const editId = elements.assetId.value;
    if (editId) {
      const asset = state.assets.find((a) => a.id === editId);
      if (asset) {
        asset.name = name;
        asset.amount = amount;
        asset.sectorId = sectorId;
      }
    } else {
      if (elements.mergeSameAsset && elements.mergeSameAsset.checked) {
        const existing = state.assets.find((a) => a.name === name);
        if (existing) {
          existing.amount += amount;
          if (sectorId) {
            existing.sectorId = sectorId;
          }
        } else {
          state.assets.push({ id: generateId('asset'), name, amount, sectorId });
        }
      } else {
        state.assets.push({ id: generateId('asset'), name, amount, sectorId });
      }
    }
    saveData();
    renderAll();
    resetAssetForm();
  });

  elements.assetList.addEventListener('click', (event) => {
    const editBtn = event.target.closest('[data-edit]');
    const deleteBtn = event.target.closest('[data-delete]');
    if (editBtn) {
      const id = editBtn.dataset.edit;
      const asset = state.assets.find((a) => a.id === id);
      if (asset) startAssetEdit(asset);
      return;
    }
    if (deleteBtn) {
      const id = deleteBtn.dataset.delete;
      state.assets = state.assets.filter((asset) => asset.id !== id);
      if (elements.assetId.value === id) {
        resetAssetForm();
      }
      saveData();
      renderAll();
    }
  });
}

function init() {
  attachEvents();
  const sessionUser = getSession();
  if (sessionUser) {
    currentUser = sessionUser;
    state = loadData(sessionUser);
    showApp();
    renderAll();
    resetSectorForm();
    resetAssetForm();
  } else {
    showAuth();
    resetSectorForm();
    resetAssetForm();
  }
}

init();
