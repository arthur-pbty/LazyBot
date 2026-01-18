// ===== BOT APPEARANCE FORM =====
(async function () {
  const previewAvatar = document.getElementById("bot-preview-avatar");
  const previewName = document.getElementById("bot-preview-name");
  const nicknameInput = document.getElementById("bot-nickname");
  const nicknameSaveBtn = document.getElementById("bot-nickname-save");
  const nicknameResetBtn = document.getElementById("bot-nickname-reset");

  let botData = null;

  // Charger les infos du bot
  async function loadBotInfo() {
    try {
      const res = await fetch(`/api/bot/get-bot-appearance/${window.guildId}`);
      const data = await res.json();
      
      if (data.success) {
        botData = data;
        
        // Mettre à jour l'aperçu
        if (data.avatarUrl) {
          previewAvatar.src = data.avatarUrl;
        }
        previewName.textContent = data.nickname || data.username;
        
        // Remplir les champs
        nicknameInput.value = data.nickname || "";
        nicknameInput.placeholder = data.username + " (par défaut)";
      }
    } catch (err) {
      console.error("Erreur chargement bot info:", err);
    }
  }

  // Sauvegarder le pseudo
  nicknameSaveBtn.addEventListener("click", async () => {
    const nickname = nicknameInput.value.trim();
    
    nicknameSaveBtn.disabled = true;
    nicknameSaveBtn.textContent = "⏳ Sauvegarde...";

    try {
      const res = await fetch("/api/bot/set-nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId: window.guildId,
          nickname: nickname || null
        })
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ Pseudo mis à jour avec succès !");
        previewName.textContent = nickname || botData.username;
      } else {
        alert("❌ Erreur: " + (data.error || "Erreur inconnue"));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Erreur lors de la mise à jour du pseudo.");
    }

    nicknameSaveBtn.disabled = false;
    nicknameSaveBtn.textContent = "💾 Sauvegarder le pseudo";
  });

  // Réinitialiser le pseudo
  nicknameResetBtn.addEventListener("click", async () => {
    nicknameResetBtn.disabled = true;
    nicknameResetBtn.textContent = "⏳ Réinitialisation...";

    try {
      const res = await fetch("/api/bot/set-nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId: window.guildId,
          nickname: null
        })
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ Pseudo réinitialisé !");
        nicknameInput.value = "";
        previewName.textContent = botData.username;
      } else {
        alert("❌ Erreur: " + (data.error || "Erreur inconnue"));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Erreur lors de la réinitialisation.");
    }

    nicknameResetBtn.disabled = false;
    nicknameResetBtn.textContent = "🔄 Réinitialiser";
  });

  // Initialiser
  loadBotInfo();
})();
