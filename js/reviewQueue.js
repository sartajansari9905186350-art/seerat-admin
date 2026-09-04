/**
 * SEERAT Review Queue Module
 * Critical Islamic Moderation Workflow:
 * - AI Islamic Content Screening (LIKELY_ISLAMIC, UNCERTAIN, LIKELY_NON_ISLAMIC, UNSAFE)
 * - Complete Post & Reel Media Previews with HTML5 Video Player
 * - Three-Tier Moderation Actions: Approve & Publish, Reject with Structured Reason, Flag for Senior Theological Review
 * - Strict Guardrail: AI is advisory; publication strictly requires human staff approval.
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
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="empty-state">Loading Islamic moderation queue...</td></tr>`;

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
          <td colspan="8">
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
            <div style="width:48px;height:48px;background:#0f172a;border-radius:8px;overflow:hidden;flex-shrink:0;cursor:pointer;position:relative;" onclick="ReviewQueue.openMediaModal('${item.id}')" title="Click to preview">
              ${item.thumbnail_url
                ? `<img src="${item.thumbnail_url}" style="width:100%;height:100%;object-fit:cover;">`
                : `<div style="color:#fff;display:flex;align-items:center;justify-content:center;height:100%;font-size:11px;font-weight:700;">${item.content_type}</div>`
              }
              ${item.content_type === 'REEL' || item.format === 'VIDEO' ? `
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              ` : ''}
            </div>
            <div>
              <div style="font-weight:600;color:var(--text-main);">${App.escapeHtml(item.creator_name || 'Creator')}</div>
              <div style="font-size:12px;color:var(--text-muted);">@${App.escapeHtml(item.creator_username || 'user')}</div>
            </div>
          </div>
        </td>
        <td>
          <div style="max-width:260px;">
            <div style="font-weight:500;color:var(--text-main);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${App.escapeHtml(item.caption || item.text_content || 'No Caption')}
            </div>
            ${item.reference_source ? `<div style="font-size:11.5px;color:var(--primary-700);font-weight:600;margin-top:2px;">📖 Ref: ${App.escapeHtml(item.reference_source)}</div>` : ''}
          </div>
        </td>
        <td><span class="status-pill active">${item.content_type} (${item.format})</span></td>
        <td><span class="status-pill flagged">${App.escapeHtml(item.category_name || 'Islamic')}</span></td>
        <td style="font-size:12px;color:var(--text-muted);">${App.formatDate(item.created_at)}</td>
        <td>
          ${this.getStatusBadge(item.status)}
          ${item.report_count > 0 ? `<div style="font-size:11px;color:var(--danger-600);font-weight:700;margin-top:4px;">⚠️ ${item.report_count} Reports</div>` : ''}
        </td>
        <td>
          ${this.getAiPill(item.ai_status, item.ai_confidence, item.ai_reason)}
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" title="Preview Full Submission & Verification" onclick="ReviewQueue.openMediaModal('${item.id}')">Preview</button>
            ${item.status === 'PENDING_REVIEW' || item.status === 'REJECTED' || item.status === 'SUSPENDED' || item.status === 'FLAGGED' ? `
              <button class="btn btn-success-sm" title="Approve and publish to SEERAT feed" onclick="ReviewQueue.quickApprove('${item.id}', '${item.content_type}')">Approve</button>
            ` : ''}
            ${item.status !== 'FLAGGED' ? `
              <button class="btn btn-warning-sm" title="Escalate to Senior Theological Review" onclick="ReviewQueue.openFlagModal('${item.id}', '${item.content_type}')">Flag</button>
            ` : ''}
            ${item.status === 'PENDING_REVIEW' || item.status === 'APPROVED' || item.status === 'FLAGGED' ? `
              <button class="btn btn-danger-sm" title="Reject submission with theological notes" onclick="ReviewQueue.openRejectModal('${item.id}', '${item.content_type}')">Reject</button>
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
      case 'FLAGGED': return '<span class="status-pill flagged" style="background:#fef3c7;color:#b45309;">Flagged / Senior</span>';
      case 'SUSPENDED': return '<span class="status-pill suspended">Suspended</span>';
      case 'REMOVED': return '<span class="status-pill suspended">Removed</span>';
      default: return `<span class="status-pill">${status}</span>`;
    }
  },

  getAiPill(status, confidence, reason) {
    const confPercent = confidence ? Math.round(confidence * 100) : 50;
    const reasonText = reason ? App.escapeHtml(reason) : 'Automated screening';
    switch (status) {
      case 'LIKELY_ISLAMIC':
        return `<span class="ai-pill likely-islamic" title="${reasonText}">🟢 Islamic ${confPercent}%</span>`;
      case 'LIKELY_NON_ISLAMIC':
        return `<span class="ai-pill non-islamic" title="${reasonText}">🔴 Non-Islamic ${confPercent}%</span>`;
      case 'UNSAFE':
        return `<span class="ai-pill unsafe" title="${reasonText}">⛔ Prohibited ${confPercent}%</span>`;
      case 'UNCERTAIN':
      default:
        return `<span class="ai-pill uncertain" title="${reasonText}">🟡 Uncertain ${confPercent}%</span>`;
    }
  },

  copyContentId(id) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(id).then(() => {
        App.showToast(`Content ID copied: ${id}`, 'success');
      }).catch(() => {
        App.showToast(`ID: ${id}`, 'info');
      });
    } else {
      App.showToast(`ID: ${id}`, 'info');
    }
  },

  async quickApprove(id, contentType) {
    try {
      const response = await Api.post(`/review-queue/${id}/approve`, {
        contentType,
        notes: 'Approved after verification by human moderator'
      });

      if (response.success) {
        App.showToast('Content approved and published to SEERAT.', 'success');
        this.fetchItems();
        if (typeof Dashboard !== 'undefined' && Dashboard.load) Dashboard.load();
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
        if (typeof Dashboard !== 'undefined' && Dashboard.load) Dashboard.load();
      }
    } catch (err) {
      App.showToast(err.message || 'Failed to reject content', 'error');
    }
  },

  openFlagModal(id, contentType) {
    const modal = document.getElementById('modal-flag-content');
    if (!modal) return;

    document.getElementById('flag-content-id').value = id;
    document.getElementById('flag-content-type').value = contentType;
    document.getElementById('flag-theological-reason').value = 'Unverified Hadith narration';
    document.getElementById('flag-internal-notes').value = '';

    App.openModal('modal-flag-content');
  },

  async submitFlag() {
    const id = document.getElementById('flag-content-id').value;
    const contentType = document.getElementById('flag-content-type').value;
    const reason = document.getElementById('flag-theological-reason').value;
    const notes = document.getElementById('flag-internal-notes').value;

    if (!reason) {
      App.showToast('Please select a flag reason.', 'warning');
      return;
    }

    try {
      const response = await Api.post(`/review-queue/${id}/flag`, {
        contentType,
        reason,
        notes
      });

      if (response.success) {
        App.closeModal('modal-flag-content');
        App.showToast('Content escalated to senior theological review.', 'success');
        this.fetchItems();
        if (typeof Dashboard !== 'undefined' && Dashboard.load) Dashboard.load();
      }
    } catch (err) {
      App.showToast(err.message || 'Failed to flag content', 'error');
    }
  },

  closeMediaModal() {
    const video = document.getElementById('preview-video-element');
    if (video) {
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch (e) {
        // ignore video abort
      }
    }
    App.closeModal('modal-media-preview');
  },

  openMediaModal(id) {
    let item = this.items.find(i => i.id === id);
    if (!item && typeof Content !== 'undefined' && Content.items) {
      item = Content.items.find(i => i.id === id);
    }
    if (!item && typeof Dashboard !== 'undefined' && Dashboard.pendingItems) {
      item = Dashboard.pendingItems.find(i => i.id === id);
    }
    if (!item) return;

    this.selectedItem = item;
    const container = document.getElementById('media-preview-container');
    const metaContainer = document.getElementById('media-meta-details');
    const titleElem = document.getElementById('media-preview-title');

    const isVideo = item.format === 'VIDEO' || item.content_type === 'REEL';
    if (titleElem) {
      titleElem.textContent = isVideo
        ? `Islamic Reel Video Player — Review Queue`
        : `Islamic Post Image & Verification — Review Queue`;
    }

    // 1. MEDIA DISPLAY / VIDEO PLAYER
    if (isVideo) {
      const videoSrc = item.media_url || item.video_url;
      if (videoSrc && !videoSrc.startsWith('content://') && !videoSrc.startsWith('file://')) {
        container.innerHTML = `
          <div style="background:#000;border-radius:8px;overflow:hidden;margin-bottom:14px;display:flex;flex-direction:column;align-items:center;">
            <video id="preview-video-element" controls playsinline crossorigin="anonymous" preload="metadata" style="width:100%;max-height:440px;background:#000;object-fit:contain;" src="${videoSrc}" onplaying="const b = document.getElementById('video-error-badge'); if(b) b.style.display='none';" onerror="const b = document.getElementById('video-error-badge'); if(b) b.style.display='block';">
              <source src="${videoSrc}" type="video/mp4">
              Your browser does not support HTML5 video playback.
            </video>
            <div style="width:100%;background:#0f172a;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;color:#cbd5e1;font-size:12px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <button type="button" class="btn-ghost btn-sm" style="color:#fff;padding:4px 8px;" onclick="const v=document.getElementById('preview-video-element'); if(v) v.paused?v.play():v.pause();">⏯ Play/Pause</button>
                <button type="button" class="btn-ghost btn-sm" style="color:#fff;padding:4px 8px;" onclick="const v=document.getElementById('preview-video-element'); if(v) v.muted=!v.muted;">🔇 Mute/Unmute</button>
                <button type="button" class="btn-ghost btn-sm" style="color:#fff;padding:4px 8px;" onclick="const v=document.getElementById('preview-video-element'); if(v) v.currentTime=Math.max(0,v.currentTime-10);">⏪ -10s</button>
                <button type="button" class="btn-ghost btn-sm" style="color:#fff;padding:4px 8px;" onclick="const v=document.getElementById('preview-video-element'); if(v) v.currentTime+=10;">⏩ +10s</button>
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span>Speed:</span>
                <select onchange="const v=document.getElementById('preview-video-element'); if(v) v.playbackRate=parseFloat(this.value);" style="background:#1e293b;color:#fff;border:1px solid #475569;border-radius:4px;padding:2px 6px;font-size:11px;">
                  <option value="0.75">0.75x</option>
                  <option value="1.0" selected>1.0x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                </select>
              </div>
            </div>
          </div>
          <div id="video-error-badge" style="display:none;padding:12px;background:#fef2f2;border:1px solid #f87171;border-radius:8px;text-align:center;color:#b91c1c;margin-bottom:14px;font-size:13px;">
            <strong>⚠️ Playback Error:</strong> Unable to stream video bytes from production URL: <code>${App.escapeHtml(videoSrc)}</code>
          </div>
        `;
      } else if (videoSrc && (videoSrc.startsWith('content://') || videoSrc.startsWith('file://'))) {
        container.innerHTML = `
          <div style="padding:32px 20px;background:#fef2f2;border:1px solid #f87171;border-radius:8px;text-align:center;color:#b91c1c;margin-bottom:14px;">
            <div style="font-size:24px;margin-bottom:8px;">⚠️</div>
            <div style="font-weight:700;font-size:14px;margin-bottom:6px;">Unplayable Local Device URI</div>
            <p style="font-size:12px;color:#7f1d1d;word-break:break-all;margin-bottom:4px;">
              Legacy submission used a client-side Android picker URI:
            </p>
            <code style="font-size:11px;background:#fee2e2;padding:4px 8px;border-radius:4px;word-break:break-all;display:inline-block;">${App.escapeHtml(videoSrc)}</code>
            <p style="font-size:12px;color:#7f1d1d;margin-top:8px;">Video bytes were not transmitted to server storage. Please reject this legacy item or re-upload from Android app.</p>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div style="padding:40px;background:var(--bg-subtle);border-radius:8px;text-align:center;color:var(--text-muted);margin-bottom:14px;">
            <p>No video media attached to this submission.</p>
          </div>
        `;
      }
    } else if (item.media_url || item.thumbnail_url) {
      const imgSrc = item.media_url || item.thumbnail_url;
      container.innerHTML = `
        <div style="background:#090d16;border-radius:8px;padding:12px;text-align:center;margin-bottom:14px;position:relative;">
          <img id="preview-image-element" src="${imgSrc}" style="max-width:100%;max-height:440px;object-fit:contain;border-radius:6px;cursor:zoom-in;" onclick="window.open('${imgSrc}', '_blank')" title="Click to view full original image in new tab">
          <div style="font-size:11.5px;color:#94a3b8;margin-top:8px;">
            🔍 Click image above to view full high-resolution media in new tab
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="padding:28px;background:var(--bg-subtle);border-radius:8px;text-align:center;color:var(--text-muted);margin-bottom:14px;">
          📖 Text-Only Islamic Submission (No media attachment)
        </div>
      `;
    }

    // 2. METADATA, AI SCREENING & THEOLOGICAL DETAILS
    const confPercent = item.ai_confidence ? Math.round(item.ai_confidence * 100) : 50;
    const aiStatus = item.ai_status || 'UNCERTAIN';
    let aiColor = '#d97706';
    let aiBg = '#fffbeb';
    let aiBorder = '#fde68a';
    if (aiStatus === 'LIKELY_ISLAMIC') {
      aiColor = '#065f46';
      aiBg = '#ecfdf5';
      aiBorder = '#a7f3d0';
    } else if (aiStatus === 'LIKELY_NON_ISLAMIC') {
      aiColor = '#991b1b';
      aiBg = '#fef2f2';
      aiBorder = '#fecaca';
    } else if (aiStatus === 'UNSAFE') {
      aiColor = '#7f1d1d';
      aiBg = '#fee2e2';
      aiBorder = '#ef4444';
    }

    metaContainer.innerHTML = `
      <!-- Creator & Submission Overview -->
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding-bottom:12px;border-bottom:1px solid var(--border-subtle);margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:44px;height:44px;border-radius:50%;overflow:hidden;background:#0f172a;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0;">
            ${item.creator_profile_photo_url || item.creator_avatar_url
              ? `<img src="${item.creator_profile_photo_url || item.creator_avatar_url}" style="width:100%;height:100%;object-fit:cover;">`
              : (item.creator_name ? item.creator_name[0].toUpperCase() : 'U')
            }
          </div>
          <div>
            <div style="font-weight:700;font-size:14px;color:var(--text-main);">${App.escapeHtml(item.creator_name || 'Creator')}</div>
            <div style="font-size:12px;color:var(--text-muted);">@${App.escapeHtml(item.creator_username || 'user')}</div>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span class="status-pill active">${item.content_type} (${item.format})</span>
          <span class="status-pill flagged">${App.escapeHtml(item.category_name || 'Islamic')}</span>
          ${this.getStatusBadge(item.status)}
        </div>
      </div>

      <!-- Submission Info & Content ID -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;background:var(--bg-subtle);padding:10px 14px;border-radius:6px;margin-bottom:12px;font-size:12px;">
        <div>
          <span style="color:var(--text-muted);">Content ID:</span>
          <code style="background:#fff;padding:2px 6px;border-radius:4px;border:1px solid #cbd5e1;font-size:11px;font-weight:600;">${item.id}</code>
          <button type="button" class="btn-ghost btn-sm" style="padding:1px 4px;font-size:11px;color:var(--primary-700);" onclick="ReviewQueue.copyContentId('${item.id}')">Copy</button>
        </div>
        <div>
          <span style="color:var(--text-muted);">Submitted:</span>
          <strong>${new Date(item.created_at).toLocaleString()}</strong>
        </div>
        ${item.report_count > 0 ? `
          <div>
            <span style="color:var(--danger-600);font-weight:700;">⚠️ Community Reports:</span>
            <strong>${item.report_count} reports filed</strong>
          </div>
        ` : ''}
      </div>

      <!-- AI ISLAMIC MODERATION SCREENING CARD -->
      <div class="ai-card-box" style="border-left: 4px solid ${aiColor};">
        <div class="ai-card-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-weight:700;font-size:13px;color:var(--text-main);">🤖 AI Islamic Content Screening:</span>
            ${this.getAiPill(item.ai_status, item.ai_confidence, item.ai_reason)}
          </div>
          <div style="font-size:12px;font-weight:700;color:${aiColor};">
            Confidence: ${confPercent}%
          </div>
        </div>

        <div class="ai-confidence-bar">
          <div class="ai-confidence-fill" style="width:${confPercent}%;background:${aiColor};"></div>
        </div>

        <div style="font-size:12.5px;color:var(--text-main);margin-top:8px;line-height:1.4;">
          <strong>Theological & Safety Analysis:</strong> ${App.escapeHtml(item.ai_reason || 'Verified Islamic terminology and safety markers screened.')}
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;font-size:11px;color:var(--text-muted);">
          <span>${item.ai_metadata?.analyzed_scope || 'Analyzed: Caption, Islamic Terms, Reference Source'}</span>
          <span>Engine: ${item.ai_metadata?.provider || 'seerat_nlp_engine'}</span>
        </div>

        <div style="margin-top:8px;padding-top:6px;border-top:1px dashed var(--border-subtle);font-size:11px;color:#047857;font-weight:600;">
          🛡️ Strict Policy Guarantee: All submissions remain PENDING_REVIEW until explicitly approved by human staff.
        </div>
      </div>

      <!-- Quranic Arabic Text (If Available) -->
      ${item.arabic_text ? `
        <div style="background:var(--primary-50);padding:14px;border-radius:8px;font-size:19px;direction:rtl;text-align:right;font-family:'Traditional Arabic', serif;color:var(--primary-900);margin-bottom:10px;line-height:1.6;border-right:4px solid var(--primary-700);">
          ${App.escapeHtml(item.arabic_text)}
        </div>
      ` : ''}

      <!-- English / Urdu Translation (If Available) -->
      ${item.translation_text ? `
        <div style="font-size:13px;color:var(--text-main);margin-bottom:10px;font-style:italic;background:#f8fafc;padding:10px 12px;border-radius:6px;border-left:3px solid #64748b;">
          "${App.escapeHtml(item.translation_text)}"
        </div>
      ` : ''}

      <!-- Caption / Text Content -->
      <div style="font-size:13.5px;color:var(--text-main);margin-bottom:12px;background:#ffffff;padding:12px;border:1px solid var(--border-subtle);border-radius:6px;">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Caption / Submission Description</div>
        <div style="white-space:pre-wrap;line-height:1.5;">${App.escapeHtml(item.caption || item.text_content || 'No text content submitted.')}</div>
      </div>

      <!-- Authentic Islamic Reference Source -->
      ${item.reference_source ? `
        <div style="font-size:12.5px;background:#f0fdf4;border:1px solid #bbf7d0;padding:8px 12px;border-radius:6px;color:#166534;font-weight:600;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
          <span>📖 Authentic Reference Source:</span>
          <span>${App.escapeHtml(item.reference_source)}</span>
        </div>
      ` : ''}

      <!-- Modal Actions Bar -->
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;align-items:center;flex-wrap:wrap;border-top:1px solid var(--border-subtle);padding-top:14px;">
        <button type="button" class="btn btn-secondary" onclick="ReviewQueue.closeMediaModal()">Close Preview</button>
        <button type="button" class="btn btn-warning-sm" style="padding:8px 14px;font-size:13px;" onclick="ReviewQueue.closeMediaModal(); ReviewQueue.openFlagModal('${item.id}', '${item.content_type}')">
          🚩 Flag / Senior Review
        </button>
        <button type="button" class="btn btn-danger" style="padding:8px 14px;font-size:13px;" onclick="ReviewQueue.closeMediaModal(); ReviewQueue.openRejectModal('${item.id}', '${item.content_type}')">
          ✕ Reject Submission
        </button>
        <button type="button" class="btn btn-primary" style="padding:8px 18px;font-size:13px;background:var(--primary-800);" onclick="ReviewQueue.closeMediaModal(); ReviewQueue.quickApprove('${item.id}', '${item.content_type}')">
          ✓ Approve & Publish
        </button>
      </div>
    `;

    App.openModal('modal-media-preview');
  }
};
