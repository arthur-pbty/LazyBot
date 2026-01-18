// ===== SCHEDULED MESSAGES FORM =====
(async function () {
  const channelSelect = document.getElementById("scheduled-channel-select");
  const messageContent = document.getElementById("scheduled-message-content");
  const embedEnabled = document.getElementById("scheduled-embed-enabled");
  const embedOptions = document.getElementById("scheduled-embed-options");
  const embedTitle = document.getElementById("scheduled-embed-title");
  const embedDescription = document.getElementById("scheduled-embed-description");
  const embedColor = document.getElementById("scheduled-embed-color");
  const scheduleType = document.getElementById("scheduled-type");
  const weeklyOptions = document.getElementById("scheduled-weekly-options");
  const intervalOptions = document.getElementById("scheduled-interval-options");
  const daysContainer = document.getElementById("scheduled-days");
  const hourSelect = document.getElementById("scheduled-hour-select");
  const minuteSelect = document.getElementById("scheduled-minute-select");
  const addTimeBtn = document.getElementById("scheduled-add-time");
  const timesList = document.getElementById("scheduled-times-list");
  const intervalValue = document.getElementById("scheduled-interval-value");
  const intervalUnit = document.getElementById("scheduled-interval-unit");
  const forceSend = document.getElementById("scheduled-force-send");
  const deletePrevious = document.getElementById("scheduled-delete-previous");
  const enabledCheckbox = document.getElementById("scheduled-enabled");
  const saveBtn = document.getElementById("scheduled-save-btn");
  const cancelBtn = document.getElementById("scheduled-cancel-btn");
  const editIdInput = document.getElementById("scheduled-edit-id");
  const formTitle = document.getElementById("scheduled-form-title");
  const listContainer = document.getElementById("scheduled-messages-list");

  let selectedTimes = [];

  // Populate hour and minute selects
  function initTimeSelects() {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, "0");
    const currentMinute = now.getMinutes().toString().padStart(2, "0");
    
    // Hours 00-23
    for (let h = 0; h < 24; h++) {
      const opt = document.createElement("option");
      opt.value = h.toString().padStart(2, "0");
      opt.textContent = h.toString().padStart(2, "0");
      hourSelect.appendChild(opt);
    }
    // Minutes 00-59
    for (let m = 0; m < 60; m++) {
      const opt = document.createElement("option");
      opt.value = m.toString().padStart(2, "0");
      opt.textContent = m.toString().padStart(2, "0");
      minuteSelect.appendChild(opt);
    }
    
    // Set default to current time
    hourSelect.value = currentHour;
    minuteSelect.value = currentMinute;
  }

  // Toggle embed options
  embedEnabled.addEventListener("change", () => {
    embedOptions.style.display = embedEnabled.checked ? "block" : "none";
  });

  // Toggle schedule type options
  scheduleType.addEventListener("change", () => {
    if (scheduleType.value === "weekly") {
      weeklyOptions.style.display = "block";
      intervalOptions.style.display = "none";
    } else {
      weeklyOptions.style.display = "none";
      intervalOptions.style.display = "block";
    }
  });

  // Add time
  addTimeBtn.addEventListener("click", () => {
    const hour = hourSelect.value;
    const minute = minuteSelect.value;
    
    if (!hour || !minute) {
      alert("Veuillez sélectionner une heure et des minutes.");
      return;
    }
    
    const time = `${hour}:${minute}`;
    if (selectedTimes.includes(time)) {
      alert("Cette heure est déjà ajoutée.");
      return;
    }
    
    selectedTimes.push(time);
    selectedTimes.sort();
    renderTimesList();
    hourSelect.value = "";
    minuteSelect.value = "";
  });

  function renderTimesList() {
    if (selectedTimes.length === 0) {
      timesList.innerHTML = '<span class="text-muted">Aucune heure sélectionnée</span>';
      return;
    }
    
    timesList.innerHTML = selectedTimes.map(time => `
      <span class="time-tag">
        ${time}
        <button type="button" class="time-remove" data-time="${time}">×</button>
      </span>
    `).join("");

    document.querySelectorAll(".time-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedTimes = selectedTimes.filter(t => t !== btn.dataset.time);
        renderTimesList();
      });
    });
  }

  // Load text channels
  async function loadChannels() {
    try {
      const res = await fetch(`/api/bot/get-text-channels/${guildId}`);
      const channels = await res.json();
      channelSelect.innerHTML = '<option value="">-- Sélectionner un salon --</option>';
      channels.forEach(ch => {
        const opt = document.createElement("option");
        opt.value = ch.id;
        opt.textContent = "# " + ch.name;
        channelSelect.appendChild(opt);
      });
    } catch (err) {
      console.error("Erreur chargement salons:", err);
    }
  }

  // Get selected days
  function getSelectedDays() {
    const days = [];
    daysContainer.querySelectorAll("input:checked").forEach(cb => {
      days.push(parseInt(cb.value));
    });
    return days;
  }

  // Set selected days
  function setSelectedDays(days) {
    daysContainer.querySelectorAll("input").forEach(cb => {
      cb.checked = days.includes(parseInt(cb.value));
    });
  }

  // Reset form
  function resetForm() {
    editIdInput.value = "";
    formTitle.textContent = "➕ Nouveau message programmé";
    channelSelect.value = "";
    messageContent.value = "";
    embedEnabled.checked = false;
    embedOptions.style.display = "none";
    embedTitle.value = "";
    embedDescription.value = "";
    embedColor.value = "#5865F2";
    scheduleType.value = "weekly";
    weeklyOptions.style.display = "block";
    intervalOptions.style.display = "none";
    setSelectedDays([]);
    selectedTimes = [];
    renderTimesList();
    intervalValue.value = 60;
    intervalUnit.value = "minutes";
    forceSend.checked = true;
    deletePrevious.checked = false;
    enabledCheckbox.checked = true;
    saveBtn.textContent = "💾 Enregistrer";
    cancelBtn.style.display = "none";
  }

  // Load scheduled messages list
  async function loadScheduledMessages() {
    try {
      const res = await fetch(`/api/bot/get-scheduled-messages/${guildId}`);
      const messages = await res.json();

      if (messages.length === 0) {
        listContainer.innerHTML = '<p class="text-muted">Aucun message programmé.</p>';
        return;
      }

      // Get channels for names
      const channelsRes = await fetch(`/api/bot/get-text-channels/${guildId}`);
      const channels = await channelsRes.json();
      const channelMap = {};
      channels.forEach(ch => channelMap[ch.id] = ch.name);

      listContainer.innerHTML = messages.map(msg => {
        const channelName = channelMap[msg.channel_id] || "Salon inconnu";
        const scheduleInfo = getScheduleInfo(msg);
        const statusClass = msg.enabled ? "status-active" : "status-inactive";
        const statusText = msg.enabled ? "Actif" : "Inactif";

        return `
          <div class="scheduled-message-item" data-id="${msg.id}">
            <div class="scheduled-message-header">
              <div class="scheduled-message-info">
                <strong># ${channelName}</strong>
                <span class="scheduled-message-schedule">${scheduleInfo}</span>
              </div>
              <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <div class="scheduled-message-preview">
              ${msg.message_content ? escapeHtml(msg.message_content.substring(0, 100)) + (msg.message_content.length > 100 ? '...' : '') : ''}
              ${msg.embed_enabled ? '<span class="embed-badge">📦 Embed</span>' : ''}
            </div>
            <div class="scheduled-message-options">
              ${msg.force_send ? '<span class="option-tag">Force envoi</span>' : '<span class="option-tag">Vérifie activité</span>'}
              ${msg.delete_previous ? '<span class="option-tag">Supprime précédent</span>' : ''}
            </div>
            <div class="scheduled-message-actions">
              <button class="btn btn-sm btn-secondary edit-scheduled" data-id="${msg.id}">✏️ Modifier</button>
              <button class="btn btn-sm ${msg.enabled ? 'btn-warning' : 'btn-success'} toggle-scheduled" data-id="${msg.id}">
                ${msg.enabled ? '⏸️ Désactiver' : '▶️ Activer'}
              </button>
              <button class="btn btn-sm btn-danger delete-scheduled" data-id="${msg.id}">🗑️ Supprimer</button>
            </div>
          </div>
        `;
      }).join("");

      // Event listeners
      document.querySelectorAll(".edit-scheduled").forEach(btn => {
        btn.addEventListener("click", () => editMessage(messages.find(m => m.id == btn.dataset.id)));
      });

      document.querySelectorAll(".toggle-scheduled").forEach(btn => {
        btn.addEventListener("click", () => toggleMessage(btn.dataset.id));
      });

      document.querySelectorAll(".delete-scheduled").forEach(btn => {
        btn.addEventListener("click", () => deleteMessage(btn.dataset.id));
      });

    } catch (err) {
      console.error("Erreur chargement messages:", err);
    }
  }

  function getScheduleInfo(msg) {
    if (msg.schedule_type === "interval") {
      return `Toutes les ${msg.interval_value} ${msg.interval_unit === 'hours' ? 'heures' : 'minutes'}`;
    } else {
      const days = JSON.parse(msg.days_of_week || "[]");
      const times = JSON.parse(msg.times_of_day || "[]");
      const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const dayStr = days.map(d => dayNames[d]).join(', ') || 'Aucun jour';
      const timeStr = times.join(', ') || 'Aucune heure';
      return `${dayStr} à ${timeStr}`;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Edit message
  function editMessage(msg) {
    editIdInput.value = msg.id;
    formTitle.textContent = "✏️ Modifier le message programmé";
    channelSelect.value = msg.channel_id;
    messageContent.value = msg.message_content || "";
    embedEnabled.checked = !!msg.embed_enabled;
    embedOptions.style.display = msg.embed_enabled ? "block" : "none";
    embedTitle.value = msg.embed_title || "";
    embedDescription.value = msg.embed_description || "";
    embedColor.value = msg.embed_color || "#5865F2";
    scheduleType.value = msg.schedule_type || "weekly";
    
    if (msg.schedule_type === "interval") {
      weeklyOptions.style.display = "none";
      intervalOptions.style.display = "block";
    } else {
      weeklyOptions.style.display = "block";
      intervalOptions.style.display = "none";
    }
    
    setSelectedDays(JSON.parse(msg.days_of_week || "[]"));
    selectedTimes = JSON.parse(msg.times_of_day || "[]");
    renderTimesList();
    intervalValue.value = msg.interval_value || 60;
    intervalUnit.value = msg.interval_unit || "minutes";
    forceSend.checked = !!msg.force_send;
    deletePrevious.checked = !!msg.delete_previous;
    enabledCheckbox.checked = !!msg.enabled;
    saveBtn.textContent = "💾 Mettre à jour";
    cancelBtn.style.display = "inline-block";

    // Scroll to form
    document.getElementById("scheduled-form-section").scrollIntoView({ behavior: "smooth" });
  }

  // Toggle message
  async function toggleMessage(id) {
    try {
      await fetch(`/api/bot/toggle-scheduled-message/${id}`, { method: "PATCH" });
      loadScheduledMessages();
    } catch (err) {
      console.error("Erreur toggle:", err);
    }
  }

  // Delete message
  async function deleteMessage(id) {
    if (!confirm("Supprimer ce message programmé ?")) return;

    try {
      await fetch(`/api/bot/delete-scheduled-message/${id}`, { method: "DELETE" });
      loadScheduledMessages();
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  }

  // Save button
  saveBtn.addEventListener("click", async () => {
    const channel = channelSelect.value;
    if (!channel) {
      alert("Veuillez sélectionner un salon.");
      return;
    }

    const content = messageContent.value;
    const hasEmbed = embedEnabled.checked && (embedTitle.value || embedDescription.value);
    
    if (!content && !hasEmbed) {
      alert("Veuillez entrer un message ou configurer un embed.");
      return;
    }

    if (scheduleType.value === "weekly") {
      if (getSelectedDays().length === 0) {
        alert("Veuillez sélectionner au moins un jour.");
        return;
      }
      if (selectedTimes.length === 0) {
        alert("Veuillez ajouter au moins une heure.");
        return;
      }
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Enregistrement...";

    const data = {
      guildId,
      channelId: channel,
      messageContent: content,
      embedEnabled: embedEnabled.checked,
      embedTitle: embedTitle.value,
      embedDescription: embedDescription.value,
      embedColor: embedColor.value,
      scheduleType: scheduleType.value,
      daysOfWeek: getSelectedDays(),
      timesOfDay: selectedTimes,
      intervalValue: parseInt(intervalValue.value) || 60,
      intervalUnit: intervalUnit.value,
      forceSend: forceSend.checked,
      deletePrevious: deletePrevious.checked,
      enabled: enabledCheckbox.checked
    };

    try {
      const editId = editIdInput.value;
      let res;
      
      if (editId) {
        res = await fetch(`/api/bot/update-scheduled-message/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      } else {
        res = await fetch("/api/bot/add-scheduled-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      }

      const result = await res.json();
      if (result.success) {
        resetForm();
        loadScheduledMessages();
      } else {
        alert("Erreur lors de l'enregistrement.");
      }
    } catch (err) {
      console.error("Erreur:", err);
      alert("Erreur réseau.");
    }

    saveBtn.disabled = false;
    saveBtn.textContent = editIdInput.value ? "💾 Mettre à jour" : "💾 Enregistrer";
  });

  // Cancel button
  cancelBtn.addEventListener("click", resetForm);

  // Init
  initTimeSelects();
  await loadChannels();
  await loadScheduledMessages();
  renderTimesList();
})();
