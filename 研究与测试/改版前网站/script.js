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

// Gift occasions guide the question, without claiming particular stock or prices.
const occasions = {
  visit: { title: '见面有礼，一起尝鲜。', detail: '建议先问礼盒净重、提携包装与可订日期，再按收礼人数安排数量。', topic: '礼盒规格', draft: '想用于探亲访友，请介绍礼盒净重、提携包装、当前价格与可订日期。' },
  thanks: { title: '以一盒荔香，表达感谢。', detail: '建议先确认包装细节、所需盒数的价格，以及送礼日期前能否安排寄送。', topic: '礼盒规格', draft: '想用于致谢相赠，请介绍礼盒包装、所需盒数的报价，以及指定日期前的寄送安排。' },
  share: { title: '一家围坐，共尝时令。', detail: '建议按分享人数询问净重与份数，了解当前供应，并按需要购买、及时享用。', topic: '当季供应', draft: '想与家人分享，请介绍当前供应、适合分享人数的净重与份数，以及保存说明。' }
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

// A server handshake enables storage. File/static previews stay explicitly demonstrative.
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

async function connectService() {
  enquiryMode = 'connecting';
  fields.disabled = true;
  retryConnection.hidden = true;
  serviceStatus.textContent = '正在确认咨询服务…';
  try {
    if (location.protocol === 'file:') enquiryMode = 'demo';
    else {
      const response = await fetch('api/session', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (response.status === 404) enquiryMode = 'demo';
      else {
        if (!response.ok) throw new Error('Session unavailable');
        const data = await response.json();
        if (data.mode !== 'stored' || typeof data.csrf_token !== 'string') throw new Error('Invalid session');
        csrfToken = data.csrf_token;
        enquiryMode = 'stored';
      }
    }
    const stored = enquiryMode === 'stored';
    const note = document.getElementById('demo-note');
    const title = document.createElement('strong');
    title.textContent = stored ? '咨询信息保存说明' : '演示表单';
    note.replaceChildren(title, document.createTextNode(stored
      ? '提交后，称呼、联系方式、主题和咨询内容将保存给课程项目小组，用于处理本次咨询。仅小组管理页可查看；不会产生订单。课程体验建议填写示例信息。'
      : '仅用于演示输入检查与反馈，不会提交或保存信息，也不会产生订单。请使用示例信息体验。'));
    document.getElementById('consent-field').hidden = !stored;
    serviceStatus.textContent = stored ? '咨询服务已连接 · 保存成功后会显示咨询编号' : '当前为静态演示 · 填写内容仅在页面中校验';
    submitButton.textContent = stored ? '提交咨询 →' : '体验咨询流程 →';
    submitButton.disabled = false;
    fields.disabled = false;
  } catch {
    enquiryMode = 'unavailable';
    serviceStatus.textContent = '咨询服务暂时无法连接。填写内容仍保留在页面中，请重新连接后再提交。';
    retryConnection.hidden = false;
  }
}
retryConnection.addEventListener('click', connectService);

function errorMessage(field) {
  if (field === consent) return enquiryMode === 'stored' && !consent.checked ? '请确认同意保存本次咨询信息。' : '';
  const value = field.value.trim();
  if (field === messageInput) return value.length > 300 ? '咨询内容不能超过 300 字。' : '';
  if (field === customerName) return !value ? '请填写称呼。' : value.length > 50 ? '称呼不能超过 50 字。' : '';
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
  if (!submitting) { submitButton.disabled = false; submitButton.textContent = enquiryMode === 'stored' ? '提交咨询 →' : '体验咨询流程 →'; }
  validationFields.forEach((field, i) => { if (field.getAttribute('aria-invalid') === 'true' && !errorMessage(field)) showFieldError(field, i, ''); });
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting || !['stored', 'demo'].includes(enquiryMode)) return;
  let firstInvalid;
  validationFields.forEach((field, i) => {
    const message = errorMessage(field);
    showFieldError(field, i, message);
    if (message && !firstInvalid) firstInvalid = field;
  });
  feedback.hidden = false;
  feedback.classList.toggle('error', Boolean(firstInvalid));
  if (firstInvalid) {
    feedback.textContent = '请检查标出的信息，修改后再提交。';
    firstInvalid.focus();
    return;
  }
  if (enquiryMode === 'demo') {
    feedback.textContent = '演示校验通过。填写的信息未提交、未保存，也未产生订单。正式咨询请使用经确认的联系方式。';
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
    feedback.textContent = `咨询已保存 · 编号 ${data.reference}。课程项目小组可查看这条记录；实际购买请通过已确认的销售渠道。`;
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
    submitButton.disabled = false;
    submitButton.textContent = enquiryMode === 'stored' ? '提交咨询 →' : '体验咨询流程 →';
    customerName.focus({ preventScroll: true });
  }, 0);
});
document.querySelectorAll('[data-topic]').forEach(link => link.addEventListener('click', () => {
  topic.value = link.dataset.topic;
  if (link.dataset.draft && !messageInput.value.trim()) messageInput.value = link.dataset.draft;
  showFieldError(topic, 1, ''); feedback.hidden = true;
  submitButton.disabled = false;
  submitButton.textContent = enquiryMode === 'stored' ? '提交咨询 →' : '体验咨询流程 →';
}));
const channelEnquiry = document.getElementById('channel-enquiry');
channelEnquiry.hidden = false;
channelEnquiry.addEventListener('click', () => { topic.value = '配送与购买渠道'; showFieldError(topic, 1, ''); feedback.hidden = true; topic.focus(); });
// Enable after the submit handler and the mode check; no-JS forms stay disabled.
connectService();
let seen = false;
try { seen = sessionStorage.getItem('changjian-intro-seen') === 'yes'; } catch {}
if (!seen && !location.hash) playIntro();
