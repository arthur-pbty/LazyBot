// ========== WELCOME FORM ==========
const welcomeEnabled = document.getElementById("welcome-enabled");
const welcomeChannel = document.getElementById("welcome-channel");
const welcomeMessage = document.getElementById("welcome-message");
const welcomeMessageType = document.getElementById("welcome-message-type");
const welcomeEmbedTitle = document.getElementById("welcome-embed-title");
const welcomeEmbedDescription = document.getElementById("welcome-embed-description");
const welcomeEmbedColor = document.getElementById("welcome-embed-color");
const welcomeEmbedThumbnail = document.getElementById("welcome-embed-thumbnail");
const welcomeEmbedFooter = document.getElementById("welcome-embed-footer");
const welcomeImageEnabled = document.getElementById("welcome-image-enabled");
const welcomeImageGradient = document.getElementById("welcome-image-gradient");
const welcomeImageTitle = document.getElementById("welcome-image-title");
const welcomeImageSubtitle = document.getElementById("welcome-image-subtitle");
const welcomeImageMemberCount = document.getElementById("welcome-image-member-count");
const saveWelcome = document.getElementById("save-welcome");

const welcomeTextGroup = document.getElementById("welcome-text-group");
const welcomeEmbedSection = document.getElementById("welcome-embed-section");
const welcomeImageOptions = document.getElementById("welcome-image-options");
const welcomeGradientPicker = document.getElementById("welcome-gradient-picker");
const welcomeImagePreview = document.getElementById("welcome-image-preview");

// Afficher/masquer les sections selon le type de message
function updateWelcomeVisibility() {
  const type = welcomeMessageType.value;
  
  // Text group visible si text ou both
  welcomeTextGroup.style.display = (type === 'text' || type === 'both') ? 'block' : 'none';
  
  // Embed section visible si embed ou both
  welcomeEmbedSection.style.display = (type === 'embed' || type === 'both') ? 'block' : 'none';
}

// Gestion du gradient picker
if (welcomeGradientPicker) {
  welcomeGradientPicker.addEventListener('click', (e) => {
    const option = e.target.closest('.gradient-option');
    if (!option) return;
    
    welcomeGradientPicker.querySelectorAll('.gradient-option').forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
    welcomeImageGradient.value = option.dataset.gradient;
    updateWelcomePreview();
  });
}

// Afficher/masquer les options d'image
if (welcomeImageEnabled) {
  welcomeImageEnabled.addEventListener('change', () => {
    welcomeImageOptions.style.display = welcomeImageEnabled.checked ? 'block' : 'none';
    if (welcomeImageEnabled.checked) {
      updateWelcomePreview();
    }
  });
}

// Mise à jour de l'aperçu de l'image
function updateWelcomePreview() {
  if (!welcomeImagePreview) return;
  
  const gradient = welcomeImageGradient.value || 'purple';
  const title = welcomeImageTitle.value || 'Bienvenue';
  const subtitle = welcomeImageSubtitle.value || 'sur le serveur Discord';
  
  // Créer un aperçu simplifié avec CSS
  welcomeImagePreview.innerHTML = `
    <div class="preview-card" style="
      width: 100%;
      max-width: 500px;
      height: 150px;
      border-radius: 12px;
      background: linear-gradient(135deg, ${getGradientColors(gradient)[0]}, ${getGradientColors(gradient)[1]});
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
        <div style="font-size: 24px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${escapeHtml(title)}</div>
        <div style="font-size: 14px; opacity: 0.9;">${escapeHtml(subtitle)}</div>
        <div style="font-size: 16px; font-style: italic; margin-top: 8px;">NomServeur</div>
        <div style="font-size: 14px; font-weight: bold; opacity: 0.8; margin-top: 4px;">Utilisateur</div>
      </div>
    </div>
  `;
}

