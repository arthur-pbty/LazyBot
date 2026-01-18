// ========== GOODBYE FORM ==========
const goodbyeEnabled = document.getElementById("goodbye-enabled");
const goodbyeChannel = document.getElementById("goodbye-channel");
const goodbyeMessage = document.getElementById("goodbye-message");
const goodbyeMessageType = document.getElementById("goodbye-message-type");
const goodbyeEmbedTitle = document.getElementById("goodbye-embed-title");
const goodbyeEmbedDescription = document.getElementById("goodbye-embed-description");
const goodbyeEmbedColor = document.getElementById("goodbye-embed-color");
const goodbyeEmbedThumbnail = document.getElementById("goodbye-embed-thumbnail");
const goodbyeEmbedFooter = document.getElementById("goodbye-embed-footer");
const goodbyeImageEnabled = document.getElementById("goodbye-image-enabled");
const goodbyeImageGradient = document.getElementById("goodbye-image-gradient");
const goodbyeImageTitle = document.getElementById("goodbye-image-title");
const goodbyeImageSubtitle = document.getElementById("goodbye-image-subtitle");
const goodbyeImageMemberCount = document.getElementById("goodbye-image-member-count");
const saveGoodbye = document.getElementById("save-goodbye");

const goodbyeTextGroup = document.getElementById("goodbye-text-group");
const goodbyeEmbedSection = document.getElementById("goodbye-embed-section");
const goodbyeImageOptions = document.getElementById("goodbye-image-options");
const goodbyeGradientPicker = document.getElementById("goodbye-gradient-picker");
const goodbyeImagePreview = document.getElementById("goodbye-image-preview");

// Afficher/masquer les sections selon le type de message
function updateGoodbyeVisibility() {
  const type = goodbyeMessageType.value;
  
  // Text group visible si text ou both
  goodbyeTextGroup.style.display = (type === 'text' || type === 'both') ? 'block' : 'none';
  
  // Embed section visible si embed ou both
  goodbyeEmbedSection.style.display = (type === 'embed' || type === 'both') ? 'block' : 'none';
}

// Gestion du gradient picker
if (goodbyeGradientPicker) {
  goodbyeGradientPicker.addEventListener('click', (e) => {
    const option = e.target.closest('.gradient-option');
    if (!option) return;
    
    goodbyeGradientPicker.querySelectorAll('.gradient-option').forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
    goodbyeImageGradient.value = option.dataset.gradient;
    updateGoodbyePreview();
  });
}

// Afficher/masquer les options d'image
if (goodbyeImageEnabled) {
  goodbyeImageEnabled.addEventListener('change', () => {
    goodbyeImageOptions.style.display = goodbyeImageEnabled.checked ? 'block' : 'none';
    if (goodbyeImageEnabled.checked) {
      updateGoodbyePreview();
    }
  });
}

// Mise à jour de l'aperçu de l'image
function updateGoodbyePreview() {
  if (!goodbyeImagePreview) return;
  
  const gradient = goodbyeImageGradient.value || 'red';
  const title = goodbyeImageTitle.value || 'Au revoir';
  const subtitle = goodbyeImageSubtitle.value || 'a quitté le serveur';
  
  // Utiliser les mêmes fonctions que welcome (définies globalement)
  const colors = typeof getGradientColors === 'function' ? getGradientColors(gradient) : ['#ff416c', '#ff4b2b'];
  
  // Créer un aperçu simplifié avec CSS
  goodbyeImagePreview.innerHTML = `
    <div class="preview-card" style="
      width: 100%;
      max-width: 500px;
      height: 150px;
      border-radius: 12px;
      background: linear-gradient(135deg, ${colors[0]}, ${colors[1]});
      display: flex;
      align-items: center;
      padding: 20px;
      gap: 20px;
      color: white;
      font-family: Arial, sans-serif;
    ">
      <div style="
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: rgba(255,255,255,0.3);
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      ">👤</div>
      <div style="flex: 1;">
        <div style="font-size: 24px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${escapeHtmlGoodbye(title)}</div>
        <div style="font-size: 14px; opacity: 0.9;">${escapeHtmlGoodbye(subtitle)}</div>
        <div style="font-size: 16px; font-style: italic; margin-top: 8px;">NomServeur</div>
        <div style="font-size: 14px; font-weight: bold; opacity: 0.8; margin-top: 4px;">Utilisateur</div>
      </div>
    </div>
  `;
}

