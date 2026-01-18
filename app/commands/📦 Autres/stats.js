const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const addCommand = require("../../fonctions/addCommand");
const db = require("../../db");
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

// Créer le renderer de graphique
const chartRenderer = new ChartJSNodeCanvas({ 
  width: 800, 
  height: 400,
  backgroundColour: '#2f3136'
});

// Fonction pour générer le buffer du graphique
async function generateChartBuffer(labels, messagesData, voiceData, title) {
  const configuration = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Messages',
          data: messagesData,
          backgroundColor: '#5865F2',
          borderColor: '#5865F2',
          yAxisID: 'y'
        },
        {
          label: 'Heures vocal',
          data: voiceData,
          backgroundColor: '#57F287',
          borderColor: '#57F287',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: false,
      plugins: {
        title: { 
          display: true, 
          text: title, 
          color: '#ffffff',
          font: { size: 18 }
        },
        legend: { 
          labels: { color: '#ffffff', font: { size: 12 } } 
        }
      },
      scales: {
        x: { 
          ticks: { color: '#ffffff' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        y: {
          position: 'left',
          title: { display: true, text: 'Messages', color: '#5865F2' },
          ticks: { color: '#5865F2' },
          grid: { color: 'rgba(255,255,255,0.1)' },
          beginAtZero: true
        },
        y1: {
          position: 'right',
          title: { display: true, text: 'Heures', color: '#57F287' },
          ticks: { color: '#57F287' },
          grid: { drawOnChartArea: false },
          beginAtZero: true
        }
      }
    }
  };

  try {
    const buffer = await chartRenderer.renderToBuffer(configuration);
    return buffer;
  } catch (err) {
    console.error('Erreur génération graphique:', err);
    return null;
  }
}

// Fonction pour obtenir les dates selon la période
function getDateRange(period) {
  const now = new Date();
  let startDate;
  let labels = [];
  let groupBy = 'day';

  switch (period) {
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      // Labels pour les 7 derniers jours
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        labels.push(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));
      }
      break;
    case 'month':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 29);
      groupBy = 'week';
      labels = ['Sem. 4', 'Sem. 3', 'Sem. 2', 'Sem. 1'];
      break;
    case 'year':
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      groupBy = 'month';
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(now.getMonth() - i);
        labels.push(d.toLocaleDateString('fr-FR', { month: 'short' }));
      }
      break;
    case 'all':
    default:
      startDate = new Date(2020, 0, 1); // Depuis le début
      groupBy = 'month';
      // On génère les labels dynamiquement pour "all"
      labels = [];
      break;
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    labels,
    groupBy,
    period
  };
}

// Fonction pour formater le temps en heures et minutes
function formatVoiceTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

