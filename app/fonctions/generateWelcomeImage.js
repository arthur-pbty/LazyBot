const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

// Couleurs par défaut pour les dégradés
const GRADIENTS = {
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

/**
 * Génère une image de bienvenue/au revoir
 * @param {Object} options - Options de génération
 * @param {string} options.type - 'welcome' ou 'goodbye'
 * @param {string} options.username - Nom d'utilisateur
 * @param {string} options.discriminator - Discriminateur (ou pseudo global)
 * @param {string} options.avatarURL - URL de l'avatar
 * @param {string} options.serverName - Nom du serveur
 * @param {string} options.memberCount - Nombre de membres (optionnel)
 * @param {string} options.gradient - Nom du dégradé ou couleurs custom
 * @param {string} options.title - Titre personnalisé (optionnel)
 * @param {string} options.subtitle - Sous-titre personnalisé (optionnel)
 * @returns {Promise<Buffer>} - Buffer de l'image PNG
 */
async function generateWelcomeImage(options) {
  const {
    type = 'welcome',
    username,
    discriminator = '',
    avatarURL,
    serverName,
    memberCount = null,
    gradient = 'purple',
    title = null,
    subtitle = null
  } = options;

  // Dimensions de l'image
  const width = 800;
  const height = 250;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Créer le dégradé de fond
  let colors = GRADIENTS[gradient] || GRADIENTS.purple;
  if (Array.isArray(gradient) && gradient.length >= 2) {
    colors = gradient;
  }
  
  const grd = ctx.createLinearGradient(0, 0, width, height);
  grd.addColorStop(0, colors[0]);
  grd.addColorStop(1, colors[1]);
  
  // Fond avec coins arrondis
  roundRect(ctx, 0, 0, width, height, 20);
  ctx.fillStyle = grd;
  ctx.fill();

  // Ajouter un effet de vague/pattern subtil
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(0, height - 50 + i * 20);
    ctx.quadraticCurveTo(width / 4, height - 80 + i * 20, width / 2, height - 50 + i * 20);
    ctx.quadraticCurveTo(width * 3 / 4, height - 20 + i * 20, width, height - 50 + i * 20);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Charger et dessiner l'avatar avec bordure circulaire
  try {
    const avatar = await loadImage(avatarURL);
    const avatarSize = 130;
    const avatarX = 50;
    const avatarY = (height - avatarSize) / 2;

    // Ombre de l'avatar
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;

    // Bordure blanche de l'avatar
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Dessiner l'avatar en cercle
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

  } catch (err) {
    // Si l'avatar ne charge pas, dessiner un cercle par défaut
    const avatarSize = 130;
    const avatarX = 50;
    const avatarY = (height - avatarSize) / 2;
    
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
  }

  // Zone de texte
  const textX = 210;
  
  // Titre principal (Bienvenue / Au revoir)
  const defaultTitle = type === 'welcome' ? 'Bienvenue' : 'Au revoir';
  const displayTitle = title || defaultTitle;
  
  ctx.font = 'bold 42px Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.fillText(displayTitle, textX, 75);

  // Sous-titre (sur le serveur Discord / a quitté le serveur)
  const defaultSubtitle = type === 'welcome' ? 'sur le serveur Discord' : 'a quitté le serveur';
  const displaySubtitle = subtitle || defaultSubtitle;
  
  ctx.font = '22px Arial, sans-serif';
  ctx.shadowBlur = 3;
  ctx.fillText(displaySubtitle, textX, 110);

  // Nom du serveur (en italique)
  ctx.font = 'italic 28px Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(serverName, textX, 150);

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Nom d'utilisateur
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  
  let userDisplay = username;
  if (discriminator && discriminator !== '0') {
    userDisplay += `#${discriminator}`;
  }
  
  // Tronquer si trop long
  if (ctx.measureText(userDisplay).width > 350) {
    while (ctx.measureText(userDisplay + '...').width > 350 && userDisplay.length > 0) {
      userDisplay = userDisplay.slice(0, -1);
    }
    userDisplay += '...';
  }
  
  ctx.fillText(userDisplay, textX, 195);

  // Nombre de membres (optionnel)
  if (memberCount) {
    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    const memberText = type === 'welcome' 
      ? `Tu es le ${memberCount}ème membre !`
      : `Il reste ${memberCount} membres`;
    ctx.fillText(memberText, textX, 225);
  }

  return canvas.toBuffer('image/png');
}

/**
 * Dessine un rectangle aux coins arrondis
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Liste des dégradés disponibles pour le frontend
const availableGradients = Object.keys(GRADIENTS);

module.exports = { generateWelcomeImage, availableGradients, GRADIENTS };
