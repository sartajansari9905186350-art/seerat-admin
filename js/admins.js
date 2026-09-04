/**
 * SEERAT Admin Staff Management Module
 * SUPER_ADMIN ONLY: Staff list, Add Moderator, Role Modifications, Deactivations
 */

const Admins = {
  items: [],

  async load() {
    const container = document.getElementById('view-admins');
    if (!container) return;

    this.bindEvents();
    await this.fetchItems();
  },

  bindEvents() {
    const addBtn = document.getElementById('btn-add-admin');
    if (addBtn) {
      addBtn.onclick = () => {
        document.getElementById('admin-form-name').value = '';
        document.getElementById('admin-form-email').value = '';
        document.getElementById('admin-form-password').value = '';
        document.getElementById('admin-form-role').value = 'MODERATOR';
        App.openModal('modal-add-admin');
      };
    }
  },

  async fetchItems() {
    const tbody = document.getElementById('admins-table-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Loading administrative team...</td></tr>`;

    try {
      const response = await Api.get('/admins');
      if (response.success && response.data) {
        this.items = response.data;
        this.render();
      }
    } catch (err) {
      console.error('Failed to load admins:', err);
      App.showToast('Could not load administrative staff.', 'error');
    }
  },

  render() {
    const tbody = document.getElementById('admins-table-tbody');
    if (!tbody) return;

    if (this.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No administrators found.</td></tr>`;
      return;
    }

    const currentAdminId = Auth.currentAdmin ? Auth.currentAdmin.id : null;

    tbody.innerHTML = this.items.map(a => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="admin-avatar" style="width:34px;height:34px;font-size:12px;">
              ${a.name[0]}
            </div>
            <div>
              <div style="font-weight:600;font-size:13.5px;color:var(--text-main);">
                ${App.escapeHtml(a.name)} ${a.id === currentAdminId ? '<span style="font-size:11px;color:var(--primary-700);">(You)</span>' : ''}
              </div>
              <div style="font-size:11.5px;color:var(--text-muted);">${App.escapeHtml(a.email)}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="status-pill ${a.role === 'SUPER_ADMIN' ? 'active' : 'flagged'}">
            ${a.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'MODERATOR'}
          </span>
        </td>
        <td>
          <span class="status-pill ${a.status === 'ACTIVE' ? 'approved' : 'rejected'}">
            ${a.status}
          </span>
        </td>
        <td style="font-size:12px;color:var(--text-muted);">${a.last_login_at ? App.formatDate(a.last_login_at) : 'Never'}</td>
        <td style="font-size:12px;color:var(--text-muted);">${App.formatDate(a.created_at)}</td>
        <td>
          ${a.id !== currentAdminId ? `
            <div style="display:flex;align-items:center;gap:6px;">
              <button class="btn btn-secondary btn-sm" onclick="Admins.toggleStatus('${a.id}', '${a.status}')">
                ${a.status === 'ACTIVE' ? 'Disable' : 'Enable'}
              </button>
              <button class="btn btn-danger-sm" onclick="Admins.deleteAdmin('${a.id}', '${App.escapeHtml(a.name)}')">
                Delete
              </button>
            </div>
          ` : '<span style="font-size:12px;color:var(--text-light);font-style:italic;">Primary Super Admin</span>'}
        </td>
      </tr>
    `).join('');
  },

  async submitNewAdmin() {
    const name = document.getElementById('admin-form-name').value.trim();
    const email = document.getElementById('admin-form-email').value.trim();
    const password = document.getElementById('admin-form-password').value;
    const role = document.getElementById('admin-form-role').value;

    if (!name || !email || !password) {
      App.showToast('All fields are required to create staff accounts.', 'warning');
      return;
    }

    try {
      const response = await Api.post('/admins', { name, email, password, role });
      if (response.success) {
        App.closeModal('modal-add-admin');
        App.showToast(`Staff member "${name}" (${role}) created successfully.`, 'success');
        this.fetchItems();
      }
    } catch (err) {
      App.showToast(err.message || 'Failed to create admin user', 'error');
    }
  },

  async toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      const response = await Api.patch(`/admins/${id}`, { status: newStatus });
      if (response.success) {
        App.showToast(`Admin account ${newStatus.toLowerCase()}.`, 'success');
        this.fetchItems();
      }
    } catch (err) {
      App.showToast(err.message || 'Failed to update admin status', 'error');
    }
  },

  async deleteAdmin(id, name) {
    App.confirm('Remove Admin Access', `Are you sure you want to completely remove "${name}" from administrative access?`, async () => {
      try {
        const response = await Api.delete(`/admins/${id}`);
        if (response.success) {
          App.showToast('Admin user deleted.', 'success');
          this.fetchItems();
        }
      } catch (err) {
        App.showToast(err.message || 'Failed to delete admin', 'error');
      }
    });
  }
};
