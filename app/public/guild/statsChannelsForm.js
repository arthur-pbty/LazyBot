// ===== STATS CHANNELS FORM =====
(async function () {
  const channelSelect = document.getElementById("stats-channel-select");
  const typeSelect = document.getElementById("stats-type-select");
  const roleGroup = document.getElementById("stats-role-group");
  const roleSelect = document.getElementById("stats-role-select");
  const formatInput = document.getElementById("stats-format-input");
  const addBtn = document.getElementById("add-stats-channel");
  const listContainer = document.getElementById("stats-channels-list");

  const statTypeNames = {
    members: "👥 Membres (total)",
    humans: "👤 Membres (sans bots)",
    bots: "🤖 Bots",
    online: "🟢 En ligne",
    voice: "🎤 En vocal",
    roles: "🎭 Rôles",
    channels: "📺 Salons",
    boosts: "🚀 Boosts",
    boost_level: "💎 Niveau boost",
    role_members: "🏷️ Membres avec rôle"
  };

  // Afficher/masquer le sélecteur de rôle
  typeSelect.addEventListener("change", () => {
    if (typeSelect.value === "role_members") {
      roleGroup.style.display = "block";
    } else {
      roleGroup.style.display = "none";
    }

    // Mettre à jour le format par défaut
    const formats = {
      members: "👥 Membres: {stat}",
      humans: "👤 Humains: {stat}",
      bots: "🤖 Bots: {stat}",
      online: "🟢 En ligne: {stat}",
      voice: "🎤 En vocal: {stat}",
      roles: "🎭 Rôles: {stat}",
      channels: "📺 Salons: {stat}",
      boosts: "🚀 Boosts: {stat}",
      boost_level: "💎 Niveau: {stat}",
      role_members: "🏷️ Rôle: {stat}"
    };
    formatInput.value = formats[typeSelect.value] || "📊 {stat}";
  });

  // Charger les salons vocaux
  async function loadVoiceChannels() {
    try {
      const res = await fetch(`/api/bot/get-voice-channels/${guildId}`);
      const channels = await res.json();
      channelSelect.innerHTML = '<option value="">-- Sélectionner un salon --</option>';
      channels.forEach(ch => {
        const opt = document.createElement("option");
        opt.value = ch.id;
        opt.textContent = "🔊 " + ch.name;
        channelSelect.appendChild(opt);
      });
    } catch (err) {
      console.error("Erreur chargement salons vocaux:", err);
    }
  }

  // Charger les rôles
  async function loadRoles() {
    try {
      const res = await fetch(`/api/bot/get-roles/${guildId}`);
      const roles = await res.json();
      roleSelect.innerHTML = '<option value="">-- Sélectionner un rôle --</option>';
      roles.forEach(role => {
        const opt = document.createElement("option");
        opt.value = role.id;
        opt.textContent = role.name;
        roleSelect.appendChild(opt);
      });
    } catch (err) {
      console.error("Erreur chargement rôles:", err);
    }
  }

  // Charger la liste des salons configurés
  async function loadStatsChannels() {
    try {
      const res = await fetch(`/api/bot/get-stats-channels/${guildId}`);
      const channels = await res.json();

      if (channels.length === 0) {
        listContainer.innerHTML = '<p class="text-muted">Aucun salon configuré.</p>';
        return;
      }

      // Récupérer les infos des salons vocaux pour afficher les noms
      const voiceRes = await fetch(`/api/bot/get-voice-channels/${guildId}`);
      const voiceChannels = await voiceRes.json();
      const voiceMap = {};
      voiceChannels.forEach(ch => voiceMap[ch.id] = ch.name);

      // Récupérer les rôles
      const rolesRes = await fetch(`/api/bot/get-roles/${guildId}`);
      const roles = await rolesRes.json();
      const rolesMap = {};
      roles.forEach(r => rolesMap[r.id] = r.name);

      listContainer.innerHTML = channels.map(ch => {
        const channelName = voiceMap[ch.channel_id] || "Salon inconnu";
        const typeName = statTypeNames[ch.stat_type] || ch.stat_type;
        const roleInfo = ch.stat_type === "role_members" && ch.role_id 
          ? ` (${rolesMap[ch.role_id] || "Rôle inconnu"})` 
          : "";

        return `
          <div class="stats-channel-item" data-id="${ch.id}">
            <div class="stats-channel-info">
              <strong>🔊 ${channelName}</strong>
              <span class="stats-channel-type">${typeName}${roleInfo}</span>
              <code class="stats-channel-format">${ch.format}</code>
            </div>
            <button class="btn btn-sm btn-danger delete-stats-channel" data-id="${ch.id}">
              🗑️ Supprimer
            </button>
          </div>
        `;
      }).join("");

      // Ajouter les événements de suppression
      document.querySelectorAll(".delete-stats-channel").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          if (!confirm("Supprimer ce salon de statistiques ?")) return;

          try {
            const res = await fetch(`/api/bot/delete-stats-channel/${id}`, {
              method: "DELETE"
            });
            const result = await res.json();
            if (result.success) {
              loadStatsChannels();
            }
          } catch (err) {
            console.error("Erreur suppression:", err);
          }
        });
      });
    } catch (err) {
      console.error("Erreur chargement stats channels:", err);
    }
  }

  // Ajouter un salon
  addBtn.addEventListener("click", async () => {
    const channelId = channelSelect.value;
    const statType = typeSelect.value;
    const roleId = typeSelect.value === "role_members" ? roleSelect.value : null;
    const format = formatInput.value || "📊 {stat}";

    if (!channelId) {
      alert("Veuillez sélectionner un salon.");
      return;
    }

    if (statType === "role_members" && !roleId) {
      alert("Veuillez sélectionner un rôle.");
      return;
    }

    addBtn.disabled = true;
    addBtn.textContent = "Ajout...";

    try {
      const res = await fetch("/api/bot/add-stats-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId, channelId, statType, roleId, format })
      });
      const result = await res.json();

      if (result.success) {
        channelSelect.value = "";
        loadStatsChannels();
      } else {
        alert("Erreur lors de l'ajout.");
      }
    } catch (err) {
      console.error("Erreur ajout:", err);
      alert("Erreur réseau.");
    }

    addBtn.disabled = false;
    addBtn.textContent = "➕ Ajouter le salon";
  });

  // Init
  await loadVoiceChannels();
  await loadRoles();
  await loadStatsChannels();
})();
