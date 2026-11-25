'use strict';

// Local observations are opt-in and last only for this page visit.
let observing = false;
const observations = [];
const observeStatus = document.getElementById('observe-status');
const exportButton = document.getElementById('export');
function record(event) {
  if (window.BA4043_METRICS === true && ['http:', 'https:'].includes(location.protocol)) {
    fetch('/_metrics/event', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({event}), keepalive: true
    }).catch(() => {});
  }
  if (observing) {
    observations.push({time: new Date().toISOString(), event});
    observeStatus.textContent = '本页已记 ' + observations.length + ' 次操作';
    exportButton.disabled = false;
  }
}
record('page_view');
function trackDestination() {
  if (location.hash === '#gift') record('box_compare');
  if (location.hash === '#delivery') record('delivery_lookup');
}
window.addEventListener('hashchange', trackDestination);
trackDestination();
document.getElementById('observe-toggle').addEventListener('click', event => {
  observing = !observing;
  event.currentTarget.textContent = observing ? '暂停观察' : '继续观察';
  observeStatus.textContent = (observing ? '记录中' : '已暂停') + ' · 已记 ' + observations.length + ' 次操作';
});
exportButton.addEventListener('click', () => {
  const csv = '\uFEFF时间（UTC）,操作\r\n' + observations.map(row => row.time + ',' + row.event).join('\r\n');
  const link = document.createElement('a');
  const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
  link.href = url;
  link.download = '本次课堂观察.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

const pictures = [
  {file:'gift-inside.jpg', alt:'开盒实拍：红色内托中，鲜荔分隔排列'},
  {file:'gift-box.jpg', alt:'外盒实拍：绿色盒盖、红色提手与鲜荔'},
  {file:'gift-detail.jpg', alt:'包装细节实拍：荔枝、纸盒与随盒卡片'}
];
const photo = document.getElementById('photo');
document.querySelectorAll('[data-picture]').forEach(button => {
  button.addEventListener('click', () => {
    const image = pictures[Number(button.dataset.picture)];
    photo.src = 'images/' + image.file;
    photo.alt = image.alt;
    document.querySelectorAll('[data-picture]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
  });
});
const lightbox = document.getElementById('lightbox');
document.getElementById('zoom').addEventListener('click', () => {
  const enlarged = document.getElementById('enlarged');
  enlarged.src = photo.currentSrc || photo.src;
  enlarged.alt = photo.alt;
  lightbox.showModal();
  record('gallery_open');
});
document.getElementById('close-photo').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });

const region = document.getElementById('region');
const routes = {
  futian:['下午班次','预计次日送达','7 月 15 日下单，7 月 16 日下午在广州增城揽收，预计 7 月 17 日送达深圳福田。'],
  delta:['珠三角城区','当日或次日','广州增城揽收后计时，当日达限早班线路。具体班次和可寄城区按地址确认。'],
  express:['生鲜专线','约 1–2 天','从广州增城揽收起算。目的城市是否有专线，请按具体地址确认。'],
  mainland:['内地其他地区','约 2–3 天','从广州增城揽收起算，按可寄地区与当地派送安排估算。'],
  remote:['特殊地区','按地址查询','偏远县镇、海岛及港澳台需先核实是否可寄，再确认路线和时间。']
};
region.addEventListener('change', () => {
  const [label, time, detail] = routes[region.value];
  document.querySelector('.route-result').hidden = false;
  document.getElementById('lead-label').textContent = label;
  document.getElementById('lead-time').textContent = time;
  document.getElementById('lead-detail').textContent = detail;
  record('delivery_lookup');
});
document.querySelectorAll('[name="sku"]').forEach(input => input.addEventListener('change', () => record('box_compare')));

// The original site's visit / thanks / share scenario choices are retained.
const occasions = {
  visit:{label:'探亲访友', advice:'先看开盒实拍，再把收货日与登门日期排在一起。', question:'想用于探亲访友，请介绍提携包装，并帮我确认拜访前的寄送安排。'},
  thanks:{label:'致谢相赠', advice:'看看盒内摆放及外观，提前说明希望送到的日期。', question:'想用于致谢相赠，请介绍包装细节、可订数量与指定日期的寄送安排。'},
  share:{label:'家人分享', advice:'按一起品尝的人数选净重，收货后及时冷藏，尽早享用。', question:'想用于家人分享，请介绍合适的净重、份量和鲜果保存方式。'}
};
let chosenOccasion = 'visit';
document.querySelectorAll('[data-occasion]').forEach(button => {
  button.addEventListener('click', () => {
    chosenOccasion = button.dataset.occasion;
    document.getElementById('occasion-detail').textContent = occasions[chosenOccasion].advice;
    document.querySelectorAll('[data-occasion]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
  });
});
const draftText = document.getElementById('draft-text');
const draftStatus = document.getElementById('draft-status');
document.querySelectorAll('[data-draft-source]').forEach(link => {
  link.addEventListener('click', () => {
    const sku = document.querySelector('[name="sku"]:checked')?.value || '礼盒';
    draftText.value = '我想了解仙进奉' + sku + '。' +
      (link.dataset.draftSource === 'occasion' ? occasions[chosenOccasion].question : '请介绍当季供货、实物包装与可订日期。');
    draftStatus.textContent = '';
  });
});
document.getElementById('draft').addEventListener('submit', event => {
  event.preventDefault();
  const text = draftText.value.trim();
  if (!text) {
    draftStatus.textContent = '请先写下想了解的问题。';
    draftText.focus();
    return;
  }
  draftStatus.textContent = '本地咨询清单\n' + text;
  record('enquiry_draft');
});
document.getElementById('copy').addEventListener('click', async () => {
  if (!draftText.value.trim()) {
    draftStatus.textContent = '请先选择一个场景，或写下咨询内容。';
    draftText.focus();
    return;
  }
  try {
    await navigator.clipboard.writeText(draftText.value);
    draftStatus.textContent = '咨询文字已复制。';
  } catch {
    draftText.select();
    draftStatus.textContent = '已选中文字，可使用系统复制操作。';
  }
});
