/* Offline classroom estimates. Prices are taken from the archived SF lychee reference
   card's exact 2.5 kg and 3 kg columns. No address is sent to a carrier. */
(function (root) {
  'use strict';

  const fares = {
    local: [15, 16], guangdong: [16, 17], fujian: [32, 36],
    south: [34, 38], central: [41, 47], east: [43, 49],
    north: [44, 51], west: [50, 59], northeast: [55, 65], xinjiang: [66, 78]
  };

  // Unlisted destinations have no fallback tariff. The chart treats Hulunbuir separately.
  const provinces = [
    ['广东', 'Guangdong', 'guangdong', '广州 深圳 佛山 东莞 珠海 中山 惠州 江门 肇庆 汕头 潮州 揭阳 汕尾 河源 梅州 清远 韶关 阳江 云浮 湛江 茂名'],
    ['福建', 'Fujian', 'fujian', '福州 厦门 泉州 漳州 莆田 龙岩 三明 南平 宁德'],
    ['湖南', 'Hunan', 'south', '长沙 株洲 湘潭 衡阳 常德 岳阳'],
    ['广西', 'Guangxi', 'south', '南宁 桂林 柳州 北海 玉林'],
    ['江西', 'Jiangxi', 'south', '南昌 赣州 九江 景德镇'],
    ['海南', 'Hainan', 'south', '海口 三亚'],
    ['安徽', 'Anhui', 'central', '合肥 芜湖 蚌埠 安庆 黄山'],
    ['贵州', 'Guizhou', 'central', '贵阳 遵义 安顺'],
    ['湖北', 'Hubei', 'central', '武汉 宜昌 襄阳 荆州'],
    ['上海', 'Shanghai', 'east', ''], ['重庆', 'Chongqing', 'east', ''],
    ['江苏', 'Jiangsu', 'east', '南京 苏州 无锡 常州 南通 扬州 徐州 镇江'],
    ['浙江', 'Zhejiang', 'east', '杭州 宁波 温州 绍兴 嘉兴 金华 台州 湖州 衢州 丽水'],
    ['河南', 'Henan', 'east', '郑州 洛阳 开封 新乡 南阳'],
    ['四川', 'Sichuan', 'east', '成都 绵阳 德阳 宜宾 乐山 泸州'],
    ['云南', 'Yunnan', 'east', '昆明 大理 丽江 曲靖 玉溪'],
    ['北京', 'Beijing', 'north', ''], ['天津', 'Tianjin', 'north', ''],
    ['辽宁', 'Liaoning', 'north', '沈阳 大连 鞍山 葫芦岛'],
    ['河北', 'Hebei', 'north', '石家庄 唐山 保定 秦皇岛 廊坊 邯郸'],
    ['山东', 'Shandong', 'north', '济南 青岛 烟台 潍坊 淄博 威海 临沂'],
    ['山西', 'Shanxi', 'north', '太原 大同 运城'],
    ['陕西', 'Shaanxi', 'north', '西安 宝鸡 咸阳 延安 榆林'],
    ['甘肃', 'Gansu', 'west', '兰州 天水 酒泉 张掖'],
    ['宁夏', 'Ningxia', 'west', '银川 石嘴山 吴忠 中卫 固原'],
    ['青海', 'Qinghai', 'west', '西宁 海东'],
    ['内蒙古', 'Inner Mongolia', 'west', '呼和浩特 包头 鄂尔多斯 呼伦贝尔 赤峰 通辽 乌海 巴彦淖尔 乌兰察布 兴安盟 锡林郭勒盟 阿拉善盟'],
    ['吉林', 'Jilin', 'northeast', '长春 四平 松原 延吉'],
    ['黑龙江', 'Heilongjiang', 'northeast', '哈尔滨 齐齐哈尔 大庆 牡丹江 佳木斯'],
    ['新疆', 'Xinjiang', 'xinjiang', '乌鲁木齐 克拉玛依 吐鲁番 哈密 喀什']
  ];
  const cities = new Map();
  for (const [province, , , names] of provinces) {
    for (const city of names.split(' ').filter(Boolean)) cities.set(city, province);
  }

  const aliases = {
    Guangzhou: '广州', Shenzhen: '深圳', Futian: '福田区', Dongguan: '东莞', Zhuhai: '珠海',
    Foshan: '佛山', Huizhou: '惠州', Zhongshan: '中山', Zhaoqing: '肇庆', Xiamen: '厦门',
    Fuzhou: '福州', Changsha: '长沙', Nanning: '南宁', Nanchang: '南昌', Haikou: '海口',
    Sanya: '三亚', Hefei: '合肥', Guiyang: '贵阳', Wuhan: '武汉', Nanjing: '南京', Suzhou: '苏州',
    Hangzhou: '杭州', Ningbo: '宁波', Zhengzhou: '郑州', Chengdu: '成都', Kunming: '昆明',
    Shenyang: '沈阳', Dalian: '大连', Shijiazhuang: '石家庄', Jinan: '济南', Qingdao: '青岛',
    Taiyuan: '太原', "Xi'an": '西安', Xian: '西安', Lanzhou: '兰州', Yinchuan: '银川',
    Xining: '西宁', Hohhot: '呼和浩特', Baotou: '包头', Hulunbuir: '呼伦贝尔',
    Harbin: '哈尔滨', Changchun: '长春', Urumqi: '乌鲁木齐'
  };
  for (const [cn, en] of provinces) aliases[en] = cn;

  const routes = ['广州市', '深圳市福田区', '广东省佛山市', '福建省厦门市', '湖南省长沙市',
    '安徽省合肥市', '上海市', '北京市', '甘肃省兰州市', '内蒙古呼和浩特市',
    '内蒙古呼伦贝尔市', '黑龙江省哈尔滨市', '新疆乌鲁木齐市'];

  const placeWords = [...cities.keys(), ...provinces.map(([cn]) => cn)].sort((a, b) => b.length - a.length);
  const namedRoad = new RegExp('(' + placeWords.join('|') + ')(?:东|南|西|北|中)?(?:大街|大道|大路|街道|公路|街|路|里弄|巷|弄)', 'g');

  function invalid(status, message) {
    return { status, message };
  }

  function normalizeAddress(value) {
    let address = value.normalize('NFKC').replace(/[’‘]/g, "'");
    for (const [en, cn] of Object.entries(aliases)) {
      address = address.replace(new RegExp('\\b' + en + '\\b', 'gi'), cn);
    }
    // A street named after a province/city is not an administrative destination.
    return address.replace(namedRoad, '').trim();
  }

  function findRoute(address) {
    if (typeof address !== 'string' || !address.trim()) return invalid('invalid', '请填写收货省市或行政区。');
    const text = normalizeAddress(address);
    const islandCheck = text.replace(/青岛|秦皇岛|葫芦岛/g, '');
    const exception = /香港|澳门|澳門|台湾|臺灣|台灣|西藏|离岛|離島|海岛|偏远|海島|岛|島|舟山|三沙|崇明|平潭|南澳县|海上|境外|海外|Hong\s*Kong|Maca[ou]|Taiwan|Tibet|Island|\b(?:HK|TW)\b/i;
    if (exception.test(islandCheck)) return invalid('unsupported', '此目的地需由顺丰按地址单独确认服务和报价。');

    const provinceHits = new Set(provinces.filter(([cn]) => text.includes(cn)).map(([cn]) => cn));
    const cityHits = new Set([...cities.keys()].filter(cn => text.includes(cn)));
    // The Tianjin administrative district 河北区 is not Hebei province.
    if (text.includes('天津') && text.includes('河北区') && !text.includes('河北省')) provinceHits.delete('河北');
    if (text.includes('福田区')) cityHits.add('深圳');
    // A conflict (including two destinations along the same tariff lane) requires clarification.
    for (const city of cityHits) provinceHits.add(cities.get(city));
    if (provinceHits.size !== 1 || cityHits.size > 1) {
      return invalid('unsupported', '请输入单一、可辨认的收货省市，例如“广东省深圳市福田区”。');
    }
    const [province] = provinceHits;
    const [city] = cityHits;
    const provinceRow = provinces.find(([cn]) => cn === province);
    if (!city && (province === '广东' || province === '内蒙古')) {
      return invalid('unsupported', '请补充收货城市，以确定同城、省内或呼伦贝尔专属价档。');
    }
    // Do not ascribe an unrecognised city to a named province by default.
    if (!city && provinceRow[3] && /市/.test(text.replace(province, ''))) {
      return invalid('unsupported', '暂未识别该城市，请通过顺丰按地址确认，或选择已列出的市区。');
    }
    const special = city === '广州' ? 'local' : city === '呼伦贝尔' ? 'northeast' : provinceRow[2];
    const [yali, jiayan] = fares[special];
    const region = city ? province + ' · ' + city : province;
    return { region, province, city: city || '', routeId: special, yali, jiayan,
      freshMin: 3, freshMax: city === '广州' || city === '深圳' ? 3 : 5 };
  }

  function numeric(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return NaN;
    if (typeof value === 'string' && !/^\d+(?:\.\d+)?$|^\.\d+$/.test(value.trim())) return NaN;
    return Number(value);
  }

  function calculate(input = {}) {
    const { address, jin, budget } = input || {};
    const minimum = numeric(jin);
    const limit = numeric(budget);
    if (!Number.isFinite(minimum) || minimum <= 0 || !Number.isSafeInteger(Math.ceil(minimum))) {
      return invalid('invalid', '请填写大于零的最低鲜果净重（斤）。');
    }
    if (!Number.isFinite(limit) || limit < 0 || limit > Number.MAX_SAFE_INTEGER ||
        (limit < 1e15 && Number(limit.toFixed(2)) !== limit)) {
      return invalid('invalid', '请填写有效的含运费总预算（元，最多保留两位小数）。');
    }
    const lane = findRoute(address);
    if (lane.status) return lane;
    const makeBox = (id, name, jin, price, chargeableKg, kitKg, packaging, freight) => ({
      id, name, jin, price, chargeableKg, kitKg, packaging, freight,
      freshMin: lane.freshMin, freshMax: lane.freshMax,
      totalMin: price + packaging + freight + lane.freshMin,
      totalMax: price + packaging + freight + lane.freshMax
    });
    const small = makeBox('yali', '雅礼装', 3, 198, 2.5, 2.5, 6, lane.yali);
    const large = makeBox('jiayan', '家宴装', 5, 298, 3, 5, 8, lane.jiayan);

    // Every 5 small boxes can be replaced by 3 large ones for the same 15 jin
    // at a lower cost under every listed lane, at both freshness-fee limits.
    const needed = Math.ceil(minimum);
    let best;
    for (let smallCount = 0; smallCount <= 4; smallCount++) {
      const largeCount = Math.max(0, Math.ceil((needed - smallCount * small.jin) / large.jin));
      const totalMin = smallCount * small.totalMin + largeCount * large.totalMin;
      const totalMax = smallCount * small.totalMax + largeCount * large.totalMax;
      const totalJin = smallCount * small.jin + largeCount * large.jin;
      if (!Number.isSafeInteger(totalMax)) continue;
      if (!best || totalMax < best.totalMax ||
        (totalMax === best.totalMax && (totalMin < best.totalMin ||
          (totalMin === best.totalMin && totalJin < best.totalJin)))) {
        best = { smallCount, largeCount, totalMin, totalMax, totalJin };
      }
    }
    if (!best) return invalid('invalid', '数量超出此估算器可精确计算的范围。');
    const { smallCount, largeCount, totalMin, totalMax, totalJin } = best;
    const items = [{ ...small, count: smallCount }, { ...large, count: largeCount }].filter(box => box.count);
    const parcelCount = smallCount + largeCount;
    const status = limit >= totalMax ? 'ok' : limit >= totalMin ? 'provisional' : 'over_budget';
    const messages = {
      ok: '推荐组合满足净重要求，预计总价在预算内。',
      provisional: '按较低保鲜费可满足预算，需确认实际保鲜费。',
      over_budget: '达到所需净重的最低价组合仍超出预算。'
    };
    const shortfall = amount => Math.max(0, Math.round((amount - limit) * 100) / 100);
    return {
      status, message: messages[status], region: lane.region, province: lane.province, city: lane.city,
      routeId: lane.routeId, requestedJin: minimum, budget: limit, totalJin, parcelCount, items,
      goods: smallCount * small.price + largeCount * large.price,
      freight: smallCount * small.freight + largeCount * large.freight,
      packaging: smallCount * small.packaging + largeCount * large.packaging,
      freshMin: parcelCount * lane.freshMin, freshMax: parcelCount * lane.freshMax,
      totalMin, totalMax, shortfall: shortfall(totalMin), shortfallMax: shortfall(totalMax)
    };
  }

  const api = { calculate, findRoute, routes };
  root.GiftEstimate = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(globalThis);
