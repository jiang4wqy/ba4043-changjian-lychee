'use strict';

// Brand opening: show once per tab; stored flag contains no form information.
const site = document.getElementById('site');
const intro = document.getElementById('intro');
const skip = document.getElementById('skip');
const replay = document.getElementById('replay');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let introTimer;
let exitTimer;
let returnFocus;

function finishIntro(animate = true) {
  clearTimeout(introTimer);
  clearTimeout(exitTimer);
  if (intro.hidden) return;
  const hideIntro = () => {
    intro.hidden = true;
    intro.classList.remove('leaving');
    site.inert = false;
    document.body.style.overflow = '';
    try { sessionStorage.setItem('changjian-intro-seen', 'yes'); } catch {}
    (returnFocus || document.getElementById('hero-title')).focus({ preventScroll: true });
  };
  if (animate && !reducedMotion.matches) {
    intro.classList.add('leaving');
    exitTimer = setTimeout(hideIntro, 620);
  } else hideIntro();
}

function playIntro() {
  if (reducedMotion.matches) return;
  clearTimeout(introTimer);
  clearTimeout(exitTimer);
  returnFocus = site.contains(document.activeElement) ? document.activeElement : document.getElementById('hero-title');
  intro.hidden = false;
  intro.classList.remove('leaving');
  site.inert = true;
  document.body.style.overflow = 'hidden';
  skip.focus({ preventScroll: true });
  introTimer = setTimeout(finishIntro, 4200);
}

function updateMotionPreference() {
  replay.disabled = reducedMotion.matches;
  replay.title = reducedMotion.matches ? '已遵循系统减少动态效果的设置' : '';
  if (reducedMotion.matches) finishIntro(false);
}
skip.addEventListener('click', () => finishIntro());
replay.hidden = false;
replay.addEventListener('click', playIntro);
reducedMotion.addEventListener('change', updateMotionPreference);
updateMotionPreference();
document.addEventListener('keydown', event => {
  if (!intro.hidden && event.key === 'Escape') finishIntro();
  if (!intro.hidden && event.key === 'Tab') { event.preventDefault(); skip.focus(); }
});

// Mobile navigation remains visible as ordinary links if JavaScript is disabled.
const menuToggle = document.getElementById('menu-toggle');
const nav = document.getElementById('main-nav');
document.documentElement.classList.add('menu-ready');
menuToggle.hidden = false;
function closeMenu() {
  nav.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
}
menuToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav.classList.contains('is-open')) { closeMenu(); menuToggle.focus(); }
});

// Four clipped image strips reveal the next photograph. Inspired by Codrops;
// the implementation uses native Web Animations, with immediate-change fallback.
const stage = document.getElementById('gallery-stage');
const slides = [...stage.querySelectorAll('.gallery-slide')];
const thumbs = [...document.querySelectorAll('[data-slide]')];
const caption = document.getElementById('gallery-caption');
let currentSlide = 0;
let switching = false;

