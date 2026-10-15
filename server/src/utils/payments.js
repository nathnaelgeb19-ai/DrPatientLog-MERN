import {ethiopianDate,isoToday} from './ethiopian.js';

const DEFAULT_PCT = 4;

const round2 = value => Math.round((Number(value) || 0) * 100) / 100;

const commissionFor = (amount, pct) =>
  Math.round((Number(amount) || 0) * (Number(pct) || 0)) / 100;

const toPlain = doc => {
  if (!doc) return doc;
  if (typeof doc.toObject === 'function') return doc.toObject();
  return doc;
};

const makeInitialPayment = ({
  amount,
  pct,
  date,
  ethDate,
  note,
  ticketNo,
  receivedAt
} = {}) => {
  const value = round2(amount);
  return {
    date: date || '',
    ethDate: ethDate || '',
    amount: value,
    commission: commissionFor(value, pct),
    ticketNo: (ticketNo || '').trim(),
    note: note || 'Initial payment',
    ref: '',
    receivedAt: receivedAt || null
  };
};

const normalizePayment = (payment, pct = DEFAULT_PCT) => {
  const amount = round2(payment?.amount);
  const commission = payment?.commission != null
    ? round2(payment.commission)
    : commissionFor(amount, pct);

  return {
    date: payment?.date || '',
    ethDate: payment?.ethDate || '',
    amount,
    commission,
    ticketNo: (payment?.ticketNo || '').trim(),
    note: payment?.note || '',
    ref: payment?.ref || '',
    receivedAt: payment?.receivedAt || null
  };
};

const normalizeTreatment = (treatment, defaults = {}) => {
  const t = toPlain(treatment) || {};
  const fee = round2(t.totalFee);
  const pct = Number(t.doctorPct ?? defaults.doctorPct ?? DEFAULT_PCT);

  let payments = Array.isArray(t.payments)
    ? t.payments.map(p => normalizePayment(p, pct))
    : [];

  let paidAmount;

  if (payments.length) {
    paidAmount = round2(payments.reduce((sum, p) => sum + p.amount, 0));
  } else if (Number(t.paidAmount) > 0) {
    paidAmount = round2(t.paidAmount);
  } else if (Number(t.balance || 0) > 0) {
    paidAmount = round2(Math.max(0, fee - Number(t.balance)));
  } else {
    // No usable payment information (e.g. a legacy record whose schema defaults
    // were applied on restore, giving paidAmount:0 and balance:0). Assume the
    // treatment was settled in full so historical records are not shown as
    // outstanding.
    paidAmount = fee;
  }

  if (!payments.length && paidAmount > 0) {
    payments = [makeInitialPayment({
      amount: paidAmount,
      pct,
      date: defaults.date,
      ethDate: defaults.ethDate,
      note: defaults.note || 'Initial payment',
      ticketNo: t.ticketNo,
      receivedAt: defaults.receivedAt
    })];
  }

  const balance = round2(Math.max(0, fee - paidAmount));
  const myEarning = round2(
    payments.length
      ? payments.reduce((sum, p) => sum + p.commission, 0)
      : commissionFor(paidAmount, pct)
  );

  // A treatment's own date wins. Records created before treatments carried a
  // date fall back to their earliest payment date (the visit that produced it),
  // then to any caller-provided default (e.g. the legacy patient registration).
  const date = t.date || (payments[0] && payments[0].date) || defaults.date || '';
  const ethDate = t.ethDate
    || (payments[0] && payments[0].ethDate)
    || defaults.ethDate
    || (date ? ethiopianDate(date) : '');

  return {
    _id: t._id,
    date,
    ethDate,
    ticketNo: (t.ticketNo || '').trim(),
    procedure: (t.procedure || '').trim(),
    totalFee: fee,
    doctorPct: pct,
    myEarning,
    paymentType: balance <= 0 ? 'full' : 'partial',
    paidAmount,
    balance,
    payments
  };
};

