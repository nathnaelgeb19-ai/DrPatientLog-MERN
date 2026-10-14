import { Patient, Setting, TelegramOutbox } from '../models/index.js';
import { ETH_MONTHS } from '../utils/ethiopian.js';

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(value) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function rule() {
  return '\u2501'.repeat(20);
}

async function clinicBranding() {
  const rows = await Setting.find({
    key: { $in: ['clinic_name', 'clinic_name_short'] }
  }).lean();

  const values = Object.fromEntries(
    rows.map(x => [x.key, x.value])
  );

  return {
    name: values.clinic_name || 'NathDent Hakim Log',
    short: values.clinic_name_short || 'Hakim Log'
  };
}

async function header(emoji, title, subtitle = null) {
  const clinic = await clinicBranding();

  const titleLine = subtitle
    ? '<b>' + htmlEscape(title) + '</b> \u00B7 ' + htmlEscape(subtitle)
    : '<b>' + htmlEscape(title) + '</b>';

  return [
    emoji + ' <b>' + htmlEscape(clinic.name) + '</b>',
    titleLine,
    rule()
  ].join('\n');
}

async function footer() {
  const clinic = await clinicBranding();

  return [
    rule(),
    '\u{1F3E5} <b>' + htmlEscape(clinic.name) + '</b>'
  ].join('\n');
}

