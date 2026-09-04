/**
 * SEERAT Admin Dashboard Module
 * Statistics Cards, Interactive Trend Charts, Recent Activities, and Quick Review Queue
 */

const Dashboard = {
  data: null,

  async load() {
    const container = document.getElementById('view-dashboard');
    if (!container) return;

    try {
      const response = await Api.get('/dashboard');
      if (response.success && response.data) {
        this.data = response.data;
        this.render();
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
      App.showToast('Could not load dashboard statistics.', 'error');
    }
  },

  render() {
    if (!this.data) return;

    const { metrics, charts, pendingQueuePreview, recentActivities } = this.data;

    // 1. Update Metrics Cards
    document.getElementById('metric-total-users').textContent = Number(metrics.totalUsers || 0).toLocaleString();
    document.getElementById('metric-active-users').textContent = Number(metrics.activeUsers || 0).toLocaleString();
    document.getElementById('metric-pending-reviews').textContent = Number(metrics.pendingReviews || 0).toLocaleString();
    document.getElementById('metric-approved-content').textContent = Number(metrics.approvedContent || 0).toLocaleString();
    document.getElementById('metric-reported-content').textContent = Number(metrics.totalReports || 0).toLocaleString();
    document.getElementById('metric-suspended-users').textContent = Number(metrics.suspendedUsers || 0).toLocaleString();

    // 2. Render Charts
    this.renderLineChart('chart-users-trend', charts.labels, charts.newUsers, 'New Users');
    this.renderLineChart('chart-content-trend', charts.labels, charts.contentSubmissions, 'Submissions');
    this.renderBarChart('chart-approval-ratio', charts.labels, charts.approvedVsRejected.approved, charts.approvedVsRejected.rejected);
    this.renderLineChart('chart-reports-trend', charts.labels, charts.reportsTrend, 'Reports', '#dc2626');

    // 3. Render Quick Pending Review Queue Preview
    this.renderPendingPreview(pendingQueuePreview || []);

    // 4. Render Recent Activities
    this.renderRecentActivities(recentActivities || []);
  },

  renderLineChart(elementId, labels, dataPoints, labelName, strokeColor = '#047857') {
    const container = document.getElementById(elementId);
    if (!container) return;

    const width = 450;
    const height = 180;
    const padding = 30;

    const maxVal = Math.max(...dataPoints, 10) * 1.15;
    const minVal = 0;

    const getX = (index) => padding + (index * (width - 2 * padding)) / (dataPoints.length - 1);
    const getY = (val) => height - padding - ((val - minVal) / (maxVal - minVal)) * (height - 2 * padding);

    // Build SVG Path
    let pathD = `M ${getX(0)} ${getY(dataPoints[0])}`;
    dataPoints.forEach((val, i) => {
      if (i > 0) {
        const prevX = getX(i - 1);
        const prevY = getY(dataPoints[i - 1]);
        const currX = getX(i);
        const currY = getY(val);
        const cpX = (prevX + currX) / 2;
        pathD += ` C ${cpX} ${prevY}, ${cpX} ${currY}, ${currX} ${currY}`;
      }
    });

    const areaD = `${pathD} L ${getX(dataPoints.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;

    const points = dataPoints.map((val, i) => `
      <circle cx="${getX(i)}" cy="${getY(val)}" r="4" fill="#ffffff" stroke="${strokeColor}" stroke-width="2.5">
        <title>${labels[i]}: ${val} ${labelName}</title>
      </circle>
    `).join('');

    const gridLines = [0, 0.5, 1].map(ratio => {
      const yVal = height - padding - ratio * (height - 2 * padding);
      return `<line x1="${padding}" y1="${yVal}" x2="${width - padding}" y2="${yVal}" stroke="#e2e8f0" stroke-dasharray="3 3"/>`;
    }).join('');

    const xLabels = labels.map((lbl, i) => `
      <text x="${getX(i)}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#64748b">${lbl}</text>
    `).join('');

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="custom-chart-svg">
        <defs>
          <linearGradient id="grad-${elementId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        ${gridLines}
        <path d="${areaD}" fill="url(#grad-${elementId})" />
        <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" />
        ${points}
        ${xLabels}
      </svg>
    `;
  },

  renderBarChart(elementId, labels, approvedData, rejectedData) {
    const container = document.getElementById(elementId);
    if (!container) return;

    const width = 450;
    const height = 180;
    const padding = 30;

    const maxVal = Math.max(...approvedData.map((a, i) => Math.max(a, rejectedData[i] || 0)), 10) * 1.2;
    const groupWidth = (width - 2 * padding) / labels.length;
    const barWidth = Math.min(groupWidth * 0.35, 14);

    const bars = labels.map((lbl, i) => {
      const groupX = padding + i * groupWidth + (groupWidth / 2);
      const appH = ((approvedData[i] || 0) / maxVal) * (height - 2 * padding);
      const rejH = ((rejectedData[i] || 0) / maxVal) * (height - 2 * padding);

      const appY = height - padding - appH;
      const rejY = height - padding - rejH;

      return `
        <rect x="${groupX - barWidth - 2}" y="${appY}" width="${barWidth}" height="${appH}" fill="#047857" rx="3">
          <title>${lbl} Approved: ${approvedData[i]}</title>
        </rect>
        <rect x="${groupX + 2}" y="${rejY}" width="${barWidth}" height="${rejH}" fill="#dc2626" rx="3">
          <title>${lbl} Rejected: ${rejectedData[i]}</title>
        </rect>
        <text x="${groupX}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#64748b">${lbl}</text>
      `;
    }).join('');

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="custom-chart-svg">
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#cbd5e1" stroke-width="1"/>
        ${bars}
      </svg>
      <div class="chart-legend">
        <div class="legend-item"><span class="legend-dot" style="background:#047857"></span> Approved</div>
        <div class="legend-item"><span class="legend-dot" style="background:#dc2626"></span> Rejected</div>
      </div>
    `;
  },

  renderPendingPreview(items) {
    const tbody = document.getElementById('dashboard-pending-tbody');
    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No pending content awaiting review. Al-Hamdulillah!</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:40px;height:40px;background:#0f172a;border-radius:6px;overflow:hidden;flex-shrink:0;position:relative;">
              ${item.thumbnail_url
                ? `<img src="${item.thumbnail_url}" style="width:100%;height:100%;object-fit:cover;">`
                : `<div style="color:#fff;display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;font-weight:700;">${item.content_type}</div>`
              }
            </div>
            <div>
              <div style="font-weight:600;font-size:13px;color:var(--text-main);">${App.escapeHtml(item.creator_name || 'Creator')}</div>
              <div style="font-size:11.5px;color:var(--text-muted);">@${App.escapeHtml(item.creator_username || 'user')}</div>
            </div>
          </div>
        </td>
        <td><span class="status-pill active">${item.content_type}</span></td>
        <td><span class="status-pill flagged">${App.escapeHtml(item.category_name || 'Islamic Reminder')}</span></td>
        <td style="font-size:12px;color:var(--text-muted);">${App.formatDate(item.created_at)}</td>
        <td><span class="status-pill pending">PENDING REVIEW</span></td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-success-sm" onclick="ReviewQueue.quickApprove('${item.id}', '${item.content_type}')">Approve</button>
            <button class="btn btn-danger-sm" onclick="ReviewQueue.openRejectModal('${item.id}', '${item.content_type}')">Reject</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  renderRecentActivities(logs) {
    const container = document.getElementById('dashboard-activities-list');
    if (!container) return;

    if (logs.length === 0) {
      container.innerHTML = `<div class="empty-state">No recent audit activity.</div>`;
      return;
    }

    container.innerHTML = logs.map(log => `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-subtle);">
        <div style="width:8px;height:8px;border-radius:9999px;background:var(--primary-700);margin-top:6px;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;color:var(--text-main);">
            ${App.escapeHtml(log.admin_name)}: <span style="color:var(--primary-800);">${App.escapeHtml(log.action)}</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
            ${App.escapeHtml(log.reason || 'Action executed successfully')}
          </div>
          <div style="font-size:11px;color:var(--text-light);margin-top:2px;">
            ${App.formatDate(log.created_at)}
          </div>
        </div>
      </div>
    `).join('');
  }
};