async function showSlide(index) {
  if (switching || index === currentSlide) return;
  switching = true;
  const next = slides[index];
  const nextImage = next.querySelector('img');
  // Decode before revealing, so a slower device does not display empty strips.
  nextImage.loading = 'eager';
  try { await nextImage.decode(); } catch {}
  if (!reducedMotion.matches && typeof stage.animate === 'function') {
    const strips = Array.from({ length: 4 }, (_, part) => {
      const strip = document.createElement('div');
      strip.className = 'gallery-slice';
      strip.setAttribute('aria-hidden', 'true');
      strip.style.clipPath = `inset(0 ${75 - part * 25}% 0 ${part * 25}%)`;
      const image = nextImage.cloneNode();
      image.alt = '';
      strip.append(image);
      stage.append(strip);
      const animation = strip.animate([{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }], { duration: 440, delay: part * 45, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
      return { strip, animation };
    });
    await Promise.all(strips.map(({ animation }) => animation.finished));
    slides[currentSlide].hidden = true;
    next.hidden = false;
    strips.forEach(({ strip }) => strip.remove());
  } else {
    slides[currentSlide].hidden = true;
    next.hidden = false;
  }
  currentSlide = index;
  caption.textContent = next.dataset.caption;
  thumbs.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  switching = false;
}
document.getElementById('gallery-controls').hidden = false;
document.getElementById('gallery-thumbs').hidden = false;
document.getElementById('gallery-prev').addEventListener('click', () => showSlide((currentSlide + slides.length - 1) % slides.length));
document.getElementById('gallery-next').addEventListener('click', () => showSlide((currentSlide + 1) % slides.length));
thumbs.forEach(button => button.addEventListener('click', () => showSlide(Number(button.dataset.slide))));

const photoDialog = document.getElementById('photo-dialog');
const expand = document.getElementById('photo-expand');
if (typeof photoDialog.showModal === 'function') {
  expand.hidden = false;
  expand.addEventListener('click', () => {
    const slide = slides[currentSlide];
    const photo = document.getElementById('dialog-photo');
    photo.src = slide.querySelector('img').src;
    photo.alt = slide.dataset.alt;
    document.getElementById('dialog-title').textContent = slide.dataset.caption.split(' / ')[1];
    photoDialog.showModal();
  });
  document.getElementById('close-photo').addEventListener('click', () => photoDialog.close());
  photoDialog.addEventListener('click', event => {
    const box = photoDialog.getBoundingClientRect();
    if (event.target === photoDialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) photoDialog.close();
  });
}

// Demo enquiry: validate in memory, never send or persist the entered values.
const form = document.getElementById('enquiry-form');
const customerName = document.getElementById('customer-name');
const topic = document.getElementById('topic');
const contactMethod = document.getElementById('contact-method');
const contact = document.getElementById('contact');
const feedback = document.getElementById('form-feedback');
const validationFields = [customerName, topic, contact];
const errorElements = [document.getElementById('name-error'), document.getElementById('topic-error'), document.getElementById('contact-error')];

function errorMessage(field) {
  const value = field.value.trim();
  if (field === customerName) return value ? '' : '请填写称呼。';
  if (field === topic) return value ? '' : '请选择一个咨询主题。';
  if (!value) return contactMethod.value === 'email' ? '请填写邮箱地址。' : '请填写手机号码。';
  if (contactMethod.value === 'phone') return /^1[3-9]\d{9}$/.test(value) ? '' : '请输入有效的 11 位中国大陆手机号码。';
  return contact.validity.typeMismatch ? '请输入有效邮箱，例如 name@example.com。' : '';
}
function showFieldError(field, index, message) {
  field.setAttribute('aria-invalid', String(Boolean(message)));
  errorElements[index].textContent = message;
  errorElements[index].hidden = !message;
}
function updateContactMethod() {
  const email = contactMethod.value === 'email';
  contact.type = email ? 'email' : 'tel';
  contact.inputMode = email ? 'email' : 'tel';
  document.getElementById('contact-label').innerHTML = `${email ? '邮箱地址' : '手机号码'} <span>（必填）</span>`;
  document.getElementById('contact-help').textContent = email ? '请输入完整邮箱地址，例如 name@example.com。' : '请输入 11 位中国大陆手机号码。';
  contact.placeholder = email ? '例如：name@example.com' : '例如：13800138000';
  showFieldError(contact, 2, '');
}
contactMethod.addEventListener('change', () => { contact.value = ''; updateContactMethod(); feedback.hidden = true; });
form.addEventListener('input', () => {
  feedback.hidden = true;
  validationFields.forEach((field, i) => { if (field.getAttribute('aria-invalid') === 'true' && !errorMessage(field)) showFieldError(field, i, ''); });
});
form.addEventListener('submit', event => {
  event.preventDefault();
  let firstInvalid;
  validationFields.forEach((field, i) => {
    const message = errorMessage(field);
    showFieldError(field, i, message);
    if (message && !firstInvalid) firstInvalid = field;
  });
  feedback.hidden = false;
  feedback.classList.toggle('error', Boolean(firstInvalid));
  feedback.textContent = firstInvalid ? '请检查标出的必填信息，修改后再体验。' : '演示校验通过。填写的信息未提交、未保存，也未产生订单。正式咨询请使用经确认的联系方式。';
  if (firstInvalid) firstInvalid.focus();
});
form.addEventListener('reset', () => {
  // Reset default values first, then restore the phone label and validation state.
  setTimeout(() => {
    updateContactMethod();
    validationFields.forEach((field, i) => showFieldError(field, i, ''));
    feedback.hidden = true;
    customerName.focus({ preventScroll: true });
  }, 0);
});
document.querySelectorAll('[data-topic]').forEach(link => link.addEventListener('click', () => { topic.value = link.dataset.topic; showFieldError(topic, 1, ''); feedback.hidden = true; }));
const channelEnquiry = document.getElementById('channel-enquiry');
channelEnquiry.hidden = false;
channelEnquiry.addEventListener('click', () => { topic.value = '配送与购买渠道'; showFieldError(topic, 1, ''); feedback.hidden = true; topic.focus(); });
// Enable only after preventDefault is attached; without JS there is no submission.
document.getElementById('enquiry-fields').disabled = false;
let seen = false;
try { seen = sessionStorage.getItem('changjian-intro-seen') === 'yes'; } catch {}
if (!seen && !location.hash) playIntro();