const normalizePatient = patient => {
  if (!patient) return patient;

  const p = toPlain(patient);
  const hasTreatments = Array.isArray(p.treatments) && p.treatments.length > 0;

  const treatments = hasTreatments
    ? p.treatments.map(t => normalizeTreatment(t, {
        doctorPct: p.doctorPct,
        date: p.gregDate,
        ethDate: p.ethDate
      }))
    : [normalizeTreatment({
        _id: p._id,
        ticketNo: p.ticketNo,
        procedure: p.procedure,
        totalFee: p.totalFee,
        doctorPct: p.doctorPct,
        paymentType: Number(p.balance || 0) > 0 ? 'partial' : 'full',
        paidAmount: p.paidAmount,
        balance: p.balance
      }, {
        doctorPct: p.doctorPct,
        date: p.gregDate,
        ethDate: p.ethDate,
        note: Number(p.balance || 0) > 0
          ? 'Initial partial payment'
          : 'Initial full payment',
        receivedAt: p.createdAt
      })];

  const totalFee = round2(treatments.reduce((sum, t) => sum + t.totalFee, 0));
  const paidAmount = round2(treatments.reduce((sum, t) => sum + t.paidAmount, 0));
  const balance = round2(treatments.reduce((sum, t) => sum + t.balance, 0));
  const myEarning = round2(treatments.reduce((sum, t) => sum + t.myEarning, 0));
  const procedure = treatments.map(t => t.procedure).filter(Boolean).join(', ');

  return {
    ...p,
    treatments,
    totalFee,
    paidAmount,
    balance,
    myEarning,
    procedure: procedure || p.procedure || ''
  };
};

const recomputePatientTotals = patient => {
  const treatments = patient.treatments || [];
  patient.totalFee = round2(treatments.reduce((sum, t) => sum + Number(t.totalFee || 0), 0));
  patient.paidAmount = round2(treatments.reduce((sum, t) => sum + Number(t.paidAmount || 0), 0));
  patient.balance = round2(treatments.reduce((sum, t) => sum + Number(t.balance || 0), 0));
  patient.myEarning = round2(treatments.reduce((sum, t) => sum + Number(t.myEarning || 0), 0));
  patient.procedure = treatments.map(t => t.procedure).filter(Boolean).join(', ');
  return patient;
};

// Creation time encoded in a treatment id. Mongoose assigns ObjectId
// subdocument ids, whose first 4 bytes are the insertion timestamp, so a
// treatment registered later always sorts after one registered earlier even
// when both share a visit date. Non-ObjectId ids (legacy/imported) yield 0 so
// ties fall back to the stored order.
const treatmentCreatedAt = id => {
  if (!id) return 0;
  if (typeof id === 'object' && typeof id.getTimestamp === 'function') {
    return id.getTimestamp().getTime();
  }
  const hex = String(id);
  return /^[0-9a-fA-F]{24}$/.test(hex)
    ? parseInt(hex.slice(0, 8), 16) * 1000
    : 0;
};

// Display order for the Patients page: newest treatment first, matching the
// newest-first patient list. Treatments are ordered by their visit date, then
// by registration time, then by stored order. This keeps same-day treatments
// in the order they were recorded regardless of their outstanding balance.
const orderTreatments = patient => {
  if (!patient || !Array.isArray(patient.treatments)) return patient;

  const indexed = patient.treatments.map((treatment, index) => ({ treatment, index }));

  indexed.sort((a, b) => {
    const aDate = a.treatment?.date || '';
    const bDate = b.treatment?.date || '';
    if (aDate !== bDate) return aDate < bDate ? 1 : -1;

    const aCreated = treatmentCreatedAt(a.treatment?._id);
    const bCreated = treatmentCreatedAt(b.treatment?._id);
    if (aCreated !== bCreated) return bCreated - aCreated;

    return a.index - b.index;
  });

  return { ...patient, treatments: indexed.map(x => x.treatment) };
};

