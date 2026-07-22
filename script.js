const gameLink = document.querySelector('a[href="#games"]');

gameLink?.addEventListener('click', () => {
  document.querySelector('#games')?.focus({ preventScroll: true });
});