function getGradientColors(gradient) {
  const gradients = {
    purple: ['#667eea', '#764ba2'],
    blue: ['#4facfe', '#00f2fe'],
    green: ['#11998e', '#38ef7d'],
    red: ['#ff416c', '#ff4b2b'],
    orange: ['#f12711', '#f5af19'],
    pink: ['#ee0979', '#ff6a00'],
    dark: ['#232526', '#414345'],
    sunset: ['#fa709a', '#fee140'],
    ocean: ['#2193b0', '#6dd5ed'],
    forest: ['#134e5e', '#71b280']
  };
  return gradients[gradient] || gradients.purple;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event listeners pour la mise à jour de l'aperçu
if (welcomeImageTitle) welcomeImageTitle.addEventListener('input', updateWelcomePreview);
if (welcomeImageSubtitle) welcomeImageSubtitle.addEventListener('input', updateWelcomePreview);

if (welcomeMessageType) {
  welcomeMessageType.addEventListener('change', updateWelcomeVisibility);
}

// Charger la config
fetch(`/api/bot/get-welcome-config/${guildId}`)
  .then(res => res.json())
  .then(cfg => {
    welcomeEnabled.checked = cfg.enabled;
    welcomeChannel.value = cfg.channelId || '';
    welcomeMessage.value = cfg.message || '';
    welcomeMessageType.value = cfg.messageType || 'embed';
    welcomeEmbedTitle.value = cfg.embedTitle || '';
    welcomeEmbedDescription.value = cfg.embedDescription || '';
    welcomeEmbedColor.value = cfg.embedColor || '#57F287';
    welcomeEmbedThumbnail.checked = cfg.embedThumbnail !== false;
    welcomeEmbedFooter.value = cfg.embedFooter || '';
    welcomeImageEnabled.checked = cfg.imageEnabled || false;
    welcomeImageGradient.value = cfg.imageGradient || 'purple';
    welcomeImageTitle.value = cfg.imageTitle || '';
    welcomeImageSubtitle.value = cfg.imageSubtitle || '';
    welcomeImageMemberCount.checked = cfg.imageShowMemberCount !== false;
    
    // Update visibility
    updateWelcomeVisibility();
    
    // Update gradient picker selection
    if (welcomeGradientPicker) {
      welcomeGradientPicker.querySelectorAll('.gradient-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.gradient === cfg.imageGradient);
      });
    }
    
    // Show image options if enabled
    if (welcomeImageOptions) {
      welcomeImageOptions.style.display = cfg.imageEnabled ? 'block' : 'none';
    }
    
    if (cfg.imageEnabled) {
      updateWelcomePreview();
    }
  });

// Sauvegarder
saveWelcome.addEventListener("click", async () => {
  saveWelcome.disabled = true;
  saveWelcome.textContent = "Sauvegarde...";

  try {
    const res = await fetch("/api/bot/save-welcome-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guildId,
        welcomeEnabled: welcomeEnabled.checked,
        channelId: welcomeChannel.value,
        welcomeMessage: welcomeMessage.value,
        messageType: welcomeMessageType.value,
        embedTitle: welcomeEmbedTitle.value,
        embedDescription: welcomeEmbedDescription.value,
        embedColor: welcomeEmbedColor.value,
        embedThumbnail: welcomeEmbedThumbnail.checked,
        embedFooter: welcomeEmbedFooter.value,
        imageEnabled: welcomeImageEnabled.checked,
        imageGradient: welcomeImageGradient.value,
        imageTitle: welcomeImageTitle.value,
        imageSubtitle: welcomeImageSubtitle.value,
        imageShowMemberCount: welcomeImageMemberCount.checked
      })
    });

    const data = await res.json();
    if (data.success) {
      showStatus("status-welcome-form", "Configuration sauvegardée ✅", "success");
    } else {
      showStatus("status-welcome-form", "Erreur lors de la sauvegarde ❌", "error");
    }
  } catch (error) {
    showStatus("status-welcome-form", "Erreur de connexion ❌", "error");
  }

  saveWelcome.disabled = false;
  saveWelcome.textContent = "Sauvegarder";
});

// Initialisation
updateWelcomeVisibility();
