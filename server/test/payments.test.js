import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  round2,
  commissionFor,
  normalizeTreatment,
  normalizePatient,
  recomputePatientTotals,
  orderTreatments,
  removeTreatment,
  findTreatment,
  addPayment,
  buildPatientPayload,
  flattenPayments,
  summarizePayments,
  adjustTreatmentPayments
} from '../src/utils/payments.js';

const eth = (month, day, year) => `${month} ${day} ${year}`;

test('commissionFor charges only the configured percentage', () => {
  assert.equal(commissionFor(1000, 10), 100);
  assert.equal(commissionFor(250, 4), 10);
  assert.equal(round2(commissionFor(33.33, 4)), 1.33);
});

test('partial payments accrue commission only on money received', () => {
  const t = normalizeTreatment({ totalFee: 1000, doctorPct: 10, paidAmount: 200, balance: 800 });
  assert.equal(t.paidAmount, 200);
  assert.equal(t.balance, 800);
  assert.equal(t.myEarning, 20);
  assert.equal(t.payments.length, 1);
  assert.equal(t.payments[0].amount, 200);
  assert.equal(t.payments[0].commission, 20);
});

test('multiple installments each record their own date and commission', () => {
  const t = normalizeTreatment({ totalFee: 1000, doctorPct: 10, paidAmount: 0, balance: 1000 });
  assert.equal(addPayment(t, { amount: 200, date: '2026-01-10', ethDate: eth('ጥቅምት', 1, 2018) }).ok, true);
  assert.equal(addPayment(t, { amount: 300, date: '2026-02-10', ethDate: eth('ህዳር', 1, 2018) }).ok, true);
  assert.equal(t.paidAmount, 500);
  assert.equal(t.balance, 500);
  assert.equal(t.myEarning, 50);
  assert.deepEqual(t.payments.map(p => p.amount), [200, 300]);
  assert.deepEqual(t.payments.map(p => p.commission), [20, 30]);
  assert.deepEqual(t.payments.map(p => p.date), ['2026-01-10', '2026-02-10']);
});

test('final installment settles the treatment and marks it full', () => {
  const t = normalizeTreatment({ totalFee: 1000, doctorPct: 10, paidAmount: 500, balance: 500, paymentType: 'partial' });
  addPayment(t, { amount: 500, date: '2026-03-01' });
  assert.equal(t.paidAmount, 1000);
  assert.equal(t.balance, 0);
  assert.equal(t.myEarning, 100);
  assert.equal(t.paymentType, 'full');
});

test('overpayment and non-positive payments are rejected', () => {
  const t = normalizeTreatment({ totalFee: 1000, doctorPct: 10, paidAmount: 200, balance: 800 });
  assert.equal(addPayment(t, { amount: 900 }).ok, false);
  assert.equal(addPayment(t, { amount: 0 }).ok, false);
  assert.equal(addPayment(t, { amount: -5 }).ok, false);
  assert.equal(t.paidAmount, 200);
  assert.equal(t.myEarning, 20);
});

test('duplicate payments with the same reference are prevented', () => {
  const t = normalizeTreatment({ totalFee: 1000, doctorPct: 10, paidAmount: 100, balance: 900 });
  const first = addPayment(t, { amount: 100, ref: 'abc-123' });
  const second = addPayment(t, { amount: 100, ref: 'abc-123' });
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.duplicate, true);
  assert.equal(t.payments.filter(p => p.ref === 'abc-123').length, 1);
  assert.equal(t.paidAmount, 200);
  assert.equal(t.myEarning, 20);
});

test('separate treatments keep separate fees, payments, balances and commission', () => {
  const t1 = normalizeTreatment({ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidAmount: 400, balance: 600 });
  const t2 = normalizeTreatment({ _id: 't2', procedure: 'Crown', totalFee: 5000, doctorPct: 10, paidAmount: 1000, balance: 4000 });
  const patient = { _id: 'p1', patientName: 'Abebe', treatments: [t1, t2] };
  recomputePatientTotals(patient);
  assert.equal(patient.totalFee, 6000);
  assert.equal(patient.paidAmount, 1400);
  assert.equal(patient.balance, 4600);
  assert.equal(patient.myEarning, 140);

  addPayment(t2, { amount: 1000, date: '2026-02-01' });
  assert.equal(t1.paidAmount, 400);
  assert.equal(t1.balance, 600);
  assert.equal(t1.myEarning, 40);
  assert.equal(t2.paidAmount, 2000);
  assert.equal(t2.balance, 3000);
  assert.equal(t2.myEarning, 200);
  recomputePatientTotals(patient);
  assert.equal(patient.paidAmount, 2400);
  assert.equal(patient.balance, 3600);
  assert.equal(patient.myEarning, 240);
});

test('creating a new patient records initial payment and commission', () => {
  const payload = buildPatientPayload({
    gregDate: '2026-01-05',
    patientName: 'New Patient',
    doctorPct: 10,
    treatments: [
      { procedure: 'Filling', totalFee: 1000, doctorPct: 10, paymentType: 'full' },
      { procedure: 'X-Ray', totalFee: 500, doctorPct: 10, paymentType: 'partial', paidToday: 100 }
    ]
  }, 'doc1');

  assert.equal(payload.totalFee, 1500);
  assert.equal(payload.paidAmount, 1100);
  assert.equal(payload.balance, 400);
  assert.equal(payload.myEarning, 110);
  assert.equal(payload.treatments[0].payments[0].amount, 1000);
  assert.equal(payload.treatments[0].payments[0].commission, 100);
  assert.equal(payload.treatments[1].payments[0].amount, 100);
  assert.equal(payload.treatments[1].payments[0].commission, 10);
});

