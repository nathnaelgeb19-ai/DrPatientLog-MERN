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
    name: values.clinic_name || 'Holy Bethel Dental Clinic',
    short: values.clinic_name_short || 'Holy Bethel'
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
    '\u{1F3E5} <b>' + htmlEscape(clinic.short) + '</b>'
  ].join('\n');
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

  const url =
    `https://api.telegram.org/bot${doctor.telegram.botToken}/sendMessage`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let response;

  try {
    response = await fetch(url, {
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

  return {
    sent: true,
    messageId: data.result?.message_id ?? null
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
  form.append(
    'document',
    new Blob([buffer]),
    filename
  );

  const response = await fetch(
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

async function monthTotals(doctorId, ethDate) {
  const parts = String(ethDate || '').split(/\s+/);
  const ethMonth = parts[0] || '';
  const ethYear = Number(parts[2] || 0);

  const rows = await Patient.find({ doctorId })
    .select('ethDate totalFee myEarning')
    .lean();

  let income = 0;
  let cutSum = 0;

  for (const row of rows) {
    const parts = String(row.ethDate || '').split(/\s+/);

    if (
      parts[0] === ethMonth &&
      Number(parts[2]) === ethYear
    ) {
      income += Number(row.totalFee || 0);
      cutSum += Number(row.myEarning || 0);
    }
  }

  let pagumeCarry = 0;

  if (ethMonth === ETH_MONTHS[0] && ethYear) {
    const previousYear = ethYear - 1;

    for (const row of rows) {
      const parts = String(row.ethDate || '').split(/\s+/);

      if (
        parts[0] === ETH_MONTHS[ETH_MONTHS.length - 1] &&
        Number(parts[2]) === previousYear
      ) {
        pagumeCarry += Number(row.myEarning || 0);
      }
    }
  }

  return {
    label: `${ethMonth} ${ethYear}`.trim(),
    income,
    cutSum,
    pagumeCarry,
    payable: cutSum + pagumeCarry
  };
}

export async function buildEarningMessage(
  title,
  eth,
  ticket,
  patient,
  cardNumber,
  procedure,
  fee,
  cut,
  doctorPct,
  doctorId
) {
  const head = await header(
    '\u{1F9B7}',
    title === 'New patient record'
      ? 'New patient'
      : 'Patient updated'
  );

  const foot = await footer();

  const feeNumber = Number(fee || 0);
  const cutNumber = Number(cut || 0);

  return [
    head,
    '\u{1F4C5} Ethiopian: ' + htmlEscape(eth || '-'),
    '',
    '\u{1F464} Patient: ' + htmlEscape(patient || '-'),
    '\u{1F4B3} Card: ' + htmlEscape(cardNumber || '-'),
    '\u{1F3AB} Ticket: #' + htmlEscape(ticket || '-'),
    '',
    '\u{1F9B7} Procedure: ' + htmlEscape(procedure || '-'),
    '\u{1F4B0} Service fee: ' + money(feeNumber) + ' Birr',
    '\u2702\uFE0F Doctor earnings: ' + money(cutNumber) + ' Birr',
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
  pagumeCarry = 0
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

  lines.push(
    '\u{1F4B5} Total payable: ' +
      money(
        Number(doctorEarnings || 0) +
        Number(pagumeCarry || 0)
      ) +
      ' Birr',
    foot
  );

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
