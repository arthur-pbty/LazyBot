const addCommand = require("../fonctions/addCommand");
const { EmbedBuilder } = require("discord.js");

module.exports = addCommand({
  name: "coinflip",
  description: "Lance une pièce (pile ou face).",
  aliases: ["cf", "flip", "piece"],
  permissions: [],
  botOwnerOnly: false,
  dm: true,
  scope: "global",

  slashOptions: [],

  executePrefix: async (client, message, args) => {
    const embed = createCoinflipEmbed(message.author);
    await message.reply({ embeds: [embed] });
  },

  executeSlash: async (client, interaction) => {
    const embed = createCoinflipEmbed(interaction.user);
    await interaction.reply({ embeds: [embed] });
  },
});

function createCoinflipEmbed(user) {
  const result = Math.random() < 0.5 ? "pile" : "face";
  const emoji = result === "pile" ? "🪙" : "💿";

  return new EmbedBuilder()
    .setColor(result === "pile" ? 0xFEE75C : 0x5865F2)
    .setTitle(`${emoji} Coinflip`)
    .setDescription(`La pièce est tombée sur **${result.toUpperCase()}** !`)
    .setFooter({ text: `Lancé par ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();
}
