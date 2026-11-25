'use strict';

// Progressive enhancement: without this script the complete long page is readable.
const chapterMain = document.getElementById('main');
const chapters = [...chapterMain.querySelectorAll('[data-chapter]')];
const chapterNavigation = document.getElementById('chapter-navigation');
const chapterPrevious = document.getElementById('chapter-prev');
const chapterNext = document.getElementById('chapter-next');
const chapterCurtain = document.getElementById('chapter-curtain');
let activeChapter = -1;
let curtainAnimations = [];
let curtainRun = 0;

function revealChapter() {
  const run = ++curtainRun;
  curtainAnimations.forEach(animation => animation.cancel());
  curtainAnimations = [];
  chapterCurtain.hidden = true;
  if (reducedMotion.matches || typeof chapterCurtain.animate !== 'function') return;
  const box = chapterMain.getBoundingClientRect();
  chapterCurtain.style.top = `${box.top}px`;
  chapterCurtain.style.height = `${box.height}px`;
  chapterCurtain.hidden = false;
  curtainAnimations = [...chapterCurtain.children].map((piece, index) => piece.animate(
    [{ transform: 'translateY(0)' }, { transform: 'translateY(-101%)' }],
    { duration: 420, delay: index * 45, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }
  ));
  Promise.all(curtainAnimations.map(animation => animation.finished)).then(() => {
    if (run === curtainRun) chapterCurtain.hidden = true;
  }).catch(() => {}); // A newer navigation intentionally cancels the older reveal.
}

function openChapter(index, updateHistory = true) {
  closeMenu();
  const initial = activeChapter < 0;
  const chapter = chapters[index];
  const heading = document.getElementById(chapter.getAttribute('aria-labelledby'));
  if (index === activeChapter && !initial) {
    chapterMain.scrollTop = 0;
    if (!site.inert) heading.focus({ preventScroll: true });
    return;
  }
  chapters.forEach((section, i) => { section.hidden = i !== index; });
  activeChapter = index;
  chapterMain.scrollTop = 0;
  chapterPrevious.disabled = index === 0;
  const nextIndex = (index + 1) % chapters.length;
  chapterNext.childNodes[0].textContent = index === chapters.length - 1 ? '返回首幕 ' : '下一幕 ';
  document.getElementById('chapter-next-name').textContent = chapters[nextIndex].dataset.chapter;
  chapterNext.setAttribute('aria-label', `${index === chapters.length - 1 ? '返回首幕' : '下一幕'}：${chapters[nextIndex].dataset.chapter}`);
  document.getElementById('chapter-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')}`;
  document.getElementById('chapter-name').textContent = chapter.dataset.chapter;
  document.getElementById('chapter-fill').style.width = `${(index + 1) / chapters.length * 100}%`;
  nav.querySelectorAll('a').forEach(link => {
    if (link.hash === `#${chapter.id}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (updateHistory && location.hash !== `#${chapter.id}`) history.pushState(null, '', `#${chapter.id}`);
  if (!initial) {
    if (!site.inert) heading.focus({ preventScroll: true });
    revealChapter();
  }
}

function chapterFromHash() {
  const index = chapters.findIndex(chapter => `#${chapter.id}` === location.hash);
  return index < 0 ? 0 : index;
}

document.documentElement.classList.add('chapter-mode');
chapterNavigation.hidden = false;
openChapter(chapterFromHash(), false);
chapterPrevious.addEventListener('click', () => openChapter(activeChapter - 1));
chapterNext.addEventListener('click', () => openChapter((activeChapter + 1) % chapters.length));
site.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (link.hash === '#main') {
    event.preventDefault();
    chapterMain.focus({ preventScroll: true });
    return;
  }
  const index = link.hash === '#top' ? 0 : chapters.findIndex(chapter => `#${chapter.id}` === link.hash);
  if (index < 0) return;
  event.preventDefault();
  openChapter(index);
});
window.addEventListener('popstate', () => openChapter(chapterFromHash(), false));
window.addEventListener('hashchange', () => openChapter(chapterFromHash(), false));
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    ++curtainRun;
    curtainAnimations.forEach(animation => animation.cancel());
    chapterCurtain.hidden = true;
  }
});
