// avoid-ai-design-ignore-file: I2, SD5 (▶▼◀ = 게임 대화창 커서, 제목 옆 숫자 = 개수 표시. STYLE.md 참고)
import { FMT, today, ym, addMonth, addDays, weekday, weekStart, net, sum, spend, saved, progress, budget, installmentFor, monthsBetween, reachedMilestone } from './calc.js';
import { catIcon, pixIcon, ICON_NAMES, sceneHTML, LEVEL_BG } from './icons.js';

const KEY = 'savings-book';
const COIN = 200000; // 동전 1개 = 20만원 → 100개 = 2,000만원
const DEFAULT = {
  settings: { goal: 20000000, start: '2026-11', salary: 2400000, categories: ['식비', '카페·간식', '교통', '쇼핑', '문화·약속', '기타'] },
  accounts: [
    { id: 'a1', name: '청년미래적금', monthly: 500000, color: '#f2c14e', invest: false, rate: 0 },
    { id: 'a2', name: '연금저축펀드', monthly: 200000, color: '#e8956b', invest: true },
    { id: 'a3', name: 'ISA', monthly: 500000, color: '#7fb2d9', invest: true },
    { id: 'a4', name: '주택청약', monthly: 100000, color: '#9fcf6a', invest: false, rate: 0 },
    { id: 'a5', name: '주식', monthly: 300000, color: '#c59ad6', invest: true },
  ],
  fixed: [],
  installments: [],
  tx: [],
  valuations: [],
};

// 미리보기(levels.html): ?lv=N → 그 레벨 구간 중간쯤 모은 데모 데이터. 실제 데이터는 읽지도 쓰지도 않음 (11 = CLEAR)
const PREVIEW = +new URLSearchParams(location.search).get('lv') || 0;
function demo(lv) {
  const d = structuredClone(DEFAULT), plan = sum(d.accounts, a => a.monthly);
  const target = lv > 10 ? d.settings.goal : (d.settings.goal * (lv * 10 - 5)) / 100;
  for (const a of d.accounts) d.tx.push({ id: 'demo' + a.id, type: 'saving', amount: Math.round((target * a.monthly) / plan), date: today(), accountId: a.id, memo: '월 납입' });
  return d;
}

let D;
try { D = PREVIEW ? demo(PREVIEW) : JSON.parse(localStorage.getItem(KEY)) || structuredClone(DEFAULT); } catch { D = structuredClone(DEFAULT); }
D.installments ||= []; // 할부 기능 이전 데이터
const stripEmoji = c => String(c).replace(/^\p{Extended_Pictographic}\S*\s+/u, '');
D.settings.categories = D.settings.categories.map(stripEmoji);
for (const x of [...D.tx, ...D.fixed, ...D.installments]) if (x.category) x.category = stripEmoji(x.category);

// 목표 진행률(%)과 레벨: 목표의 10%마다 1레벨 (LV.1 ~ LV.10, 100%면 CLEAR)
const pctOf = p => (p.value / D.settings.goal) * 100;
const levelOf = pct => Math.min(10, Math.floor(pct / 10) + 1);
function paintLevel() {
  const [bg, dark] = LEVEL_BG[levelOf(pctOf(progress(D, ym(today())))) - 1];
  document.documentElement.style.setProperty('--field', bg);
  document.documentElement.style.setProperty('--field-dark', dark);
  document.querySelector('meta[name=theme-color]').content = bg;
}
// 이미 축하한 구간. 처음 열 때는 지금 구간까지 본 걸로 처리 (기존 데이터로 축하가 뜨지 않게)
D.settings.celebrated ??= reachedMilestone(pctOf(progress(D, ym(today()))));

function save() {
  // 새 구간을 넘으면 저장 전에 기록 → 한 구간에 한 번만 축하 (저축을 취소해도 다시 안 뜸)
  const p = progress(D, ym(today())), m = reachedMilestone(pctOf(p));
  const party = m > D.settings.celebrated ? m : 0;
  if (party) D.settings.celebrated = m;
  try { if (!PREVIEW) localStorage.setItem(KEY, JSON.stringify(D)); }
  catch { alert('저장 실패! 설정 → 백업 내보내기로 데이터를 지켜주세요.'); }
  render();
  if (party) setTimeout(() => celebrate(party, p), 900); // 동전이 떨어진 뒤에
}

const $ = s => document.querySelector(s);

// 효과음: 다이얼 / 저축 / 레벨업
// ponytail: HTMLAudio라 iOS에서 약간 지연될 수 있음. 거슬리면 Web Audio로 교체
const SFX = Object.fromEntries(['dial', 'coin', 'levelup'].map(n => [n, new Audio(`soundeffect/${n}.mp3`)]));
const play = n => { const a = SFX[n]; a.currentTime = 0; a.play().catch(() => {}); };
// iOS는 터치 안에서 한 번 재생된 소리만 나중에(레벨업처럼 타이머로) 재생 가능 → 첫 터치에 무음으로 풀어둠
addEventListener('pointerdown', () => Object.values(SFX).forEach(a => {
  a.muted = true; a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; });
}), { once: true });
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const num = v => +String(v).replace(/[^\d.]/g, '') || 0; // '1,200,000' → 1200000 (이율 소수점은 유지)
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const acc = id => D.accounts.find(a => a.id === id);
const signed = n => (n >= 0 ? '+' : '−') + FMT(Math.abs(n));
const md = d => `${+d.slice(5, 7)}월 ${+d.slice(8)}일`;
// 카테고리 → [도트 아이콘, 이름]
// 설정에서 고른 아이콘이 있으면 그것, 없으면 이름으로 추측
const iconFor = c => (D.settings.catIcons?.[c] ? pixIcon(D.settings.catIcons[c]) : catIcon(c));
const splitCat = c => [iconFor(c), c];
// 계좌 한 줄 요약: 평가액 · 수익(수익률)
const growth = a => {
  if (!a.principal) return a.invest || a.rate ? '아직 납입 전' : '이율을 넣으면 이자가 계산돼요';
  const g = a.value - a.principal, pct = (g / a.principal) * 100;
  return `${FMT(a.value)}원 · <span class="${g >= 0 ? 'up' : 'down'}">${signed(g)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)</span>${a.invest || a.rate ? '' : ' · 이율 미입력'}`;
};
const coinIcon = color => `<i class="coin" style="background:${color}"></i>`;