test('new treatment for an existing patient does not inherit previous payments', () => {
  const existing = {
    _id: 'p1',
    patientName: 'Abebe',
    gregDate: '2026-01-05',
    ethDate: eth('ታኅሣሥ', 27, 2018),
    doctorPct: 10,
    treatments: [normalizeTreatment({ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidAmount: 400, balance: 600 })]
  };

  const payload = buildPatientPayload({
    gregDate: '2026-02-05',
    patientName: 'Abebe',
    doctorPct: 10,
    treatments: [
      { _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paymentType: 'partial', paidToday: 400 },
      { procedure: 'Extraction', totalFee: 500, doctorPct: 10, paymentType: 'partial', paidToday: 100 }
    ]
  }, 'doc1', existing);

  const [kept, added] = payload.treatments;
  assert.equal(kept._id, 't1');
  assert.equal(kept.paidAmount, 400);
  assert.equal(kept.payments.length, 1);
  assert.equal(added.paidAmount, 100);
  assert.equal(added.balance, 400);
  assert.equal(added.myEarning, 10);
  assert.equal(added.payments.length, 1);
  assert.notEqual(added._id, 't1');

  assert.equal(payload.totalFee, 1500);
  assert.equal(payload.paidAmount, 500);
  assert.equal(payload.balance, 1000);
  assert.equal(payload.myEarning, 50);
});

test('editing an existing treatment preserves its payment history', () => {
  const existing = {
    _id: 'p1',
    patientName: 'Abebe',
    gregDate: '2026-01-05',
    doctorPct: 10,
    treatments: [normalizeTreatment({ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidAmount: 500, balance: 500 })]
  };
  const before = existing.treatments[0].payments.length;

  const payload = buildPatientPayload({
    gregDate: '2026-01-05',
    patientName: 'Abebe',
    doctorPct: 10,
    treatments: [{ _id: 't1', procedure: 'Filling (updated)', totalFee: 1200, doctorPct: 10, paymentType: 'partial', paidToday: 500 }]
  }, 'doc1', existing);

  assert.equal(payload.treatments[0].procedure, 'Filling (updated)');
  assert.equal(payload.treatments[0].payments.length, before);
  assert.equal(payload.treatments[0].paidAmount, 500);
  assert.equal(payload.treatments[0].balance, 700);
  assert.equal(payload.treatments[0].myEarning, 50);
});

test('raising the amount received on edit replaces the recorded amount in place', () => {
  const existing = {
    _id: 'p1',
    patientName: 'Abebe',
    gregDate: '2026-01-05',
    doctorPct: 10,
    treatments: [normalizeTreatment({ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidAmount: 400, balance: 600 })]
  };

  const payload = buildPatientPayload({
    gregDate: '2026-01-05',
    patientName: 'Abebe',
    doctorPct: 10,
    treatments: [{ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paymentType: 'partial', paidToday: 700 }]
  }, 'doc1', existing);

  const t = payload.treatments[0];
  assert.equal(t.paidAmount, 700);
  assert.equal(t.balance, 300);
  assert.equal(t.payments.length, 1);
  assert.equal(t.payments[0].amount, 700);
  assert.equal(t.payments[0].commission, 70);
  assert.equal(t.myEarning, 70);
});

test('raising the amount received on edit extends the most recent installment', () => {
  const existingT = normalizeTreatment({ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidAmount: 800, balance: 200 });
  existingT.payments = [
    { date: '2026-01-01', ethDate: '', amount: 500, commission: 50, note: 'first', ref: '', receivedAt: null },
    { date: '2026-02-01', ethDate: '', amount: 300, commission: 30, note: 'second', ref: '', receivedAt: null }
  ];

  const existing = { _id: 'p1', patientName: 'Abebe', gregDate: '2026-01-05', doctorPct: 10, treatments: [existingT] };

  const payload = buildPatientPayload({
    gregDate: '2026-01-05',
    patientName: 'Abebe',
    doctorPct: 10,
    treatments: [{ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paymentType: 'partial', paidToday: 900 }]
  }, 'doc1', existing);

  const t = payload.treatments[0];
  assert.equal(t.paidAmount, 900);
  assert.equal(t.payments.length, 2);
  assert.equal(t.payments[0].amount, 500);
  assert.equal(t.payments[1].amount, 400);
  assert.equal(t.payments[1].date, '2026-02-01');
  assert.equal(t.payments[1].commission, 40);
});

test('editing the amount received never adds an extra report row', () => {
  const existing = {
    _id: 'p1',
    patientName: 'Abebe',
    gregDate: '2026-01-05',
    doctorPct: 10,
    treatments: [normalizeTreatment({ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidAmount: 400, balance: 600 })]
  };

  const before = summarizePayments([existing], {}).rows.length;

  const payload = buildPatientPayload({
    gregDate: '2026-01-05',
    patientName: 'Abebe',
    doctorPct: 10,
    treatments: [{ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paymentType: 'partial', paidToday: 700 }]
  }, 'doc1', existing);

  const after = summarizePayments([payload], {}).rows.length;
  assert.equal(after, before);
  assert.equal(after, 1);
});

test('lowering the amount received on edit trims the most recent payment first', () => {
  const existingT = normalizeTreatment({ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidAmount: 800, balance: 200 });
  existingT.payments = [
    { date: '2026-01-01', ethDate: '', amount: 500, commission: 50, note: 'first', ref: '', receivedAt: null },
    { date: '2026-02-01', ethDate: '', amount: 300, commission: 30, note: 'second', ref: '', receivedAt: null }
  ];

  const existing = {
    _id: 'p1',
    patientName: 'Abebe',
    gregDate: '2026-01-05',
    doctorPct: 10,
    treatments: [existingT]
  };

  const payload = buildPatientPayload({
    gregDate: '2026-01-05',
    patientName: 'Abebe',
    doctorPct: 10,
    treatments: [{ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paymentType: 'partial', paidToday: 600 }]
  }, 'doc1', existing);

  const t = payload.treatments[0];
  assert.equal(t.paidAmount, 600);
  assert.equal(t.balance, 400);
  assert.equal(t.payments.length, 2);
  assert.equal(t.payments[0].amount, 500);
  assert.equal(t.payments[0].commission, 50);
  assert.equal(t.payments[1].amount, 100);
  assert.equal(t.payments[1].commission, 10);
  assert.equal(t.myEarning, 60);
});

