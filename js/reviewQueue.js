/**
 * SEERAT Review Queue Module
 * Critical Islamic Moderation Workflow: Approve, Structured Rejection, Media Video Preview
 */

const ReviewQueue = {
  currentTab: 'PENDING_REVIEW',
  items: [],
  selectedItem: null,

  async load() {
    const container = document.getElementById('view-review-queue');
    if (!container) return;

    this.bindEvents();
    await this.fetchItems();
  },

  bindEvents() {
    // Tabs
    const tabBtns = document.querySelectorAll('#review-tabs .tab-btn');
    tabBtns.forEach(btn => {
      btn.onclick = () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTab = btn.getAttribute('data-status');
        this.fetchItems();
      };
    });

    // Filters
    const typeFilter = document.getElementById('review-filter-type');
    const catFilter = document.getElementById('review-filter-category');
    const searchInput = document.getElementById('review-filter-search');

    if (typeFilter) typeFilter.onchange = () => this.fetchItems();
    if (catFilter) catFilter.onchange = () => this.fetchItems();
    if (searchInput) {
      searchInput.oninput = App.debounce(() => this.fetchItems(), 300);
    }
  },

  async fetchItems() {
    const tbody = document.getElementById('review-queue-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Loading Islamic moderation queue...</td></tr>`;

    try {
      const type = document.getElementById('review-filter-type')?.value || 'ALL';
      const cat = document.getElementById('review-filter-category')?.value || 'ALL';
      const search = document.getElementById('review-filter-search')?.value || '';

      const response = await Api.get('/review-queue', {
        status: this.currentTab,
        contentType: type,
        category: cat,
        search
      });

      if (response.success && response.data) {
        this.items = response.data;
        this.render();
      }
    } catch (err) {
      console.error('Failed to load review queue items:', err);
      App.showToast('Could not load review queue.', 'error');
    }
  },

  render() {
    const tbody = document.getElementById('review-queue-tbody');
    if (!tbody) return;

    if (this.items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-state-title">No items found</div>
              <div>There are no submissions currently matching this status and filter.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.items.map(item => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:48px;height:48px;background:#0f172a;border-radius:8px;overflow:hidden;flex-shrink:0;cursor:pointer;" onclick="ReviewQueue.openMediaModal('${item.id}')">
              ${item.thumbnail_url
                ? `<img src="${item.thumbnail_url}" style="width:100%;height:100%;object-fit:cover;">`
                : `<div style="color:#fff;display:flex;align-items:center;justify-content:center;height:100%;font-size:11px;font-weight:700;">${item.content_type}</div>`
              }
            </div>
            <div>
              <div style="font-weight:600;color:var(--text-main);">${App.escapeHtml(item.creator_name)}</div>
              <div style="font-size:12px;color:var(--text-muted);">@${App.escapeHtml(item.creator_username)}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="max-width:280px;">
            <div style="font-weight:500;color:var(--text-main);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${App.escapeHtml(item.caption || item.text_content || 'No Caption')}
            </div>
            ${item.reference_source ? `<div style="font-size:11.5px;color:var(--primary-700);font-weight:600;margin-top:2px;">Ref: ${App.escapeHtml(item.reference_source)}</div>` : ''}
          </div>
        </td>
        <td><span class="status-pill active">${item.content_type} (${item.format})</span></td>
        <td><span class="status-pill flagged">${App.escapeHtml(item.category_name || 'General')}</span></td>
        <td style="font-size:12px;color:var(--text-muted);">${App.formatDate(item.created_at)}</td>
        <td>
          ${this.getStatusBadge(item.status)}
          ${item.report_count > 0 ? `<div style="font-size:11px;color:var(--danger-600);font-weight:700;margin-top:4px;">⚠️ ${item.report_count} Reports</div>` : ''}
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;">
            <button class="btn btn-secondary btn-sm" title="Preview Media & Verification" onclick="ReviewQueue.openMediaModal('${item.id}')">Preview</button>
            ${item.status === 'PENDING_REVIEW' || item.status === 'REJECTED' || item.status === 'SUSPENDED' ? `
              <button class="btn btn-success-sm" onclick="ReviewQueue.quickApprove('${item.id}', '${item.content_type}')">Approve</button>
            ` : ''}
            ${item.status === 'PENDING_REVIEW' || item.status === 'APPROVED' ? `
              <button class="btn btn-danger-sm" onclick="ReviewQueue.openRejectModal('${item.id}', '${item.content_type}')">Reject</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  getStatusBadge(status) {
    switch (status) {
      case 'PENDING_REVIEW': return '<span class="status-pill pending">Pending Review</span>';
      case 'APPROVED': return '<span class="status-pill approved">Approved</span>';
      case 'REJECTED': return '<span class="status-pill rejected">Rejected</span>';
      case 'SUSPENDED': case 'FLAGGED': return '<span class="status-pill flagged">Flagged</span>';
      case 'REMOVED': return '<span class="status-pill suspended">Removed</span>';
      default: return `<span class="status-pill">${status}</span>`;
    }
  },

  async quickApprove(id, contentType) {
    try {
      const response = await Api.post(`/review-queue/${id}/approve`, {
        contentType,
        notes: 'Approved after verification'
      });

      if (response.success) {
        App.showToast('Content approved and published to SEERAT.', 'success');
        this.fetchItems();
        Dashboard.load();
      }
    } catch (err) {
      App.showToast(err.message || 'Failed to approve item', 'error');
    }
  },

  openRejectModal(id, contentType) {
    const modal = document.getElementById('modal-reject-content');
    if (!modal) return;

    document.getElementById('reject-content-id').value = id;
    document.getElementById('reject-content-type').value = contentType;
    document.getElementById('reject-reason-select').value = '';
    document.getElementById('reject-custom-notes').value = '';

    App.openModal('modal-reject-content');
  },

  async submitRejection() {
    const id = document.getElementById('reject-content-id').value;
    const contentType = document.getElementById('reject-content-type').value;
    const reason = document.getElementById('reject-reason-select').value;
    const notes = document.getElementById('reject-custom-notes').value;

    if (!reason) {
      App.showToast('Please select a rejection reason.', 'warning');
      return;
    }

    try {
      const response = await Api.post(`/review-queue/${id}/reject`, {
        contentType,
        rejectionReason: reason,
        customNotes: notes
      });

      if (response.success) {
        App.closeModal('modal-reject-content');
        App.showToast('Content rejected and notification sent to creator.', 'success');
        this.fetchItems();
        Dashboard.load();
      }
    } catch (err) {
      App.showToast(err.message || 'Failed to reject content', 'error');
    }
  },

  openMediaModal(id) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    this.selectedItem = item;
    const modal = document.getElementById('modal-media-preview');
    const container = document.getElementById('media-preview-container');
    const metaContainer = document.getElementById('media-meta-details');

    if (item.format === 'VIDEO' || item.content_type === 'REEL') {
      const videoSrc = item.media_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';
      container.innerHTML = `
        <video controls autoplay playsinline style="width:100%;max-height:400px;background:#000;">
          <source src="${videoSrc}" type="video/mp4">
          Your browser does not support HTML5 video.
        </video>
      `;
    } else if (item.thumbnail_url || item.media_url) {
      container.innerHTML = `
        <img src="${item.media_url || item.thumbnail_url}" style="width:100%;max-height:400px;object-fit:contain;background:#000;">
      `;
    } else {
      container.innerHTML = `
        <div style="padding:30px;background:var(--bg-subtle);border-radius:8px;text-align:center;color:var(--text-muted);">
          Text-only Islamic post submission.
        </div>
      `;
    }

    metaContainer.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="admin-avatar">${item.creator_name[0]}</div>
          <div>
            <div style="font-weight:700;font-size:14px;">${App.escapeHtml(item.creator_name)}</div>
            <div style="font-size:12px;color:var(--text-muted);">@${App.escapeHtml(item.creator_username)}</div>
          </div>
        </div>
        <span class="status-pill active">${item.category_name || 'Islamic'}</span>
      </div>

      ${item.arabic_text ? `
        <div style="background:var(--primary-50);padding:14px;border-radius:8px;font-size:18px;direction:rtl;text-align:right;font-family:'Traditional Arabic', serif;color:var(--primary-900);margin-bottom:10px;">
          ${App.escapeHtml(item.arabic_text)}
        </div>
      ` : ''}

      ${item.translation_text ? `
        <div style="font-size:13px;color:var(--text-main);margin-bottom:10px;font-style:italic;">
          "${App.escapeHtml(item.translation_text)}"
        </div>
      ` : ''}

      <div style="font-size:13.5px;color:var(--text-main);margin-bottom:12px;">
        <strong>Caption / Content:</strong> ${App.escapeHtml(item.caption || item.text_content || 'N/A')}
      </div>

      ${item.reference_source ? `
        <div style="font-size:12.5px;background:var(--bg-subtle);padding:8px 12px;border-radius:6px;color:var(--primary-800);font-weight:600;margin-bottom:12px;">
          📖 Authentic Reference Source: ${App.escapeHtml(item.reference_source)}
        </div>
      ` : ''}

      <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
        <button class="btn btn-secondary" onclick="App.closeModal('modal-media-preview')">Close</button>
        <button class="btn btn-danger" onclick="App.closeModal('modal-media-preview'); ReviewQueue.openRejectModal('${item.id}', '${item.content_type}')">Reject</button>
        <button class="btn btn-primary" onclick="App.closeModal('modal-media-preview'); ReviewQueue.quickApprove('${item.id}', '${item.content_type}')">Approve & Publish</button>
      </div>
    `;

    App.openModal('modal-media-preview');
  }
};
