// Navigation sidebar avec hash routing

document.addEventListener('DOMContentLoaded', () => {
  const navItems = document.querySelectorAll('.nav-item[data-section]');
  const sections = document.querySelectorAll('.config-section');
  const sidebar = document.getElementById('sidebar');
  const mobileToggle = document.getElementById('mobile-toggle');

  // Fonction pour changer de section
  function showSection(sectionId) {
    // Masquer toutes les sections
    sections.forEach(section => {
      section.classList.remove('active');
    });

    // Retirer la classe active de tous les nav items
    navItems.forEach(item => {
      item.classList.remove('active');
    });

    // Afficher la section cible
    const targetSection = document.getElementById(`section-${sectionId}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Activer le nav item correspondant
    const targetNav = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
    if (targetNav) {
      targetNav.classList.add('active');
    }

    // Fermer la sidebar sur mobile
    if (window.innerWidth <= 900) {
      sidebar.classList.remove('open');
    }

    // Mettre à jour l'URL
    window.location.hash = sectionId;
  }

  // Ajouter les listeners sur les nav items
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = item.dataset.section;
      showSection(sectionId);
    });
  });

  // Gérer le hash au chargement de la page
  function handleHash() {
    const hash = window.location.hash.slice(1); // Enlever le #
    if (hash && document.getElementById(`section-${hash}`)) {
      showSection(hash);
    } else {
      // Par défaut, afficher la première section
      const firstNavItem = navItems[0];
      if (firstNavItem) {
        showSection(firstNavItem.dataset.section);
      }
    }
  }

  // Écouter les changements de hash
  window.addEventListener('hashchange', handleHash);

  // Charger la section initiale
  handleHash();

  // Toggle sidebar sur mobile
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Fermer la sidebar en cliquant à l'extérieur sur mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 900) {
      if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });
});

// Helper function pour afficher les messages de statut
window.showStatus = function(elementId, message, type = 'success') {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.className = `status-message show ${type}`;
    
    // Masquer après 5 secondes
    setTimeout(() => {
      element.classList.remove('show');
    }, 5000);
  }
};