test('editing the amount received can never exceed the treatment fee', () => {
  const existing = {
    _id: 'p1',
    patientName: 'Abebe',
    gregDate: '2026-01-05',
    doctorPct: 10,
    treatments: [normalizeTreatment({ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidAmount: 400, balance: 600 })]
  };

  const payload = buildPatientPayload({
    gregDate: '2026-01-05',
    patientName: 'Abebe',
    doctorPct: 10,
    treatments: [{ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paymentType: 'partial', paidToday: 9999 }]
  }, 'doc1', existing);

  const t = payload.treatments[0];
  assert.equal(t.paidAmount, 1000);
  assert.equal(t.balance, 0);
  assert.equal(t.payments.length, 1);
  assert.equal(t.payments[0].amount, 1000);
  assert.equal(t.myEarning, 100);
});

test('adjustTreatmentPayments leaves the source payments untouched', () => {
  const treatment = {
    totalFee: 1000,
    doctorPct: 10,
    payments: [{ date: '2026-01-01', amount: 500, commission: 50 }]
  };

  const result = adjustTreatmentPayments(treatment, 700, { date: '2026-05-01', ethDate: '' });

  assert.equal(result.length, 1);
  assert.equal(result[0].amount, 700);
  assert.equal(result[0].date, '2026-01-01');
  assert.equal(treatment.payments.length, 1);
  assert.equal(treatment.payments[0].amount, 500);
});

test('adjustTreatmentPayments creates a single payment when none exist yet', () => {
  const treatment = { totalFee: 1000, doctorPct: 10, payments: [] };

  const result = adjustTreatmentPayments(treatment, 300, { date: '2026-05-01', ethDate: '' });

  assert.equal(result.length, 1);
  assert.equal(result[0].amount, 300);
  assert.equal(result[0].date, '2026-05-01');
  assert.equal(result[0].commission, 30);
});

test('legacy records are preserved and commission is limited to money received', () => {
  const legacy = {
    _id: 'p9',
    patientName: 'Sara',
    gregDate: '2025-12-01',
    ethDate: eth('ኅዳር', 22, 2018),
    procedure: 'Root Canal',
    totalFee: 1000,
    doctorPct: 10,
    myEarning: 100,
    balance: 600,
    paidAmount: 400,
    createdAt: new Date('2025-12-01')
  };
  const normalized = normalizePatient(legacy);
  assert.equal(normalized.totalFee, 1000);
  assert.equal(normalized.paidAmount, 400);
  assert.equal(normalized.balance, 600);
  assert.equal(normalized.myEarning, 40);
  assert.equal(normalized.treatments.length, 1);
  assert.equal(normalized.treatments[0].payments.length, 1);
  assert.equal(normalized.treatments[0].payments[0].date, '2025-12-01');
  assert.equal(normalized.patientName, 'Sara');
});

test('fully paid legacy records keep their full commission', () => {
  const legacy = { _id: 'p9', patientName: 'Sara', gregDate: '2025-12-01', ethDate: eth('ኅዳር', 22, 2018), totalFee: 1000, doctorPct: 10, myEarning: 100 };
  const normalized = normalizePatient(legacy);
  assert.equal(normalized.paidAmount, 1000);
  assert.equal(normalized.balance, 0);
  assert.equal(normalized.myEarning, 100);
});

test('a restored legacy patient is fully paid even after schema defaults set paidAmount and balance to zero', () => {
  // Patient.insertMany applies the schema defaults, so a legacy document that
  // had no payment fields is stored with paidAmount:0, balance:0, treatments:[].
  const restored = {
    _id: 'p10',
    patientName: 'Sara',
    gregDate: '2025-12-01',
    ethDate: eth('ኅዳር', 22, 2018),
    procedure: 'Filling',
    totalFee: 1000,
    doctorPct: 10,
    myEarning: 100,
    paidAmount: 0,
    balance: 0,
    treatments: []
  };
  const normalized = normalizePatient(restored);
  assert.equal(normalized.paidAmount, 1000);
  assert.equal(normalized.balance, 0);
  assert.equal(normalized.myEarning, 100);
  assert.equal(normalized.treatments.length, 1);
});

test('a treatment with no payments and an outstanding balance stays unpaid', () => {
  const t = normalizeTreatment({ totalFee: 1000, doctorPct: 10, paidAmount: 0, balance: 1000 });
  assert.equal(t.paidAmount, 0);
  assert.equal(t.balance, 1000);
  assert.equal(t.myEarning, 0);
});

test('a partially paid legacy treatment keeps its recorded amount', () => {
  const t = normalizeTreatment({ totalFee: 1000, doctorPct: 10, paidAmount: 400, balance: 600 });
  assert.equal(t.paidAmount, 400);
  assert.equal(t.balance, 600);
  assert.equal(t.myEarning, 40);
});