let view = 'home';
let expMode = 'day';
let expAnchor = today();

// ---------- 홈 ----------
function homeView() {
  const now = ym(today());
  const p = progress(D, now);
  const { goal, salary, start } = D.settings;
  const pct = Math.min(100, pctOf(p));
  const lv = levelOf(pct);
  const toNextLv = pct >= 100 ? 0 : (goal * Math.min(10, Math.floor(pct / 10) + 1)) / 10 - p.value;
  const nextCoin = COIN - (p.value % COIN);

  const bg = budget(D, now), plan = bg.plan;
  const hpMax = Math.max(0, bg.max);
  const hp = bg.left;
  const lastDay = new Date(+now.slice(0, 4), +now.slice(5), 0).getDate();
  const daysLeft = lastDay - +today().slice(8) + 1;
  const hpOn = hpMax ? Math.max(0, Math.ceil((hp / hpMax) * 20)) : 0;
  const hpCls = hpOn > 10 ? 'g' : hpOn > 4 ? 'y' : 'r';

  const quests = D.accounts.map(a => ({ a, done: saved(D, now, a.id) >= a.monthly }));
  const doneN = quests.filter(q => q.done).length;
  const bonus = D.tx.filter(t => t.type === 'saving' && ym(t.date) === now && t.memo !== '월 납입');

  // 대화창: 지금 상황을 한두 문장으로
  const lines = [];
  if (now < start) lines.push(`${+start.slice(5)}월부터 2,000만원 모으기 모험 시작! 지금은 연습 모드예요.`);
  else if (doneN < quests.length) lines.push(`이번 달 저축 퀘스트가 <span class="gold">${quests.length - doneN}개</span> 남았어요.`);
  else lines.push('이번 달 저축 퀘스트 클리어! ★');
  if (toNextLv > 0 && now >= start) lines.push(`LV.${lv + 1}까지 <span class="gold">${FMT(toNextLv)}원</span> 남았어요.`);
  if (hp < 0) lines.push(`생활비 HP가 바닥났어요. <span class="down">${FMT(-hp)}원</span> 초과!`);
  else if (now >= start) lines.push(p.ahead >= 0 ? `예정보다 <span class="up">${FMT(p.ahead)}원</span> 앞서는 중!` : `목표까지 매달 <span class="gold">${FMT(p.need)}원</span>씩 모으면 돼요.`);

  return `
    <div class="hud"><button class="lv" data-act="levels" aria-label="레벨별 화면 보기">${pct >= 100 ? 'CLEAR' : 'LV.' + lv} ▾</button><span class="purse">${coinIcon('#f2c14e')} ${FMT(p.value)}</span></div>

    <section class="box stage">
      <div class="stage-bg" aria-hidden="true">${stageScene}</div>
      <canvas id="jar" width="96" height="104" aria-label="저금통: 동전 ${Math.floor(p.value / COIN)}개"></canvas>
      <div>
        <div class="label">모은 돈</div>
        <div class="num">${FMT(p.value)}원</div>
        <div class="label">목표 ${FMT(goal / 10000)}만원까지</div>
        <div class="num gold">${pct.toFixed(1)}%</div>
        <div class="pbar"><i style="width:${pct}%"></i></div>
        <div class="hint">동전 1개 = ${COIN / 10000}만원<br>저금통을 가득 채우면 목표 달성!<br>다음 동전까지 <span class="gold">${FMT(nextCoin)}원</span>
        ${p.gain ? `<br>투자 수익 <span class="${p.gain >= 0 ? 'up' : 'down'}">${signed(p.gain)}</span>` : ''}</div>
      </div>
    </section>

    <div class="box dialog"><span class="face">▶</span> ${lines.join('<br>')}<span class="blink">▼</span></div>

    <h2><span>${+now.slice(5)}월 저축 퀘스트</span><span>${doneN} / ${quests.length}</span></h2>
    <section class="box">
      ${quests.map(({ a, done }) => {
        const paid = saved(D, now, a.id), x = p.accs.find(x => x.id === a.id);
        return `<div class="quest${done ? ' done' : ''}" data-act="quest" data-id="${a.id}" role="button" tabindex="0">
        ${coinIcon(a.color)}
        <div class="q"><div>${esc(a.name)} <span class="sub">${paid && !done ? FMT(paid) + ' / ' : ''}${FMT(a.monthly)}</span></div><div>${growth(x)}</div></div>
        <button class="st" data-act="pay" data-id="${a.id}">${done ? 'CLEAR ✓' : '넣기'}</button></div>`;
      }).join('')}
      ${bonus.map(t => `<button class="quest" data-act="edit-saving" data-id="${t.id}">
        ${coinIcon(acc(t.accountId)?.color ?? '#d4a373')}<div class="q"><div>${esc(acc(t.accountId)?.name)}에 보너스 저축</div><div>${esc(t.memo)}</div></div>
        <span class="up">+${FMT(t.amount)}</span></button>`).join('')}
    </section>

    <h2><span>이번 달 생활비 HP</span><span>${daysLeft}일 남음</span></h2>
    <section class="box">
      <div class="row"><span>HP</span><span><span class="num ${hp < 0 ? 'down' : ''}">${FMT(hp)}</span> <span class="sub">/ ${FMT(hpMax)}</span></span></div>
      <div class="hp ${hpCls}">${Array.from({ length: 20 }, (_, i) => `<i class="${i < hpOn ? 'on' : ''}"></i>`).join('')}</div>
      <div class="hint">${hp > 0 ? `하루 <span class="gold">${FMT(hp / daysLeft)}원</span>씩 쓰면 딱 맞아요.` : '이번 달은 지출을 꽉 잡아봐요!'}<br>월급 ${FMT(salary)}${bg.income ? ` + 추가 수입 ${FMT(bg.income)}` : ''} − 저축 ${FMT(plan + bg.bonus)} = 생활비 ${FMT(bg.max)}</div>
      ${hp > 0 ? `<button class="btn go" style="margin-top:12px" data-act="bonus" data-amt="${hp}">남은 HP를 저금통에 넣기</button>` : ''}
    </section>`;
}