async function executeStats(context, isSlash) {
  const guild = context.guild;
  const targetUser = isSlash 
    ? (context.options.getUser('utilisateur') || context.user)
    : (context.mentions.users.first() || context.author);
  const period = isSlash 
    ? (context.options.getString('periode') || 'week')
    : 'week';

  const { startDate, labels, groupBy, period: selectedPeriod } = getDateRange(period);

  // Récupérer les stats de l'utilisateur
  const stats = await db.allAsync(
    `SELECT stat_type, value, date FROM user_activity_stats 
     WHERE guild_id = ? AND user_id = ? AND date >= ?
     ORDER BY date ASC`,
    [guild.id, targetUser.id, startDate]
  );

  // Calculer les totaux
  let totalMessages = 0;
  let totalVoiceSeconds = 0;
  const messagesByDate = {};
  const voiceByDate = {};

  stats.forEach(stat => {
    if (stat.stat_type === 'messages') {
      totalMessages += stat.value;
      messagesByDate[stat.date] = (messagesByDate[stat.date] || 0) + stat.value;
    } else if (stat.stat_type === 'voice_time') {
      totalVoiceSeconds += stat.value;
      voiceByDate[stat.date] = (voiceByDate[stat.date] || 0) + stat.value;
    }
  });

  // Préparer les données pour le graphique
  let chartLabels = labels;
  let messagesData = [];
  let voiceData = [];

  if (selectedPeriod === 'week') {
    // Données journalières pour la semaine
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      messagesData.push(messagesByDate[dateStr] || 0);
      voiceData.push(Math.round(((voiceByDate[dateStr] || 0) / 3600) * 10) / 10); // En heures
    }
  } else if (selectedPeriod === 'month') {
    // Données par semaine pour le mois
    const now = new Date();
    for (let week = 3; week >= 0; week--) {
      let weekMessages = 0;
      let weekVoice = 0;
      for (let day = 0; day < 7; day++) {
        const d = new Date(now);
        d.setDate(now.getDate() - (week * 7 + day));
        const dateStr = d.toISOString().split('T')[0];
        weekMessages += messagesByDate[dateStr] || 0;
        weekVoice += voiceByDate[dateStr] || 0;
      }
      messagesData.push(weekMessages);
      voiceData.push(Math.round((weekVoice / 3600) * 10) / 10);
    }
  } else if (selectedPeriod === 'year') {
    // Données par mois pour l'année
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const targetMonth = new Date(now);
      targetMonth.setMonth(now.getMonth() - i);
      const year = targetMonth.getFullYear();
      const month = targetMonth.getMonth();
      
      let monthMessages = 0;
      let monthVoice = 0;
      
      Object.entries(messagesByDate).forEach(([date, value]) => {
        const d = new Date(date);
        if (d.getFullYear() === year && d.getMonth() === month) {
          monthMessages += value;
        }
      });
      
      Object.entries(voiceByDate).forEach(([date, value]) => {
        const d = new Date(date);
        if (d.getFullYear() === year && d.getMonth() === month) {
          monthVoice += value;
        }
      });
      
      messagesData.push(monthMessages);
      voiceData.push(Math.round((monthVoice / 3600) * 10) / 10);
    }
  } else {
    // "all" - Tout depuis le début, groupé par mois
    const allDates = [...new Set([...Object.keys(messagesByDate), ...Object.keys(voiceByDate)])].sort();
    if (allDates.length > 0) {
      const firstDate = new Date(allDates[0]);
      const lastDate = new Date();
      
      chartLabels = [];
      const current = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
      
      while (current <= lastDate) {
        const year = current.getFullYear();
        const month = current.getMonth();
        chartLabels.push(current.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }));
        
        let monthMessages = 0;
        let monthVoice = 0;
        
        Object.entries(messagesByDate).forEach(([date, value]) => {
          const d = new Date(date);
          if (d.getFullYear() === year && d.getMonth() === month) {
            monthMessages += value;
          }
        });
        
        Object.entries(voiceByDate).forEach(([date, value]) => {
          const d = new Date(date);
          if (d.getFullYear() === year && d.getMonth() === month) {
            monthVoice += value;
          }
        });
        
        messagesData.push(monthMessages);
        voiceData.push(Math.round((monthVoice / 3600) * 10) / 10);
        
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      chartLabels = ['Aucune donnée'];
      messagesData = [0];
      voiceData = [0];
    }
  }

  // Limiter à 12 labels max pour le graphique
  if (chartLabels.length > 12) {
    const step = Math.ceil(chartLabels.length / 12);
    chartLabels = chartLabels.filter((_, i) => i % step === 0);
    messagesData = messagesData.filter((_, i) => i % step === 0);
    voiceData = voiceData.filter((_, i) => i % step === 0);
  }

  const periodNames = {
    'week': 'cette semaine',
    'month': 'ce mois',
    'year': 'cette année',
    'all': 'depuis le début'
  };

  const chartTitle = `Statistiques de ${targetUser.username} - ${periodNames[selectedPeriod]}`;
  const chartBuffer = await generateChartBuffer(chartLabels, messagesData, voiceData, chartTitle);

  // Calculer le rang sur le serveur
  const allUsersMessages = await db.allAsync(
    `SELECT user_id, SUM(value) as total FROM user_activity_stats 
     WHERE guild_id = ? AND stat_type = 'messages' AND date >= ?
     GROUP BY user_id ORDER BY total DESC`,
    [guild.id, startDate]
  );

  const allUsersVoice = await db.allAsync(
    `SELECT user_id, SUM(value) as total FROM user_activity_stats 
     WHERE guild_id = ? AND stat_type = 'voice_time' AND date >= ?
     GROUP BY user_id ORDER BY total DESC`,
    [guild.id, startDate]
  );

  const messageRank = allUsersMessages.findIndex(u => u.user_id === targetUser.id) + 1 || '-';
  const voiceRank = allUsersVoice.findIndex(u => u.user_id === targetUser.id) + 1 || '-';

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({
      name: `📊 Statistiques de ${targetUser.username}`,
      iconURL: targetUser.displayAvatarURL({ dynamic: true })
    })
    .setDescription(`Statistiques d'activité **${periodNames[selectedPeriod]}**`)
    .addFields(
      {
        name: '💬 Messages',
        value: `**${totalMessages.toLocaleString('fr-FR')}** messages\n🏆 Rang: #${messageRank}`,
        inline: true
      },
      {
        name: '🎤 Temps vocal',
        value: `**${formatVoiceTime(totalVoiceSeconds)}**\n🏆 Rang: #${voiceRank}`,
        inline: true
      }
    )
    .setFooter({ text: `Serveur: ${guild.name}` })
    .setTimestamp();

  // Créer l'attachment et ajouter l'image à l'embed
  const files = [];
  if (chartBuffer) {
    const attachment = new AttachmentBuilder(chartBuffer, { name: 'stats.png' });
    files.push(attachment);
    embed.setImage('attachment://stats.png');
  }

  if (isSlash) {
    await context.reply({ embeds: [embed], files });
  } else {
    await context.channel.send({ embeds: [embed], files });
  }
}

module.exports = addCommand({
  name: "stats",
  description: "Affiche les statistiques d'activité d'un utilisateur",
  slashOptions: [
    {
      name: "utilisateur",
      description: "L'utilisateur dont vous voulez voir les stats",
      type: "USER",
      required: false
    },
    {
      name: "periode",
      description: "La période à afficher",
      type: "STRING",
      required: false,
      choices: [
        { name: "📅 Cette semaine", value: "week" },
        { name: "📆 Ce mois", value: "month" },
        { name: "🗓️ Cette année", value: "year" },
        { name: "♾️ Depuis le début", value: "all" }
      ]
    }
  ],
  executeSlash: async (client, interaction) => {
    await executeStats(interaction, true);
  },
  executePrefix: async (client, message, args) => {
    await executeStats(message, false);
  }
});