test('report totals are attributed to the payment date and month', () => {
  const t1 = normalizeTreatment({ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidAmount: 200, balance: 800 });
  t1.payments = [{ date: '2026-01-10', ethDate: eth('ጥቅምት', 1, 2018), amount: 200, commission: 20, ref: '', note: '' }];
  t1.paidAmount = 200;
  t1.balance = 800;
  t1.myEarning = 20;

  const t2 = normalizeTreatment({ _id: 't2', procedure: 'Crown', totalFee: 5000, doctorPct: 10, paidAmount: 0, balance: 5000 });
  t2.payments = [];
  t2.paidAmount = 0;
  t2.balance = 5000;
  t2.myEarning = 0;

  const patient = { _id: 'p1', patientName: 'Abebe', cardNumber: 'C1', ticketNo: 'T1', ethDate: eth('ጥቅምት', 1, 2018), treatments: [t1, t2] };

  addPayment(t2, { amount: 1000, date: '2026-02-05', ethDate: eth('ህዳር', 1, 2018), ref: 'r2' });
  addPayment(t1, { amount: 300, date: '2026-02-05', ethDate: eth('ህዳር', 1, 2018), ref: 'r1' });

  const jan = summarizePayments([patient], { dateFrom: '2026-01-01', dateTo: '2026-01-31' });
  assert.equal(jan.income, 200);
  assert.equal(jan.cut, 20);
  assert.equal(jan.count, 1);

  const feb = summarizePayments([patient], { dateFrom: '2026-02-01', dateTo: '2026-02-28' });
  assert.equal(feb.income, 1300);
  assert.equal(feb.cut, 130);
  assert.equal(feb.count, 2);

  const monthPattern = new RegExp('^' + eth('ህዳር', '\\d{1,2}', 2018) + '$');
  const ethMonth = summarizePayments([patient], { ethPattern: monthPattern });
  assert.equal(ethMonth.income, 1300);
  assert.equal(ethMonth.cut, 130);

  const all = summarizePayments([patient], {});
  assert.equal(all.income, 1500);
  assert.equal(all.cut, 150);
});

test('unpaid treatments contribute no commission to reports', () => {
  const t = normalizeTreatment({ _id: 't1', procedure: 'Crown', totalFee: 5000, doctorPct: 10, paidAmount: 0, balance: 5000 });
  t.payments = [];
  t.paidAmount = 0;
  t.balance = 5000;
  t.myEarning = 0;
  const patient = { _id: 'p1', patientName: 'Abebe', treatments: [t] };
  const summary = summarizePayments([patient], {});
  assert.equal(summary.income, 0);
  assert.equal(summary.cut, 0);
  assert.equal(summary.count, 0);
});

test('an installment updates only the selected treatment (route-style selection)', () => {
  const a = normalizeTreatment({ _id: 'A', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidAmount: 300, balance: 700 });
  const b = normalizeTreatment({ _id: 'B', procedure: 'Crown', totalFee: 2000, doctorPct: 20, paidAmount: 400, balance: 1600 });
  const patient = { _id: 'p1', patientName: 'Abebe', treatments: [a, b] };
  recomputePatientTotals(patient);

  assert.equal(a.totalFee, 1000);
  assert.equal(b.totalFee, 2000);

  const selected = findTreatment(patient, 'A');
  assert.equal(selected, a);
  assert.equal(addPayment(selected, { amount: 200, date: '2026-03-01', ethDate: eth('መጋቢት', 1, 2018), ref: 'x1' }).ok, true);
  recomputePatientTotals(patient);

  assert.equal(a.paidAmount, 500);
  assert.equal(a.balance, 500);
  assert.equal(a.myEarning, 50);
  assert.equal(a.payments.length, 2);

  assert.equal(b.paidAmount, 400);
  assert.equal(b.balance, 1600);
  assert.equal(b.myEarning, 80);
  assert.equal(b.payments.length, 1);

  assert.equal(patient.paidAmount, 900);
  assert.equal(patient.balance, 2100);
  assert.equal(patient.myEarning, 130);
});

test('new treatment does not inherit payments even when the prior treatment is fully paid', () => {
  const existing = {
    _id: 'p1',
    patientName: 'Abebe',
    gregDate: '2026-01-05',
    doctorPct: 10,
    treatments: [normalizeTreatment({ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidAmount: 1000, balance: 0 })]
  };

  const payload = buildPatientPayload({
    gregDate: '2026-03-05',
    patientName: 'Abebe',
    doctorPct: 10,
    treatments: [
      { _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paymentType: 'full' },
      { procedure: 'X-Ray', totalFee: 800, doctorPct: 10, paymentType: 'partial', paidToday: 0 }
    ]
  }, 'doc1', existing);

  const [kept, added] = payload.treatments;
  assert.equal(kept._id, 't1');
  assert.equal(kept.paidAmount, 1000);
  assert.equal(kept.balance, 0);
  assert.equal(kept.myEarning, 100);
  assert.equal(kept.payments.length, 1);

  assert.equal(added.paidAmount, 0);
  assert.equal(added.balance, 800);
  assert.equal(added.myEarning, 0);
  assert.equal(added.payments.length, 0);
  assert.notEqual(added._id, 't1');

  assert.equal(payload.totalFee, 1800);
  assert.equal(payload.paidAmount, 1000);
  assert.equal(payload.balance, 800);
  assert.equal(payload.myEarning, 100);
});

test('legacy patient edited through the payload keeps prior payment and stays compatible', () => {
  const legacyRaw = {
    _id: 'p9',
    patientName: 'Sara',
    gregDate: '2025-12-01',
    ethDate: eth('ኅዳር', 22, 2018),
    procedure: 'Root Canal',
    totalFee: 1000,
    doctorPct: 10,
    myEarning: 100,
    paidAmount: 400,
    balance: 600,
    createdAt: new Date('2025-12-01')
  };

  assert.deepEqual((legacyRaw.treatments || []), []);

  const payload = buildPatientPayload({
    gregDate: '2025-12-01',
    patientName: 'Sara',
    doctorPct: 10,
    treatments: [
      { _id: 'p9', procedure: 'Root Canal', totalFee: 1000, doctorPct: 10, paymentType: 'partial', paidToday: 400, balance: 600, payments: [] },
      { procedure: 'Cleaning', totalFee: 600, doctorPct: 10, paymentType: 'partial', paidToday: 100 }
    ]
  }, 'doc1', legacyRaw);

  assert.equal(payload.treatments.length, 2);
  assert.equal(payload.treatments[0].paidAmount, 400);
  assert.equal(payload.treatments[0].balance, 600);
  assert.equal(payload.treatments[0].myEarning, 40);
  assert.equal(payload.treatments[0].payments.length, 1);
  assert.equal(payload.treatments[1].paidAmount, 100);
  assert.equal(payload.treatments[1].balance, 500);
  assert.equal(payload.treatments[1].myEarning, 10);

  assert.equal(payload.totalFee, 1600);
  assert.equal(payload.paidAmount, 500);
  assert.equal(payload.balance, 1100);
  assert.equal(payload.myEarning, 50);
});

