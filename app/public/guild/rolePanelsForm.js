// =============================================
// ========== ROLE PANELS FORM =================
// =============================================

(function() {
  let panels = [];
  let channels = [];
  let roles = [];
  let currentPanelId = null;

  // Charger les panels
  async function loadRolePanels() {
    try {
      const res = await fetch(`/api/bot/get-role-panels?guildId=${guildId}`);
      const data = await res.json();
      
      if (data.success) {
        panels = data.panels || [];
        channels = data.channels || [];
        roles = data.roles || [];
        
        renderPanelsList();
        populateSelects();
      }
    } catch (err) {
      console.error('Erreur chargement panels:', err);
    }
  }

  // Remplir les selects
  function populateSelects() {
    // Salon du panel
    const channelSelect = document.getElementById('panel-channel');
    if (channelSelect) {
      channelSelect.innerHTML = channels.map(c => `<option value="${c.id}"># ${c.name}</option>`).join('');
    }

    // Rôle requis
    const requiredRoleSelect = document.getElementById('panel-required-role');
    if (requiredRoleSelect) {
      requiredRoleSelect.innerHTML = '<option value="">Aucun</option>' + 
        roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    }

    // Rôle pour nouveau bouton
    const newButtonRoleSelect = document.getElementById('new-button-role');
    if (newButtonRoleSelect) {
      newButtonRoleSelect.innerHTML = roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    }
  }

  // Afficher la liste des panels
  function renderPanelsList() {
    const container = document.getElementById('role-panels-list');
    if (!container) return;
    
    if (panels.length === 0) {
      container.innerHTML = '<div class="empty-message">Aucun panel de rôles configuré.</div>';
      return;
    }

    container.innerHTML = panels.map(panel => {
      const statusClass = panel.enabled ? 'status-active' : 'status-inactive';
      const statusText = panel.enabled ? 'Actif' : 'Inactif';
      const buttonCount = panel.buttons ? panel.buttons.length : 0;
      const channel = channels.find(c => c.id === panel.channel_id);

      return `
        <div class="panel-item" data-panel-id="${panel.id}">
          <div class="panel-item-header">
            <div class="panel-item-info">
              <span class="panel-status ${statusClass}"></span>
              <h4>${panel.name}</h4>
              <span class="panel-meta">${buttonCount} boutons • #${channel?.name || 'inconnu'}</span>
            </div>
            <div class="panel-item-actions">
              <button class="btn btn-sm btn-secondary" onclick="editPanelButtons(${panel.id})">🔘 Boutons</button>
              <button class="btn btn-sm btn-secondary" onclick="editPanel(${panel.id})">✏️ Modifier</button>
              <button class="btn btn-sm btn-danger" onclick="deletePanel(${panel.id})">🗑️</button>
            </div>
          </div>
          <div class="panel-item-preview">
            <div class="preview-embed" style="border-left-color: ${panel.color || '#5865F2'}">
              <div class="preview-title">${panel.title || '🎭 Choisissez vos rôles'}</div>
              <div class="preview-desc">${panel.description || ''}</div>
              <div class="preview-buttons">
                ${(panel.buttons || []).slice(0, 5).map(btn => `
                  <span class="preview-btn preview-btn-${btn.style || 'primary'}">${btn.emoji || ''} ${btn.label}</span>
                `).join('')}
                ${buttonCount > 5 ? `<span class="preview-more">+${buttonCount - 5} autres</span>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Ouvrir le modal de création
  function openCreateModal() {
    document.getElementById('panel-modal-title').textContent = 'Créer un panel';
    document.getElementById('edit-panel-id').value = '';
    document.getElementById('panel-name').value = '';
    document.getElementById('panel-name').disabled = false;
    document.getElementById('panel-title').value = '';
    document.getElementById('panel-description').value = '';
    document.getElementById('panel-color').value = '#5865F2';
    document.getElementById('panel-mode').value = 'toggle';
    document.getElementById('panel-exclusive').checked = false;
    document.getElementById('panel-required-role').value = '';
    document.getElementById('panel-image').value = '';
    document.getElementById('panel-thumbnail').value = '';
    document.getElementById('panel-modal').style.display = 'flex';
  }

  // Ouvrir le modal d'édition
  window.editPanel = function(panelId) {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;

    document.getElementById('panel-modal-title').textContent = 'Modifier le panel';
    document.getElementById('edit-panel-id').value = panelId;
    document.getElementById('panel-name').value = panel.name;
    document.getElementById('panel-name').disabled = true;
    document.getElementById('panel-channel').value = panel.channel_id;
    document.getElementById('panel-title').value = panel.title || '';
    document.getElementById('panel-description').value = panel.description || '';
    document.getElementById('panel-color').value = panel.color || '#5865F2';
    document.getElementById('panel-mode').value = panel.mode || 'toggle';
    document.getElementById('panel-exclusive').checked = panel.exclusive;
    document.getElementById('panel-required-role').value = panel.required_role_id || '';
    document.getElementById('panel-image').value = panel.image_url || '';
    document.getElementById('panel-thumbnail').value = panel.thumbnail_url || '';
    document.getElementById('panel-modal').style.display = 'flex';
  };

  // Fermer le modal
  function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
  }

  // Sauvegarder le panel
  async function savePanel() {
    const panelId = document.getElementById('edit-panel-id').value;
    const isEdit = !!panelId;

    const data = {
      guildId,
      name: document.getElementById('panel-name').value,
      channelId: document.getElementById('panel-channel').value,
      title: document.getElementById('panel-title').value,
      description: document.getElementById('panel-description').value,
      color: document.getElementById('panel-color').value,
      mode: document.getElementById('panel-mode').value,
      exclusive: document.getElementById('panel-exclusive').checked,
      requiredRoleId: document.getElementById('panel-required-role').value || null,
      imageUrl: document.getElementById('panel-image').value || null,
      thumbnailUrl: document.getElementById('panel-thumbnail').value || null,
      enabled: true
    };

    if (!data.name) {
      showStatus('status-panel-form', '❌ Le nom est requis', 'error');
      return;
    }

    const statusEl = document.getElementById('status-panel-form');
    statusEl.textContent = 'Sauvegarde en cours...';

    try {
      let res;
      if (isEdit) {
        data.panelId = panelId;
        res = await fetch('/api/bot/update-role-panel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } else {
        res = await fetch('/api/bot/create-role-panel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }

      const result = await res.json();

      if (result.success) {
        showStatus('status-panel-form', '✅ Panel sauvegardé !', 'success');
        setTimeout(() => {
          closeModal('panel-modal');
          loadRolePanels();
        }, 1000);
      } else {
        showStatus('status-panel-form', '❌ ' + (result.error || 'Erreur'), 'error');
      }
    } catch (err) {
      console.error('Erreur sauvegarde panel:', err);
      showStatus('status-panel-form', '❌ Erreur de connexion', 'error');
    }
  }

  // Supprimer un panel
  window.deletePanel = async function(panelId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce panel ? Le message sera également supprimé.')) {
      return;
    }

    try {
      const res = await fetch('/api/bot/delete-role-panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId, panelId })
      });

      const result = await res.json();

      if (result.success) {
        loadRolePanels();
      } else {
        alert('Erreur: ' + (result.error || 'Erreur inconnue'));
      }
    } catch (err) {
      console.error('Erreur suppression panel:', err);
      alert('Erreur de connexion');
    }
  };

  // Ouvrir le modal des boutons
  window.editPanelButtons = function(panelId) {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;

    currentPanelId = panelId;
    document.getElementById('buttons-modal-title').textContent = `Boutons: ${panel.name}`;
    document.getElementById('buttons-panel-id').value = panelId;
    
    renderButtonsList(panel.buttons || []);
    document.getElementById('buttons-modal').style.display = 'flex';
  };

  // Afficher la liste des boutons
  function renderButtonsList(buttons) {
    const container = document.getElementById('panel-buttons-list');

    if (buttons.length === 0) {
      container.innerHTML = '<div class="empty-message">Aucun bouton configuré. Ajoutez-en un ci-dessous.</div>';
      return;
    }

    container.innerHTML = buttons.map((btn, index) => {
      const role = roles.find(r => r.id === btn.role_id);
      const statusClass = btn.enabled ? '' : 'button-disabled';

      return `
        <div class="button-item ${statusClass}" data-button-id="${btn.id}">
          <div class="button-preview">
            <span class="preview-btn preview-btn-${btn.style || 'primary'}">${btn.emoji || ''} ${btn.label}</span>
          </div>
          <div class="button-info">
            <span class="button-role">→ @${role?.name || 'Rôle inconnu'}</span>
          </div>
          <div class="button-actions">
            <button class="btn btn-xs btn-secondary" onclick="toggleButton(${btn.id}, ${!btn.enabled})">${btn.enabled ? '🔴 Désactiver' : '🟢 Activer'}</button>
            <button class="btn btn-xs btn-danger" onclick="deleteButton(${btn.id})">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Ajouter un bouton
  async function addButton() {
    const panelId = document.getElementById('buttons-panel-id').value;
    const roleId = document.getElementById('new-button-role').value;
    const label = document.getElementById('new-button-label').value;
    const emoji = document.getElementById('new-button-emoji').value;
    const style = document.getElementById('new-button-style').value;

    if (!roleId) {
      showStatus('status-buttons-form', '❌ Sélectionnez un rôle', 'error');
      return;
    }

    const role = roles.find(r => r.id === roleId);
    const finalLabel = label || role?.name || 'Rôle';

    try {
      const res = await fetch('/api/bot/add-panel-button', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId,
          panelId,
          roleId,
          label: finalLabel,
          emoji: emoji || null,
          style
        })
      });

      const result = await res.json();

      if (result.success) {
        showStatus('status-buttons-form', '✅ Bouton ajouté !', 'success');
        // Reset le formulaire
        document.getElementById('new-button-label').value = '';
        document.getElementById('new-button-emoji').value = '';
        // Recharger les panels
        await loadRolePanels();
        const panel = panels.find(p => p.id == panelId);
        if (panel) renderButtonsList(panel.buttons || []);
      } else {
        showStatus('status-buttons-form', '❌ ' + (result.error || 'Erreur'), 'error');
      }
    } catch (err) {
      console.error('Erreur ajout bouton:', err);
      showStatus('status-buttons-form', '❌ Erreur de connexion', 'error');
    }
  }

  // Activer/désactiver un bouton
  window.toggleButton = async function(buttonId, enabled) {
    try {
      const res = await fetch('/api/bot/update-panel-button', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId,
          buttonId,
          enabled,
          // On garde les autres valeurs
          roleId: panels.flatMap(p => p.buttons || []).find(b => b.id === buttonId)?.role_id,
          label: panels.flatMap(p => p.buttons || []).find(b => b.id === buttonId)?.label,
          emoji: panels.flatMap(p => p.buttons || []).find(b => b.id === buttonId)?.emoji,
          style: panels.flatMap(p => p.buttons || []).find(b => b.id === buttonId)?.style,
          position: panels.flatMap(p => p.buttons || []).find(b => b.id === buttonId)?.position
        })
      });

      const result = await res.json();

      if (result.success) {
        await loadRolePanels();
        const panelId = document.getElementById('buttons-panel-id').value;
        const panel = panels.find(p => p.id == panelId);
        if (panel) renderButtonsList(panel.buttons || []);
      }
    } catch (err) {
      console.error('Erreur toggle bouton:', err);
    }
  };

  // Supprimer un bouton
  window.deleteButton = async function(buttonId) {
    if (!confirm('Supprimer ce bouton ?')) return;

    try {
      const res = await fetch('/api/bot/delete-panel-button', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId, buttonId })
      });

      const result = await res.json();

      if (result.success) {
        await loadRolePanels();
        const panelId = document.getElementById('buttons-panel-id').value;
        const panel = panels.find(p => p.id == panelId);
        if (panel) renderButtonsList(panel.buttons || []);
      }
    } catch (err) {
      console.error('Erreur suppression bouton:', err);
    }
  };

  // Publier/actualiser le panel
  async function publishPanel() {
    const panelId = document.getElementById('buttons-panel-id').value;

    try {
      const res = await fetch('/api/bot/publish-role-panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId, panelId })
      });

      const result = await res.json();

      if (result.success) {
        showStatus('status-buttons-form', '✅ Panel publié/actualisé !', 'success');
      } else {
        showStatus('status-buttons-form', '❌ ' + (result.error || 'Erreur'), 'error');
      }
    } catch (err) {
      console.error('Erreur publication panel:', err);
      showStatus('status-buttons-form', '❌ Erreur de connexion', 'error');
    }
  }

  // Afficher un message de statut
  function showStatus(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = 'status-message ' + (type || '');
    setTimeout(() => {
      el.textContent = '';
      el.className = 'status-message';
    }, 3000);
  }

  // Event Listeners (avec vérification d'existence)
  const createPanelBtn = document.getElementById('create-panel-btn');
  const closePanelModalBtn = document.getElementById('close-panel-modal');
  const cancelPanelBtn = document.getElementById('cancel-panel-btn');
  const savePanelBtn = document.getElementById('save-panel-btn');
  const closeButtonsModalBtn = document.getElementById('close-buttons-modal');
  const addButtonBtn = document.getElementById('add-button-btn');
  const publishPanelBtn = document.getElementById('publish-panel-btn');
  const panelModal = document.getElementById('panel-modal');
  const buttonsModal = document.getElementById('buttons-modal');

  if (createPanelBtn) createPanelBtn.addEventListener('click', openCreateModal);
  if (closePanelModalBtn) closePanelModalBtn.addEventListener('click', () => closeModal('panel-modal'));
  if (cancelPanelBtn) cancelPanelBtn.addEventListener('click', () => closeModal('panel-modal'));
  if (savePanelBtn) savePanelBtn.addEventListener('click', savePanel);
  if (closeButtonsModalBtn) closeButtonsModalBtn.addEventListener('click', () => closeModal('buttons-modal'));
  if (addButtonBtn) addButtonBtn.addEventListener('click', addButton);
  if (publishPanelBtn) publishPanelBtn.addEventListener('click', publishPanel);

  // Fermer les modals en cliquant à l'extérieur
  if (panelModal) {
    panelModal.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal('panel-modal');
    });
  }
  if (buttonsModal) {
    buttonsModal.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal('buttons-modal');
    });
  }

  // Charger au démarrage
  loadRolePanels();
})();