const removeTreatment = (patient, treatmentId) => {
  const normalized = normalizePatient(patient);
  const list = normalized.treatments || [];
  const idx = list.findIndex(t => String(t._id) === String(treatmentId));

  if (idx < 0) return { ok: false, error: 'Treatment not found.' };

  if (list.length <= 1) {
    return {
      ok: false,
      error: 'This is the only treatment for this patient. Delete the patient instead.'
    };
  }

  const removed = list[idx];
  const treatments = list.filter((_, i) => i !== idx);
  const updated = { ...normalized, treatments };
  recomputePatientTotals(updated);

  return { ok: true, removed, patient: updated };
};

const findTreatment = (patient, treatmentId) => {
  const list = patient?.treatments || [];
  return list.find(t => String(t._id) === String(treatmentId)) || null;
};

const addPayment = (treatment, input = {}) => {
  const pct = Number(treatment.doctorPct ?? DEFAULT_PCT);
  const fee = round2(treatment.totalFee);
  const amount = round2(input.amount);

  if (!(amount > 0)) {
    return { ok: false, error: 'Payment amount must be greater than 0.' };
  }

  const balance = round2(
    treatment.balance != null
      ? treatment.balance
      : Math.max(0, fee - Number(treatment.paidAmount || 0))
  );

  if (amount > balance + 0.001) {
    return {
      ok: false,
      error: `Payment amount (${amount.toFixed(2)} ETB) exceeds outstanding balance (${balance.toFixed(2)} ETB).`
    };
  }

  const ref = String(input.ref || '').trim();

  if (ref && (treatment.payments || []).some(p => String(p.ref || '') === ref)) {
    return {
      ok: false,
      duplicate: true,
      error: 'This payment was already recorded.'
    };
  }

  const payment = normalizePayment({
    date: input.date,
    ethDate: input.ethDate,
    amount,
    ticketNo: input.ticketNo,
    note: input.note,
    ref,
    receivedAt: input.receivedAt
  }, pct);

  treatment.payments = [...(treatment.payments || []), payment];
  treatment.paidAmount = round2(
    treatment.payments.reduce((sum, p) => sum + p.amount, 0)
  );
  treatment.balance = round2(Math.max(0, fee - treatment.paidAmount));
  treatment.myEarning = round2(
    treatment.payments.reduce((sum, p) => sum + p.commission, 0)
  );
  treatment.paymentType = treatment.balance <= 0 ? 'full' : 'partial';

  return { ok: true, payment };
};

const adjustTreatmentPayments = (treatment, targetPaid, options = {}) => {
  const pct = Number(treatment?.doctorPct ?? DEFAULT_PCT);
  const fee = round2(treatment?.totalFee);
  const target = Math.min(fee, Math.max(0, round2(targetPaid)));

  const payments = (treatment?.payments || []).map(p => ({
    date: p.date || '',
    ethDate: p.ethDate || '',
    amount: round2(p.amount),
    commission: round2(p.commission),
    ticketNo: p.ticketNo || '',
    note: p.note || '',
    ref: p.ref || '',
    receivedAt: p.receivedAt || null
  }));

  const current = round2(payments.reduce((sum, p) => sum + p.amount, 0));

  if (target > current + 0.001) {
    const delta = round2(target - current);

    if (payments.length) {
      const last = payments[payments.length - 1];
      last.amount = round2(last.amount + delta);
      last.commission = commissionFor(last.amount, pct);
    } else {
      payments.push(normalizePayment({
        date: options.date,
        ethDate: options.ethDate,
        amount: delta,
        ticketNo: options.ticketNo,
        note: options.note || 'Payment recorded on edit',
        receivedAt: options.receivedAt || new Date()
      }, pct));
    }
  } else if (target < current - 0.001) {
    let excess = round2(current - target);

    for (let i = payments.length - 1; i >= 0 && excess > 0.001; i--) {
      const payment = payments[i];

      if (payment.amount <= excess + 0.001) {
        excess = round2(excess - payment.amount);
        payments.splice(i, 1);
      } else {
        payments[i] = normalizePayment({
          date: payment.date,
          ethDate: payment.ethDate,
          amount: round2(payment.amount - excess),
          ticketNo: payment.ticketNo,
          note: payment.note,
          ref: payment.ref,
          receivedAt: payment.receivedAt
        }, pct);
        excess = 0;
      }
    }
  }

  return payments;
};

