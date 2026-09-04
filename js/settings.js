/**
 * SEERAT Platform Settings Module
 * System Configuration, Islamic Moderation Controls, Security Policies
 */

const Settings = {
  settingsData: {},
  categories: [],

  async load() {
    const container = document.getElementById('view-settings');
    if (!container) return;

    this.bindEvents();
    await this.fetchSettings();
  },

  bindEvents() {
    const generalForm = document.getElementById('form-general-settings');
    const moderationForm = document.getElementById('form-moderation-settings');
    const securityForm = document.getElementById('form-security-settings');

    if (generalForm) {
      generalForm.onsubmit = (e) => {
        e.preventDefault();
        this.saveGeneralSettings();
      };
    }

    if (moderationForm) {
      moderationForm.onsubmit = (e) => {
        e.preventDefault();
        this.saveModerationSettings();
      };
    }

    if (securityForm) {
      securityForm.onsubmit = (e) => {
        e.preventDefault();
        this.saveSecuritySettings();
      };
    }
  },

  async fetchSettings() {
    try {
      const response = await Api.get('/settings');
      if (response.success && response.data) {
        this.settingsData = response.data.settings || {};
        this.categories = response.data.categories || [];
        this.render();
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
      App.showToast('Could not load system settings.', 'error');
    }
  },

  render() {
    const gen = this.settingsData.general_settings || {};
    const mod = this.settingsData.moderation_settings || {};
    const sec = this.settingsData.security_settings || {};

    // General Form Fields
    const appNameInput = document.getElementById('setting-app-name');
    const maintenanceInput = document.getElementById('setting-maintenance-mode');
    const registrationInput = document.getElementById('setting-new-registration');
    const moderationToggle = document.getElementById('setting-moderation-enabled');

    if (appNameInput) appNameInput.value = gen.appName || 'SEERAT';
    if (maintenanceInput) maintenanceInput.checked = Boolean(gen.maintenanceMode);
    if (registrationInput) registrationInput.checked = gen.newUserRegistration !== false;
    if (moderationToggle) moderationToggle.checked = gen.contentModerationEnabled !== false;

    // Moderation Fields
    const autoFlagInput = document.getElementById('setting-auto-flag');
    const requireApprovalInput = document.getElementById('setting-require-approval');
    const maxReportsInput = document.getElementById('setting-max-reports');

    if (autoFlagInput) autoFlagInput.checked = Boolean(mod.autoFlagKeywords);
    if (requireApprovalInput) requireApprovalInput.checked = mod.requireApprovalBeforePublic !== false;
    if (maxReportsInput) maxReportsInput.value = mod.maxReportsBeforeAutoHold || 3;

    // Security Fields
    const timeoutInput = document.getElementById('setting-session-timeout');
    const maxAttemptsInput = document.getElementById('setting-max-attempts');
    const lockoutInput = document.getElementById('setting-lockout-duration');
    const strongPassInput = document.getElementById('setting-strong-password');

    if (timeoutInput) timeoutInput.value = sec.adminSessionTimeoutMinutes || 120;
    if (maxAttemptsInput) maxAttemptsInput.value = sec.maxLoginAttempts || 5;
    if (lockoutInput) lockoutInput.value = sec.lockoutDurationMinutes || 15;
    if (strongPassInput) strongPassInput.checked = sec.requireStrongPassword !== false;

    // Render Categories
    const catList = document.getElementById('settings-categories-list');
    if (catList && this.categories.length > 0) {
      catList.innerHTML = this.categories.map(c => `
        <div style="background:var(--bg-subtle);padding:10px 14px;border-radius:6px;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-weight:700;color:var(--primary-800);">${c.sort_order}.</span>
            <div>
              <div style="font-weight:600;font-size:13.5px;color:var(--text-main);">${App.escapeHtml(c.name)}</div>
              <div style="font-size:12px;color:var(--text-muted);">${App.escapeHtml(c.description || '')}</div>
            </div>
          </div>
          <div style="font-family:'Traditional Arabic', serif;font-size:16px;color:var(--primary-900);">${App.escapeHtml(c.arabic_name || '')}</div>
        </div>
      `).join('');
    }
  },

  async saveGeneralSettings() {
    const value = {
      appName: document.getElementById('setting-app-name').value.trim(),
      maintenanceMode: document.getElementById('setting-maintenance-mode').checked,
      newUserRegistration: document.getElementById('setting-new-registration').checked,
      contentModerationEnabled: document.getElementById('setting-moderation-enabled').checked
    };

    try {
      const response = await Api.patch('/settings', { key: 'general_settings', value });
      if (response.success) {
        App.showToast('General platform settings updated.', 'success');
      }
    } catch (err) {
      App.showToast(err.message || 'Failed to update settings', 'error');
    }
  },

  async saveModerationSettings() {
    const value = {
      autoFlagKeywords: document.getElementById('setting-auto-flag').checked,
      requireApprovalBeforePublic: document.getElementById('setting-require-approval').checked,
      maxReportsBeforeAutoHold: parseInt(document.getElementById('setting-max-reports').value, 10),
      allowedLanguages: ['en', 'ur', 'ar', 'hi']
    };

    try {
      const response = await Api.patch('/settings', { key: 'moderation_settings', value });
      if (response.success) {
        App.showToast('Islamic moderation rules saved.', 'success');
      }
    } catch (err) {
      App.showToast(err.message || 'Failed to update moderation settings', 'error');
    }
  },

  async saveSecuritySettings() {
    const value = {
      adminSessionTimeoutMinutes: parseInt(document.getElementById('setting-session-timeout').value, 10),
      maxLoginAttempts: parseInt(document.getElementById('setting-max-attempts').value, 10),
      lockoutDurationMinutes: parseInt(document.getElementById('setting-lockout-duration').value, 10),
      requireStrongPassword: document.getElementById('setting-strong-password').checked
    };

    try {
      const response = await Api.patch('/settings', { key: 'security_settings', value });
      if (response.success) {
        App.showToast('Security and authentication policies saved.', 'success');
      }
    } catch (err) {
      App.showToast(err.message || 'Failed to update security settings', 'error');
    }
  }
};
