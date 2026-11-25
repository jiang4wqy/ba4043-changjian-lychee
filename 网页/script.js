'use strict';

function recordSiteEvent(event) {
  if (!['http:', 'https:'].includes(location.protocol)) return;
  fetch('api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    credentials: 'omit', keepalive: true, body: JSON.stringify({ event }) }).catch(() => {});
}
recordSiteEvent('page_view');

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
    recordSiteEvent('gallery_open');
  });
  document.getElementById('close-photo').addEventListener('click', () => photoDialog.close());
  photoDialog.addEventListener('click', event => {
    const box = photoDialog.getBoundingClientRect();
    if (event.target === photoDialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) photoDialog.close();
  });
}

// Gift occasions guide the question, without claiming particular stock or prices.
const occasions = {
  visit: { title: '见面有礼，一起尝鲜。', detail: '红色提手方便携带，见面便可开盒分享。', topic: '礼盒规格', draft: '想挑一盒荔枝探访亲友，请问当季有哪些礼盒可订？' },
  thanks: { title: '以一盒荔香，表达感谢。', detail: '绿盒红提手，一份夏日时令礼。', topic: '礼盒规格', draft: '想订礼盒送人，请问当季价格和包装？' },
  share: { title: '一家围坐，共尝时令。', detail: '家宴装盛放五斤鲜荔，席间与亲友共尝。', topic: '当季供应', draft: '想订家宴装与家人分享，请问有现货吗？' }
};
document.querySelector('.occasion-buttons').hidden = false;
document.querySelectorAll('[data-occasion]').forEach(button => button.addEventListener('click', () => {
  const choice = occasions[button.dataset.occasion];
  document.querySelectorAll('[data-occasion]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  document.getElementById('occasion-title').textContent = choice.title;
  document.getElementById('occasion-detail').textContent = choice.detail;
  const link = document.getElementById('occasion-enquiry');
  link.dataset.topic = choice.topic;
  link.dataset.draft = choice.draft;
}));

const pickupDate = document.getElementById('pickup-date');
const arrivalDate = document.getElementById('arrival-date');
const arrivalWindow = document.getElementById('arrival-window');
const dateFormat = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const monthDayFormat = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', timeZone: 'UTC' });
function updateArrivalDate() {
  const day = 24 * 60 * 60 * 1000;
  const nextDay = new Date(pickupDate.valueAsNumber + day);
  const secondDay = new Date(pickupDate.valueAsNumber + 2 * day);
  if (Number.isNaN(secondDay.getTime())) {
    arrivalDate.value = arrivalWindow.value = '—';
    return;
  }
  arrivalDate.value = dateFormat.format(nextDay);
  const endFormat = nextDay.getUTCFullYear() === secondDay.getUTCFullYear() ? monthDayFormat : dateFormat;
  arrivalWindow.value = arrivalDate.value + ' 至 ' + endFormat.format(secondDay);
}
pickupDate.addEventListener('input', updateArrivalDate);
pickupDate.addEventListener('change', () => recordSiteEvent('date_change'));
document.getElementById('delivery').closest('details').addEventListener('toggle', event => {
  if (event.currentTarget.open) recordSiteEvent('delivery_open');
});
updateArrivalDate();
document.getElementById('delivery-dates').hidden = false;

// Online enquiries are saved by the server. Static pages prepare a message for WeChat.
const form = document.getElementById('enquiry-form');
const customerName = document.getElementById('customer-name');
const topic = document.getElementById('topic');
const contactMethod = document.getElementById('contact-method');
const contact = document.getElementById('contact');
const messageInput = document.getElementById('message');
const consent = document.getElementById('consent');
const feedback = document.getElementById('form-feedback');
const fields = document.getElementById('enquiry-fields');
const submitButton = document.getElementById('enquiry-submit');
const retryConnection = document.getElementById('retry-connection');
const serviceStatus = document.getElementById('service-status');
const validationFields = [customerName, topic, contact, messageInput, consent];
const errorElements = ['name-error', 'topic-error', 'contact-error', 'message-error', 'consent-error'].map(id => document.getElementById(id));
let enquiryMode = 'connecting';
let csrfToken = '';
let submitting = false;

function resetSubmitButton() {
  submitButton.textContent = enquiryMode === 'draft' ? '复制咨询内容' : '提交咨询 →';
  submitButton.disabled = false;
}

async function connectService() {
  enquiryMode = 'connecting';
  fields.disabled = true;
  retryConnection.hidden = true;
  serviceStatus.textContent = '正在连接…';
  try {
    if (location.protocol === 'file:') enquiryMode = 'draft';
    else {
      const response = await fetch('api/session', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (response.status === 404) enquiryMode = 'draft';
      else {
        if (!response.ok) throw new Error('Session unavailable');
        const data = await response.json();
        if (data.mode !== 'stored' || typeof data.csrf_token !== 'string') throw new Error('Invalid session');
        csrfToken = data.csrf_token;
        enquiryMode = 'stored';
      }
    }
    const stored = enquiryMode === 'stored';
    form.querySelectorAll('[data-reply-field]').forEach(group => {
      group.hidden = !stored;
      group.querySelector('input, select').disabled = !stored;
    });
    document.getElementById('consent-field').hidden = !stored;
    consent.disabled = !stored;
    serviceStatus.textContent = stored ? '在线留言' : '微信咨询';
    resetSubmitButton();
    fields.disabled = false;
  } catch {
    enquiryMode = 'unavailable';
    serviceStatus.textContent = '在线留言暂不可用，请稍后重试或通过电话、微信联系。';
    retryConnection.hidden = false;
  }
}
retryConnection.addEventListener('click', connectService);

function errorMessage(field) {
  if (field.disabled) return '';
  if (field === consent) return enquiryMode === 'stored' && !consent.checked ? '请确认同意保存本次咨询信息。' : '';
  const value = field.value.trim();
  if (field === messageInput) return value.length > 300 ? '咨询内容不能超过 300 字。' : '';
  if (field === customerName) return !value ? '请填写称呼。' : value.length > 50 ? '称呼不能超过 50 字。' : '';
  if (field === topic) return value ? '' : '请选择一个咨询主题。';
  if (!value) return contactMethod.value === 'email' ? '请填写邮箱地址。' : '请填写手机号码。';
  if (contactMethod.value === 'phone') return /^1[3-9]\d{9}$/.test(value) ? '' : '请输入有效的 11 位中国大陆手机号码。';
  return contact.validity.typeMismatch ? '请输入有效的邮箱地址。' : '';
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
  showFieldError(contact, 2, '');
}
contactMethod.addEventListener('change', () => { contact.value = ''; updateContactMethod(); feedback.hidden = true; });
form.addEventListener('input', () => {
  feedback.hidden = true;
  if (!submitting) resetSubmitButton();
  validationFields.forEach((field, i) => { if (field.getAttribute('aria-invalid') === 'true' && !errorMessage(field)) showFieldError(field, i, ''); });
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting || !['stored', 'draft'].includes(enquiryMode)) return;
  let firstInvalid;
  validationFields.forEach((field, i) => {
    const message = errorMessage(field);
    showFieldError(field, i, message);
    if (message && !firstInvalid) firstInvalid = field;
  });
  feedback.hidden = false;
  feedback.classList.toggle('error', Boolean(firstInvalid));
  if (firstInvalid) {
    feedback.textContent = '请补全标出的信息。';
    firstInvalid.focus();
    return;
  }
  if (enquiryMode === 'draft') {
    const draft = ['礼盒咨询 · ' + topic.value, messageInput.value.trim()].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(draft);
      feedback.textContent = '已复制，可粘贴到微信发送。';
    } catch {
      feedback.textContent = '可选中下方文字复制到微信\n' + draft;
    }
    feedback.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    return;
  }
  const payload = { customer_name: customerName.value.trim(), topic: topic.value, contact_method: contactMethod.value, contact: contact.value.trim(), message: messageInput.value.trim(), consent: consent.checked };
  submitting = true;
  fields.disabled = true;
  form.setAttribute('aria-busy', 'true');
  submitButton.textContent = '正在保存…';
  feedback.textContent = '正在提交咨询，请稍候。';
  let saved = false;
  try {
    const response = await fetch('api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify(payload), signal: AbortSignal.timeout(12000) });
    const data = await response.json();
    if (!response.ok) {
      const indexes = { customer_name: 0, topic: 1, contact: 2, contact_method: 2, message: 3, consent: 4 };
      Object.entries(data.errors || {}).forEach(([name, text]) => {
        const index = indexes[name];
        if (index !== undefined) { showFieldError(validationFields[index], index, text); firstInvalid ||= validationFields[index]; }
      });
      if (response.status === 403) { enquiryMode = 'unavailable'; retryConnection.hidden = false; }
      throw new Error(data.message || '咨询暂未保存，请稍后再试。');
    }
    if (response.status !== 201 || !/^CJ-\d+$/.test(data.reference || '')) throw new Error('未能确认提交结果，请重新连接后确认再尝试。');
    feedback.textContent = `咨询已保存 · 编号 ${data.reference}`;
    saved = true;
  } catch (error) {
    feedback.classList.add('error');
    feedback.textContent = error.name === 'TypeError' || error.name === 'TimeoutError' ? '连接中断，未能确认提交结果。填写内容已保留，请确认后再尝试。' : error.message;
  } finally {
    submitting = false;
    fields.disabled = enquiryMode === 'unavailable';
    form.removeAttribute('aria-busy');
    submitButton.disabled = saved;
    submitButton.textContent = saved ? '已提交咨询 ✓' : '提交咨询 →';
    if (firstInvalid) firstInvalid.focus();
    else feedback.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }
});
form.addEventListener('reset', () => {
  // Reset default values first, then restore the phone label and validation state.
  setTimeout(() => {
    updateContactMethod();
    validationFields.forEach((field, i) => showFieldError(field, i, ''));
    feedback.hidden = true;
    resetSubmitButton();
    (enquiryMode === 'draft' ? topic : customerName).focus({ preventScroll: true });
  }, 0);
});
document.querySelectorAll('[data-topic]').forEach(link => link.addEventListener('click', () => {
  topic.value = link.dataset.topic;
  const draft = link.dataset.draft || '';
  if (!messageInput.value.trim() || messageInput.value === messageInput.dataset.lastDraft) messageInput.value = draft;
  messageInput.dataset.lastDraft = draft;
  showFieldError(topic, 1, '');
  feedback.hidden = true;
  if (!submitting) resetSubmitButton();
}));
// Enable after the submit handler and the mode check; no-JS forms stay disabled.
connectService();
let seen = false;
try { seen = sessionStorage.getItem('changjian-intro-seen') === 'yes'; } catch {}
if (!seen && !location.hash) playIntro();