// 저금통 캔버스 (96×104 픽셀 → 2배 확대)
let shown = 0; // 이미 그려진 동전 수 (새 동전만 떨어짐)
let anim;
const shade = (hex, k) => '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, parseInt(hex.slice(i, i + 2), 16) + k)).toString(16).padStart(2, '0')).join('');
const SPRITE = ['..kkk..', '.khhok.', 'khooodk', 'khooodk', 'koooddk', '.kdddk.', '..kkk..'];
function drawJar() {
  const cv = $('#jar'); if (!cv) return;
  const g = cv.getContext('2d');
  const p = progress(D, ym(today()));
  // 계좌별 누적액을 누적 반올림 없이 내림 → 전체 동전 수가 항상 정확
  const coins = []; let cum = 0;
  for (const a of p.accs) { cum += Math.max(0, a.value); while (coins.length < Math.min(100, Math.floor(cum / COIN))) coins.push(a.color); }
  const slot = i => { const r = Math.floor(i / 10); return [11 + (i % 10) * 7 + (r % 2 ? 3 : 0), 92 - r * 7]; };
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const coin = (x, y, c) => {
    const map = { k: '#6a4636', h: shade(c, 70), o: c, d: shade(c, -60) };
    SPRITE.forEach((row, j) => [...row].forEach((ch, i) => ch !== '.' && px(x + i, y + j, 1, 1, map[ch])));
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (shown > coins.length || reduce) shown = coins.length;
  const falling = coins.map((_, i) => i >= shown ? { y: -8 - Math.min(i - shown, 30) * 10, vy: 0 } : null);
  shown = coins.length;

  cancelAnimationFrame(anim);
  const frame = () => {
    g.clearRect(0, 0, 96, 104);
    // 유리병 안쪽
    px(10, 20, 76, 78, 'rgba(127,178,217,.18)'); px(36, 10, 24, 10, 'rgba(127,178,217,.18)');
    // 동전
    let moving = false;
    coins.forEach((c, i) => {
      const [x, ty] = slot(i), f = falling[i];
      if (f && f.y < ty) { f.vy += 0.5; f.y = Math.min(ty, f.y + f.vy); moving = true; }
      coin(x, f ? Math.round(f.y) : ty, c);
    });
    // 병 테두리 + 뚜껑 + 반짝임
    const E = '#b07a52';
    px(8, 22, 2, 76, E); px(86, 22, 2, 76, E); px(12, 98, 72, 2, E);
    px(10, 20, 2, 2, E); px(84, 20, 2, 2, E); px(10, 96, 2, 2, E); px(84, 96, 2, 2, E);
    px(12, 18, 24, 2, E); px(60, 18, 24, 2, E); px(34, 10, 2, 8, E); px(60, 10, 2, 8, E);
    px(30, 3, 36, 7, '#b07a52'); px(30, 3, 36, 2, '#d4a373'); px(46, 5, 4, 2, '#6a4636'); // 동전 투입구
    px(13, 26, 2, 30, 'rgba(255,255,255,.8)'); px(13, 60, 2, 5, 'rgba(255,255,255,.8)');
    if (moving) anim = requestAnimationFrame(frame);
  };
  frame();
}

// ---------- 모달: 레벨표 · 축하 ----------
const modal = html => { $('#modal').innerHTML = `<div class="box modal" role="dialog">${html}</div>`; };
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) $('#modal').innerHTML = ''; });

function celebrate(m, p) {
  play('levelup');
  const { goal, start } = D.settings;
  const rain = matchMedia('(prefers-reduced-motion: reduce)').matches ? '' : `<div class="rain">${Array.from({ length: 24 }, (_, i) =>
    `<i class="coin" style="left:${(i * 37) % 100}%;background:${D.accounts[i % D.accounts.length]?.color ?? '#f2c14e'};animation-delay:${(i % 8) * 0.12}s"></i>`).join('')}</div>`;
  const left = Math.max(0, goal - p.value);
  const monthsLeft = Math.max(1, 12 - Math.max(0, monthsBetween(start, ym(today()))));
  if (m >= 100) {
    const took = Math.max(1, monthsBetween(start, ym(today())) + 1);
    return modal(`${rain}<div class="party-t">GAME CLEAR!</div>
      <div class="party-m">${FMT(goal / 10000)}만원 모으기 성공!<br>정말 해냈어요 ★</div>
      <div class="vs" style="grid-template-columns:1fr 1fr;text-align:left;gap:4px 12px">
        <span class="sub">걸린 기간</span><span>${took}개월</span>
        <span class="sub">넣은 돈</span><span>${FMT(p.principal)}원</span>
        <span class="sub">불어난 돈</span><span class="${p.gain >= 0 ? 'up' : 'down'}">${signed(p.gain)}원</span>
        <span class="sub">총 모은 돈</span><span>${FMT(p.value)}원</span></div>
      <button class="btn go" data-close>계속 모으기</button>`);
  }
  const special = { 25: ['MILESTONE!', '4분의 1 돌파!'], 50: ['HALF WAY!', '절반 돌파!'], 75: ['MILESTONE!', '4분의 3 돌파! 거의 다 왔어요'] }[m];
  const [title, msg] = special ?? ['LEVEL UP!', `LV.${levelOf(m)} 달성!`];
  modal(`${rain}<div class="party-t">${title}</div>
    <div class="party-m">${msg}<br>${FMT(p.value)}원, <span class="gold">목표의 ${m}%</span></div>
    <div class="hint" style="text-align:center">남은 ${FMT(left)}원, 매달 ${FMT(left / monthsLeft)}원이면 돼요.</div>
    <button class="btn go" data-close>좋아!</button>`);
}

