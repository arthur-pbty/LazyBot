// ===== SEND MESSAGE FORM =====
(async function () {
  const channelSelect = document.getElementById("sendmsg-channel-select");
  const messageContent = document.getElementById("sendmsg-content");
  const embedEnabled = document.getElementById("sendmsg-embed-enabled");
  const embedOptions = document.getElementById("sendmsg-embed-options");
  const embedTitle = document.getElementById("sendmsg-embed-title");
  const embedDescription = document.getElementById("sendmsg-embed-description");
  const embedColor = document.getElementById("sendmsg-embed-color");
  const embedAuthorName = document.getElementById("sendmsg-embed-author-name");
  const embedAuthorUrl = document.getElementById("sendmsg-embed-author-url");
  const embedAuthorIcon = document.getElementById("sendmsg-embed-author-icon");
  const embedImage = document.getElementById("sendmsg-embed-image");
  const embedThumbnail = document.getElementById("sendmsg-embed-thumbnail");
  const embedFooterText = document.getElementById("sendmsg-embed-footer-text");
  const embedFooterIcon = document.getElementById("sendmsg-embed-footer-icon");
  const embedTimestamp = document.getElementById("sendmsg-embed-timestamp");
  const fieldsContainer = document.getElementById("sendmsg-fields-container");
  const addFieldBtn = document.getElementById("sendmsg-add-field");
  const previewContainer = document.getElementById("sendmsg-preview");
  const sendBtn = document.getElementById("sendmsg-send-btn");
  const historyContainer = document.getElementById("sendmsg-history");

  let fields = [];
  let sentMessages = [];

  // Toggle embed options
  embedEnabled.addEventListener("change", () => {
    embedOptions.style.display = embedEnabled.checked ? "block" : "none";
    updatePreview();
  });

  // Add field
  addFieldBtn.addEventListener("click", () => {
    const fieldIndex = fields.length;
    fields.push({ name: "", value: "", inline: false });
    renderFields();
  });

  function renderFields() {
    fieldsContainer.innerHTML = "";
    fields.forEach((field, index) => {
      const fieldDiv = document.createElement("div");
      fieldDiv.className = "field-item";
      fieldDiv.innerHTML = `
        <div class="form-row" style="margin-bottom: 0.5rem;">
          <div class="form-group" style="flex: 1;">
            <input type="text" class="form-input field-name" data-index="${index}" placeholder="Nom du champ" value="${field.name}">
          </div>
          <div class="form-group" style="flex: 2;">
            <input type="text" class="form-input field-value" data-index="${index}" placeholder="Valeur" value="${field.value}">
          </div>
          <div class="form-group" style="flex: 0 0 auto; display: flex; align-items: center; gap: 0.5rem;">
            <label style="display: flex; align-items: center; gap: 0.25rem; white-space: nowrap;">
              <input type="checkbox" class="field-inline" data-index="${index}" ${field.inline ? "checked" : ""}> Inline
            </label>
            <button type="button" class="btn btn-sm btn-danger field-remove" data-index="${index}">✕</button>
          </div>
        </div>
      `;
      fieldsContainer.appendChild(fieldDiv);
    });

    // Event listeners for fields
    document.querySelectorAll(".field-name").forEach(input => {
      input.addEventListener("input", (e) => {
        fields[e.target.dataset.index].name = e.target.value;
        updatePreview();
      });
    });
    document.querySelectorAll(".field-value").forEach(input => {
      input.addEventListener("input", (e) => {
        fields[e.target.dataset.index].value = e.target.value;
        updatePreview();
      });
    });
    document.querySelectorAll(".field-inline").forEach(input => {
      input.addEventListener("change", (e) => {
        fields[e.target.dataset.index].inline = e.target.checked;
        updatePreview();
      });
    });
    document.querySelectorAll(".field-remove").forEach(btn => {
      btn.addEventListener("click", (e) => {
        fields.splice(e.target.dataset.index, 1);
        renderFields();
        updatePreview();
      });
    });
  }

  // Update preview
  function updatePreview() {
    let html = "";
    
    const content = messageContent.value.trim();
    if (content) {
      html += `<div class="preview-content">${escapeHtml(content)}</div>`;
    }

    if (embedEnabled.checked) {
      const color = embedColor.value || "#5865F2";
      html += `<div class="preview-embed" style="border-left-color: ${color};">`;
      
      // Author
      if (embedAuthorName.value.trim()) {
        html += `<div class="preview-embed-author">`;
        if (embedAuthorIcon.value.trim()) {
          html += `<img src="${escapeHtml(embedAuthorIcon.value)}" class="preview-author-icon" onerror="this.style.display='none'">`;
        }
        if (embedAuthorUrl.value.trim()) {
          html += `<a href="${escapeHtml(embedAuthorUrl.value)}" target="_blank">${escapeHtml(embedAuthorName.value)}</a>`;
        } else {
          html += `<span>${escapeHtml(embedAuthorName.value)}</span>`;
        }
        html += `</div>`;
      }

      // Title
      if (embedTitle.value.trim()) {
        html += `<div class="preview-embed-title">${escapeHtml(embedTitle.value)}</div>`;
      }

      // Description
      if (embedDescription.value.trim()) {
        html += `<div class="preview-embed-description">${escapeHtml(embedDescription.value)}</div>`;
      }

      // Thumbnail
      if (embedThumbnail.value.trim()) {
        html += `<img src="${escapeHtml(embedThumbnail.value)}" class="preview-embed-thumbnail" onerror="this.style.display='none'">`;
      }

      // Fields
      const validFields = fields.filter(f => f.name.trim() && f.value.trim());
      if (validFields.length > 0) {
        html += `<div class="preview-embed-fields">`;
        validFields.forEach(f => {
          html += `<div class="preview-embed-field ${f.inline ? 'inline' : ''}">
            <div class="preview-field-name">${escapeHtml(f.name)}</div>
            <div class="preview-field-value">${escapeHtml(f.value)}</div>
          </div>`;
        });
        html += `</div>`;
      }

      // Image
      if (embedImage.value.trim()) {
        html += `<img src="${escapeHtml(embedImage.value)}" class="preview-embed-image" onerror="this.style.display='none'">`;
      }

      // Footer
      if (embedFooterText.value.trim() || embedTimestamp.checked) {
        html += `<div class="preview-embed-footer">`;
        if (embedFooterIcon.value.trim()) {
          html += `<img src="${escapeHtml(embedFooterIcon.value)}" class="preview-footer-icon" onerror="this.style.display='none'">`;
        }
        let footerParts = [];
        if (embedFooterText.value.trim()) {
          footerParts.push(escapeHtml(embedFooterText.value));
        }
        if (embedTimestamp.checked) {
          footerParts.push(new Date().toLocaleString("fr-FR"));
        }
        html += `<span>${footerParts.join(" • ")}</span>`;
        html += `</div>`;
      }

      html += `</div>`;
    }

    if (!html) {
      html = `<p class="text-muted">L'aperçu apparaîtra ici...</p>`;
    }

    previewContainer.innerHTML = html;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Add event listeners for preview updates
  [messageContent, embedTitle, embedDescription, embedAuthorName, embedAuthorUrl, 
   embedAuthorIcon, embedImage, embedThumbnail, embedFooterText, embedFooterIcon].forEach(el => {
    el.addEventListener("input", updatePreview);
  });
  embedColor.addEventListener("change", updatePreview);
  embedTimestamp.addEventListener("change", updatePreview);

  // Send message
  sendBtn.addEventListener("click", async () => {
    const channelId = channelSelect.value;
    if (!channelId) {
      alert("Veuillez sélectionner un salon.");
      return;
    }

    const content = messageContent.value.trim();
    const hasEmbed = embedEnabled.checked;

    if (!content && !hasEmbed) {
      alert("Veuillez entrer un message ou activer l'embed.");
      return;
    }

    // Build embed data
    let embed = null;
    if (hasEmbed) {
      embed = {
        title: embedTitle.value.trim() || null,
        description: embedDescription.value.trim() || null,
        color: embedColor.value,
        author: null,
        thumbnail: embedThumbnail.value.trim() ? { url: embedThumbnail.value.trim() } : null,
        image: embedImage.value.trim() ? { url: embedImage.value.trim() } : null,
        footer: null,
        timestamp: embedTimestamp.checked,
        fields: fields.filter(f => f.name.trim() && f.value.trim())
      };

      if (embedAuthorName.value.trim()) {
        embed.author = {
          name: embedAuthorName.value.trim(),
          url: embedAuthorUrl.value.trim() || null,
          icon_url: embedAuthorIcon.value.trim() || null
        };
      }

      if (embedFooterText.value.trim()) {
        embed.footer = {
          text: embedFooterText.value.trim(),
          icon_url: embedFooterIcon.value.trim() || null
        };
      }
    }

    sendBtn.disabled = true;
    sendBtn.textContent = "⏳ Envoi en cours...";

    try {
      const res = await fetch("/api/bot/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId: window.guildId,
          channelId,
          content: content || null,
          embed
        })
      });

      const data = await res.json();

      if (data.success) {
        // Add to history
        sentMessages.unshift({
          channelId,
          channelName: channelSelect.options[channelSelect.selectedIndex].text,
          content: content || "(Embed uniquement)",
          timestamp: new Date().toLocaleString("fr-FR")
        });
        if (sentMessages.length > 10) sentMessages.pop();
        renderHistory();

        // Clear form
        messageContent.value = "";
        embedTitle.value = "";
        embedDescription.value = "";
        embedAuthorName.value = "";
        embedAuthorUrl.value = "";
        embedAuthorIcon.value = "";
        embedImage.value = "";
        embedThumbnail.value = "";
        embedFooterText.value = "";
        embedFooterIcon.value = "";
        embedTimestamp.checked = false;
        fields = [];
        renderFields();
        updatePreview();

        alert("✅ Message envoyé avec succès !");
      } else {
        alert("❌ Erreur lors de l'envoi: " + (data.error || "Erreur inconnue"));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Erreur lors de l'envoi du message.");
    }

    sendBtn.disabled = false;
    sendBtn.textContent = "📤 Envoyer le message";
  });

  function renderHistory() {
    if (sentMessages.length === 0) {
      historyContainer.innerHTML = `<p class="text-muted">Aucun message envoyé récemment.</p>`;
      return;
    }

    historyContainer.innerHTML = sentMessages.map(msg => `
      <div class="history-item">
        <div class="history-item-header">
          <span class="history-channel">#${escapeHtml(msg.channelName)}</span>
          <span class="history-time">${msg.timestamp}</span>
        </div>
        <div class="history-content">${escapeHtml(msg.content.substring(0, 100))}${msg.content.length > 100 ? '...' : ''}</div>
      </div>
    `).join("");
  }

  // Initialize
  updatePreview();
})();