test('extending a legacy patient preserves the original payment date and adds an isolated treatment', () => {
  const legacyRaw = {
    _id: 'p9',
    patientName: 'Sara',
    gregDate: '2025-12-01',
    ethDate: eth('ኅዳር', 22, 2018),
    procedure: 'Root Canal',
    totalFee: 1000,
    doctorPct: 10,
    myEarning: 100,
    paidAmount: 400,
    balance: 600,
    createdAt: new Date('2025-12-01')
  };

  const base = normalizePatient(legacyRaw).treatments[0];
  assert.equal(base.payments[0].date, '2025-12-01');

  const payload = buildPatientPayload({
    gregDate: '2026-02-10',
    ethDate: eth('የካቲት', 3, 2018),
    patientName: 'Sara',
    doctorPct: 10,
    treatments: [
      { _id: base._id, procedure: 'Root Canal', totalFee: 1000, doctorPct: 10, paymentType: 'partial', paidToday: 400, balance: 600, payments: base.payments },
      { procedure: 'Cleaning', totalFee: 600, doctorPct: 10, paymentType: 'partial', paidToday: 100 }
    ]
  }, 'doc1', legacyRaw);

  const [kept, added] = payload.treatments;
  assert.equal(kept.payments.length, 1);
  assert.equal(kept.payments[0].amount, 400);
  assert.equal(kept.payments[0].date, '2025-12-01');
  assert.equal(kept.myEarning, 40);

  assert.equal(added.payments.length, 1);
  assert.equal(added.payments[0].date, '2026-02-10');
  assert.equal(added.myEarning, 10);
  assert.notEqual(added._id, base._id);

  assert.equal(payload.totalFee, 1600);
  assert.equal(payload.paidAmount, 500);
  assert.equal(payload.balance, 1100);
  assert.equal(payload.myEarning, 50);
});

test('repeated edits keep each treatment payment history isolated', () => {
  const existing = {
    _id: 'p1',
    patientName: 'Abebe',
    gregDate: '2026-01-05',
    doctorPct: 10,
    treatments: [
      normalizeTreatment({ _id: 'A', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidAmount: 300, balance: 700 }),
      normalizeTreatment({ _id: 'B', procedure: 'Crown', totalFee: 2000, doctorPct: 10, paidAmount: 500, balance: 1500 })
    ]
  };

  const body = {
    gregDate: '2026-02-01',
    patientName: 'Abebe',
    doctorPct: 10,
    treatments: existing.treatments.map(t => ({
      _id: t._id,
      procedure: t.procedure,
      totalFee: t.totalFee,
      doctorPct: t.doctorPct,
      paymentType: t.paymentType,
      paidToday: t.paidAmount,
      paidAmount: t.paidAmount,
      balance: t.balance,
      payments: t.payments
    }))
  };

  const payload = buildPatientPayload(body, 'doc1', existing);
  assert.equal(payload.treatments.length, 2);
  assert.equal(payload.treatments[0].paidAmount, 300);
  assert.equal(payload.treatments[0].balance, 700);
  assert.equal(payload.treatments[0].payments.length, 1);
  assert.equal(payload.treatments[1].paidAmount, 500);
  assert.equal(payload.treatments[1].balance, 1500);
  assert.equal(payload.treatments[1].payments.length, 1);
  assert.equal(payload.paidAmount, 800);
  assert.equal(payload.balance, 2200);
  assert.equal(payload.myEarning, 80);
});

test('two treatments for one patient expose independent fee, paid, balance and commission', () => {
  const patient = {
    _id: 'p1',
    patientName: 'Ermias Birru',
    cardNumber: 'C-9',
    ticketNo: 'T-9',
    doctorPct: 4,
    treatments: [
      normalizeTreatment({ _id: 't1', procedure: 'Scaling & Polishing', totalFee: 3000, doctorPct: 4, paidAmount: 2000, balance: 1000 }),
      normalizeTreatment({ _id: 't2', procedure: 'Composite Restoration', totalFee: 4000, doctorPct: 4, paidAmount: 2000, balance: 2000 })
    ]
  };
  recomputePatientTotals(patient);

  // Exactly what the Patients page renders, one row per treatment.
  const rows = patient.treatments.map(t => ({
    procedure: t.procedure,
    fee: t.totalFee,
    paid: t.paidAmount,
    balance: t.balance,
    cut: t.myEarning
  }));

  assert.deepEqual(rows, [
    { procedure: 'Scaling & Polishing', fee: 3000, paid: 2000, balance: 1000, cut: 80 },
    { procedure: 'Composite Restoration', fee: 4000, paid: 2000, balance: 2000, cut: 80 }
  ]);

  // Patient aggregates are the sum of the independent treatments (no double counting).
  assert.equal(patient.totalFee, 7000);
  assert.equal(patient.paidAmount, 4000);
  assert.equal(patient.balance, 3000);
  assert.equal(patient.myEarning, 160);

  // A later installment on one treatment only moves that treatment's numbers.
  addPayment(patient.treatments[0], { amount: 1000, date: '2026-02-01', ref: 'ermias-1' });
  recomputePatientTotals(patient);
  assert.equal(patient.treatments[0].balance, 0);
  assert.equal(patient.treatments[0].myEarning, 120);
  assert.equal(patient.treatments[1].balance, 2000);
  assert.equal(patient.treatments[1].myEarning, 80);
  assert.equal(patient.balance, 2000);
  assert.equal(patient.myEarning, 200);
});