// ---------- 지출 ----------
function range() {
  if (expMode === 'day') return [expAnchor, expAnchor];
  if (expMode === 'week') { const s = weekStart(expAnchor); return [s, addDays(s, 6)]; }
  const m = ym(expAnchor);
  return [m + '-01', addDays(addMonth(m, 1) + '-01', -1)];
}
function expenseView() {
  const [from, to] = range();
  const list = D.tx.filter(t => t.type === 'expense' && t.date >= from && t.date <= to)
    .sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1));
  const fixedTotal = expMode === 'month' ? sum(D.fixed) : 0;
  const instTotal = expMode === 'month' ? sum(D.installments, i => installmentFor(i, ym(from))) : 0;
  const total = sum(list, net) + fixedTotal + instTotal;
  const label = expMode === 'day' ? `${md(from)} (${weekday(from)})`
    : expMode === 'week' ? `${+from.slice(5, 7)}/${+from.slice(8)} ~ ${+to.slice(5, 7)}/${+to.slice(8)}`
    : `${from.slice(0, 4)}년 ${+from.slice(5, 7)}월`;
  const word = { day: '오늘', week: '이번 주', month: '이번 달' }[expMode];
  const isNow = today() >= from && today() <= to;

  let extra = '';
  if (expMode === 'week') {
    const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
    const per = days.map(d => sum(list.filter(t => t.date === d), net));
    const max = Math.max(1, ...per);
    extra = `<div class="week">${days.map((d, i) => `<button data-act="goday" data-d="${d}" class="${d === today() ? 'today' : ''}">
      <small>${per[i] ? (per[i] >= 10000 ? Math.round(per[i] / 10000) + '만' : FMT(per[i] / 1000) + '천') : ''}</small>
      <b style="height:${(per[i] / max) * 80}%"></b>${weekday(d)}</button>`).join('')}</div>`;
  }
  if (expMode === 'month') {
    const cats = spend(D, ym(from)).cats;
    const entries = Object.entries(cats).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...entries.map(e => e[1]));
    extra = entries.map(([c, v]) => { const [ic, lb] = splitCat(c); return `<div class="cat"><span>${ic}</span><span>${esc(lb)}</span><span>${FMT(v)}</span>
      <div class="pbar"><i style="width:${(v / max) * 100}%"></i></div></div>`; }).join('');
  }

  // 날짜별 묶음
  const byDay = {};
  for (const t of list) (byDay[t.date] ||= []).push(t);
  const listHtml = Object.entries(byDay).map(([d, ts]) => `
    ${expMode !== 'day' ? `<div class="day-h"><span>${md(d)} (${weekday(d)})</span><span>−${FMT(sum(ts, net))}</span></div>` : ''}
    ${ts.map(t => { const [ic, lb] = splitCat(t.category); return `<button class="tx" data-act="edit" data-id="${t.id}">
      <span class="ic">${ic}</span>
      <div class="l"><div>${esc(t.memo || lb)}${t.back ? '<span class="tag">정산</span>' : ''}</div><div>${t.memo ? esc(lb) : ''}</div></div>
      <div class="r">${t.back ? `<s>${FMT(t.amount)}</s>` : ''}${FMT(net(t))}원</div></button>`; }).join('')}`).join('');

  // 지금 쓸 수 있는 돈 (항상 오늘 기준 이번 달)
  const now = ym(today()), bg = budget(D, now), td = today();
  const daysLeft = new Date(+now.slice(0, 4), +now.slice(5), 0).getDate() - +td.slice(8) + 1;
  const spentToday = sum(D.tx.filter(t => t.type === 'expense' && t.date === td), net);
  const todayLeft = (bg.left + spentToday) / daysLeft - spentToday;
  const incomes = D.tx.filter(t => t.type === 'income' && ym(t.date) === now);
  const wallet = `<button class="box wallet" data-act="income">
      <div class="row"><span class="sub">지금 쓸 수 있는 돈</span><span class="plus">+ 수입</span></div>
      <div class="big ${bg.left < 0 ? 'down' : ''}">${FMT(bg.left)}<span class="unit">원</span></div>
      <div class="hint">${bg.left <= 0 ? '이번 달 생활비를 다 썼어요!'
        : expMode === 'day' ? `오늘은 <span class="gold">${FMT(Math.max(0, todayLeft))}원</span>까지 써도 돼요${todayLeft < 0 ? ' (오늘 예산 초과)' : ''}`
        : `남은 ${daysLeft}일 동안 하루 <span class="gold">${FMT(bg.left / daysLeft)}원</span>씩 쓸 수 있어요`}</div>
    </button>
    ${incomes.map(t => `<button class="income-row" data-act="edit-income" data-id="${t.id}"><span>${coinIcon('#f2c14e')} ${md(t.date)} ${esc(t.memo || '추가 수입')}</span><span class="up">+${FMT(t.amount)}</span></button>`).join('')}`;

  return `
    ${wallet}
    <div class="seg" style="margin-top:14px">${[['day', '일'], ['week', '주'], ['month', '월']].map(([k, v]) => `<button data-act="mode" data-m="${k}" class="${expMode === k ? 'on' : ''}">${v}</button>`).join('')}</div>
    <div class="period"><button data-act="move" data-step="-1" aria-label="이전">◀</button><span>${label}</span><button data-act="move" data-step="1" aria-label="다음">▶</button></div>

    <section class="box">
      <div class="sub">${isNow ? word : label} 쓴 돈</div>
      <div class="big">${FMT(total)}<span style="font-size:16px">원</span></div>
      ${expMode === 'month' ? `<div class="hint">고정지출 ${FMT(fixedTotal)}원${instTotal ? `과 할부 ${FMT(instTotal)}원` : ''} 포함</div>` : ''}
      ${extra}
    </section>

    <h2><span>기록</span><span>${list.length}건</span></h2>
    <section class="box">${listHtml || `<div class="empty">기록이 없어요.<br>오른쪽 아래 [+]를 눌러 기록해요.</div>`}</section>

    ${expMode === 'month' ? `
    <h2><span>고정지출 (매달 자동 포함)</span><span>${FMT(sum(D.fixed))}</span></h2>
    <section class="box">
      ${D.fixed.map((f, i) => { const [ic, lb] = splitCat(f.category); return `<button class="tx" data-act="edit-fixed" data-i="${i}">
        <span class="ic">${ic}</span><div class="l"><div>${esc(f.name)}</div><div>${esc(lb)}, 매달</div></div><div class="r">${FMT(f.amount)}원</div></button>`; }).join('')}
      <button class="addrow" data-act="new-fixed">+ 고정지출 추가 (월세, 통신비, 구독…)</button>
    </section>

    <h2><span>할부지출 (끝나는 달까지 자동 포함)</span><span>${FMT(instTotal)}</span></h2>
    <section class="box">
      ${D.installments.map((x, i) => {
        const [ic, lb] = splitCat(x.category), k = monthsBetween(x.start, ym(from));
        const status = k < 0 ? `${+x.start.slice(5)}월부터` : k >= x.months ? '완료 ✓' : `${k + 1} / ${x.months}개월`;
        const end = addMonth(x.start, x.months - 1);
        return `<button class="tx" data-act="edit-install" data-i="${i}">
        <span class="ic">${ic}</span><div class="l"><div>${esc(x.name)} <span class="tag">${status}</span></div>
        <div>총 ${FMT(x.total)}원, ${end.slice(2, 4)}년 ${+end.slice(5)}월까지</div></div>
        <div class="r">월 ${FMT(Math.floor(x.total / x.months))}원</div></button>`;
      }).join('')}
      <button class="addrow" data-act="new-install">+ 할부지출 추가</button>
    </section>` : ''}`;
}