const buildPatientPayload = (body, doctorId, existingDoc = null) => {
  const gregDate = body.gregDate;
  const ethDate = body.ethDate || ethiopianDate(body.gregDate);
  const patientName = (body.patientName || '').trim();
  const cardNumber = (body.cardNumber || '').trim();
  const ticketNo = (body.ticketNo || '').trim();
  const defaultPct = Number(body.doctorPct ?? DEFAULT_PCT);

  const rawList = Array.isArray(body.treatments) && body.treatments.length
    ? body.treatments
    : [{
        procedure: body.procedure,
        totalFee: body.totalFee,
        doctorPct: defaultPct,
        paymentType: body.paymentType,
        paidToday: body.paidToday,
        paidAmount: body.paidAmount
      }];

  const existingList = existingDoc?.treatments || [];

  let anyNew = false;

  const treatments = rawList.map(t => {
    const pct = Number(t.doctorPct ?? defaultPct);
    const fee = round2(t.totalFee);
    const existing = existingList.find(x => String(x._id) === String(t._id));

    if (existing) {
      const existingPayments = Array.isArray(existing.payments)
        ? existing.payments.map(p => toPlain(p))
        : [];

      const existingPaid = existingPayments.length
        ? round2(existingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0))
        : round2(existing.paidAmount);

      const submittedPaid = t.paidToday ?? t.paidAmount;
      const hasSubmitted = submittedPaid != null && submittedPaid !== '';

      let payments = existingPayments;
      let paidAmount = existingPaid;

      if (hasSubmitted && Math.abs(round2(submittedPaid) - existingPaid) > 0.001) {
        const today = isoToday();

        payments = adjustTreatmentPayments(
          { payments: existingPayments, doctorPct: pct, totalFee: fee },
          submittedPaid,
          { date: today, ethDate: ethiopianDate(today), note: 'Payment recorded on edit', ticketNo: existing.ticketNo }
        );

        paidAmount = round2(payments.reduce((sum, p) => sum + Number(p.amount || 0), 0));
      }

      return normalizeTreatment({
        _id: existing._id,
        date: existing.date || '',
        ethDate: existing.ethDate || '',
        ticketNo: t.ticketNo ?? existing.ticketNo,
        procedure: t.procedure ?? existing.procedure,
        totalFee: fee,
        doctorPct: pct,
        paymentType: t.paymentType ?? existing.paymentType,
        paidAmount,
        balance: Math.max(0, fee - paidAmount),
        payments
      }, { doctorPct: pct, date: gregDate, ethDate, receivedAt: new Date() });
    }

    anyNew = true;

    const tDate = t.date || gregDate;
    const tEth = t.ethDate || (t.date ? ethiopianDate(t.date) : ethDate);

    const paymentType = t.paymentType === 'partial' ? 'partial' : 'full';

    // Treatments with an explicit history (e.g. a legacy record being extended)
    // keep that history verbatim so payment dates and cash-basis reporting are
    // never re-attributed. Brand-new treatments always arrive with no payments.
    const suppliedPayments = Array.isArray(t.payments) && t.payments.length
      ? t.payments.map(p => normalizePayment(p, pct))
      : [];

    let payments;
    let paidAmount;

    if (suppliedPayments.length) {
      payments = suppliedPayments;
      paidAmount = round2(payments.reduce((sum, p) => sum + p.amount, 0));
    } else {
      const initialPaid = paymentType === 'full'
        ? fee
        : Number(t.paidToday ?? t.paidAmount ?? 0);
      paidAmount = round2(Math.min(fee, Math.max(0, initialPaid)));

      payments = paidAmount > 0
        ? [makeInitialPayment({
            amount: paidAmount,
            pct,
            date: tDate,
            ethDate: tEth,
            ticketNo: t.ticketNo,
            note: paymentType === 'full'
              ? 'Initial full payment'
              : 'Initial partial payment',
            receivedAt: new Date()
          })]
        : [];
    }

    return normalizeTreatment({
      date: tDate,
      ethDate: tEth,
      ticketNo: (t.ticketNo || '').trim(),
      procedure: (t.procedure || '').trim(),
      totalFee: fee,
      doctorPct: pct,
      paymentType,
      paidAmount,
      balance: Math.max(0, fee - paidAmount),
      payments
    }, { doctorPct: pct, date: tDate, ethDate: tEth });
  });

  // Adding a treatment to an existing patient must never rewrite the patient's
  // original registration date. The new treatment carries its own date instead.
  const registrationDate = existingDoc && anyNew
    ? (existingDoc.gregDate || gregDate)
    : gregDate;
  const registrationEthDate = existingDoc && anyNew
    ? (existingDoc.ethDate || ethDate)
    : ethDate;

  const patient = {
    gregDate: registrationDate,
    ethDate: registrationEthDate,
    patientName,
    cardNumber,
    ticketNo: ticketNo || existingDoc?.ticketNo || (treatments.find(t => t.ticketNo)?.ticketNo || ''),
    doctorId,
    treatments
  };

  return recomputePatientTotals(patient);
};

