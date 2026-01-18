// =============================================
// ========== ANTI-RAID FORM ===================
// =============================================

(function() {
  let config = {};
  let warningsConfig = {};
  let channels = [];
  let roles = [];

  // Charger la config anti-raid
  async function loadAntiraidConfig() {
    try {
      const res = await fetch(`/api/bot/get-antiraid-config?guildId=${guildId}`);
      const data = await res.json();
      
      if (data.success) {
        config = data.config;
        channels = data.channels || [];
        roles = data.roles || [];
        
        populateSelects();
        fillForm();
      }
    } catch (err) {
      console.error('Erreur chargement config antiraid:', err);
    }

    // Charger aussi la config des warnings
    try {
      const res = await fetch(`/api/bot/get-warnings-config?guildId=${guildId}`);
      const data = await res.json();
      
      if (data.success) {
        warningsConfig = data.config;
        fillWarningsForm();
      }
    } catch (err) {
      console.error('Erreur chargement config warnings:', err);
    }
  }

  // Remplir les selects avec les salons et rôles
  function populateSelects() {
    // Salon de logs
    const logChannelSelect = document.getElementById('antiraid-log-channel');
    logChannelSelect.innerHTML = '<option value="">Aucun (pas de logs)</option>';
    channels.forEach(ch => {
      logChannelSelect.innerHTML += `<option value="${ch.id}"># ${ch.name}</option>`;
    });

    // Salon notifications warnings
    const notifyChannelSelect = document.getElementById('warnings-notify-channel');
    if (notifyChannelSelect) {
      notifyChannelSelect.innerHTML = '<option value="">Aucun (pas de notification)</option>';
      channels.forEach(ch => {
        notifyChannelSelect.innerHTML += `<option value="${ch.id}"># ${ch.name}</option>`;
      });
    }

    // Multi-selects pour les exclusions
    const channelSelects = [
      'antilink-exclude-channels',
      'antiinvite-exclude-channels',
      'antispam-exclude-channels',
      'antidupe-exclude-channels',
      'antimention-exclude-channels',
      'antiemoji-exclude-channels',
      'anticaps-exclude-channels',
      'antinewline-exclude-channels',
      'antibadwords-exclude-channels'
    ];

    const roleSelects = [
      'antilink-exclude-roles',
      'antiinvite-exclude-roles',
      'antispam-exclude-roles',
      'antidupe-exclude-roles',
      'antimention-exclude-roles',
      'antiemoji-exclude-roles',
      'anticaps-exclude-roles',
      'antinewline-exclude-roles',
      'antibadwords-exclude-roles'
    ];

    channelSelects.forEach(selectId => {
      const select = document.getElementById(selectId);
      if (select) {
        select.innerHTML = '';
        channels.forEach(ch => {
          select.innerHTML += `<option value="${ch.id}"># ${ch.name}</option>`;
        });
      }
    });

    roleSelects.forEach(selectId => {
      const select = document.getElementById(selectId);
      if (select) {
        select.innerHTML = '';
        roles.forEach(r => {
          select.innerHTML += `<option value="${r.id}" style="color: ${r.color}">@ ${r.name}</option>`;
        });
      }
    });
  }

  // Remplir le formulaire avec la config
  function fillForm() {
    // Global
    document.getElementById('antiraid-enabled').checked = config.enabled;
    document.getElementById('antiraid-log-channel').value = config.log_channel_id || '';

    // Anti-Link
    document.getElementById('antilink-enabled').checked = config.antilink_enabled;
    document.getElementById('antilink-action').value = config.antilink_action || 'delete';
    document.getElementById('antilink-warn-message').value = config.antilink_warn_message || '⚠️ Les liens ne sont pas autorisés ici.';
    try {
      const whitelist = JSON.parse(config.antilink_whitelist_domains || '[]');
      document.getElementById('antilink-whitelist').value = whitelist.join(', ');
    } catch { document.getElementById('antilink-whitelist').value = ''; }
    setMultiSelectValues('antilink-exclude-channels', config.antilink_exclude_channels);
    setMultiSelectValues('antilink-exclude-roles', config.antilink_exclude_roles);

    // Anti-Invite
    document.getElementById('antiinvite-enabled').checked = config.antiinvite_enabled;
    document.getElementById('antiinvite-action').value = config.antiinvite_action || 'delete';
    document.getElementById('antiinvite-allow-own').checked = config.antiinvite_allow_own_server;
    setMultiSelectValues('antiinvite-exclude-channels', config.antiinvite_exclude_channels);
    setMultiSelectValues('antiinvite-exclude-roles', config.antiinvite_exclude_roles);

    // Anti-Spam
    document.getElementById('antispam-enabled').checked = config.antispam_enabled;
    document.getElementById('antispam-max-messages').value = config.antispam_max_messages || 5;
    document.getElementById('antispam-interval').value = config.antispam_interval_seconds || 5;
    document.getElementById('antispam-action').value = config.antispam_action || 'mute';
    document.getElementById('antispam-mute-duration').value = config.antispam_mute_duration_minutes || 10;
    setMultiSelectValues('antispam-exclude-channels', config.antispam_exclude_channels);
    setMultiSelectValues('antispam-exclude-roles', config.antispam_exclude_roles);

    // Anti-Duplicate
    document.getElementById('antidupe-enabled').checked = config.antidupe_enabled;
    document.getElementById('antidupe-max').value = config.antidupe_max_duplicates || 3;
    document.getElementById('antidupe-interval').value = config.antidupe_interval_seconds || 30;
    document.getElementById('antidupe-action').value = config.antidupe_action || 'delete';
    setMultiSelectValues('antidupe-exclude-channels', config.antidupe_exclude_channels);
    setMultiSelectValues('antidupe-exclude-roles', config.antidupe_exclude_roles);

    // Anti-Mention
    document.getElementById('antimention-enabled').checked = config.antimention_enabled;
    document.getElementById('antimention-max').value = config.antimention_max_mentions || 5;
    document.getElementById('antimention-action').value = config.antimention_action || 'delete';
    setMultiSelectValues('antimention-exclude-channels', config.antimention_exclude_channels);
    setMultiSelectValues('antimention-exclude-roles', config.antimention_exclude_roles);

    // Anti-Emoji
    document.getElementById('antiemoji-enabled').checked = config.antiemoji_enabled;
    document.getElementById('antiemoji-max').value = config.antiemoji_max_emojis || 10;
    document.getElementById('antiemoji-action').value = config.antiemoji_action || 'delete';
    setMultiSelectValues('antiemoji-exclude-channels', config.antiemoji_exclude_channels);
    setMultiSelectValues('antiemoji-exclude-roles', config.antiemoji_exclude_roles);

    // Anti-Caps
    document.getElementById('anticaps-enabled').checked = config.anticaps_enabled;
    document.getElementById('anticaps-max-percent').value = config.anticaps_max_percent || 70;
    document.getElementById('anticaps-min-length').value = config.anticaps_min_length || 10;
    document.getElementById('anticaps-action').value = config.anticaps_action || 'delete';
    setMultiSelectValues('anticaps-exclude-channels', config.anticaps_exclude_channels);
    setMultiSelectValues('anticaps-exclude-roles', config.anticaps_exclude_roles);

    // Anti-Newline
    document.getElementById('antinewline-enabled').checked = config.antinewline_enabled;
    document.getElementById('antinewline-max').value = config.antinewline_max_lines || 15;
    document.getElementById('antinewline-action').value = config.antinewline_action || 'delete';
    setMultiSelectValues('antinewline-exclude-channels', config.antinewline_exclude_channels);
    setMultiSelectValues('antinewline-exclude-roles', config.antinewline_exclude_roles);

    // Anti-Bot
    document.getElementById('antibot-enabled').checked = config.antibot_enabled;
    document.getElementById('antibot-min-age').value = config.antibot_min_account_age_days || 7;
    document.getElementById('antibot-action').value = config.antibot_action || 'kick';
    document.getElementById('antibot-no-avatar').checked = config.antibot_no_avatar_action;
    document.getElementById('antibot-suspicious-name').checked = config.antibot_suspicious_name_action;

    // Anti-Mass Join
    document.getElementById('antimassj-enabled').checked = config.antimassj_enabled;
    document.getElementById('antimassj-max').value = config.antimassj_max_joins || 10;
    document.getElementById('antimassj-interval').value = config.antimassj_interval_seconds || 10;
    document.getElementById('antimassj-action').value = config.antimassj_action || 'kick';

    // Anti-Badwords
    document.getElementById('antibadwords-enabled').checked = config.antibadwords_enabled;
    document.getElementById('antibadwords-action').value = config.antibadwords_action || 'delete';
    document.getElementById('antibadwords-warn-message').value = config.antibadwords_warn_message || '⚠️ Les insultes et gros mots ne sont pas autorisés.';
    try {
      const words = JSON.parse(config.antibadwords_words || '[]');
      document.getElementById('antibadwords-words').value = words.join('\n');
    } catch { document.getElementById('antibadwords-words').value = ''; }
    setMultiSelectValues('antibadwords-exclude-channels', config.antibadwords_exclude_channels);
    setMultiSelectValues('antibadwords-exclude-roles', config.antibadwords_exclude_roles);

    updateModulesVisibility();
  }

  // Remplir le formulaire des warnings
  function fillWarningsForm() {
    document.getElementById('warnings-enabled').checked = warningsConfig.enabled;
    document.getElementById('warn1-action').value = warningsConfig.warn1_action || 'none';
    document.getElementById('warn1-duration').value = warningsConfig.warn1_duration || 10;
    document.getElementById('warn2-action').value = warningsConfig.warn2_action || 'none';
    document.getElementById('warn2-duration').value = warningsConfig.warn2_duration || 30;
    document.getElementById('warn3-action').value = warningsConfig.warn3_action || 'mute';
    document.getElementById('warn3-duration').value = warningsConfig.warn3_duration || 60;
    document.getElementById('warn4-action').value = warningsConfig.warn4_action || 'kick';
    document.getElementById('warn4-duration').value = warningsConfig.warn4_duration || 0;
    document.getElementById('warn5-action').value = warningsConfig.warn5_action || 'ban';
    document.getElementById('warn5-duration').value = warningsConfig.warn5_duration || 0;
    document.getElementById('warnings-decay-enabled').checked = warningsConfig.decay_enabled;
    document.getElementById('warnings-decay-days').value = warningsConfig.decay_days || 30;
    document.getElementById('warnings-notify-channel').value = warningsConfig.notify_channel_id || '';

    // Afficher/masquer les options de decay
    document.getElementById('warnings-decay-options').style.display = 
      warningsConfig.decay_enabled ? 'grid' : 'none';

    updateWarningDurationFields();
  }

  // Mettre à jour les champs de durée selon l'action
  function updateWarningDurationFields() {
    for (let i = 1; i <= 5; i++) {
      const action = document.getElementById(`warn${i}-action`).value;
      const durationField = document.getElementById(`warn${i}-duration`);
      durationField.disabled = action !== 'mute';
    }
  }

  // Helper pour les multi-selects
  function setMultiSelectValues(selectId, jsonValue) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    try {
      const values = JSON.parse(jsonValue || '[]');
      Array.from(select.options).forEach(opt => {
        opt.selected = values.includes(opt.value);
      });
    } catch {}
  }

  function getMultiSelectValues(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return [];
    return Array.from(select.selectedOptions).map(opt => opt.value);
  }

  // Mise à jour de la visibilité des modules selon l'état global
  function updateModulesVisibility() {
    const enabled = document.getElementById('antiraid-enabled').checked;
    const modules = document.querySelectorAll('.antiraid-module');
    modules.forEach(m => {
      m.style.opacity = enabled ? '1' : '0.5';
      m.style.pointerEvents = enabled ? 'auto' : 'none';
    });
  }

  // Sauvegarder la config
  async function saveAntiraidConfig() {
    const statusEl = document.getElementById('status-antiraid-form');
    const saveBtn = document.getElementById('antiraid-save-btn');
    
    saveBtn.disabled = true;
    statusEl.textContent = 'Sauvegarde en cours...';
    statusEl.className = 'status-message';

    // Parser la whitelist
    const whitelistText = document.getElementById('antilink-whitelist').value;
    const whitelist = whitelistText.split(',').map(d => d.trim()).filter(d => d);

    const configData = {
      enabled: document.getElementById('antiraid-enabled').checked,
      log_channel_id: document.getElementById('antiraid-log-channel').value || null,

      // Anti-Link
      antilink_enabled: document.getElementById('antilink-enabled').checked,
      antilink_action: document.getElementById('antilink-action').value,
      antilink_whitelist_domains: whitelist,
      antilink_exclude_channels: getMultiSelectValues('antilink-exclude-channels'),
      antilink_exclude_roles: getMultiSelectValues('antilink-exclude-roles'),
      antilink_warn_message: document.getElementById('antilink-warn-message').value,

      // Anti-Invite
      antiinvite_enabled: document.getElementById('antiinvite-enabled').checked,
      antiinvite_action: document.getElementById('antiinvite-action').value,
      antiinvite_allow_own_server: document.getElementById('antiinvite-allow-own').checked,
      antiinvite_exclude_channels: getMultiSelectValues('antiinvite-exclude-channels'),
      antiinvite_exclude_roles: getMultiSelectValues('antiinvite-exclude-roles'),

      // Anti-Spam
      antispam_enabled: document.getElementById('antispam-enabled').checked,
      antispam_max_messages: parseInt(document.getElementById('antispam-max-messages').value) || 5,
      antispam_interval_seconds: parseInt(document.getElementById('antispam-interval').value) || 5,
      antispam_action: document.getElementById('antispam-action').value,
      antispam_mute_duration_minutes: parseInt(document.getElementById('antispam-mute-duration').value) || 10,
      antispam_exclude_channels: getMultiSelectValues('antispam-exclude-channels'),
      antispam_exclude_roles: getMultiSelectValues('antispam-exclude-roles'),

      // Anti-Duplicate
      antidupe_enabled: document.getElementById('antidupe-enabled').checked,
      antidupe_max_duplicates: parseInt(document.getElementById('antidupe-max').value) || 3,
      antidupe_interval_seconds: parseInt(document.getElementById('antidupe-interval').value) || 30,
      antidupe_action: document.getElementById('antidupe-action').value,
      antidupe_exclude_channels: getMultiSelectValues('antidupe-exclude-channels'),
      antidupe_exclude_roles: getMultiSelectValues('antidupe-exclude-roles'),

      // Anti-Mention
      antimention_enabled: document.getElementById('antimention-enabled').checked,
      antimention_max_mentions: parseInt(document.getElementById('antimention-max').value) || 5,
      antimention_action: document.getElementById('antimention-action').value,
      antimention_exclude_channels: getMultiSelectValues('antimention-exclude-channels'),
      antimention_exclude_roles: getMultiSelectValues('antimention-exclude-roles'),

      // Anti-Emoji
      antiemoji_enabled: document.getElementById('antiemoji-enabled').checked,
      antiemoji_max_emojis: parseInt(document.getElementById('antiemoji-max').value) || 10,
      antiemoji_action: document.getElementById('antiemoji-action').value,
      antiemoji_exclude_channels: getMultiSelectValues('antiemoji-exclude-channels'),
      antiemoji_exclude_roles: getMultiSelectValues('antiemoji-exclude-roles'),

      // Anti-Caps
      anticaps_enabled: document.getElementById('anticaps-enabled').checked,
      anticaps_max_percent: parseInt(document.getElementById('anticaps-max-percent').value) || 70,
      anticaps_min_length: parseInt(document.getElementById('anticaps-min-length').value) || 10,
      anticaps_action: document.getElementById('anticaps-action').value,
      anticaps_exclude_channels: getMultiSelectValues('anticaps-exclude-channels'),
      anticaps_exclude_roles: getMultiSelectValues('anticaps-exclude-roles'),

      // Anti-Newline
      antinewline_enabled: document.getElementById('antinewline-enabled').checked,
      antinewline_max_lines: parseInt(document.getElementById('antinewline-max').value) || 15,
      antinewline_action: document.getElementById('antinewline-action').value,
      antinewline_exclude_channels: getMultiSelectValues('antinewline-exclude-channels'),
      antinewline_exclude_roles: getMultiSelectValues('antinewline-exclude-roles'),

      // Anti-Bot
      antibot_enabled: document.getElementById('antibot-enabled').checked,
      antibot_min_account_age_days: parseInt(document.getElementById('antibot-min-age').value) || 7,
      antibot_no_avatar_action: document.getElementById('antibot-no-avatar').checked,
      antibot_suspicious_name_action: document.getElementById('antibot-suspicious-name').checked,
      antibot_action: document.getElementById('antibot-action').value,

      // Anti-Mass Join
      antimassj_enabled: document.getElementById('antimassj-enabled').checked,
      antimassj_max_joins: parseInt(document.getElementById('antimassj-max').value) || 10,
      antimassj_interval_seconds: parseInt(document.getElementById('antimassj-interval').value) || 10,
      antimassj_action: document.getElementById('antimassj-action').value,

      // Anti-Badwords
      antibadwords_enabled: document.getElementById('antibadwords-enabled').checked,
      antibadwords_words: document.getElementById('antibadwords-words').value.split('\n').map(w => w.trim()).filter(w => w),
      antibadwords_action: document.getElementById('antibadwords-action').value,
      antibadwords_warn_message: document.getElementById('antibadwords-warn-message').value,
      antibadwords_exclude_channels: getMultiSelectValues('antibadwords-exclude-channels'),
      antibadwords_exclude_roles: getMultiSelectValues('antibadwords-exclude-roles')
    };

    try {
      const res = await fetch('/api/bot/save-antiraid-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId, config: configData })
      });

      const data = await res.json();

      if (data.success) {
        statusEl.textContent = '✅ Configuration sauvegardée !';
        statusEl.className = 'status-message success';
      } else {
        statusEl.textContent = '❌ ' + (data.error || 'Erreur inconnue');
        statusEl.className = 'status-message error';
      }
    } catch (err) {
      console.error('Erreur sauvegarde antiraid:', err);
      statusEl.textContent = '❌ Erreur de connexion';
      statusEl.className = 'status-message error';
    }

    saveBtn.disabled = false;
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'status-message';
    }, 3000);
  }

  // Event Listeners
  document.getElementById('antiraid-enabled').addEventListener('change', updateModulesVisibility);
  document.getElementById('antiraid-save-btn').addEventListener('click', saveAntiraidConfig);

  // Warnings event listeners
  document.getElementById('warnings-decay-enabled').addEventListener('change', (e) => {
    document.getElementById('warnings-decay-options').style.display = e.target.checked ? 'grid' : 'none';
  });

  // Update duration fields when action changes
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`warn${i}-action`).addEventListener('change', updateWarningDurationFields);
  }

  document.getElementById('warnings-save-btn').addEventListener('click', saveWarningsConfig);

  // Sauvegarder la config warnings
  async function saveWarningsConfig() {
    const statusEl = document.getElementById('status-warnings-form');
    const saveBtn = document.getElementById('warnings-save-btn');
    
    saveBtn.disabled = true;
    statusEl.textContent = 'Sauvegarde en cours...';
    statusEl.className = 'status-message';

    const configData = {
      enabled: document.getElementById('warnings-enabled').checked,
      warn1_action: document.getElementById('warn1-action').value,
      warn1_duration: parseInt(document.getElementById('warn1-duration').value) || 10,
      warn2_action: document.getElementById('warn2-action').value,
      warn2_duration: parseInt(document.getElementById('warn2-duration').value) || 30,
      warn3_action: document.getElementById('warn3-action').value,
      warn3_duration: parseInt(document.getElementById('warn3-duration').value) || 60,
      warn4_action: document.getElementById('warn4-action').value,
      warn4_duration: parseInt(document.getElementById('warn4-duration').value) || 0,
      warn5_action: document.getElementById('warn5-action').value,
      warn5_duration: parseInt(document.getElementById('warn5-duration').value) || 0,
      decay_enabled: document.getElementById('warnings-decay-enabled').checked,
      decay_days: parseInt(document.getElementById('warnings-decay-days').value) || 30,
      notify_channel_id: document.getElementById('warnings-notify-channel').value || null
    };

    try {
      const res = await fetch('/api/bot/save-warnings-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId, config: configData })
      });

      const data = await res.json();

      if (data.success) {
        statusEl.textContent = '✅ Configuration sauvegardée !';
        statusEl.className = 'status-message success';
      } else {
        statusEl.textContent = '❌ ' + (data.error || 'Erreur inconnue');
        statusEl.className = 'status-message error';
      }
    } catch (err) {
      console.error('Erreur sauvegarde warnings:', err);
      statusEl.textContent = '❌ Erreur de connexion';
      statusEl.className = 'status-message error';
    }

    saveBtn.disabled = false;
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'status-message';
    }, 3000);
  }

  // Toggle modules body visibility when clicking header
  document.querySelectorAll('.antiraid-module-header').forEach(header => {
    header.addEventListener('click', (e) => {
      // Ne pas toggle si on clique sur le switch
      if (e.target.closest('.toggle-switch')) return;
      
      const module = header.closest('.antiraid-module');
      const body = module.querySelector('.antiraid-module-body');
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
    });
  });

  // Charger au démarrage
  loadAntiraidConfig();
})();
