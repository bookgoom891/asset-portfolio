const storage = {
  usersKey: 'ap_users'
};

const elements = {
  resetForm: document.getElementById('resetForm'),
  resetMsg: document.getElementById('resetMsg'),
  resetUsername: document.getElementById('resetUsername'),
  resetPassword: document.getElementById('resetPassword'),
  resetModal: document.getElementById('resetModal'),
  resetConfirm: document.getElementById('resetConfirm')
};

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

function setMessage(el, text, isError = false) {
  el.textContent = text;
  el.style.color = isError ? '#c84215' : '#1f8a8a';
}

function openResetModal() {
  elements.resetModal.hidden = false;
}

function closeResetModal() {
  elements.resetModal.hidden = true;
}

function attachEvents() {
  elements.resetForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = elements.resetUsername.value.trim();
    const password = elements.resetPassword.value;
    const users = loadUsers();
    if (!users[username]) {
      setMessage(elements.resetMsg, '존재하지 않는 아이디입니다.', true);
      return;
    }
    const hash = await hashPassword(password);
    users[username] = hash;
    saveUsers(users);
    elements.resetForm.reset();
    setMessage(elements.resetMsg, '');
    openResetModal();
  });

  elements.resetConfirm.addEventListener('click', () => {
    closeResetModal();
    window.location.href = '/index.html';
  });
}

attachEvents();
