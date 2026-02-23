const storage = {
  usersKey: 'ap_users',
  sessionKey: 'ap_session'
};

const elements = {
  registerForm: document.getElementById('registerForm'),
  registerMsg: document.getElementById('registerMsg'),
  openRegister: document.getElementById('openRegister'),
  closeRegister: document.getElementById('closeRegister'),
  registerModal: document.getElementById('registerModal'),
  registerSuccessModal: document.getElementById('registerSuccessModal'),
  registerConfirm: document.getElementById('registerConfirm'),
  loginForm: document.getElementById('loginForm'),
  loginMsg: document.getElementById('loginMsg'),
  regUsername: document.getElementById('regUsername'),
  regPassword: document.getElementById('regPassword'),
  loginUsername: document.getElementById('loginUsername'),
  loginPassword: document.getElementById('loginPassword')
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

function setSession(user) {
  localStorage.setItem(storage.sessionKey, user);
}

function clearSession() {
  localStorage.removeItem(storage.sessionKey);
}

function openRegisterModal() {
  elements.registerModal.hidden = false;
}

function closeRegisterModal() {
  elements.registerModal.hidden = true;
}

function openRegisterSuccess() {
  elements.registerSuccessModal.hidden = false;
}

function closeRegisterSuccess() {
  elements.registerSuccessModal.hidden = true;
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
    setMessage(elements.registerMsg, '');
    elements.registerForm.reset();
    closeRegisterModal();
    openRegisterSuccess();
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
    setSession(username);
    window.location.href = '/app.html';
  });

  elements.openRegister.addEventListener('click', () => {
    elements.registerForm.reset();
    setMessage(elements.registerMsg, '');
    openRegisterModal();
  });

  elements.closeRegister.addEventListener('click', () => {
    closeRegisterModal();
  });

  elements.registerConfirm.addEventListener('click', () => {
    closeRegisterSuccess();
  });
}

clearSession();
attachEvents();
