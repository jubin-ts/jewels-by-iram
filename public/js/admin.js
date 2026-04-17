// ===== Admin Panel JavaScript =====

document.addEventListener('DOMContentLoaded', function() {
  // Sidebar toggle for mobile
  var sidebarToggle = document.getElementById('sidebarToggle');
  var adminSidebar = document.getElementById('adminSidebar');

  if (sidebarToggle && adminSidebar) {
    sidebarToggle.addEventListener('click', function() {
      adminSidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
      if (window.innerWidth <= 768 && !adminSidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
        adminSidebar.classList.remove('open');
      }
    });
  }
});
