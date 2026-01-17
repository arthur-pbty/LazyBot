const economyForm = document.getElementById("economy-form");
const economyEnabled = document.getElementById("economy-enabled");
const currencyName = document.getElementById("economy-currency-name");
const currencySymbol = document.getElementById("economy-currency-symbol");
const startingBalance = document.getElementById("economy-starting-balance");

// Daily
const dailyEnabled = document.getElementById("economy-daily-enabled");
const dailyAmount = document.getElementById("economy-daily-amount");
const dailyCooldown = document.getElementById("economy-daily-cooldown");

// Work
const workEnabled = document.getElementById("economy-work-enabled");
const workMin = document.getElementById("economy-work-min");
const workMax = document.getElementById("economy-work-max");
const workCooldown = document.getElementById("economy-work-cooldown");

// Crime
const crimeEnabled = document.getElementById("economy-crime-enabled");
const crimeMin = document.getElementById("economy-crime-min");
const crimeMax = document.getElementById("economy-crime-max");
const crimeSuccess = document.getElementById("economy-crime-success");
const crimeFine = document.getElementById("economy-crime-fine");
const crimeCooldown = document.getElementById("economy-crime-cooldown");

// Steal
const stealEnabled = document.getElementById("economy-steal-enabled");
const stealSuccess = document.getElementById("economy-steal-success");
const stealMaxPercent = document.getElementById("economy-steal-max-percent");
const stealFine = document.getElementById("economy-steal-fine");
const stealCooldown = document.getElementById("economy-steal-cooldown");

// Message Money
const messageMoneyEnabled = document.getElementById("economy-message-money-enabled");
const messageMoneyMin = document.getElementById("economy-message-money-min");
const messageMoneyMax = document.getElementById("economy-message-money-max");
const messageMoneyCooldown = document.getElementById("economy-message-money-cooldown");

// Voice Money
const voiceMoneyEnabled = document.getElementById("economy-voice-money-enabled");
const voiceMoneyMin = document.getElementById("economy-voice-money-min");
const voiceMoneyMax = document.getElementById("economy-voice-money-max");
const voiceMoneyInterval = document.getElementById("economy-voice-money-interval");

const statusEconomyForm = document.getElementById("status-economy-form");

// Charger la config existante
fetch(`/api/bot/get-economy-config/${guildId}`)
  .then(res => res.json())
  .then(cfg => {
    economyEnabled.checked = cfg.enabled;
    currencyName.value = cfg.currencyName;
    currencySymbol.value = cfg.currencySymbol;
    startingBalance.value = cfg.startingBalance;

    // Daily
    dailyEnabled.checked = cfg.dailyEnabled;
    dailyAmount.value = cfg.dailyAmount;
    dailyCooldown.value = cfg.dailyCooldownHours;

    // Work
    workEnabled.checked = cfg.workEnabled;
    workMin.value = cfg.workMinAmount;
    workMax.value = cfg.workMaxAmount;
    workCooldown.value = cfg.workCooldownMinutes;

    // Crime
    crimeEnabled.checked = cfg.crimeEnabled;
    crimeMin.value = cfg.crimeMinAmount;
    crimeMax.value = cfg.crimeMaxAmount;
    crimeSuccess.value = cfg.crimeSuccessRate;
    crimeFine.value = cfg.crimeFinePercent;
    crimeCooldown.value = cfg.crimeCooldownMinutes;

    // Steal
    stealEnabled.checked = cfg.stealEnabled;
    stealSuccess.value = cfg.stealSuccessRate;
    stealMaxPercent.value = cfg.stealMaxPercent;
    stealFine.value = cfg.stealFinePercent;
    stealCooldown.value = cfg.stealCooldownMinutes;

    // Message Money
    messageMoneyEnabled.checked = cfg.messageMoneyEnabled;
    messageMoneyMin.value = cfg.messageMoneyMin;
    messageMoneyMax.value = cfg.messageMoneyMax;
    messageMoneyCooldown.value = cfg.messageMoneyCooldownSeconds;

    // Voice Money
    voiceMoneyEnabled.checked = cfg.voiceMoneyEnabled;
    voiceMoneyMin.value = cfg.voiceMoneyMin;
    voiceMoneyMax.value = cfg.voiceMoneyMax;
    voiceMoneyInterval.value = cfg.voiceMoneyIntervalMinutes;
  })
  .catch(console.error);

// Sauvegarder la config
economyForm.addEventListener("submit", async e => {
  e.preventDefault();

  const res = await fetch("/api/bot/save-economy-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      guildId,
      economyEnabled: economyEnabled.checked,
      currencyName: currencyName.value,
      currencySymbol: currencySymbol.value,
      startingBalance: parseInt(startingBalance.value, 10),

      // Daily
      dailyEnabled: dailyEnabled.checked,
      dailyAmount: parseInt(dailyAmount.value, 10),
      dailyCooldownHours: parseInt(dailyCooldown.value, 10),

      // Work
      workEnabled: workEnabled.checked,
      workMinAmount: parseInt(workMin.value, 10),
      workMaxAmount: parseInt(workMax.value, 10),
      workCooldownMinutes: parseInt(workCooldown.value, 10),

      // Crime
      crimeEnabled: crimeEnabled.checked,
      crimeMinAmount: parseInt(crimeMin.value, 10),
      crimeMaxAmount: parseInt(crimeMax.value, 10),
      crimeSuccessRate: parseInt(crimeSuccess.value, 10),
      crimeFinePercent: parseInt(crimeFine.value, 10),
      crimeCooldownMinutes: parseInt(crimeCooldown.value, 10),

      // Steal
      stealEnabled: stealEnabled.checked,
      stealSuccessRate: parseInt(stealSuccess.value, 10),
      stealMaxPercent: parseInt(stealMaxPercent.value, 10),
      stealFinePercent: parseInt(stealFine.value, 10),
      stealCooldownMinutes: parseInt(stealCooldown.value, 10),

      // Message Money
      messageMoneyEnabled: messageMoneyEnabled.checked,
      messageMoneyMin: parseInt(messageMoneyMin.value, 10),
      messageMoneyMax: parseInt(messageMoneyMax.value, 10),
      messageMoneyCooldownSeconds: parseInt(messageMoneyCooldown.value, 10),

      // Voice Money
      voiceMoneyEnabled: voiceMoneyEnabled.checked,
      voiceMoneyMin: parseInt(voiceMoneyMin.value, 10),
      voiceMoneyMax: parseInt(voiceMoneyMax.value, 10),
      voiceMoneyIntervalMinutes: parseInt(voiceMoneyInterval.value, 10)
    })
  });

  statusEconomyForm.textContent = (await res.json()).success
    ? "Config économie sauvegardée ✅"
    : "Erreur ❌";
});
