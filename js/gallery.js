// Lightbox para la galería de fotos
document.addEventListener('DOMContentLoaded', () => {
  const frames = Array.from(document.querySelectorAll('#gallery .photo-frame'));
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  let current = 0;

  function show(index) {
    current = (index + frames.length) % frames.length;
    const frame = frames[current];
    const img = frame.querySelector('img');
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = frame.dataset.caption || img.alt;
    lightbox.classList.add('open');
  }

  frames.forEach((frame, i) => frame.addEventListener('click', () => show(i)));

  document.getElementById('lightboxClose').addEventListener('click', () => lightbox.classList.remove('open'));
  document.getElementById('lightboxPrev').addEventListener('click', () => show(current - 1));
  document.getElementById('lightboxNext').addEventListener('click', () => show(current + 1));

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.classList.remove('open');
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') lightbox.classList.remove('open');
    if (e.key === 'ArrowRight') show(current + 1);
    if (e.key === 'ArrowLeft') show(current - 1);
  });
});
