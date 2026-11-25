'use strict';

// Progressive enhancement: without this script the complete long page is readable.
const chapterMain = document.getElementById('main');
const chapters = [...chapterMain.querySelectorAll('[data-chapter]')];
const chapterNavigation = document.getElementById('chapter-navigation');
const chapterCurtain = document.getElementById('chapter-curtain');
const chapterWindow = chapterCurtain.querySelector('.chapter-window');
const chapterWindowImage = document.getElementById('chapter-window-image');
const chapterWindowWord = document.getElementById('chapter-window-word');
let activeChapter = -1;
let curtainAnimations = [];
let curtainRun = 0;

function cancelChapterReveal() {
  ++curtainRun;
  curtainAnimations.forEach(animation => animation.cancel());
  curtainAnimations = [];
  chapterCurtain.hidden = true;
}

function chapterImage(section) {
  const image = section?.querySelector('.gallery-slide:not([hidden]) img, .hero-photo img, .product-photo img, .orchard-photo img');
  if (!image) return null;
  const box = image.getBoundingClientRect();
  const viewport = chapterMain.getBoundingClientRect();
  if (box.bottom < viewport.top + 40 || box.top > viewport.bottom - 40) return null;
  return { src: image.currentSrc || image.src, box, position: getComputedStyle(image).objectPosition };
}

function revealChapter(image, word) {
  cancelChapterReveal();
  const run = ++curtainRun;
  if (reducedMotion.matches || typeof chapterMain.animate !== 'function') return;
  const box = chapterMain.getBoundingClientRect();
  const x = image ? Math.max(40, Math.min(box.width - 40, image.box.left - box.left + image.box.width / 2)) : box.width * .65;
  const y = image ? Math.max(40, Math.min(box.height - 40, image.box.top - box.top + image.box.height / 2)) : box.height * .45;
  const radius = Math.min(image ? Math.min(image.box.width, image.box.height) / 2 : 90, box.width * .4, box.height * .4);
  chapterCurtain.style.top = `${box.top}px`;
  chapterCurtain.style.height = `${box.height}px`;
  chapterWindow.style.cssText = `left:${box.left + x - radius}px;top:${y - radius}px;width:${radius * 2}px;height:${radius * 2}px;`;
  chapterWindowImage.hidden = !image;
  chapterWindowWord.hidden = Boolean(image);
  if (image) {
    chapterWindowImage.src = image.src;
    chapterWindowImage.style.objectPosition = image.position;
  } else chapterWindowWord.textContent = word;
  chapterCurtain.hidden = false;
  const size = Math.hypot(box.width, box.height);
  const timing = { duration: 760, easing: 'cubic-bezier(.22,.8,.22,1)', fill: 'both' };
  curtainAnimations = [
    chapterMain.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${size}px at ${x}px ${y}px)` }], timing),
    chapterWindow.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: `scale(${size / radius * .7})`, opacity: .8, offset: .6 }, { transform: `scale(${size / radius})`, opacity: 0 }], timing)
  ];
  Promise.all(curtainAnimations.map(animation => animation.finished)).then(() => {
    if (run === curtainRun) cancelChapterReveal();
  }).catch(() => {}); // A newer navigation intentionally cancels the older reveal.
}

function openChapter(target, updateHistory = true) {
  closeMenu();
  const initial = activeChapter < 0;
  const chapter = target.closest('[data-chapter]');
  const index = chapters.indexOf(chapter);
  const changed = index !== activeChapter;
  const outgoingImage = changed ? chapterImage(chapters[activeChapter]) : null;
  if (changed) {
    chapters.forEach((section, i) => { section.hidden = i !== index; });
    activeChapter = index;
    if (chapter.id === 'gift' || chapter.id === 'enquiry') recordSiteEvent(chapter.id + '_view');
    document.getElementById('chapter-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')}`;
    document.getElementById('chapter-name').textContent = chapter.dataset.chapter;
    site.querySelectorAll('#main-nav a, .chapter-rail a').forEach(link => {
      if (link.hash === `#${chapter.id}`) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  const question = target.closest('details');
  const heading = question ? question.querySelector('summary') : document.getElementById(chapter.getAttribute('aria-labelledby'));
  if (question) {
    question.open = true;
    heading.scrollIntoView({ block: 'start', behavior: 'instant' });
  } else {
    chapterMain.scrollTop = 0;
  }
  if (updateHistory && location.hash !== `#${target.id}`) history.pushState(null, '', `#${target.id}`);
  if ((!initial || question) && !site.inert) heading.focus({ preventScroll: true });
  if (!initial && changed) revealChapter(outgoingImage, chapter.querySelector('.chapter-glyph').textContent);
}

function targetFromHash(hash) {
  if (hash === '#top') return chapters[0];
  const target = document.getElementById(hash.slice(1));
  return target?.matches('[data-chapter], .faq-answer[id]') ? target : null;
}

function restoreChapter() {
  openChapter(targetFromHash(location.hash) || chapters[0], false);
}

document.documentElement.classList.add('chapter-mode');
chapterNavigation.hidden = false;
restoreChapter();
site.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (link.hash === '#main') {
    event.preventDefault();
    chapterMain.focus({ preventScroll: true });
    return;
  }
  const target = targetFromHash(link.hash);
  if (!target) return;
  event.preventDefault();
  openChapter(target);
});
window.addEventListener('popstate', restoreChapter);
window.addEventListener('hashchange', restoreChapter);
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    cancelChapterReveal();
  }
});
