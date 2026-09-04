/**
 * SEERAT Admin Authentication Module
 * Manages Login, Logout, Session Expiration, and Role-Based UI Gating
 */

const Auth = {
  currentAdmin: null,

  init() {
    this.currentAdmin = Api.getCurrentAdmin();
    const token = Api.getToken();

    if (token && this.currentAdmin) {
      this.showDashboard();
    } else {
      this.showLogin();
    }

    this.bindEvents();
  },

  bindEvents() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    const togglePasswordBtn = document.getElementById('toggle-password');
    if (togglePasswordBtn) {
      togglePasswordBtn.addEventListener('click', () => {
        const passInput = document.getElementById('login-password');
        if (passInput.type === 'password') {
          passInput.type = 'text';
          togglePasswordBtn.textContent = 'Hide';
        } else {
          passInput.type = 'password';
          togglePasswordBtn.textContent = 'Show';
        }
      });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    const forgotPasswordBtn = document.getElementById('forgot-password-link');
    if (forgotPasswordBtn) {
      forgotPasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        App.showToast('Please contact the Platform Super Admin to initiate password reset.', 'info');
      });
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');
    const rememberMeInput = document.getElementById('login-remember');
    const errorEl = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit-btn');

    const email = emailInput.value.trim();
    const password = passInput.value;
    const rememberMe = rememberMeInput ? rememberMeInput.checked : false;

    if (!email || !password) {
      this.showLoginError('Please enter both administrative email and password.');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';
      if (errorEl) errorEl.classList.add('hidden');

      const response = await Api.post('/auth/login', {
        email,
        password,
        rememberMe
      });

      if (response.success && response.data) {
        Api.setToken(response.data.token, rememberMe);
        Api.setCurrentAdmin(response.data.admin, rememberMe);
        this.currentAdmin = response.data.admin;

        App.showToast(`Welcome, ${this.currentAdmin.name}`, 'success');
        this.showDashboard();
      } else {
        throw new Error(response.error || 'Authentication failed');
      }
    } catch (err) {
      this.showLoginError(err.message || 'Invalid credentials or server error.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In to Portal';
    }
  },

  showLoginError(msg) {
    const errorEl = document.getElementById('login-error');
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
    }
  },

  showLogin() {
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('app-layout').classList.add('hidden');
  },

  showDashboard() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');

    this.renderAdminProfile();
    this.applyRoleRestrictions();

    // Trigger initial data load
    App.switchTab('dashboard');
    Notifications.load();
  },

  renderAdminProfile() {
    if (!this.currentAdmin) return;

    const nameEls = document.querySelectorAll('.admin-profile-name');
    const roleEls = document.querySelectorAll('.admin-profile-role');
    const avatarEls = document.querySelectorAll('.admin-avatar-img');

    nameEls.forEach(el => el.textContent = this.currentAdmin.name || 'Admin');
    roleEls.forEach(el => el.textContent = this.currentAdmin.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'MODERATOR');

    avatarEls.forEach(el => {
      if (this.currentAdmin.avatarUrl) {
        el.innerHTML = `<img src="${this.currentAdmin.avatarUrl}" style="width:100%;height:100%;border-radius:9999px;object-fit:cover;">`;
      } else {
        const initials = (this.currentAdmin.name || 'A').split(' ').map(n => n[0]).join('').slice(0, 2);
        el.textContent = initials;
      }
    });
  },

  applyRoleRestrictions() {
    const isSuperAdmin = this.currentAdmin && this.currentAdmin.role === 'SUPER_ADMIN';

    // Elements accessible only by SUPER_ADMIN (Admins management tab, System settings modifications)
    const superAdminElements = document.querySelectorAll('.super-admin-only');
    superAdminElements.forEach(el => {
      if (isSuperAdmin) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
  },

  async handleLogout() {
    try {
      await Api.post('/auth/logout');
    } catch (e) {
      // Ignore network errors during logout
    } finally {
      Api.clearSession();
      this.currentAdmin = null;
      App.showToast('You have been securely signed out.', 'info');
      this.showLogin();
    }
  }
};
