const economyForm = document.getElementById("economy-form");
const economyEnabled = document.getElementById("economy-enabled");
const currencyName = document.getElementById("economy-currency-name");
const currencySymbol = document.getElementById("economy-currency-symbol");
const startingBalance = document.getElementById("economy-starting-balance");
const dailyAmount = document.getElementById("economy-daily-amount");
const dailyCooldown = document.getElementById("economy-daily-cooldown");
const workMin = document.getElementById("economy-work-min");
const workMax = document.getElementById("economy-work-max");
const workCooldown = document.getElementById("economy-work-cooldown");
const crimeMin = document.getElementById("economy-crime-min");
const crimeMax = document.getElementById("economy-crime-max");
const crimeSuccess = document.getElementById("economy-crime-success");
const crimeFine = document.getElementById("economy-crime-fine");
const crimeCooldown = document.getElementById("economy-crime-cooldown");
const statusEconomyForm = document.getElementById("status-economy-form");

// Charger la config existante
fetch(`/api/bot/get-economy-config/${guildId}`)
  .then(res => res.json())
  .then(cfg => {
    economyEnabled.checked = cfg.enabled;
    currencyName.value = cfg.currencyName;
    currencySymbol.value = cfg.currencySymbol;
    startingBalance.value = cfg.startingBalance;
    dailyAmount.value = cfg.dailyAmount;
    dailyCooldown.value = cfg.dailyCooldownHours;
    workMin.value = cfg.workMinAmount;
    workMax.value = cfg.workMaxAmount;
    workCooldown.value = cfg.workCooldownMinutes;
    crimeMin.value = cfg.crimeMinAmount;
    crimeMax.value = cfg.crimeMaxAmount;
    crimeSuccess.value = cfg.crimeSuccessRate;
    crimeFine.value = cfg.crimeFinePercent;
    crimeCooldown.value = cfg.crimeCooldownMinutes;
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
      dailyAmount: parseInt(dailyAmount.value, 10),
      dailyCooldownHours: parseInt(dailyCooldown.value, 10),
      workMinAmount: parseInt(workMin.value, 10),
      workMaxAmount: parseInt(workMax.value, 10),
      workCooldownMinutes: parseInt(workCooldown.value, 10),
      crimeMinAmount: parseInt(crimeMin.value, 10),
      crimeMaxAmount: parseInt(crimeMax.value, 10),
      crimeSuccessRate: parseInt(crimeSuccess.value, 10),
      crimeFinePercent: parseInt(crimeFine.value, 10),
      crimeCooldownMinutes: parseInt(crimeCooldown.value, 10)
    })
  });

  statusEconomyForm.textContent = (await res.json()).success
    ? "Config économie sauvegardée ✅"
    : "Erreur ❌";
});