// ---------- 비교 ----------
function compareView() {
  const now = ym(today()), prev = addMonth(now, -1), day = +today().slice(8);
  const a = spend(D, now, day), b = spend(D, prev, day);
  const sNow = saved(D, now), sPrev = saved(D, prev);
  const sd = sNow - sPrev, d = a.total - b.total;
  const cats = [...new Set([...Object.keys(a.cats), ...Object.keys(b.cats)])].filter(c => a.cats[c] || b.cats[c]);
  const max = Math.max(1, ...cats.flatMap(c => [a.cats[c] || 0, b.cats[c] || 0]));
  const pm = m => +m.slice(5) + '월';
  return `
    <h2><span>${pm(prev)}보다 얼마나 더 모았을까</span></h2>
    <section class="box">
      <div class="big ${sd >= 0 ? 'up' : 'down'}">${signed(sd)}<span style="font-size:16px">원</span></div>
      <div class="sub">${sd > 0 ? '지난달보다 더 모았어요!' : sd < 0 ? '지난달보다 덜 모았어요.' : '지난달과 같아요.'} 목표 달성률 ${sd >= 0 ? '+' : ''}${((sd / D.settings.goal) * 100).toFixed(1)}%p</div>
      <div class="vs"><div><span class="sub">${pm(prev)}</span>${FMT(sPrev)}</div><span class="gold">▶</span><div><span class="sub">${pm(now)}</span>${FMT(sNow)}</div></div>
    </section>

    <h2><span>${pm(prev)} 같은 기간(1~${day}일)보다 얼마나 썼을까</span></h2>
    <section class="box">
      <div class="big ${d <= 0 ? 'up' : 'down'}">${FMT(Math.abs(d))}<span style="font-size:16px">원 ${d <= 0 ? '덜 씀' : '더 씀'}</span></div>
      <div class="sub">지난달 같은 기간과 비교했어요.</div>
      <div class="vs"><div><span class="sub">${pm(prev)}</span>${FMT(b.total)}</div><span class="gold">▶</span><div><span class="sub">${pm(now)}</span>${FMT(a.total)}</div></div>
    </section>

    <h2><span>카테고리별</span><span><span style="color:var(--green)">■</span> 이번 달 <span style="color:var(--tan)">■</span> 지난달</span></h2>
    <section class="box">${cats.length ? cats.map(c => {
      const x = a.cats[c] || 0, y = b.cats[c] || 0, [ic, lb] = splitCat(c);
      const ch = y ? Math.round(((x - y) / y) * 100) : null;
      return `<div class="cmp"><span>${ic} ${esc(lb)}</span>
        <div class="bars"><i style="width:${(x / max) * 100}%"></i><i class="prev" style="width:${(y / max) * 100}%"></i></div>
        <b class="${x <= y ? 'up' : 'down'}">${ch === null ? 'NEW' : (ch > 0 ? '▲' : ch < 0 ? '▼' : '') + Math.abs(ch) + '%'}</b></div>`;
    }).join('') : '<div class="empty">비교할 지출이 아직 없어요.</div>'}</section>`;
}

