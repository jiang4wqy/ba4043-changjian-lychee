const stage = document.querySelector('#stage');
const scenes = [...stage.querySelectorAll('.scene')];
const optionButtons = [...document.querySelectorAll('[data-option]')].filter(el => el.tagName === 'BUTTON');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const notes = {
  a: ['荔影新国风', '浅青底色、枝叶线描、错位宋体与朱红小印。鲜果像画中的一扇圆窗，点击后从圆窗展开到礼盒一幕。', 'https://tympanus.net/codrops/2023/03/14/fullscreen-clip-animation/', 'Codrops / 形状裁切'],
  b: ['山野沉浸影像', '深松绿与整幅鲜果实拍，文字像片头字幕。转场时整幅照片收拢到下一幕的展示框，再出现礼盒细节与文案。', 'https://tympanus.net/codrops/2022/08/03/large-image-to-content-page-transition/', 'Codrops / 大图进入内容'],
  c: ['青绿当代画册', '明亮青绿、超大黑体与严格分栏，图片嵌在标题中间。点击后图片扩展，横向展开下一页画册，再带出标题与说明。', 'https://tympanus.net/codrops/2024/04/02/on-scroll-expanding-image-animation-within-typography/', 'Codrops / 图片与字体联动']
};
let current = scenes[0];
let animations = [];
let transitionPhoto;
let run = 0;

function cancelMotion() {
  animations.forEach(animation => animation.cancel());
  animations = [];
  transitionPhoto?.remove();
  transitionPhoto = null;
}

function animate(element, frames, options) {
  const animation = element.animate(frames, options);
  animations.push(animation);
  return animation.finished.catch(() => {});
}

async function showScene(option, sceneName, playMotion = true, updateHistory = true, focus = true) {
  const target = scenes.find(scene => scene.dataset.option === option && scene.dataset.scene === sceneName);
  if (!target || target === current) return;
  const old = current;
  const sameOption = old.dataset.option === option;
  const sourcePhoto = old.querySelector('.photo');
  const sourceBounds = sourcePhoto.getBoundingClientRect();
  const stageBounds = stage.getBoundingClientRect();
  const sourceRadius = getComputedStyle(sourcePhoto).borderRadius;
  const sourceImage = sourcePhoto.querySelector('img');
  const token = ++run;
  cancelMotion();
  old.hidden = true;
  target.hidden = false;
  current = target;
  stage.className = `stage concept-${option}`;
  optionButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.option === option)));
  document.querySelector('.brand').href = `#${option}-home`;
  stage.querySelectorAll('.chapter-nav a').forEach(link => {
    link.href = `#${option}-${link.dataset.scene}`;
    if (link.dataset.scene === sceneName) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.querySelector('#option-letter').textContent = option.toUpperCase();
  document.querySelector('#note-title').textContent = notes[option][0];
  document.querySelector('#note-description').textContent = notes[option][1];
  const referenceLink = document.querySelector('#reference-link');
  referenceLink.href = notes[option][2];
  referenceLink.textContent = notes[option][3];
  if (updateHistory) history.pushState(null, '', `#${option}-${sceneName}`);

  if (playMotion && sameOption && !reducedMotion.matches && target.animate) {
    const dest = target.querySelector('.photo').getBoundingClientRect();
    const clone = document.createElement('div');
    clone.className = 'transition-photo';
    clone.setAttribute('aria-hidden', 'true');
    clone.style.cssText = `left:${sourceBounds.left - stageBounds.left}px;top:${sourceBounds.top - stageBounds.top}px;width:${sourceBounds.width}px;height:${sourceBounds.height}px;border-radius:${sourceRadius};`;
    const img = sourceImage.cloneNode();
    img.alt = '';
    img.style.objectPosition = getComputedStyle(sourceImage).objectPosition;
    clone.append(img);
    stage.append(clone);
    transitionPhoto = clone;
    const work = [];
    const ease = 'cubic-bezier(.22,.8,.22,1)';
    if (option === 'a') {
      const x = sourceBounds.left - stageBounds.left + sourceBounds.width / 2;
      const y = sourceBounds.top - stageBounds.top + sourceBounds.height / 2;
      clone.style.transformOrigin = 'center';
      work.push(animate(clone, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(3.5)', opacity: .9, offset: .55 }, { transform: 'scale(4)', opacity: 0 }], { duration: 820, easing: ease }));
      work.push(animate(target, [{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(180% at ${x}px ${y}px)` }], { duration: 820, easing: ease }));
    } else {
      const dx = dest.left - sourceBounds.left;
      const dy = dest.top - sourceBounds.top;
      const sx = dest.width / sourceBounds.width;
      const sy = dest.height / sourceBounds.height;
      work.push(animate(clone, [{ transform: 'translate(0,0) scale(1,1)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, opacity: 1, offset: .72 }, { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, opacity: 0 }], { duration: 850, easing: ease }));
      if (option === 'c') work.push(animate(target, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], { duration: 650, easing: ease }));
      const text = target.querySelector('.copy');
      work.push(animate(text, [{ opacity: 0, transform: 'translateY(25px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 400, delay: 350, easing: ease, fill: 'backwards' }));
    }
    await Promise.all(work);
    if (token !== run) return;
    cancelMotion();
  }
  if (focus) target.querySelector('h1, h2').focus({ preventScroll: true });
}

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-option]');
  if (button) {
    showScene(button.dataset.option, 'home', false, true, false);
    return;
  }
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const match = link.hash.match(/^#([abc])-(home|gift)$/);
  if (!match) return;
  event.preventDefault();
  showScene(match[1], match[2]);
});

function restoreHash() {
  const match = location.hash.match(/^#([abc])-(home|gift)$/);
  showScene(match?.[1] || 'a', match?.[2] || 'home', false, false, false);
}
window.addEventListener('popstate', restoreHash);
window.addEventListener('hashchange', restoreHash);
reducedMotion.addEventListener('change', () => { ++run; cancelMotion(); });
restoreHash();
