import test from 'node:test';
import assert from 'node:assert/strict';
import {
  treatmentMessageLines,
  treatmentDeleteMessageLines,
  paymentMessageLines,
  earningMessageLines
} from '../src/services/telegram.js';

const scaling = { procedure: 'Scaling & Polishing', totalFee: 3000, paidAmount: 2000, balance: 1000, myEarning: 80, doctorPct: 4 };
const composite = { procedure: 'Composite Restoration', totalFee: 4000, paidAmount: 2000, balance: 2000, myEarning: 80, doctorPct: 4 };

test('new treatment message reports only that treatment', () => {
  const text = treatmentMessageLines({
    ethDate: 'ጥቅምት 1 2018',
    patientName: 'Ermias Birru',
    cardNumber: 'C-9',
    ticketNo: 'T-9',
    treatment: scaling
  }).join('\n');

  assert.match(text, /Ermias Birru/);
  assert.match(text, /Scaling/);
  assert.match(text, /Polishing/);
  assert.match(text, /Service fee: 3,000\.00 Birr/);
  assert.match(text, /Paid: 2,000\.00 Birr/);
  assert.match(text, /Outstanding balance: 1,000\.00 Birr/);
  assert.match(text, /Doctor earnings: 80\.00 Birr/);

  assert.doesNotMatch(text, /Composite/);
  assert.doesNotMatch(text, /4,000\.00/);
  assert.doesNotMatch(text, /2,000\.00 Birr[\s\S]*Outstanding balance: 2,000\.00/);
});

test('payment message identifies the specific treatment receiving the installment', () => {
  const text = paymentMessageLines({
    ethDate: 'ህዳር 5 2018',
    patientName: 'Ermias Birru',
    cardNumber: 'C-9',
    ticketNo: 'T-9',
    treatment: { ...composite, balance: 1500 },
    payment: { amount: 500, commission: 20 }
  }).join('\n');

  assert.match(text, /Ermias Birru/);
  assert.match(text, /Composite/);
  assert.match(text, /Restoration/);
  assert.match(text, /Amount received: 500\.00 Birr/);
  assert.match(text, /Doctor earnings: 20\.00 Birr/);
  assert.match(text, /Outstanding balance: 1,500\.00 Birr/);

  assert.doesNotMatch(text, /Scaling/);
  assert.doesNotMatch(text, /3,000\.00/);
});

test('escapes user supplied procedure text', () => {
  const text = treatmentMessageLines({
    patientName: 'A & B',
    treatment: { procedure: '<script>', totalFee: 0, paidAmount: 0, balance: 0, myEarning: 0 }
  }).join('\n');

  assert.match(text, /A &amp; B/);
  assert.match(text, /&lt;script&gt;/);
  assert.doesNotMatch(text, /<script>/);
});

test('added treatment notification shows only the new treatment (Kemsur Redi)', () => {
  const added = {
    procedure: 'Scaling & Polishing',
    totalFee: 2000,
    paidAmount: 1000,
    balance: 1000,
    myEarning: 40,
    doctorPct: 4
  };

  const text = treatmentMessageLines({
    ethDate: 'ጥቅምት 3 2019',
    patientName: 'Kemsur Redi',
    cardNumber: '',
    ticketNo: '',
    treatment: added
  }).join('\n');

  assert.match(text, /Kemsur Redi/);
  assert.match(text, /Scaling/);
  assert.match(text, /Polishing/);
  assert.match(text, /Service fee: 2,000\.00 Birr/);
  assert.match(text, /Paid: 1,000\.00 Birr/);
  assert.match(text, /Outstanding balance: 1,000\.00 Birr/);
  assert.match(text, /Doctor earnings: 40\.00 Birr/);

  // The earlier extraction and its money must not leak into a new-treatment message.
  assert.doesNotMatch(text, /Simple Extraction/);
  assert.doesNotMatch(text, /4,000\.00/);
  assert.doesNotMatch(text, /160\.00/);
});

test('deleted treatment notification names only the removed treatment', () => {
  const text = treatmentDeleteMessageLines({
    ethDate: 'ጥቅምት 3 2019',
    patientName: 'Kemsur Redi',
    cardNumber: 'C-1',
    ticketNo: 'T-1',
    treatment: scaling
  }).join('\n');

  assert.match(text, /Kemsur Redi/);
  assert.match(text, /Scaling/);
  assert.match(text, /Polishing/);
  assert.match(text, /Service fee: 3,000\.00 Birr/);
  assert.match(text, /Treatment removed/);

  assert.doesNotMatch(text, /Composite/);
  assert.doesNotMatch(text, /4,000\.00/);
});

test('genuinely new patient keeps the aggregated notification', () => {
  const text = earningMessageLines({
    ethDate: 'መስከረም 1 2018',
    patientName: 'Kemsur Redi',
    cardNumber: '',
    ticketNo: '',
    procedure: 'Simple Extraction, Scaling & Polishing',
    fee: 6000,
    cut: 200
  }).join('\n');

  assert.match(text, /Simple Extraction, Scaling &amp; Polishing/);
  assert.match(text, /Service fee: 6,000\.00 Birr/);
  assert.match(text, /Doctor earnings: 200\.00 Birr/);
});

test('registration message differentiates full payment from partial payment', () => {
  const full = earningMessageLines({
    ethDate: 'መስከረም 1 2018',
    patientName: 'Kemsur Redi',
    procedure: 'Simple Extraction',
    fee: 1000,
    cut: 40,
    paid: 1000,
    balance: 0
  }).join('\n');

  assert.match(full, /Full payment/);
  assert.doesNotMatch(full, /Partial payment/);
  assert.match(full, /Paid: 1,000\.00 Birr/);
  assert.match(full, /Outstanding balance: 0\.00 Birr/);

  const partial = earningMessageLines({
    ethDate: 'መስከረም 1 2018',
    patientName: 'Kemsur Redi',
    procedure: 'Simple Extraction',
    fee: 1000,
    cut: 16,
    paid: 400,
    balance: 600
  }).join('\n');

  assert.match(partial, /Partial payment/);
  assert.doesNotMatch(partial, /Full payment/);
  assert.match(partial, /Paid: 400\.00 Birr/);
  assert.match(partial, /Outstanding balance: 600\.00 Birr/);
});
