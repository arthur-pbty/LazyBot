// ===== LOGS FORM =====
(function() {
  const logsEnabled = document.getElementById('logs-enabled');
  const logsCategory = document.getElementById('logs-category');
  const logsTypesContainer = document.getElementById('logs-types-container');
  const logsPreviewContainer = document.getElementById('logs-preview-container');
  const logsChannelsPreview = document.getElementById('logs-channels-preview');
  const logsSaveBtn = document.getElementById('logs-save-btn');
  const logsDeleteBtn = document.getElementById('logs-delete-btn');
  const statusLogsForm = document.getElementById('status-logs-form');

  let logTypes = [];
  let currentConfig = null;

  // Charger la config des logs
  async function loadLogsConfig() {
    try {
      const res = await fetch(`/api/bot/get-logs-config/${guildId}`);
      const data = await res.json();

      if (data.success) {
        logTypes = data.logTypes || [];
        currentConfig = data.config || {};

        // Remplir le select des catégories
        logsCategory.innerHTML = '<option value="">📜 Créer une nouvelle catégorie "LOGS"</option>';
        (data.categories || []).forEach(cat => {
          const option = document.createElement('option');
          option.value = cat.id;
          option.textContent = cat.name;
          if (currentConfig.category_id === cat.id) {
            option.selected = true;
          }
          logsCategory.appendChild(option);
        });

        // Activer/désactiver le toggle
        logsEnabled.checked = !!currentConfig.enabled;

        // Générer les checkboxes pour les types de logs
        renderLogTypes();

        // Mettre à jour l'aperçu
        updatePreview();

        // Afficher le bouton supprimer si des salons existent
        updateDeleteButton();
      }
    } catch (err) {
      console.error('Erreur chargement config logs:', err);
    }
  }

  // Générer les checkboxes des types de logs
  function renderLogTypes() {
    logsTypesContainer.innerHTML = '';

    logTypes.forEach(logType => {
      const isEnabled = currentConfig[`${logType.key}_enabled`];
      const channelId = currentConfig[`${logType.key}_channel_id`];

      const div = document.createElement('div');
      div.className = 'log-type-card' + (isEnabled ? ' active' : '');
      div.innerHTML = `
        <label class="log-type-checkbox">
          <input type="checkbox" name="log-type" value="${logType.key}" ${isEnabled ? 'checked' : ''}>
          <span class="log-type-icon">${logType.name.split(' ')[0]}</span>
          <div class="log-type-info">
            <div class="log-type-name">${logType.name.substring(logType.name.indexOf(' ') + 1)}</div>
            <div class="log-type-desc">${logType.description}</div>
          </div>
          ${channelId ? `<span class="log-type-status">✅</span>` : ''}
        </label>
      `;

      const checkbox = div.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', () => {
        div.classList.toggle('active', checkbox.checked);
        updatePreview();
      });

      logsTypesContainer.appendChild(div);
    });
  }

  // Mettre à jour l'aperçu des salons
  function updatePreview() {
    const checkedTypes = [...document.querySelectorAll('input[name="log-type"]:checked')]
      .map(cb => cb.value);

    if (checkedTypes.length === 0 || !logsEnabled.checked) {
      logsPreviewContainer.style.display = 'none';
      return;
    }

    logsPreviewContainer.style.display = 'block';
    logsChannelsPreview.innerHTML = '';

    checkedTypes.forEach(key => {
      const logType = logTypes.find(lt => lt.key === key);
      if (!logType) return;

      const channelId = currentConfig[`${key}_channel_id`];
      const div = document.createElement('div');
      div.className = 'log-channel-item';
      div.innerHTML = `
        <span class="log-channel-icon">#</span>
        <span class="log-channel-name">${logType.channelName}</span>
        <span class="log-channel-status ${channelId ? 'created' : 'pending'}">
          ${channelId ? '✅ Créé' : '⏳ Sera créé'}
        </span>
      `;
      logsChannelsPreview.appendChild(div);
    });
  }

  // Mettre à jour le bouton supprimer
  function updateDeleteButton() {
    const hasChannels = logTypes.some(lt => currentConfig[`${lt.key}_channel_id`]);
    logsDeleteBtn.style.display = hasChannels ? 'inline-flex' : 'none';
  }

  // Sauvegarder la config
  logsSaveBtn.addEventListener('click', async () => {
    const enabledLogs = [...document.querySelectorAll('input[name="log-type"]:checked')]
      .map(cb => cb.value);

    logsSaveBtn.disabled = true;
    logsSaveBtn.textContent = '⏳ Sauvegarde...';
    statusLogsForm.textContent = '';
    statusLogsForm.className = 'status-message';

    try {
      const res = await fetch('/api/bot/save-logs-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId,
          enabled: logsEnabled.checked,
          categoryId: logsCategory.value || null,
          enabledLogs
        })
      });

      const data = await res.json();

      if (data.success) {
        statusLogsForm.textContent = '✅ Configuration sauvegardée !';
        statusLogsForm.className = 'status-message success';

        // Mettre à jour la config locale
        if (data.categoryId) {
          currentConfig.category_id = data.categoryId;
        }
        if (data.channels) {
          for (const [key, channelId] of Object.entries(data.channels)) {
            currentConfig[`${key}_channel_id`] = channelId;
            if (enabledLogs.includes(key)) {
              currentConfig[`${key}_enabled`] = 1;
            }
          }
        }

        // Rafraîchir l'affichage
        renderLogTypes();
        updatePreview();
        updateDeleteButton();

        // Recharger les catégories
        await loadLogsConfig();
      } else {
        statusLogsForm.textContent = '❌ ' + (data.error || 'Erreur lors de la sauvegarde');
        statusLogsForm.className = 'status-message error';
      }
    } catch (err) {
      console.error('Erreur sauvegarde logs:', err);
      statusLogsForm.textContent = '❌ Erreur de connexion';
      statusLogsForm.className = 'status-message error';
    }

    logsSaveBtn.disabled = false;
    logsSaveBtn.textContent = '💾 Sauvegarder';
  });

  // Supprimer tous les salons
  logsDeleteBtn.addEventListener('click', async () => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer tous les salons de logs ? Cette action est irréversible.')) {
      return;
    }

    logsDeleteBtn.disabled = true;
    logsDeleteBtn.textContent = '⏳ Suppression...';
    statusLogsForm.textContent = '';

    try {
      const res = await fetch('/api/bot/delete-logs-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId })
      });

      const data = await res.json();

      if (data.success) {
        statusLogsForm.textContent = '✅ Tous les salons de logs ont été supprimés.';
        statusLogsForm.className = 'status-message success';

        // Reset la config locale
        currentConfig = { enabled: false };
        logsEnabled.checked = false;

        // Décocher tous les types
        document.querySelectorAll('input[name="log-type"]').forEach(cb => {
          cb.checked = false;
          cb.closest('.log-type-card')?.classList.remove('active');
        });

        // Rafraîchir
        renderLogTypes();
        updatePreview();
        updateDeleteButton();
      } else {
        statusLogsForm.textContent = '❌ ' + (data.error || 'Erreur lors de la suppression');
        statusLogsForm.className = 'status-message error';
      }
    } catch (err) {
      console.error('Erreur suppression logs:', err);
      statusLogsForm.textContent = '❌ Erreur de connexion';
      statusLogsForm.className = 'status-message error';
    }

    logsDeleteBtn.disabled = false;
    logsDeleteBtn.textContent = '🗑️ Supprimer tous les salons';
  });

  // Events toggle
  logsEnabled.addEventListener('change', updatePreview);

  // Charger au démarrage
  window.addEventListener('guildLoaded', loadLogsConfig);
  if (typeof guildId !== 'undefined' && guildId) {
    loadLogsConfig();
  }
})();
