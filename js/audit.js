/**
 * SEERAT Admin Audit Logs Module
 * Immutable Action Tracking, Compliance Verification, and Security Logs
 */

const Audit = {
  items: [],

  async load() {
    const container = document.getElementById('view-audit');
    if (!container) return;

    this.bindEvents();
    await this.fetchItems();
  },

  bindEvents() {
    const actionFilter = document.getElementById('audit-filter-action');
    const searchInput = document.getElementById('audit-filter-search');

    if (actionFilter) actionFilter.onchange = () => this.fetchItems();
    if (searchInput) {
      searchInput.oninput = App.debounce(() => this.fetchItems(), 300);
    }
  },

  async fetchItems() {
    const tbody = document.getElementById('audit-table-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Loading immutable audit trail...</td></tr>`;

    try {
      const action = document.getElementById('audit-filter-action')?.value || 'ALL';
      const search = document.getElementById('audit-filter-search')?.value || '';

      const response = await Api.get('/audit-logs', { action, search });
      if (response.success && response.data) {
        this.items = response.data;
        this.render();
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      App.showToast('Could not load audit log records.', 'error');
    }
  },

  render() {
    const tbody = document.getElementById('audit-table-tbody');
    if (!tbody) return;

    if (this.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No audit logs found matching criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.items.map(l => `
      <tr>
        <td style="font-size:12px;color:var(--text-muted);white-space:nowrap;">
          ${App.formatDate(l.created_at)}
        </td>
        <td>
          <div style="font-weight:600;font-size:13px;color:var(--text-main);">${App.escapeHtml(l.admin_name)}</div>
          <div style="font-size:11px;color:var(--text-muted);">${App.escapeHtml(l.admin_email)}</div>
        </td>
        <td>
          <span class="status-pill ${this.getActionBadgeClass(l.action)}">
            ${App.escapeHtml(l.action)}
          </span>
        </td>
        <td><span class="status-pill active">${l.target_type}</span></td>
        <td style="font-family:monospace;font-size:11.5px;color:var(--text-muted);">
          ${l.target_id ? '#' + l.target_id.slice(0, 8) : 'N/A'}
        </td>
        <td style="max-width:280px;font-size:12.5px;color:var(--text-main);">
          ${App.escapeHtml(l.reason || 'No description provided')}
        </td>
        <td style="font-family:monospace;font-size:11.5px;color:var(--text-muted);">
          ${App.escapeHtml(l.ip_address || '—')}
        </td>
      </tr>
    `).join('');
  },

  getActionBadgeClass(action) {
    if (action.includes('APPROVE') || action.includes('RESTORE')) return 'approved';
    if (action.includes('REJECT') || action.includes('REMOVE') || action.includes('SUSPEND') || action.includes('DELETE')) return 'rejected';
    if (action.includes('FLAG')) return 'flagged';
    return 'pending';
  }
};
