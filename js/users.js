/**
 * SEERAT Users Management Module
 * User Accounts, Moderation, Profile Details Modal, and Suspension Actions
 */

const Users = {
  items: [],
  selectedUser: null,

  async load() {
    const container = document.getElementById('view-users');
    if (!container) return;

    this.bindEvents();
    await this.fetchItems();
  },

  bindEvents() {
    const statusFilter = document.getElementById('users-filter-status');
    const searchInput = document.getElementById('users-filter-search');

    if (statusFilter) statusFilter.onchange = () => this.fetchItems();
    if (searchInput) {
      searchInput.oninput = App.debounce(() => this.fetchItems(), 300);
    }
  },

  async fetchItems() {
    const tbody = document.getElementById('users-table-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="empty-state">Loading user registry...</td></tr>`;

    try {
      const status = document.getElementById('users-filter-status')?.value || 'ALL';
      const search = document.getElementById('users-filter-search')?.value || '';

      const response = await Api.get('/users', { status, search });
      if (response.success && response.data) {
        this.items = response.data;
        this.render();
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      App.showToast('Could not load user accounts.', 'error');
    }
  },

  render() {
    const tbody = document.getElementById('users-table-tbody');
    if (!tbody) return;

    if (this.items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <div class="empty-state-title">No users found</div>
              <div>Try adjusting your search criteria or filter.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.items.map(u => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="admin-avatar" style="width:34px;height:34px;font-size:12px;">
              ${u.profile_photo ? `<img src="${u.profile_photo}" style="width:100%;height:100%;border-radius:9999px;object-fit:cover;">` : u.name[0]}
            </div>
            <div>
              <div style="font-weight:600;font-size:13.5px;color:var(--text-main);">
                ${App.escapeHtml(u.name)} ${u.is_verified ? '<span title="Verified" style="color:var(--primary-700)">✓</span>' : ''}
              </div>
              <div style="font-size:11.5px;color:var(--text-muted);">@${App.escapeHtml(u.username)}</div>
            </div>
          </div>
        </td>
        <td style="font-size:13px;color:var(--text-muted);">${App.escapeHtml(u.email)}</td>
        <td>
          <span class="status-pill ${u.status === 'ACTIVE' ? 'active' : (u.status === 'SUSPENDED' ? 'rejected' : 'suspended')}">
            ${u.status}
          </span>
          ${u.report_count > 0 ? `<div style="font-size:10.5px;color:var(--danger-600);font-weight:700;margin-top:2px;">⚠️ ${u.report_count} Reports</div>` : ''}
        </td>
        <td>${Number(u.followers_count || 0).toLocaleString()}</td>
        <td>${Number(u.posts_count || 0) + Number(u.reels_count || 0)}</td>
        <td style="font-size:12px;color:var(--text-muted);">${App.formatDate(u.created_at)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;">
            <button class="btn btn-secondary btn-sm" onclick="Users.viewUserDetails('${u.id}')">Details</button>
            ${u.status === 'ACTIVE' ? `
              <button class="btn btn-danger-sm" onclick="Users.openSuspendModal('${u.id}', '${App.escapeHtml(u.username)}')">Suspend</button>
            ` : `
              <button class="btn btn-success-sm" onclick="Users.unsuspendUser('${u.id}', '${App.escapeHtml(u.username)}')">Unsuspend</button>
            `}
          </div>
        </td>
      </tr>
    `).join('');
  },

  async viewUserDetails(id) {
    try {
      const response = await Api.get(`/users/${id}`);
      if (!response.success || !response.data) throw new Error('User not found');

      const { user, posts, reels, reports } = response.data;
      this.selectedUser = user;

      const body = document.getElementById('user-details-modal-body');
      body.innerHTML = `
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border-subtle);">
          <div class="admin-avatar" style="width:56px;height:56px;font-size:20px;">
            ${user.profile_photo ? `<img src="${user.profile_photo}" style="width:100%;height:100%;border-radius:9999px;object-fit:cover;">` : user.name[0]}
          </div>
          <div>
            <div style="font-size:18px;font-weight:700;color:var(--text-main);">
              ${App.escapeHtml(user.name)} ${user.is_verified ? '<span style="color:var(--primary-700)">✓</span>' : ''}
            </div>
            <div style="font-size:13px;color:var(--text-muted);">@${App.escapeHtml(user.username)} • ${App.escapeHtml(user.email)}</div>
            <div style="margin-top:6px;display:flex;gap:8px;">
              <span class="status-pill ${user.status === 'ACTIVE' ? 'active' : 'rejected'}">${user.status}</span>
              <span class="status-pill flagged">Joined: ${App.formatDate(user.created_at)}</span>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;margin-bottom:20px;text-align:center;">
          <div style="background:var(--bg-subtle);padding:10px;border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Followers</div>
            <div style="font-size:16px;font-weight:800;">${Number(user.followers_count || 0).toLocaleString()}</div>
          </div>
          <div style="background:var(--bg-subtle);padding:10px;border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Following</div>
            <div style="font-size:16px;font-weight:800;">${Number(user.following_count || 0).toLocaleString()}</div>
          </div>
          <div style="background:var(--bg-subtle);padding:10px;border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Posts</div>
            <div style="font-size:16px;font-weight:800;">${posts.length}</div>
          </div>
          <div style="background:var(--bg-subtle);padding:10px;border-radius:8px;">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:700;">Reels</div>
            <div style="font-size:16px;font-weight:800;">${reels.length}</div>
          </div>
        </div>

        ${user.bio ? `
          <div style="margin-bottom:16px;">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Bio</div>
            <div style="font-size:13.5px;color:var(--text-main);background:var(--bg-subtle);padding:10px 12px;border-radius:6px;">
              ${App.escapeHtml(user.bio)}
            </div>
          </div>
        ` : ''}

        ${user.suspension_reason ? `
          <div style="margin-bottom:16px;background:var(--danger-50);border-left:4px solid var(--danger-600);padding:10px 12px;border-radius:4px;">
            <div style="font-size:12px;font-weight:700;color:var(--danger-600);">Suspension Notice</div>
            <div style="font-size:13px;color:var(--text-main);">${App.escapeHtml(user.suspension_reason)}</div>
          </div>
        ` : ''}

        <div style="margin-top:20px;">
          <div style="font-size:13px;font-weight:700;color:var(--text-main);margin-bottom:10px;">Recent Submissions (${posts.length + reels.length})</div>
          <div style="max-height:180px;overflow-y:auto;border:1px solid var(--border-subtle);border-radius:6px;">
            ${[...posts, ...reels].length === 0 ? '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">No content submissions found.</div>' : ''}
            ${[...posts, ...reels].map(c => `
              <div style="padding:8px 12px;border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:space-between;font-size:12.5px;">
                <div style="max-width:320px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${App.escapeHtml(c.caption || c.text_content || 'Submission')}
                </div>
                <div>${ReviewQueue.getStatusBadge(c.status)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      App.openModal('modal-user-details');
    } catch (err) {
      App.showToast(err.message || 'Failed to fetch user details', 'error');
    }
  },

  openSuspendModal(id, username) {
    document.getElementById('suspend-user-id').value = id;
    document.getElementById('suspend-user-label').textContent = `@${username}`;
    document.getElementById('suspend-reason-input').value = '';
    App.openModal('modal-suspend-user');
  },

  async submitSuspension() {
    const id = document.getElementById('suspend-user-id').value;
    const reason = document.getElementById('suspend-reason-input').value.trim();

    if (!reason) {
      App.showToast('Please provide a reason for suspension.', 'warning');
      return;
    }

    try {
      const response = await Api.post(`/users/${id}/suspend`, { reason });
      if (response.success) {
        App.closeModal('modal-suspend-user');
        App.showToast('User suspended and content temporarily held.', 'success');
        this.fetchItems();
      }
    } catch (err) {
      App.showToast(err.message || 'Failed to suspend user', 'error');
    }
  },

  async unsuspendUser(id, username) {
    App.confirm(
      'Unsuspend User Account',
      `Restore active standing for @${username}? Their verified content will be restored.`,
      async () => {
        try {
          const response = await Api.post(`/users/${id}/unsuspend`);
          if (response.success) {
            App.showToast(`User @${username} unsuspended.`, 'success');
            this.fetchItems();
          }
        } catch (err) {
          App.showToast(err.message || 'Failed to unsuspend user', 'error');
        }
      }
    );
  }
};