test('flattenPayments exposes each treatment payment separately', () => {
  const t1 = normalizeTreatment({ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidAmount: 200, balance: 800 });
  t1.payments = [{ date: '2026-01-10', amount: 200, commission: 20, ref: '', note: '' }];
  t1.paidAmount = 200;
  t1.balance = 800;
  t1.myEarning = 20;
  const t2 = normalizeTreatment({ _id: 't2', procedure: 'Crown', totalFee: 500, doctorPct: 10, paidAmount: 500, balance: 0 });
  t2.payments = [{ date: '2026-01-11', amount: 500, commission: 50, ref: '', note: '' }];
  const flat = flattenPayments({ _id: 'p1', patientName: 'Abebe', treatments: [t1, t2] });
  assert.equal(flat.length, 2);
  assert.equal(flat[0].procedure, 'Filling');
  assert.equal(flat[1].procedure, 'Crown');
  assert.equal(flat[0].treatmentId, 't1');
});

test('adding a treatment keeps the registration date and the historical treatment date', () => {
  const meskerem = eth('መስከረም', 1, 2018);
  const tikimt = eth('ጥቅምት', 3, 2019);

  const existing = {
    _id: 'p1',
    patientName: 'Kemsur Redi',
    gregDate: '2025-09-11',
    ethDate: meskerem,
    doctorPct: 4,
    treatments: [normalizeTreatment({
      _id: 't1',
      date: '2025-09-11',
      ethDate: meskerem,
      procedure: 'Simple Extraction',
      totalFee: 4000,
      doctorPct: 4,
      paidAmount: 4000,
      balance: 0
    })]
  };

  const payload = buildPatientPayload({
    gregDate: '2026-10-13',
    ethDate: tikimt,
    patientName: 'Kemsur Redi',
    doctorPct: 4,
    treatments: [
      { _id: 't1', date: '2025-09-11', ethDate: meskerem, procedure: 'Simple Extraction', totalFee: 4000, doctorPct: 4, paymentType: 'full' },
      { date: '2026-10-13', ethDate: tikimt, procedure: 'Scaling & Polishing', totalFee: 2000, doctorPct: 4, paymentType: 'partial', paidToday: 1000 }
    ]
  }, 'doc1', existing);

  const [kept, added] = payload.treatments;

  // Registration date is untouched by adding a treatment.
  assert.equal(payload.gregDate, '2025-09-11');
  assert.equal(payload.ethDate, meskerem);

  // Original extraction keeps its historical date.
  assert.equal(kept.date, '2025-09-11');
  assert.equal(kept.ethDate, meskerem);

  // New treatment gets its own creation date.
  assert.equal(added.date, '2026-10-13');
  assert.equal(added.ethDate, tikimt);
  assert.notEqual(kept.date, added.date);

  // New treatment's own money, isolated from the old extraction.
  assert.equal(added.totalFee, 2000);
  assert.equal(added.paidAmount, 1000);
  assert.equal(added.balance, 1000);
  assert.equal(added.myEarning, 40);
  assert.equal(kept.myEarning, 160);
});

test('editing an existing treatment never rewrites its historical date', () => {
  const meskerem = eth('መስከረም', 1, 2018);
  const yekatit = eth('የካቲት', 22, 2018);

  const existing = {
    _id: 'p1',
    patientName: 'Abebe',
    gregDate: '2026-01-05',
    ethDate: eth('ታኅሣሥ', 27, 2018),
    doctorPct: 4,
    treatments: [normalizeTreatment({
      _id: 't1',
      date: '2025-09-11',
      ethDate: meskerem,
      procedure: 'Filling',
      totalFee: 1000,
      doctorPct: 4,
      paidAmount: 500,
      balance: 500
    })]
  };

  const payload = buildPatientPayload({
    gregDate: '2026-03-01',
    ethDate: yekatit,
    patientName: 'Abebe',
    doctorPct: 4,
    treatments: [
      { _id: 't1', date: '2026-03-01', ethDate: yekatit, procedure: 'Filling (updated)', totalFee: 1200, doctorPct: 4, paymentType: 'partial', paidToday: 500 }
    ]
  }, 'doc1', existing);

  assert.equal(payload.treatments[0].date, '2025-09-11');
  assert.equal(payload.treatments[0].ethDate, meskerem);
  assert.equal(payload.treatments[0].procedure, 'Filling (updated)');
  assert.equal(payload.treatments[0].paidAmount, 500);
});

test('a stored treatment missing a date falls back to the registration date', () => {
  const meskerem = eth('መስከረም', 1, 2018);
  const patient = {
    _id: 'p1',
    patientName: 'Abebe',
    gregDate: '2025-09-11',
    ethDate: meskerem,
    doctorPct: 4,
    treatments: [{ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 4, paidAmount: 0, balance: 1000, payments: [] }]
  };

  const normalized = normalizePatient(patient);
  assert.equal(normalized.treatments[0].date, '2025-09-11');
  assert.equal(normalized.treatments[0].ethDate, meskerem);
});

test('a historical treatment recovers its date from its earliest payment', () => {
  const meskerem = eth('መስከረም', 1, 2018);

  // Patient registration was overwritten to today, but the extraction's own
  // payment still carries the real visit date.
  const patient = {
    _id: 'p1',
    patientName: 'Kemsur Redi',
    gregDate: '2026-10-13',
    ethDate: eth('ጥቅምት', 3, 2019),
    doctorPct: 4,
    treatments: [{
      _id: 't1',
      procedure: 'Simple Extraction',
      totalFee: 4000,
      doctorPct: 4,
      paidAmount: 4000,
      balance: 0,
      payments: [{ date: '2025-09-11', ethDate: meskerem, amount: 4000, commission: 160 }]
    }]
  };

  const normalized = normalizePatient(patient);
  assert.equal(normalized.treatments[0].date, '2025-09-11');
  assert.equal(normalized.treatments[0].ethDate, meskerem);
});

