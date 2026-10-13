// 순수 계산 함수 (DOM 없음, node 테스트 가능)
export const FMT = n => Math.round(n).toLocaleString('ko-KR');
export const today = () => new Date().toLocaleDateString('sv'); // YYYY-MM-DD (로컬)
export const ym = d => d.slice(0, 7);
export const addMonth = (m, k) => new Date(+m.slice(0, 4), +m.slice(5) - 1 + k, 1).toLocaleDateString('sv').slice(0, 7);
export const monthsBetween = (a, b) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5) - +a.slice(5));
export const sum = (arr, f = t => t.amount) => arr.reduce((s, t) => s + f(t), 0);
export const addDays = (d, k) => { const x = new Date(d + 'T00:00'); x.setDate(x.getDate() + k); return x.toLocaleDateString('sv'); };
export const weekday = d => '일월화수목금토'[new Date(d + 'T00:00').getDay()];
export const weekStart = d => addDays(d, -((new Date(d + 'T00:00').getDay() + 6) % 7)); // 월요일 시작
export const net = t => t.amount - (t.back || 0); // 실지출 = 결제액 - 돌려받은 돈(더치페이)

// 할부: start 달부터 months개월 동안 total을 나눠 냄. 나머지는 마지막 달에
export function installmentFor(i, month) {
  const k = monthsBetween(i.start, month);
  if (k < 0 || k >= i.months) return 0;
  const per = Math.floor(i.total / i.months);
  return per + (k === i.months - 1 ? i.total - per * i.months : 0);
}

// 월 실지출 = 고정지출 + 할부 + 지출. uptoDay: 같은 날짜 비교용
// ponytail: 고정지출은 현재 목록 기준으로 과거 달에도 적용됨. 달마다 달라지면 시작/종료월 필드 추가
export function spend(data, month, uptoDay = 31) {
  const cats = {};
  const add = (c, v) => (cats[c] = (cats[c] || 0) + v);
  for (const f of data.fixed) add(f.category, f.amount);
  for (const i of data.installments || []) { const v = installmentFor(i, month); if (v) add(i.category, v); }
  for (const t of data.tx)
    if (t.type === 'expense' && ym(t.date) === month && +t.date.slice(8) <= uptoDay) add(t.category, net(t));
  return { cats, total: sum(Object.values(cats), v => v) };
}

// 이번 달 쓸 수 있는 돈 = 월급 + 추가 수입 − 계획 저축 − 보너스 저축(월 납입 외) − 실지출
export function budget(data, month) {
  const inMonth = t => ym(t.date) === month;
  const income = sum(data.tx.filter(t => t.type === 'income' && inMonth(t)));
  const bonus = sum(data.tx.filter(t => t.type === 'saving' && inMonth(t) && t.memo !== '월 납입'));
  const plan = sum(data.accounts, a => a.monthly);
  const max = data.settings.salary + income - plan - bonus;
  const spent = spend(data, month).total;
  return { income, bonus, plan, max, spent, left: max - spent };
}

export const saved = (data, month, accountId) =>
  sum(data.tx.filter(t => t.type === 'saving' && ym(t.date) === month && (!accountId || t.accountId === accountId)));

// 계좌별 원금/평가액 + 목표 페이스
// 투자 계좌: 마지막 입력 평가액 + 그 달 이후 납입액 (입력이 없으면 원금)
// 적금·청약: 원금 + 예상 이자 (납입한 달부터 지난 개월 수만큼 연 이율 단리)
// ponytail: 세전 단리 추정. 우대금리·정부기여금·세금은 무시, 필요하면 계좌별 이율을 그만큼 조정
export function progress(data, nowMonth) {
  const accs = data.accounts.map(a => {
    const sv = data.tx.filter(t => t.type === 'saving' && t.accountId === a.id);
    const principal = sum(sv);
    let value = principal;
    if (a.invest) {
      const v = data.valuations.filter(x => x.accountId === a.id).sort((x, y) => (x.month < y.month ? -1 : 1)).at(-1);
      if (v) value = v.value + sum(sv.filter(t => ym(t.date) > v.month));
    } else if (a.rate) {
      value += sum(sv, t => (t.amount * a.rate * Math.max(0, monthsBetween(ym(t.date), nowMonth))) / 1200);
    }
    return { ...a, principal, value, gain: value - principal };
  });
  const { goal, start } = data.settings;
  const principal = sum(accs, a => a.principal);
  const value = sum(accs, a => a.value);
  const m = monthsBetween(start, nowMonth);
  const passed = Math.min(12, Math.max(0, m)); // 이번 달 이전에 지난 달 수
  const expected = m < 0 ? 0 : (goal * Math.min(12, passed + 1)) / 12; // 이번 달 말까지 모여 있어야 할 금액 (시작 전이면 0)
  const need = Math.max(0, goal - value) / Math.max(1, 12 - passed); // 이번 달 포함 남은 달마다 필요한 금액
  return { accs, principal, value, gain: value - principal, expected, ahead: value - expected, need };
}

// 축하 구간(%): 10%마다 레벨업 + 25·75% 특별 메시지
export const MILESTONES = [10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100];
export const reachedMilestone = pct => MILESTONES.filter(m => m <= pct).at(-1) ?? 0;