function escapeHtmlGoodbye(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event listeners pour la mise à jour de l'aperçu
if (goodbyeImageTitle) goodbyeImageTitle.addEventListener('input', updateGoodbyePreview);
if (goodbyeImageSubtitle) goodbyeImageSubtitle.addEventListener('input', updateGoodbyePreview);

if (goodbyeMessageType) {
  goodbyeMessageType.addEventListener('change', updateGoodbyeVisibility);
}

// Charger la config
fetch(`/api/bot/get-goodbye-config/${guildId}`)
  .then(res => res.json())
  .then(cfg => {
    goodbyeEnabled.checked = cfg.enabled;
    goodbyeChannel.value = cfg.channelId || '';
    goodbyeMessage.value = cfg.message || '';
    goodbyeMessageType.value = cfg.messageType || 'embed';
    goodbyeEmbedTitle.value = cfg.embedTitle || '';
    goodbyeEmbedDescription.value = cfg.embedDescription || '';
    goodbyeEmbedColor.value = cfg.embedColor || '#ED4245';
    goodbyeEmbedThumbnail.checked = cfg.embedThumbnail !== false;
    goodbyeEmbedFooter.value = cfg.embedFooter || '';
    goodbyeImageEnabled.checked = cfg.imageEnabled || false;
    goodbyeImageGradient.value = cfg.imageGradient || 'red';
    goodbyeImageTitle.value = cfg.imageTitle || '';
    goodbyeImageSubtitle.value = cfg.imageSubtitle || '';
    goodbyeImageMemberCount.checked = cfg.imageShowMemberCount !== false;
    
    // Update visibility
    updateGoodbyeVisibility();
    
    // Update gradient picker selection
    if (goodbyeGradientPicker) {
      goodbyeGradientPicker.querySelectorAll('.gradient-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.gradient === cfg.imageGradient);
      });
    }
    
    // Show image options if enabled
    if (goodbyeImageOptions) {
      goodbyeImageOptions.style.display = cfg.imageEnabled ? 'block' : 'none';
    }
    
    if (cfg.imageEnabled) {
      updateGoodbyePreview();
    }
  });

// Sauvegarder
saveGoodbye.addEventListener("click", async () => {
  saveGoodbye.disabled = true;
  saveGoodbye.textContent = "Sauvegarde...";

  try {
    const res = await fetch("/api/bot/save-goodbye-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guildId,
        goodbyeEnabled: goodbyeEnabled.checked,
        channelId: goodbyeChannel.value,
        goodbyeMessage: goodbyeMessage.value,
        messageType: goodbyeMessageType.value,
        embedTitle: goodbyeEmbedTitle.value,
        embedDescription: goodbyeEmbedDescription.value,
        embedColor: goodbyeEmbedColor.value,
        embedThumbnail: goodbyeEmbedThumbnail.checked,
        embedFooter: goodbyeEmbedFooter.value,
        imageEnabled: goodbyeImageEnabled.checked,
        imageGradient: goodbyeImageGradient.value,
        imageTitle: goodbyeImageTitle.value,
        imageSubtitle: goodbyeImageSubtitle.value,
        imageShowMemberCount: goodbyeImageMemberCount.checked
      })
    });

    const data = await res.json();
    if (data.success) {
      showStatus("status-goodbye-form", "Configuration sauvegardée ✅", "success");
    } else {
      showStatus("status-goodbye-form", "Erreur lors de la sauvegarde ❌", "error");
    }
  } catch (error) {
    showStatus("status-goodbye-form", "Erreur de connexion ❌", "error");
  }

  saveGoodbye.disabled = false;
  saveGoodbye.textContent = "Sauvegarder";
});

// Initialisation
updateGoodbyeVisibility();