test('orderTreatments lists the newest treatment first without mutating the source', () => {
  const patient = {
    _id: 'p1',
    treatments: [
      normalizeTreatment({ _id: 'old', date: '2025-09-11', procedure: 'Simple Extraction', totalFee: 4000, doctorPct: 4, paidAmount: 4000, balance: 0 }),
      normalizeTreatment({ _id: 'new', date: '2026-10-13', procedure: 'Scaling & Polishing', totalFee: 2000, doctorPct: 4, paidAmount: 1000, balance: 1000 })
    ]
  };

  const ordered = orderTreatments(patient);
  assert.deepEqual(ordered.treatments.map(t => t._id), ['new', 'old']);

  // The stored (source) order is untouched, so unrelated pages are unaffected.
  assert.deepEqual(patient.treatments.map(t => t._id), ['old', 'new']);
});

test('orderTreatments is stable for equal or missing dates', () => {
  const patient = {
    _id: 'p2',
    treatments: [
      normalizeTreatment({ _id: 'a', date: '2026-01-01', procedure: 'A', totalFee: 1, doctorPct: 4, paidAmount: 1, balance: 0 }),
      normalizeTreatment({ _id: 'b', date: '2026-01-01', procedure: 'B', totalFee: 1, doctorPct: 4, paidAmount: 1, balance: 0 }),
      normalizeTreatment({ _id: 'c', date: '', procedure: 'C', totalFee: 1, doctorPct: 4, paidAmount: 1, balance: 0 })
    ]
  };

  const ordered = orderTreatments(patient);
  assert.deepEqual(ordered.treatments.map(t => t._id), ['a', 'b', 'c']);
});

test('orderTreatments orders same-date treatments by registration time, not balance', () => {
  const older = new mongoose.Types.ObjectId('65000000' + '0000000000000000');
  const newer = new mongoose.Types.ObjectId('66000000' + '0000000000000000');

  // The earlier treatment still carries an outstanding balance; the later one
  // was paid in full. Registration order must win regardless of balance.
  const patient = {
    _id: 'p3',
    treatments: [
      normalizeTreatment({ _id: older, date: '2026-01-01', procedure: 'Earlier partial', totalFee: 1000, doctorPct: 4, paidAmount: 400, balance: 600 }),
      normalizeTreatment({ _id: newer, date: '2026-01-01', procedure: 'Later full', totalFee: 500, doctorPct: 4, paidAmount: 500, balance: 0 })
    ]
  };

  const ordered = orderTreatments(patient);
  assert.deepEqual(ordered.treatments.map(t => t.procedure), ['Later full', 'Earlier partial']);
  assert.deepEqual(patient.treatments.map(t => t.procedure), ['Earlier partial', 'Later full']);
});

test('removing one treatment deletes only it and recomputes the patient totals', () => {
  const patient = normalizePatient({
    _id: 'p1',
    patientName: 'Ermias',
    gregDate: '2026-01-05',
    ethDate: eth('ታኅሣሥ', 27, 2018),
    doctorPct: 4,
    treatments: [
      { _id: 't1', date: '2026-01-05', procedure: 'Filling', totalFee: 1000, doctorPct: 4, paidAmount: 400, balance: 600 },
      { _id: 't2', date: '2026-02-05', procedure: 'Crown', totalFee: 5000, doctorPct: 4, paidAmount: 1000, balance: 4000 }
    ]
  });

  const result = removeTreatment(patient, 't1');
  assert.equal(result.ok, true);
  assert.equal(result.removed._id, 't1');
  assert.equal(result.patient.treatments.length, 1);
  assert.equal(result.patient.treatments[0]._id, 't2');
  assert.equal(result.patient.totalFee, 5000);
  assert.equal(result.patient.paidAmount, 1000);
  assert.equal(result.patient.balance, 4000);
  assert.equal(result.patient.myEarning, 40);

  // Source patient is not mutated.
  assert.equal(patient.treatments.length, 2);
});

test('removing the only treatment is refused', () => {
  const patient = normalizePatient({
    _id: 'p1',
    patientName: 'Solo',
    gregDate: '2026-01-05',
    ethDate: eth('ታኅሣሥ', 27, 2018),
    doctorPct: 4,
    treatments: [{ _id: 't1', date: '2026-01-05', procedure: 'Filling', totalFee: 1000, doctorPct: 4, paidAmount: 1000, balance: 0 }]
  });

  const result = removeTreatment(patient, 't1');
  assert.equal(result.ok, false);
  assert.match(result.error, /only treatment/i);
  assert.equal(patient.treatments.length, 1);
});

test('removing an unknown treatment reports not found and changes nothing', () => {
  const patient = normalizePatient({
    _id: 'p1',
    patientName: 'Ermias',
    gregDate: '2026-01-05',
    ethDate: eth('ታኅሣሥ', 27, 2018),
    doctorPct: 4,
    treatments: [
      { _id: 't1', date: '2026-01-05', procedure: 'Filling', totalFee: 1000, doctorPct: 4, paidAmount: 1000, balance: 0 },
      { _id: 't2', date: '2026-02-05', procedure: 'Crown', totalFee: 500, doctorPct: 4, paidAmount: 500, balance: 0 }
    ]
  });

  const result = removeTreatment(patient, 'missing');
  assert.equal(result.ok, false);
  assert.equal(result.error, 'Treatment not found.');
  assert.equal(patient.treatments.length, 2);
});

