function initializeServicesDropdowns() {
    const menus = document.querySelectorAll('div[role="menu"]');

    if (!menus.length) return;

    const style = document.createElement('style');
    style.textContent = `
        .services-dropdown-menu {
            display: none !important;
            width: 16rem;
        }
        .services-dropdown:hover > .services-dropdown-menu,
        .services-dropdown:focus-within > .services-dropdown-menu {
            display: block !important;
        }
    `;
    document.head.appendChild(style);

    menus.forEach(menu => {
        menu.classList.add('services-dropdown-menu');
        if (menu.parentElement) menu.parentElement.classList.add('services-dropdown');
    });
}

function toggleServicesMenu() {
    const menu = document.getElementById('mobileServicesMenu');
    const button = document.getElementById('mobileServicesToggle');

    if (!menu || !button) return;

    const isOpen = menu.classList.toggle('hidden') === false;
    button.setAttribute('aria-expanded', String(isOpen));
}

initializeServicesDropdowns();

function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const hamburger = document.getElementById('hamburgerIcon');
    const close = document.getElementById('closeIcon');

    if (!menu || !hamburger || !close) return;

    const isOpening = menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    hamburger.classList.toggle('hidden');
    close.classList.toggle('hidden');

    if (!isOpening) {
        const servicesMenu = document.getElementById('mobileServicesMenu');
        const servicesButton = document.getElementById('mobileServicesToggle');

        if (servicesMenu && servicesButton) {
            servicesMenu.classList.add('hidden');
            servicesButton.setAttribute('aria-expanded', 'false');
        }
    }
}
