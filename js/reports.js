/**
 * SEERAT Reports Management Module
 * User Flagging Triage, Resolution Actions, and Dismissals
 */

const Reports = {
  items: [],
  selectedReport: null,

  async load() {
    const container = document.getElementById('view-reports');
    if (!container) return;

    this.bindEvents();
    await this.fetchItems();
  },

  bindEvents() {
    const statusFilter = document.getElementById('reports-filter-status');
    const reasonFilter = document.getElementById('reports-filter-reason');

    if (statusFilter) statusFilter.onchange = () => this.fetchItems();
    if (reasonFilter) reasonFilter.onchange = () => this.fetchItems();
  },

  async fetchItems() {
    const tbody = document.getElementById('reports-table-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Loading user reports...</td></tr>`;

    try {
      const status = document.getElementById('reports-filter-status')?.value || 'ALL';
      const reason = document.getElementById('reports-filter-reason')?.value || 'ALL';

      const response = await Api.get('/reports', { status, reason });
      if (response.success && response.data) {
        this.items = response.data;
        this.render();
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      App.showToast('Could not load reports database.', 'error');
    }
  },

  render() {
    const tbody = document.getElementById('reports-table-tbody');
    if (!tbody) return;

    if (this.items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-state-title">No reports found</div>
              <div>No user reports matching the selected filters.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.items.map(r => `
      <tr>
        <td>
          <div style="font-family:monospace;font-size:12px;color:var(--text-muted);">
            #${r.id.slice(0, 8)}
          </div>
        </td>
        <td>
          <div style="font-weight:600;color:var(--text-main);font-size:13px;">${App.escapeHtml(r.reporter_name || 'Anonymous')}</div>
          <div style="font-size:11.5px;color:var(--text-muted);">@${App.escapeHtml(r.reporter_username || 'user')}</div>
        </td>
        <td><span class="status-pill active">${r.target_type}</span></td>
        <td><span class="status-pill flagged">${App.escapeHtml(r.reason)}</span></td>
        <td style="font-size:12px;color:var(--text-muted);">${App.formatDate(r.created_at)}</td>
        <td>
          <span class="status-pill ${r.status === 'OPEN' ? 'open' : (r.status === 'RESOLVED' ? 'resolved' : 'pending')}">
            ${r.status}
          </span>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;">
            <button class="btn btn-secondary btn-sm" onclick="Reports.openReportDetails('${r.id}')">Inspect</button>
            ${r.status === 'OPEN' || r.status === 'UNDER_REVIEW' ? `
              <button class="btn btn-success-sm" onclick="Reports.openResolveModal('${r.id}')">Resolve</button>
              <button class="btn btn-ghost btn-sm" onclick="Reports.dismissReport('${r.id}')">Dismiss</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  async openReportDetails(id) {
    try {
      const response = await Api.get(`/reports/${id}`);
      if (!response.success || !response.data) throw new Error('Report details not found');

      const { report, targetDetails } = response.data;
      this.selectedReport = report;

      const modalBody = document.getElementById('report-details-modal-body');
      modalBody.innerHTML = `
        <div style="background:var(--bg-subtle);padding:14px;border-radius:8px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <div style="font-weight:700;color:var(--text-main);">Report #${report.id.slice(0, 8)}</div>
            <span class="status-pill ${report.status === 'OPEN' ? 'open' : 'resolved'}">${report.status}</span>
          </div>
          <div style="font-size:13px;color:var(--text-muted);">
            Filed by <strong>${App.escapeHtml(report.reporter_name)}</strong> (@${App.escapeHtml(report.reporter_username)}) on ${App.formatDate(report.created_at)}
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Violation Reason</div>
          <div style="font-size:14px;font-weight:600;color:var(--danger-600);">${App.escapeHtml(report.reason)}</div>
          ${report.details ? `<div style="font-size:13px;color:var(--text-main);margin-top:4px;">"${App.escapeHtml(report.details)}"</div>` : ''}
        </div>

        <div style="margin-bottom:16px;">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px;">Target Object (${report.target_type})</div>
          <div style="background:#ffffff;border:1px solid var(--border-subtle);padding:12px;border-radius:6px;">
            ${targetDetails ? `
              <div style="font-weight:600;font-size:13px;">${App.escapeHtml(targetDetails.name || targetDetails.caption || targetDetails.text_content || 'Target Content')}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">ID: ${targetDetails.id}</div>
            ` : `<div style="font-size:12px;color:var(--text-muted);">Target data no longer available.</div>`}
          </div>
        </div>

        ${report.resolution_notes ? `
          <div style="background:var(--primary-50);padding:12px;border-radius:6px;margin-bottom:16px;">
            <div style="font-size:12px;font-weight:700;color:var(--primary-800);">Resolution Outcome</div>
            <div style="font-size:13px;color:var(--primary-900);margin-top:2px;">Action: ${report.action_taken} • ${report.resolution_notes}</div>
          </div>
        ` : ''}
      `;

      App.openModal('modal-report-details');
    } catch (err) {
      App.showToast(err.message || 'Failed to inspect report', 'error');
    }
  },

  openResolveModal(id) {
    document.getElementById('resolve-report-id').value = id;
    document.getElementById('resolve-action-select').value = 'NONE';
    document.getElementById('resolve-notes-input').value = '';
    App.openModal('modal-resolve-report');
  },

  async submitResolve() {
    const id = document.getElementById('resolve-report-id').value;
    const action = document.getElementById('resolve-action-select').value;
    const notes = document.getElementById('resolve-notes-input').value.trim();

    try {
      const response = await Api.post(`/reports/${id}/resolve`, {
        actionTaken: action,
        notes
      });

      if (response.success) {
        App.closeModal('modal-resolve-report');
        App.showToast('Report marked as Resolved.', 'success');
        this.fetchItems();
        Dashboard.load();
      }
    } catch (err) {
      App.showToast(err.message || 'Failed to resolve report', 'error');
    }
  },

  async dismissReport(id) {
    App.confirm('Dismiss Report', 'Are you sure you want to dismiss this report without punitive action?', async () => {
      try {
        const response = await Api.post(`/reports/${id}/dismiss`, {
          reason: 'Report inspected and dismissed as invalid'
        });

        if (response.success) {
          App.showToast('Report dismissed.', 'info');
          this.fetchItems();
          Dashboard.load();
        }
      } catch (err) {
        App.showToast(err.message || 'Failed to dismiss report', 'error');
      }
    });
  }
};
