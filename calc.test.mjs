import assert from 'node:assert/strict';
import { spend, saved, progress, addMonth } from './calc.js';

const D = {
  settings: { goal: 20000000, start: '2026-11' },
  accounts: [{ id: 'a', monthly: 1600000, invest: true }, { id: 'b', monthly: 0, invest: true }],
  fixed: [{ category: '통신', amount: 50000 }],
  tx: [
    { type: 'expense', date: '2026-11-03', amount: 30000, back: 20000, category: '식비' }, // 더치페이
    { type: 'transfer', date: '2026-11-04', amount: 1000000 }, // 엄마 송금
    { type: 'expense', date: '2026-11-20', amount: 5000, category: '카페' },
    { type: 'saving', date: '2026-11-25', amount: 1600000, accountId: 'a' },
    { type: 'expense', date: '2026-10-02', amount: 40000, category: '식비' },
    { type: 'saving', date: '2026-12-25', amount: 100000, accountId: 'b' },
  ],
  valuations: [{ month: '2026-11', accountId: 'b', value: 0 }, { month: '2026-11', accountId: 'a', value: 1700000 }],
};

// 실지출: 고정 5만 + (3만-2만) + 5천, 이체 제외
assert.equal(spend(D, '2026-11').total, 65000);
assert.equal(spend(D, '2026-11').cats['식비'], 10000);
// 같은 날짜 비교: 10일까지면 카페 제외
assert.equal(spend(D, '2026-11', 10).total, 60000);
assert.equal(spend(D, '2026-10', 10).total, 90000);

assert.equal(saved(D, '2026-11'), 1600000);
assert.equal(saved(D, '2026-11', 'b'), 0);
assert.equal(addMonth('2027-01', -1), '2026-12');

// 평가액: a=170만(수익 10만), b=0 + 12월 납입 10만
const p = progress(D, '2026-12');
assert.equal(p.principal, 1700000);
assert.equal(p.value, 1800000);
assert.equal(p.gain, 100000);
// 12월 = 2번째 달 → 예정 2000만*2/12, 남은 11개월
assert.equal(Math.round(p.expected), 3333333);
assert.equal(Math.round(p.need), Math.round((20000000 - 1800000) / 11));

// 시작 전에는 뒤처짐 없음
assert.equal(progress(D, '2026-10').expected, 0);

// 160만 × 12 = 1,920만 → 목표에 80만 모자람
const year = { ...D, tx: Array.from({ length: 12 }, (_, i) => ({ type: 'saving', date: addMonth('2026-11', i) + '-25', amount: 1600000, accountId: 'b' })), valuations: [] };
assert.equal(progress(year, '2027-10').ahead, -800000);

console.log('ok');

import { weekStart, addDays, weekday } from './calc.js';
assert.equal(weekStart('2026-10-04'), '2026-09-28'); // 일요일 → 그 주 월요일
assert.equal(weekStart('2026-09-28'), '2026-09-28');
assert.equal(addDays('2026-02-28', 1), '2026-03-01');
assert.equal(weekday('2026-10-04'), '일');
console.log('date ok');

// 적금 예상 이자: 연 6%, 100만원을 12개월 전에 넣음 → 6만원. 이번 달 넣은 돈은 이자 0
const dep = { settings: { goal: 1, start: '2026-01' }, accounts: [{ id: 's', rate: 6 }], fixed: [], valuations: [],
  tx: [{ type: 'saving', accountId: 's', date: '2026-01-10', amount: 1000000 }, { type: 'saving', accountId: 's', date: '2027-01-10', amount: 500000 }] };
assert.equal(progress(dep, '2027-01').accs[0].gain, 60000);
// 투자 계좌가 아니면 평가액 입력은 무시
assert.equal(progress({ ...dep, accounts: [{ id: 's' }], valuations: [{ month: '2026-02', accountId: 's', value: 9 }] }, '2027-01').accs[0].value, 1500000);
console.log('interest ok');

// 쓸 수 있는 돈: 월급 240 + 보너스 30 − 계획 160 − 보너스 저축 15 − 실지출
import { budget } from './calc.js';
const B = { settings: { salary: 2400000 }, accounts: [{ monthly: 1600000 }], fixed: [{ category: 'x', amount: 50000 }], valuations: [],
  tx: [
    { type: 'income', date: '2026-10-05', amount: 300000 },
    { type: 'saving', date: '2026-10-05', amount: 150000, memo: '보너스' },
    { type: 'saving', date: '2026-10-25', amount: 1600000, memo: '월 납입' }, // 계획 저축은 중복 차감 안 함
    { type: 'expense', date: '2026-10-06', amount: 20000, category: 'x' },
    { type: 'income', date: '2026-09-05', amount: 999 }, // 다른 달
  ] };
const b = budget(B, '2026-10');
assert.equal(b.max, 2400000 + 300000 - 1600000 - 150000);
assert.equal(b.left, b.max - 70000);
console.log('budget ok');

// 할부: 100,000원 3개월 → 33,333 / 33,333 / 33,334, 시작 전·종료 후 0
import { installmentFor } from './calc.js';
const ins = { total: 100000, months: 3, start: '2026-11', category: 'x' };
assert.deepEqual(['2026-10', '2026-11', '2026-12', '2027-01', '2027-02'].map(m => installmentFor(ins, m)), [0, 33333, 33333, 33334, 0]);
const withIns = { ...B, installments: [ins] };
assert.equal(budget(withIns, '2026-12').left, budget(B, '2026-12').left - 33333); // 쓸 수 있는 돈에서 빠짐
console.log('installment ok');

import { reachedMilestone } from './calc.js';
assert.deepEqual([0, 9.9, 10, 24.9, 25, 26, 74, 75, 99.9, 100, 130].map(reachedMilestone), [0, 0, 10, 20, 25, 25, 70, 75, 90, 100, 100]);
console.log('milestone ok');
