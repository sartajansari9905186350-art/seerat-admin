/**
 * SEERAT Admin Notification Center Module
 * Real-time moderation alerts, reports notifications, and unread badges
 */

const Notifications = {
  items: [],
  unreadCount: 0,

  async load() {
    this.bindEvents();
    await this.fetchNotifications();
  },

  bindEvents() {
    const notifBtn = document.getElementById('btn-notifications');
    const dropdown = document.getElementById('notifications-dropdown');
    const markAllBtn = document.getElementById('btn-mark-all-read');

    if (notifBtn && dropdown) {
      notifBtn.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
      };

      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !notifBtn.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      });
    }

    if (markAllBtn) {
      markAllBtn.onclick = () => this.markAllAsRead();
    }
  },

  async fetchNotifications() {
    try {
      const response = await Api.get('/notifications');
      if (response.success && response.data) {
        this.items = response.data.notifications || [];
        this.unreadCount = response.data.unreadCount || 0;
        this.render();
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  },

  render() {
    const badge = document.getElementById('notification-badge-count');
    const list = document.getElementById('notifications-list-container');

    if (badge) {
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    if (list) {
      if (this.items.length === 0) {
        list.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">No notifications.</div>`;
        return;
      }

      list.innerHTML = this.items.map(n => `
        <div style="padding:10px 14px;border-bottom:1px solid var(--border-subtle);background:${n.is_read ? '#fff' : 'var(--primary-50)'};cursor:pointer;" onclick="Notifications.handleClick('${n.id}', '${n.type}', '${n.target_id || ''}')">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-weight:600;font-size:12.5px;color:var(--text-main);">${App.escapeHtml(n.title)}</div>
            <div style="font-size:10.5px;color:var(--text-muted);">${App.formatDate(n.created_at)}</div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
            ${App.escapeHtml(n.message)}
          </div>
        </div>
      `).join('');
    }
  },

  async handleClick(id, type, targetId) {
    try {
      await Api.patch(`/notifications/${id}/read`);
      const n = this.items.find(x => x.id === id);
      if (n && !n.is_read) {
        n.is_read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.render();
      }

      // Route to appropriate section
      const dropdown = document.getElementById('notifications-dropdown');
      if (dropdown) dropdown.classList.add('hidden');

      if (type === 'PENDING_REVIEW') {
        App.switchTab('review-queue');
      } else if (type === 'REPORT_FILED') {
        App.switchTab('reports');
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  },

  async markAllAsRead() {
    try {
      await Api.post('/notifications/read-all');
      this.items.forEach(n => n.is_read = true);
      this.unreadCount = 0;
      this.render();
      App.showToast('All notifications marked as read.', 'info');
    } catch (err) {
      App.showToast('Failed to mark all as read', 'error');
    }
  }
};
