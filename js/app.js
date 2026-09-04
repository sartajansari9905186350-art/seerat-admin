/**
 * SEERAT Admin Portal - Main Application Orchestrator
 * Tab Routing, Global Search, Modal Services, and Toast Notifications
 */

const App = {
  currentTab: 'dashboard',
  confirmCallback: null,

  init() {
    this.bindNavigation();
    this.bindGlobalSearch();
    this.bindMobileSidebar();
    this.bindModalDismissals();

    // Start Authentication & Lifecycle
    Auth.init();
  },

  bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-tab');
        if (tab) {
          this.switchTab(tab);
          // Close mobile sidebar if open
          document.querySelector('.sidebar')?.classList.remove('open');
          document.querySelector('.sidebar-backdrop')?.classList.remove('active');
        }
      });
    });
  },

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update Sidebar Active Link
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-tab') === tabName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update View Containers
    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.add('hidden');
    });

    const targetView = document.getElementById(`view-${tabName}`);
    if (targetView) {
      targetView.classList.remove('hidden');
    }

    // Trigger section loader
    switch (tabName) {
      case 'dashboard':
        Dashboard.load();
        break;
      case 'review-queue':
        ReviewQueue.load();
        break;
      case 'content':
        Content.load();
        break;
      case 'users':
        Users.load();
        break;
      case 'reports':
        Reports.load();
        break;
      case 'admins':
        Admins.load();
        break;
      case 'audit':
        Audit.load();
        break;
      case 'settings':
        Settings.load();
        break;
    }
  },

  bindGlobalSearch() {
    const searchInput = document.getElementById('global-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (!query) return;

        // Route to content or users tab and apply search
        if (query.startsWith('#') || query.startsWith('post') || query.startsWith('reel')) {
          this.switchTab('content');
          const contentSearch = document.getElementById('content-filter-search');
          if (contentSearch) {
            contentSearch.value = query.replace(/^#/, '');
            Content.fetchItems();
          }
        } else {
          this.switchTab('users');
          const userSearch = document.getElementById('users-filter-search');
          if (userSearch) {
            userSearch.value = query;
            Users.fetchItems();
          }
        }
      }
    });
  },

  bindMobileSidebar() {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');

    if (mobileBtn && sidebar) {
      mobileBtn.onclick = () => {
        sidebar.classList.toggle('open');
        backdrop?.classList.toggle('active');
      };

      backdrop?.addEventListener('click', () => {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
      });
    }
  },

  bindModalDismissals() {
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove('active');
        }
      });
    });

    const confirmOkBtn = document.getElementById('modal-confirm-btn');
    if (confirmOkBtn) {
      confirmOkBtn.onclick = () => {
        if (typeof this.confirmCallback === 'function') {
          this.confirmCallback();
        }
        this.closeModal('modal-confirmation');
      };
    }
  },

  // Modal Service
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  },

  confirm(title, message, callback) {
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-message').textContent = message;
    this.confirmCallback = callback;
    this.openModal('modal-confirmation');
  },

  // Toast Notification Service
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div style="font-weight:700;">${type === 'error' ? '✕' : (type === 'warning' ? '⚠️' : '✓')}</div>
      <div style="flex:1;">${this.escapeHtml(message)}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 200ms ease-out';
      setTimeout(() => toast.remove(), 200);
    }, 4000);
  },

  // Utilities
  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
};

// Launch Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
