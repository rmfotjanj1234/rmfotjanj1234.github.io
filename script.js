const gameLink = document.querySelector('a[href="#games"]');
const revealItems = document.querySelectorAll('[data-reveal]');

gameLink?.addEventListener('click', () => {
  document.querySelector('#games')?.focus({ preventScroll: true });
});

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver((entries, instance) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      instance.unobserve(entry.target);
    });
  }, { threshold: .16 });
  revealItems.forEach((item) => {
    item.classList.add('js-reveal');
    observer.observe(item);
  });
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}