// ---------- 설정 ----------
function settingsView() {
  const now = ym(today());
  const p = progress(D, now);
  const st = D.settings;
  return `
    <h2><span>목표</span></h2>
    <section class="box">
      <label class="field">목표 금액<input class="money" inputmode="numeric" data-path="settings.goal" value="${FMT(st.goal)}"></label>
      <label class="field">시작 월<input type="month" data-path="settings.start" value="${st.start}" data-str></label>
      <label class="field">월급<input class="money" inputmode="numeric" data-path="settings.salary" value="${FMT(st.salary)}"></label>
    </section>

    <h2><span>저축 계좌 (색, 이름, 매달 넣는 돈)</span></h2>
    <section class="box">
      ${D.accounts.map((a, i) => `<div class="set">
        <input type="color" data-path="accounts.${i}.color" value="${a.color}" data-str>
        <input data-path="accounts.${i}.name" value="${esc(a.name)}" data-str>
        <input class="money" inputmode="numeric" data-path="accounts.${i}.monthly" value="${FMT(a.monthly)}">
        <button class="x" data-act="del" data-path="accounts.${i}" aria-label="삭제">✕</button></div>`).join('')}
      <button class="addrow" data-act="add" data-what="accounts">+ 계좌 추가</button>
    </section>

    <h2><span>계좌별 불리기</span></h2>
    <section class="box">
      <div class="hint" style="margin-bottom:10px">투자 계좌: 한 달에 한 번 증권 앱의 ${+now.slice(5)}월 잔고를 적어요.<br>적금·청약: 연 이율(%)을 적으면 예상 이자를 계산해요 (세전 단리).</div>
      ${p.accs.map((a, i) => {
        const v = D.valuations.find(x => x.accountId === a.id && x.month === now);
        const input = a.invest
          ? `<input class="money" inputmode="numeric" data-act-change="val" data-id="${a.id}" placeholder="잔고 (원금 ${FMT(a.principal)})" value="${v ? FMT(v.value) : ''}">`
          : `<input type="number" inputmode="decimal" step="0.01" data-path="accounts.${i}.rate" placeholder="연 이율 %" value="${a.rate || ''}">`;
        return `<label class="field">${esc(a.name)}<span>${input}<span class="hint">${growth(a)}</span></span></label>`;
      }).join('')}
      <div class="hint">투자 계좌 표시: ${D.accounts.map((a, i) => `<label style="white-space:nowrap;margin-right:8px"><input type="checkbox" data-path="accounts.${i}.invest" ${a.invest ? 'checked' : ''} style="width:auto"> ${esc(a.name)}</label>`).join('')}</div>
    </section>

    <h2><span>카테고리 (아이콘을 누르면 바꿀 수 있어요)</span></h2>
    <section class="box">
      ${st.categories.map((c, i) => `<div class="set" style="grid-template-columns:28px 1fr 30px">
        <button class="ic pick" data-act="icon" data-cat="${esc(c)}" aria-label="${esc(c)} 아이콘 바꾸기">${iconFor(c)}</button><input data-path="settings.categories.${i}" value="${esc(c)}" data-str>
        <button class="x" data-act="del" data-path="settings.categories.${i}" aria-label="삭제">✕</button></div>`).join('')}
      <button class="addrow" data-act="add" data-what="settings.categories">+ 카테고리 추가</button>
    </section>

    <h2><span>세이브 파일 (폰에만 저장돼요. 가끔 꼭 백업!)</span></h2>
    <section class="box" style="display:grid;gap:8px">
      <button class="btn go" data-act="export">백업 내보내기</button>
      <button class="btn" data-act="import">백업 불러오기</button>
      <button class="btn danger" data-act="reset">처음부터 다시 (카테고리만 남김)</button>
    </section>`;
}

const views = { home: homeView, expense: expenseView, compare: compareView, settings: settingsView };
function render() {
  $('#app').innerHTML = views[view]();
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.view === view));
  if (view === 'home') drawJar();
  paintLevel();
}

// ---------- 입력 시트 (지출 / 저축 / 고정지출) ----------
const TITLE = { expense: '지출 기록', saving: '저금통에 넣기', fixed: '고정지출', income: '보너스나 추가 수입', install: '할부지출' };
let F = null;
function openSheet(mode, t = {}) {
  F = { mode, id: t.id, i: t.i, amount: String(t.amount || ''), category: t.category, accountId: t.accountId ?? D.accounts[0]?.id, split: 0 };
  const accTiles = D.accounts.map(a => `<button class="tile${a.id === F.accountId ? ' on' : ''}" data-acc="${a.id}"><span class="ic">${coinIcon(a.color)}</span>${esc(a.name)}</button>`).join('');
  // 수입(새로 입력할 때만): 저금통에 넣을 비율 + 계좌
  const splitHtml = mode === 'income' && !t.id ? `<div class="sub">이 중 저금통에 넣을 돈</div>
    <div class="seg" id="s-split">${[[0, '안 넣기'], [0.5, '절반'], [1, '전부']].map(([v, l]) => `<button data-split="${v}" class="${v === 0 ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="tiles" id="s-acc" hidden>${accTiles}</div>` : '';
  const tiles = mode === 'income' ? '' : mode === 'saving' ? accTiles
    : D.settings.categories.map(c => { const [ic, lb] = splitCat(c); return `<button class="tile${c === F.category ? ' on' : ''}" data-cat="${esc(c)}"><span class="ic">${ic}</span>${esc(lb)}</button>`; }).join('');
  const editing = t.id || t.i != null;
  $('#sheet').innerHTML = `<div class="box sheet" role="dialog" aria-label="${TITLE[mode]}">
    <div class="row"><span class="title">▶ ${TITLE[mode]}</span><button class="x" data-s="close" aria-label="닫기">✕</button></div>
    ${mode === 'fixed' || mode === 'install' ? `<input id="s-name" placeholder="${mode === 'fixed' ? '이름 (예: 월세, 넷플릭스)' : '무엇을 샀나요? (예: 노트북)'}" value="${esc(t.name)}">` : ''}
    ${mode === 'install' ? '<div class="sub" style="margin-bottom:-8px">총 결제 금액</div>' : ''}
    ${mode === 'income' ? `<input id="s-memo" placeholder="어떤 돈? (예: 추석 보너스, 중고 판매)" value="${esc(t.memo)}">` : ''}
    <div class="amount" id="s-amount"></div>
    ${tiles ? `<div class="tiles">${tiles}</div>` : ''}${splitHtml}
    ${mode === 'install' ? `<div class="more" style="margin:0">
      <label>할부 개월<input id="s-months" type="number" inputmode="numeric" min="1" value="${t.months || 3}"></label>
      <div class="seg">${[2, 3, 6, 10, 12, 24].map(m => `<button data-months="${m}" class="${m === (t.months || 3) ? 'on' : ''}">${m}개월</button>`).join('')}</div>
      <label>첫 결제 달<input id="s-start" type="month" value="${t.start || ym(today())}"></label>
    </div>` : ''}
    ${mode !== 'fixed' && mode !== 'install' ? `<details${t.back || (t.memo && t.memo !== '월 납입') || (t.date && t.date !== today()) ? ' open' : ''}>
      <summary>${mode === 'expense' ? '날짜, 메모, 더치페이 정산' : mode === 'income' ? '날짜' : '날짜, 메모'}</summary>
      <div class="more">
        <label>날짜<input type="date" id="s-date" value="${t.date || today()}"></label>
        ${mode === 'income' ? '' : `<label>메모<input id="s-memo" value="${esc(t.memo)}" placeholder="${mode === 'expense' ? '어디서? (선택)' : '메모 (선택)'}"></label>`}
        ${mode === 'expense' ? `<label>돌려받은 돈<input id="s-back" class="money" inputmode="numeric" value="${t.back ? FMT(t.back) : ''}" placeholder="친구에게 받은 금액"></label>` : ''}
      </div></details>` : ''}
    <div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'].map(k => `<button class="key" data-k="${k}">${k}</button>`).join('')}</div>
    <div class="two">${editing ? '<button class="btn danger" data-s="del">삭제</button>' : ''}<button class="btn go" data-s="save" id="s-save">저장</button></div>
  </div>`;
  updateSheet();
}
function updateSheet() {
  const n = +F.amount;
  const el = $('#s-amount');
  el.textContent = n ? FMT(n) + '원' : '0원';
  el.classList.toggle('zero', !n);
  const needAcc = F.mode === 'saving' || (F.mode === 'income' && F.split > 0);
  $('#s-save').disabled = !n || (needAcc ? !F.accountId : F.mode !== 'income' && !F.category);
  $('#s-save').textContent = !n ? '금액을 입력해요' : $('#s-save').disabled ? (needAcc ? '계좌를 골라요' : '카테고리를 골라요')
    : F.mode === 'income' && F.split ? `저장하고 저금통에 ${FMT(Math.round(n * F.split))}원 넣기`
    : F.mode === 'install' ? `월 ${FMT(Math.floor(n / Math.max(1, +$('#s-months').value || 1)))}원씩 ${Math.max(1, +$('#s-months').value || 1)}개월로 저장` : '저장';
}
$('#sheet').addEventListener('input', e => { if (e.target.id === 's-months' && F) updateSheet(); });
const closeSheet = () => { $('#sheet').innerHTML = ''; F = null; };

