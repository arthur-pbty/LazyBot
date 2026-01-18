const db = require('../db');

module.exports = {
  name: 'userUpdate',
  async execute(client, oldUser, newUser) {
    // Ignorer les bots
    if (newUser.bot) return;

    // Vérifier si le nom d'utilisateur ou le display name a changé
    const usernameChanged = oldUser.username !== newUser.username;
    const displayNameChanged = oldUser.displayName !== newUser.displayName;

    if (!usernameChanged && !displayNameChanged) return;

    // Enregistrer l'ancien nom dans l'historique
    try {
      // Vérifier si ce nom n'est pas déjà le dernier enregistré (éviter les doublons)
      const lastEntry = await db.getAsync(
        `SELECT username, display_name FROM username_history 
         WHERE user_id = ? 
         ORDER BY changed_at DESC LIMIT 1`,
        [oldUser.id]
      );

      // Si c'est le premier changement ou si le nom est différent du dernier enregistré
      if (!lastEntry || lastEntry.username !== oldUser.username || lastEntry.display_name !== oldUser.displayName) {
        db.run(
          `INSERT INTO username_history (user_id, username, display_name, changed_at)
           VALUES (?, ?, ?, ?)`,
          [oldUser.id, oldUser.username, oldUser.displayName, Math.floor(Date.now() / 1000)]
        );
      }
    } catch (err) {
      console.error('Erreur enregistrement historique nom:', err);
    }
  }
};
