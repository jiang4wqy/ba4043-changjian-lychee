'use strict';

(() => {
  const estimate = window.GiftEstimate;
  if (!estimate) return;
  const byId = name => document.getElementById('estimate-' + name);
  const form = byId('form');
  const address = byId('address');
  const jin = byId('jin');
  const budget = byId('budget');
  const heading = byId('result-title');
  const total = byId('total');
  const message = byId('message');
  const details = byId('detail');
  const items = byId('items');
  const breakdown = byId('breakdown');
  const weights = byId('weights');
  const currency = new Intl.NumberFormat('zh-CN', {
    style: 'currency', currency: 'CNY', minimumFractionDigits: 0, maximumFractionDigits: 2
  });

  const money = value => currency.format(value);
  const priceRange = (low, high) => low === high ? money(low) : money(low) + '–' + money(high);
  const names = { ok: '预算内的礼盒组合', provisional: '需确认保鲜费', over_budget: '最低估价已超预算' };
  for (const region of estimate.routes) {
    const option = document.createElement('option');
    option.value = region;
    byId('regions').append(option);
  }

  function resetResult(title, text) {
    heading.textContent = title;
    message.textContent = text;
    total.hidden = details.hidden = true;
    total.textContent = weights.textContent = '';
    items.replaceChildren();
    breakdown.replaceChildren();
  }

  function cost(label, value, subtotal = false) {
    const line = document.createElement('div');
    if (subtotal) line.classList.add('estimate-subtotal');
    const term = document.createElement('dt');
    const amount = document.createElement('dd');
    term.textContent = label;
    amount.textContent = value;
    line.append(term, amount);
    breakdown.append(line);
  }

  function calculate() {
    const result = estimate.calculate({ address: address.value, jin: jin.value, budget: budget.value });
    if (!Object.hasOwn(names, result.status)) {
      resetResult(result.status === 'unsupported' ? '收货地区需确认' : '请检查寄送条件', result.message);
      return;
    }

    const budgetNotes = {
      ok: '按估价上限，预算还余 ' + money(result.budget - result.totalMax) + '。',
      provisional: '总预算落在估价区间内，需确认实际保鲜费。',
      over_budget: '至少超出预算 ' + money(result.shortfall) + '。'
    };
    resetResult(names[result.status], result.region + ' · 鲜果净重 ' + result.totalJin + ' 斤。' + budgetNotes[result.status]);
    total.hidden = details.hidden = false;
    total.textContent = priceRange(result.totalMin, result.totalMax);
    for (const item of result.items) {
      const line = document.createElement('li');
      line.textContent = item.name + ' × ' + item.count + ' 盒（每盒 ' + item.jin + ' 斤，' + money(item.price) + '）';
      items.append(line);
    }
    cost('礼盒商品价', money(result.goods));
    cost('顺丰基础运费', money(result.freight));
    cost('寄递包材', money(result.packaging));
    cost('保鲜服务', priceRange(result.freshMin, result.freshMax));
    const shipping = result.freight + result.packaging;
    cost('寄送费用小计', priceRange(shipping + result.freshMin, shipping + result.freshMax), true);
    weights.textContent = '每盒单独寄送。' + result.items.map(item =>
      item.name + '每件暂按 ' + item.chargeableKg + ' kg 计费'
    ).join('，') + '。';
  }

  form.addEventListener('input', () => {
    if (!details.hidden || heading.textContent !== '等待估价') {
      resetResult('等待估价', '寄送条件已修改，点击“计算礼盒方案”查看估价。');
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    calculate();
    if (window.matchMedia('(max-width: 720px)').matches) {
      byId('result').scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  });
  byId('example').addEventListener('click', () => {
    address.value = '广东省深圳市福田区';
    jin.value = '3';
    budget.value = '250';
    form.requestSubmit();
  });

  byId('interface').hidden = false;
})();