$('#sheet').addEventListener('click', e => {
  if (e.target.id === 'sheet') return closeSheet();
  const b = e.target.closest('button'); if (!b || !F) return;
  const { k, s, cat, acc: accId, split, months } = b.dataset;
  if (months) {
    $('#s-months').value = months;
    b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    updateSheet();
  }
  if (split != null) {
    F.split = +split;
    b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    $('#s-acc').hidden = !F.split;
    updateSheet();
  }
  if (k) {
    play('dial');
    F.amount = k === '⌫' ? F.amount.slice(0, -1) : (F.amount + k).replace(/^0+/, '').slice(0, 10);
    updateSheet();
  }
  if (cat || accId) {
    if (cat) F.category = cat; else F.accountId = accId;
    b.parentNode.querySelectorAll('.tile').forEach(x => x.classList.toggle('on', x === b));
    updateSheet();
  }
  if (s === 'close') closeSheet();
  if (s === 'del' && confirm('삭제할까요?')) {
    if (F.mode === 'fixed') D.fixed.splice(F.i, 1);
    else if (F.mode === 'install') D.installments.splice(F.i, 1);
    else D.tx = D.tx.filter(t => t.id !== F.id);
    closeSheet(); save();
  }
  if (s === 'save') {
    const amount = +F.amount;
    if (F.mode === 'fixed') {
      const f = { name: $('#s-name').value.trim() || splitCat(F.category)[1], amount, category: F.category };
      if (F.i != null) D.fixed[F.i] = f; else D.fixed.push(f);
    } else if (F.mode === 'install') {
      const x = { name: $('#s-name').value.trim() || splitCat(F.category)[1], total: amount, months: Math.max(1, Math.round(+$('#s-months').value) || 1),
        start: $('#s-start').value || ym(today()), category: F.category };
      if (F.i != null) D.installments[F.i] = x; else D.installments.push(x);
    } else {
      const t = { id: F.id || uid(), type: F.mode, amount, date: $('#s-date').value || today(), memo: $('#s-memo').value.trim() };
      if (F.mode === 'expense') { t.category = F.category; const back = Math.min(amount, num($('#s-back').value)); if (back) t.back = back; }
      if (F.mode === 'saving') t.accountId = F.accountId;
      D.tx = D.tx.filter(x => x.id !== t.id).concat(t);
      if (F.mode === 'saving' || (F.mode === 'income' && F.split)) play('coin');
      // 수입 중 일부를 바로 보너스 저축으로 (이후엔 별개 기록이라 따로 수정)
      if (F.mode === 'income' && F.split) D.tx.push({ id: uid(), type: 'saving', amount: Math.round(amount * F.split), date: t.date, accountId: F.accountId, memo: '보너스: ' + (t.memo || '추가 수입') });
    }
    closeSheet(); save();
  }
});

// ---------- 전역 이벤트 ----------
function walk(path) {
  const k = path.split('.');
  let o = D;
  while (k.length > 1) o = o[k.shift()];
  return [o, k[0]];
}