const flattenNormalized = normalized => {
  const out = [];

  for (const treatment of normalized.treatments || []) {
    for (const payment of treatment.payments || []) {
      out.push({
        patientId: normalized._id,
        patientName: normalized.patientName,
        cardNumber: normalized.cardNumber,
        ticketNo: payment.ticketNo || treatment.ticketNo || normalized.ticketNo,
        procedure: treatment.procedure,
        doctorPct: treatment.doctorPct,
        treatmentId: treatment._id,
        date: payment.date,
        ethDate: payment.ethDate,
        amount: payment.amount,
        commission: payment.commission,
        note: payment.note,
        ref: payment.ref
      });
    }
  }

  return out;
};

const flattenPayments = patient => flattenNormalized(normalizePatient(patient));

const matchPayment = (payment, filter = {}) => {
  if (filter.date && payment.date !== filter.date) return false;
  if (filter.dateFrom && payment.date < filter.dateFrom) return false;
  if (filter.dateTo && payment.date > filter.dateTo) return false;
  if (filter.ethPattern && !filter.ethPattern.test(payment.ethDate || '')) return false;
  return true;
};

const summarizeNormalized = (normalizedList, filter = {}) => {
  const rows = [];
  let income = 0;
  let cut = 0;
  let weighted = 0;

  for (const normalized of normalizedList || []) {
    for (const payment of flattenNormalized(normalized)) {
      if (!matchPayment(payment, filter)) continue;

      income += payment.amount;
      cut += payment.commission;
      weighted += payment.amount * Number(payment.doctorPct || 0);

      rows.push({
        _id: payment.patientId,
        patientName: payment.patientName,
        cardNumber: payment.cardNumber,
        ticketNo: payment.ticketNo,
        procedure: payment.procedure,
        ethDate: payment.ethDate,
        gregDate: payment.date,
        totalFee: payment.amount,
        doctorPct: payment.doctorPct,
        myEarning: payment.commission,
        balance: 0,
        amount: payment.amount,
        commission: payment.commission
      });
    }
  }

  return {
    income: round2(income),
    cut: round2(cut),
    count: rows.length,
    weighted,
    rows
  };
};

const summarizePayments = (patients, filter = {}) =>
  summarizeNormalized((patients || []).map(normalizePatient), filter);

export {
  round2,
  commissionFor,
  normalizeTreatment,
  normalizePatient,
  recomputePatientTotals,
  orderTreatments,
  removeTreatment,
  findTreatment,
  addPayment,
  adjustTreatmentPayments,
  buildPatientPayload,
  flattenPayments,
  summarizeNormalized,
  summarizePayments
};
