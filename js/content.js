/**
 * SEERAT Content Management Module
 * Posts, Reels, Search, Remove, and Restore operations
 */

const Content = {
  items: [],

  async load() {
    const container = document.getElementById('view-content');
    if (!container) return;

    this.bindEvents();
    await this.fetchItems();
  },

  bindEvents() {
    const typeFilter = document.getElementById('content-filter-type');
    const statusFilter = document.getElementById('content-filter-status');
    const catFilter = document.getElementById('content-filter-category');
    const searchInput = document.getElementById('content-filter-search');

    if (typeFilter) typeFilter.onchange = () => this.fetchItems();
    if (statusFilter) statusFilter.onchange = () => this.fetchItems();
    if (catFilter) catFilter.onchange = () => this.fetchItems();
    if (searchInput) {
      searchInput.oninput = App.debounce(() => this.fetchItems(), 300);
    }
  },

  async fetchItems() {
    const tbody = document.getElementById('content-table-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Loading content database...</td></tr>`;

    try {
      const type = document.getElementById('content-filter-type')?.value || 'ALL';
      const status = document.getElementById('content-filter-status')?.value || 'ALL';
      const cat = document.getElementById('content-filter-category')?.value || 'ALL';
      const search = document.getElementById('content-filter-search')?.value || '';

      const response = await Api.get('/content', {
        contentType: type,
        status,
        category: cat,
        search
      });

      if (response.success && response.data) {
        this.items = response.data;
        this.render();
      }
    } catch (err) {
      console.error('Failed to load content list:', err);
      App.showToast('Could not load content records.', 'error');
    }
  },

  render() {
    const tbody = document.getElementById('content-table-tbody');
    if (!tbody) return;

    if (this.items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-state-title">No content records found</div>
              <div>Try adjusting your search criteria or filters.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.items.map(item => `
      <tr>
        <td>
          <div style="font-family:monospace;font-size:12px;color:var(--text-muted);">
            #${item.id.slice(0, 8)}
          </div>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;background:#0f172a;border-radius:6px;overflow:hidden;flex-shrink:0;">
              ${item.thumbnail_url
                ? `<img src="${item.thumbnail_url}" style="width:100%;height:100%;object-fit:cover;">`
                : `<div style="color:#fff;display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;font-weight:700;">${item.content_type}</div>`
              }
            </div>
            <div>
              <div style="font-weight:600;font-size:13px;">${App.escapeHtml(item.creator_name)}</div>
              <div style="font-size:11.5px;color:var(--text-muted);">@${App.escapeHtml(item.creator_username)}</div>
            </div>
          </div>
        </td>
        <td><span class="status-pill active">${item.content_type}</span></td>
        <td><span class="status-pill flagged">${App.escapeHtml(item.category_name || 'General')}</span></td>
        <td>${ReviewQueue.getStatusBadge(item.status)}</td>
        <td style="font-size:12px;color:var(--text-muted);">${App.formatDate(item.created_at)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;">
            <button class="btn btn-secondary btn-sm" onclick="ReviewQueue.openMediaModal('${item.id}')">View</button>
            ${item.status === 'REMOVED' ? `
              <button class="btn btn-success-sm" onclick="Content.restoreContent('${item.id}', '${item.content_type}')">Restore</button>
            ` : `
              <button class="btn btn-danger-sm" onclick="Content.removeContent('${item.id}', '${item.content_type}')">Remove</button>
            `}
          </div>
        </td>
      </tr>
    `).join('');
  },

  async removeContent(id, contentType) {
    App.confirm(
      'Remove Content Item',
      `Are you sure you want to remove this ${contentType.toLowerCase()}? It will no longer be visible in feeds.`,
      async () => {
        try {
          const response = await Api.post(`/content/${id}/remove`, {
            contentType,
            reason: 'Removed by moderator after inspection'
          });

          if (response.success) {
            App.showToast('Content item removed.', 'success');
            this.fetchItems();
          }
        } catch (err) {
          App.showToast(err.message || 'Failed to remove content', 'error');
        }
      }
    );
  },

  async restoreContent(id, contentType) {
    try {
      const response = await Api.post(`/content/${id}/restore`, { contentType });
      if (response.success) {
        App.showToast('Content restored to Approved status.', 'success');
        this.fetchItems();
      }
    } catch (err) {
      App.showToast(err.message || 'Failed to restore content', 'error');
    }
  }
};