document.addEventListener('click', e => {
  const nav = e.target.closest('[data-view]');
  if (nav) { view = nav.dataset.view; render(); scrollTo(0, 0); return; }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const { act, id, path, what } = el.dataset;
  const now = ym(today());
  if (act === 'new') openSheet('expense');
  if (act === 'edit') openSheet('expense', D.tx.find(t => t.id === id));
  if (act === 'edit-saving') openSheet('saving', D.tx.find(t => t.id === id));
  if (act === 'new-fixed') openSheet('fixed');
  if (act === 'income') openSheet('income');
  if (act === 'levels') location.href = 'levels.html';
  if (act === 'icon') {
    const c = el.dataset.cat, cur = D.settings.catIcons?.[c];
    modal(`<div class="row"><span>▶ ${esc(c)} 아이콘</span><button class="x" data-close aria-label="닫기">✕</button></div>
      <div class="icon-grid">${ICON_NAMES.map(n => `<button class="tile${n === cur ? ' on' : ''}" data-act="set-icon" data-cat="${esc(c)}" data-icon="${n}" aria-label="${n}">${pixIcon(n)}</button>`).join('')}
      <button class="tile${cur ? '' : ' on'}" data-act="set-icon" data-cat="${esc(c)}" data-icon="">자동</button></div>`);
  }
  if (act === 'set-icon') {
    const icons = (D.settings.catIcons ||= {});
    if (el.dataset.icon) icons[el.dataset.cat] = el.dataset.icon; else delete icons[el.dataset.cat];
    $('#modal').innerHTML = ''; save();
  }
  if (act === 'new-install') openSheet('install');
  if (act === 'edit-install') { const i = +el.dataset.i; openSheet('install', { ...D.installments[i], amount: D.installments[i].total, i }); }
  if (act === 'edit-income') openSheet('income', D.tx.find(t => t.id === id));
  if (act === 'edit-fixed') openSheet('fixed', { ...D.fixed[+el.dataset.i], i: +el.dataset.i });
  if (act === 'bonus') openSheet('saving', { amount: Math.floor(+el.dataset.amt), memo: '남은 생활비' });
  if (act === 'mode') { expMode = el.dataset.m; render(); }
  if (act === 'move') {
    const k = +el.dataset.step;
    expAnchor = expMode === 'day' ? addDays(expAnchor, k) : expMode === 'week' ? addDays(expAnchor, 7 * k) : addMonth(ym(expAnchor), k) + '-01';
    render();
  }
  if (act === 'goday') { expMode = 'day'; expAnchor = el.dataset.d; render(); }
  if (act === 'pay') {
    const a = acc(id), rest = a.monthly - saved(D, now, id);
    if (rest > 0) { D.tx.push({ id: uid(), type: 'saving', amount: rest, date: today(), accountId: id, memo: '월 납입' }); play('coin'); }
    else if (confirm(`${a.name} 이번 달 납입을 취소할까요?`)) {
      D.tx = D.tx.filter(t => !(t.type === 'saving' && t.accountId === id && ym(t.date) === now && t.memo === '월 납입'));
    } else return;
    save();
  }
  if (act === 'quest') {
    const t = D.tx.find(t => t.type === 'saving' && t.accountId === id && ym(t.date) === now && t.memo === '월 납입');
    openSheet('saving', t || { accountId: id, amount: acc(id).monthly, memo: '월 납입' });
  }
  if (act === 'del') {
    if (!confirm('삭제할까요?')) return;
    const [o, k] = walk(path); o.splice(+k, 1); save();
  }
  if (act === 'add') {
    const [o, k] = walk(what);
    o[k].push(what === 'accounts' ? { id: uid(), name: '새 계좌', monthly: 0, color: '#d4a373', invest: false, rate: 0 } : '새 카테고리');
    save();
  }
  if (act === 'export') exportData();
  if (act === 'import') $('#import').click();
  if (act === 'reset' && confirm('지출·저축·수입·고정지출·할부 기록과 계좌·목표 설정이 모두 지워지고 처음 상태로 돌아가요. 카테고리만 남아요.\n\n되돌릴 수 없어요. 계속할까요?')) {
    const categories = D.settings.categories;
    D = structuredClone(DEFAULT);
    D.settings.categories = categories;
    D.settings.celebrated = 0;
    shown = 0; view = 'home'; save();
  }
});

// 금액칸: 입력하는 동안 숫자만 남기고 콤마
document.addEventListener('input', e => {
  if (!e.target.classList.contains('money')) return;
  const d = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12);
  e.target.value = d ? FMT(+d) : '';
});

document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.path) {
    const [o, k] = walk(el.dataset.path), old = o[k];
    if (el.dataset.path.startsWith('settings.categories.') && el.value !== old) {
      for (const x of [...D.tx, ...D.fixed, ...D.installments]) if (x.category === old) x.category = el.value;
      const icons = D.settings.catIcons;
      if (icons?.[old]) { icons[el.value] = icons[old]; delete icons[old]; }
    }
    o[k] = el.type === 'checkbox' ? el.checked : 'str' in el.dataset ? el.value : num(el.value);
    save();
  }
  if (el.dataset.actChange === 'val') {
    const month = ym(today()), accountId = el.dataset.id;
    D.valuations = D.valuations.filter(x => !(x.accountId === accountId && x.month === month));
    if (el.value !== '') D.valuations.push({ month, accountId, value: num(el.value) });
    save();
  }
});

// ---------- 백업 ----------
async function exportData() {
  const name = `모으기-백업-${today()}.json`;
  const blob = new Blob([JSON.stringify(D, null, 1)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file] }).catch(() => {});
  Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name }).click();
}
$('#import').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!Array.isArray(d.tx) || !Array.isArray(d.accounts) || !d.settings) throw 0;
    if (!confirm(`기록 ${d.tx.length}건을 불러와요. 지금 데이터는 덮어써져요. 계속할까요?`)) return;
    D = { ...structuredClone(DEFAULT), ...d };
    D.installments ||= [];
    D.settings.celebrated ??= reachedMilestone(pctOf(progress(D, ym(today()))));
    shown = 0; save();
  } catch { alert('올바른 백업 파일이 아니에요.'); }
  e.target.value = '';
};

$('#scene').innerHTML = sceneHTML(Math.max(screen.width, innerWidth));
const stageScene = sceneHTML(480, [6, 44, 22]); // 저금통 무대 안 하늘
render();
if (!PREVIEW && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