async function fetchRetry(url, options, attempts = 3) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (error?.name === 'AbortError') throw error;

      lastError = error;

      console.log(
        `[Telegram] network error (attempt ${attempt + 1}/${attempts}): ${error.message || error}`
      );

      if (attempt < attempts - 1) {
        await new Promise(res => setTimeout(res, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

async function sendMessage(doctor, text) {
  const url =
    `https://api.telegram.org/bot${doctor.telegram.botToken}/sendMessage`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let response;

  try {
    response = await fetchRetry(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: doctor.telegram.chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }),
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Telegram request timed out after 10 seconds.');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || data?.ok !== true) {
    const description =
      data?.description ||
      `Telegram returned HTTP ${response.status}`;

    throw new Error(`Telegram: ${description}`);
  }

  return data.result?.message_id ?? null;
}

function splitMessage(text, limit = 4000) {
  if (text.length <= limit) return [text];

  const chunks = [];
  let current = '';

  for (const line of text.split('\n')) {
    if (current && (current + line).length > limit) {
      chunks.push(current);
      current = '';
    }

    current += line + '\n';
  }

  if (current) chunks.push(current);

  return chunks.map(c => c.trimEnd());
}

export async function sendTelegram(doctor, text) {
  if (
    !doctor?.telegram?.enabled ||
    !doctor.telegram.botToken ||
    !doctor.telegram.chatId
  ) {
    return {
      sent: false,
      reason: 'Telegram is disabled or not configured.'
    };
  }

  const parts = splitMessage(text);

  let firstMessageId = null;

  for (const part of parts) {
    const messageId = await sendMessage(doctor, part);

    if (firstMessageId === null) {
      firstMessageId = messageId;
    }
  }

  return {
    sent: true,
    messageId: firstMessageId,
    parts: parts.length
  };
}

export async function sendTelegramDocument(
  doctor,
  buffer,
  filename,
  caption = ''
) {
  if (
    !doctor?.telegram?.enabled ||
    !doctor.telegram.botToken ||
    !doctor.telegram.chatId
  ) {
    return {
      sent: false,
      reason: 'Telegram is disabled or not configured.'
    };
  }

  const form = new FormData();

  form.append('chat_id', doctor.telegram.chatId);
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');
  form.append(
    'document',
    new Blob([buffer]),
    filename
  );

  const response = await fetchRetry(
    `https://api.telegram.org/bot${doctor.telegram.botToken}/sendDocument`,
    {
      method: 'POST',
      body: form
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || data?.ok !== true) {
    const description =
      data?.description ||
      `Telegram returned HTTP ${response.status}`;

    throw new Error(`Telegram: ${description}`);
  }

  return {
    sent: true,
    messageId: data.result?.message_id ?? null
  };
}

export async function queueTelegram(doctorId, text) {
  return TelegramOutbox.create({
    doctorId,
    messageText: text,
    attempts: 0
  });
}

export async function pendingOutbox(limit = 10) {
  return TelegramOutbox.find({
    sentAt: null,
    attempts: { $lt: 12 }
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
}

export async function markOutboxSent(id) {
  return TelegramOutbox.updateOne(
    { _id: id },
    {
      $set: {
        sentAt: new Date(),
        lastError: ''
      }
    }
  );
}

export async function markOutboxFail(id, attempts, error) {
  return TelegramOutbox.updateOne(
    { _id: id },
    {
      $set: {
        attempts,
        lastError: String(error || '').slice(0, 500)
      }
    }
  );
}

export function earningMessageLines({
  ethDate,
  patientName,
  cardNumber,
  ticketNo,
  procedure,
  fee,
  cut,
  paid,
  balance,
  paymentType
} = {}) {
  const hasPaymentInfo = paid != null || balance != null;
  const type = paymentType === 'full' || paymentType === 'partial'
    ? paymentType
    : (Number(balance || 0) > 0 ? 'partial' : 'full');

  const lines = [
    '\u{1F4C5} Ethiopian: ' + htmlEscape(ethDate || '-'),
    '',
    '\u{1F464} Patient: ' + htmlEscape(patientName || '-'),
    '\u{1F4B3} Card: ' + htmlEscape(cardNumber || '-'),
    '\u{1F3AB} Ticket: #' + htmlEscape(ticketNo || '-'),
    '',
    '\u{1F9B7} Procedure: ' + htmlEscape(procedure || '-'),
    '\u{1F4B0} Service fee: ' + money(Number(fee || 0)) + ' Birr'
  ];

  if (hasPaymentInfo) {
    lines.push(
      (type === 'full' ? '\u2705' : '\u{1F4B3}') +
        ' Payment: ' +
        (type === 'full' ? 'Full payment' : 'Partial payment'),
      '\u{1F4B5} Paid: ' + money(Number(paid || 0)) + ' Birr',
      '\u23F3 Outstanding balance: ' + money(Number(balance || 0)) + ' Birr'
    );
  }

  lines.push('\u2702\uFE0F Doctor earnings: ' + money(Number(cut || 0)) + ' Birr');

  return lines;
}

export async function buildEarningMessage({
  title,
  ethDate,
  ticketNo,
  patientName,
  cardNumber,
  procedure,
  fee,
  cut,
  paid,
  balance,
  paymentType
} = {}) {
  const head = await header(
    '\u{1F9B7}',
    title === 'New patient record'
      ? 'New patient'
      : 'Patient updated'
  );

  const foot = await footer();

  return [
    head,
    ...earningMessageLines({
      ethDate,
      patientName,
      cardNumber,
      ticketNo,
      procedure,
      fee,
      cut,
      paid,
      balance,
      paymentType
    }),
    foot
  ].join('\n');
}

export function treatmentMessageLines({
  ethDate,
  patientName,
  cardNumber,
  ticketNo,
  treatment
} = {}) {
  const t = treatment || {};
  const pct = Number(t.doctorPct ?? 0);

  return [
    '\u{1F4C5} Ethiopian: ' + htmlEscape(ethDate || '-'),
    '',
    '\u{1F464} Patient: ' + htmlEscape(patientName || '-'),
    '\u{1F4B3} Card: ' + htmlEscape(cardNumber || '-'),
    '\u{1F3AB} Ticket: #' + htmlEscape(ticketNo || '-'),
    '',
    '\u{1F9B7} Treatment: ' + htmlEscape(t.procedure || '-'),
    '\u{1F4B0} Service fee: ' + money(t.totalFee) + ' Birr',
    '\u{1F4B5} Paid: ' + money(t.paidAmount) + ' Birr',
    '\u23F3 Outstanding balance: ' + money(t.balance) + ' Birr',
    '\u2702\uFE0F Doctor earnings: ' + money(t.myEarning) + ' Birr' +
      (pct > 0 ? ' (' + pct + '%)' : '')
  ];
}

export async function buildTreatmentMessage(options) {
  const head = await header(
    '\u{1F9B7}',
    'New treatment'
  );

  const foot = await footer();

  return [
    head,
    ...treatmentMessageLines(options),
    foot
  ].join('\n');
}

export async function buildTreatmentUpdateMessage(options) {
  const head = await header(
    '\u270F\uFE0F',
    'Treatment updated'
  );

  const foot = await footer();

  return [
    head,
    ...treatmentMessageLines(options),
    foot
  ].join('\n');
}

export function treatmentDeleteMessageLines({
  ethDate,
  patientName,
  cardNumber,
  ticketNo,
  treatment
} = {}) {
  const t = treatment || {};

  return [
    '\u{1F4C5} Ethiopian: ' + htmlEscape(ethDate || '-'),
    '',
    '\u{1F464} Patient: ' + htmlEscape(patientName || '-'),
    '\u{1F4B3} Card: ' + htmlEscape(cardNumber || '-'),
    '\u{1F3AB} Ticket: #' + htmlEscape(ticketNo || '-'),
    '',
    '\u{1F9B7} Treatment: ' + htmlEscape(t.procedure || '-'),
    '\u{1F4B0} Service fee: ' + money(t.totalFee) + ' Birr',
    '',
    '\u{1F5D1}\uFE0F Treatment removed'
  ];
}

export async function buildTreatmentDeleteMessage(options) {
  const head = await header(
    '\u{1F5D1}\uFE0F',
    'Treatment deleted'
  );

  const foot = await footer();

  return [
    head,
    ...treatmentDeleteMessageLines(options),
    foot
  ].join('\n');
}

export function paymentMessageLines({
  ethDate,
  patientName,
  cardNumber,
  ticketNo,
  treatment,
  payment
} = {}) {
  const t = treatment || {};
  const pay = payment || {};

  return [
    '\u{1F4C5} Ethiopian: ' + htmlEscape(ethDate || '-'),
    '',
    '\u{1F464} Patient: ' + htmlEscape(patientName || '-'),
    '\u{1F4B3} Card: ' + htmlEscape(cardNumber || '-'),
    '\u{1F3AB} Ticket: #' + htmlEscape(ticketNo || '-'),
    '',
    '\u{1F9B7} Treatment: ' + htmlEscape(t.procedure || '-'),
    '\u{1F4B5} Amount received: ' + money(pay.amount) + ' Birr',
    '\u2702\uFE0F Doctor earnings: ' + money(pay.commission) + ' Birr',
    '\u23F3 Outstanding balance: ' + money(t.balance) + ' Birr'
  ];
}

export async function buildPaymentMessage(options) {
  const head = await header(
    '\u{1F4B5}',
    'Payment received'
  );

  const foot = await footer();

  return [
    head,
    ...paymentMessageLines(options),
    foot
  ].join('\n');
}

export async function buildDailyMessage(
  ethDate,
  patientCount,
  income,
  doctorEarnings,
  doctorPct = null,
  rows = []
) {
  const head = await header(
    '\u{1F9B7}',
    'Daily report'
  );

  const foot = await footer();

  const lines = [
    head,
    '\u{1F4C5} Ethiopian: ' + htmlEscape(ethDate || '-'),
    '\u{1F465} Patients: ' + Number(patientCount || 0),
    '\u{1F4B0} Total income: ' + money(income) + ' Birr',
    '\u2702\uFE0F Doctor percentage earnings: ' + money(doctorEarnings) + ' Birr',
    ''
  ];

  if (rows.length) {
    lines.push(
      '\u{1F4CB} Today\'s records \u00B7 ' +
      rows.length +
      ' of ' +
      rows.length
    );

    rows.forEach((row, index) => {
      lines.push(
        (index + 1) +
          '. ' +
          htmlEscape(row.patientName || '-') +
          ' \u00B7 Card: ' +
          htmlEscape(row.cardNumber || '-') +
          ' \u00B7 #' +
          htmlEscape(row.ticketNo || '-'),

        '   ' +
          htmlEscape(row.procedure || '-') +
          ' \u00B7 ' +
          money(row.totalFee) +
          ' Birr'
      );
    });
  } else {
    lines.push('\u{1F4CB} No patient records today');
  }

  lines.push(foot);

  return lines.join('\n');
}

export async function buildMonthlyMessage(
  ethMonth,
  ethYear,
  patientCount,
  income,
  doctorEarnings,
  doctorPct = null,
  pagumeCarry = 0,
  rows = [],
  paid = undefined
) {
  const label =
    String(ethMonth || '') +
    ' ' +
    String(ethYear || '');

  const head = await header(
    '\u{1F9B7}',
    'Monthly report'
  );

  const foot = await footer();

  const lines = [
    head,
    '\u{1F4C5} Ethiopian: ' + htmlEscape(label.trim()),
    '\u{1F465} Patients: ' + Number(patientCount || 0),
    '\u{1F4B0} Total income: ' + money(income) + ' Birr',
    '\u2702\uFE0F Doctor percentage earnings: ' +
      money(doctorEarnings) +
      ' Birr'
  ];

  if (Number(pagumeCarry || 0) > 0) {
    lines.push(
      '\u21AA\uFE0F Pagume ' +
        String(Number(ethYear) - 1) +
        ' carryover: ' +
        money(pagumeCarry) +
        ' Birr'
    );
  }

  if (rows.length) {
    lines.push(
      '',
      '\u{1F4CB} Monthly records \u00B7 ' +
        rows.length +
        ' of ' +
        rows.length
    );

    rows.forEach((row, index) => {
      lines.push(
        (index + 1) +
          '. ' +
          htmlEscape(row.patientName || '-') +
          ' \u00B7 Card: ' +
          htmlEscape(row.cardNumber || '-') +
          ' \u00B7 #' +
          htmlEscape(row.ticketNo || '-'),

        '   ' +
          htmlEscape(row.procedure || '-') +
          ' \u00B7 ' +
          money(row.totalFee) +
          ' Birr'
      );
    });
  } else if (Number(patientCount || 0) > 0) {
    lines.push(
      '',
      '\u{1F4CB} ' + Number(patientCount) + ' patient record(s)'
    );
  } else {
    lines.push('', '\u{1F4CB} No patient records');
  }

  lines.push(
    '\u{1F4B5} Total payable: ' +
      money(
        Number(doctorEarnings || 0) +
        Number(pagumeCarry || 0)
      ) +
      ' Birr'
  );

  if (paid === true) {
    lines.push(
      '',
      '\u2705 Paid & closed'
    );
  } else if (paid === false) {
    lines.push(
      '',
      '\u23F3 Pending payment \u00B7 mark as paid when you receive it'
    );
  }

  lines.push(foot);

  return lines.join('\n');
}

export async function buildTestMessage(ethDate) {
  const head = await header(
    '\u{1F4E1}',
    'Telegram connection test'
  );

  const foot = await footer();

  return [
    head,
    '\u2705 Connection successful',
    '',
    'Telegram notifications are configured correctly.',
    '\u{1F4C5} Ethiopian: ' +
      htmlEscape(ethDate || '-'),
    foot
  ].join('\n');
}

export async function buildDeleteMessage(patientName) {
  const head = await header(
    '\u{1F5D1}\uFE0F',
    'Patient record deleted'
  );

  const foot = await footer();

  return [
    head,
    '\u{1F464} Patient: ' +
      htmlEscape(patientName || '-'),
    '\u{1F5D1}\uFE0F Record removed',
    foot
  ].join('\n');
}