test('removing the legacy synthetic treatment (patient id) keeps the newer treatment', () => {
  const patient = {
    _id: 'p9',
    patientName: 'Sara',
    gregDate: '2025-12-01',
    ethDate: eth('ኅዳር', 22, 2018),
    doctorPct: 4,
    treatments: [
      normalizeTreatment({ _id: 'p9', date: '2025-12-01', ethDate: eth('ኅዳር', 22, 2018), procedure: 'Root Canal', totalFee: 1000, doctorPct: 4, paidAmount: 400, balance: 600 }),
      normalizeTreatment({ _id: 't2', date: '2026-02-10', procedure: 'Cleaning', totalFee: 600, doctorPct: 4, paidAmount: 100, balance: 500 })
    ]
  };

  const result = removeTreatment(patient, 'p9');
  assert.equal(result.ok, true);
  assert.equal(result.removed.procedure, 'Root Canal');
  assert.equal(result.patient.treatments.length, 1);
  assert.equal(result.patient.treatments[0]._id, 't2');
  assert.equal(result.patient.totalFee, 600);
  assert.equal(result.patient.paidAmount, 100);
  assert.equal(result.patient.balance, 500);
});

test('each treatment keeps its own ticket number through the payload', () => {
  const payload = buildPatientPayload({
    gregDate: '2026-03-05',
    patientName: 'Abebe',
    doctorPct: 10,
    treatments: [
      { procedure: 'Filling', totalFee: 1000, doctorPct: 10, paymentType: 'full', ticketNo: 'T-1' },
      { procedure: 'Crown', totalFee: 2000, doctorPct: 10, paymentType: 'partial', paidToday: 0, ticketNo: 'T-2' }
    ]
  }, 'doc1');

  assert.equal(payload.treatments[0].ticketNo, 'T-1');
  assert.equal(payload.treatments[1].ticketNo, 'T-2');
  assert.notEqual(payload.treatments[0].ticketNo, payload.treatments[1].ticketNo);
  // Patient-level ticket falls back to the earliest treatment's ticket.
  assert.equal(payload.ticketNo, 'T-1');
});

test('editing a treatment updates only that treatment ticket', () => {
  const existing = {
    _id: 'p1',
    patientName: 'Abebe',
    gregDate: '2026-01-05',
    doctorPct: 10,
    treatments: [
      normalizeTreatment({ _id: 'A', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidAmount: 1000, balance: 0, ticketNo: 'A-1' }),
      normalizeTreatment({ _id: 'B', procedure: 'Crown', totalFee: 2000, doctorPct: 10, paidAmount: 500, balance: 1500, ticketNo: 'B-1' })
    ]
  };

  const payload = buildPatientPayload({
    gregDate: '2026-02-01',
    patientName: 'Abebe',
    doctorPct: 10,
    treatments: [
      { _id: 'A', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidToday: 1000, ticketNo: 'A-2' },
      { _id: 'B', procedure: 'Crown', totalFee: 2000, doctorPct: 10, paidToday: 500, ticketNo: 'B-1' }
    ]
  }, 'doc1', existing);

  assert.equal(payload.treatments[0].ticketNo, 'A-2');
  assert.equal(payload.treatments[1].ticketNo, 'B-1');
});

test('flattened payment rows use the treatment ticket and fall back to the patient ticket', () => {
  const withTicket = normalizeTreatment({ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidAmount: 1000, balance: 0, ticketNo: 'T-1' });
  const withoutTicket = normalizeTreatment({ _id: 't2', procedure: 'Crown', totalFee: 2000, doctorPct: 10, paidAmount: 2000, balance: 0 });

  const patient = { _id: 'p1', patientName: 'Abebe', ticketNo: 'P-9', treatments: [withTicket, withoutTicket] };

  const rows = flattenPayments(patient);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].ticketNo, 'T-1');
  assert.equal(rows[1].ticketNo, 'P-9');

  const summary = summarizePayments([patient], {});
  assert.equal(summary.rows[0].ticketNo, 'T-1');
  assert.equal(summary.rows[1].ticketNo, 'P-9');
});

test('legacy patients carry their existing ticket onto the synthetic treatment', () => {
  const legacy = {
    _id: 'p9',
    patientName: 'Sara',
    gregDate: '2025-12-01',
    ethDate: eth('ኅዳር', 22, 2018),
    ticketNo: 'L-1',
    totalFee: 1000,
    doctorPct: 10,
    paidAmount: 400,
    balance: 600
  };

  const normalized = normalizePatient(legacy);
  assert.equal(normalized.treatments[0].ticketNo, 'L-1');
  assert.equal(flattenPayments(normalized)[0].ticketNo, 'L-1');
});

test('each received payment records its own ticket number', () => {
  const t = normalizeTreatment({ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidAmount: 200, balance: 800, ticketNo: 'T-1' });

  addPayment(t, { amount: 300, date: '2026-03-01', ticketNo: 'R-2' });
  addPayment(t, { amount: 200, date: '2026-04-01' });

  assert.equal(t.payments[0].ticketNo, 'T-1');
  assert.equal(t.payments[1].ticketNo, 'R-2');
  assert.equal(t.payments[2].ticketNo, '');
  assert.deepEqual(t.payments.map(p => p.ticketNo), ['T-1', 'R-2', '']);
});

test('flattened payment rows prefer the payment ticket over the treatment ticket', () => {
  const t = normalizeTreatment({ _id: 't1', procedure: 'Filling', totalFee: 1000, doctorPct: 10, paidAmount: 200, balance: 800, ticketNo: 'T-1' });
  addPayment(t, { amount: 300, date: '2026-03-01', ticketNo: 'R-2' });

  const rows = flattenPayments({ _id: 'p1', patientName: 'Abebe', treatments: [t] });
  assert.equal(rows[0].ticketNo, 'T-1');
  assert.equal(rows[1].ticketNo, 'R-2');
});

