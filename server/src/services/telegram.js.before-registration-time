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
  return '━━━━━━━━━━━━━━━━━━━━';
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
    ? `<b>${htmlEscape(title)}</b> · ${htmlEscape(subtitle)}`
    : `<b>${htmlEscape(title)}</b>`;

  return [
    `${emoji} <b>${htmlEscape(clinic.name)}</b>`,
    titleLine,
    rule()
  ].join('\n');
}

async function footer() {
  const clinic = await clinicBranding();

  return [
    rule(),
    `🏥 <b>${htmlEscape(clinic.short)}</b>`,
    `🤖 Automated clinic notification`
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
  const timeout = setTimeout(() => controller.abort(), 3000);

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
      throw new Error('Telegram request timed out after 3 seconds.');
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
  const totals = await monthTotals(doctorId, eth);
  const head = await header(
    title === 'New patient record' ? '🆕' : '✏️',
    title
  );
  const foot = await footer();

  const feeNumber = Number(fee || 0);
  const cutNumber = Number(cut || 0);
  const percentage = Number.isFinite(Number(doctorPct))
    ? Number(doctorPct)
    : (feeNumber ? (cutNumber / feeNumber) * 100 : 0);

  const carryText = totals.pagumeCarry
    ? `\n↪️ <b>Pagume carryover:</b> ${money(totals.pagumeCarry)} Birr`
    : '';

  const status =
    title === 'New patient record'
      ? '✅ New record registered'
      : '🔄 Patient record updated';

  return [
    head,
    '',
    `👤 <b>PATIENT</b>`,
    `Name: <b>${htmlEscape(patient || '-')}</b>`,
    `Card No: <b>${htmlEscape(cardNumber || '-')}</b>`,
    `Ticket No: <b>${htmlEscape(ticket || '-')}</b>`,
    '',
    `🦷 <b>VISIT</b>`,
    `Procedure: ${htmlEscape(procedure || '-')}`,
    `Ethiopian date: ${htmlEscape(eth || '-')}`,
    '',
    `💳 <b>FINANCIAL</b>`,
    `Service fee: <b>${money(feeNumber)} Birr</b>`,
    '',
    `📊 <b>DOCTOR SHARE</b>`,
    `Percentage: <b>${percentage.toFixed(2)}%</b>`,
    `Doctor earnings: <b>${money(cutNumber)} Birr</b>`,
    '',
    `📅 <b>MONTH TO DATE</b>`,
    `<b>${htmlEscape(totals.label)}</b>`,
    `Income: ${money(totals.income)} Birr`,
    `Percentage earnings: ${money(totals.cutSum)} Birr`,
    `${carryText}`,
    `Total payable: <b>${money(totals.payable)} Birr</b>`,
    '',
    `${status}`,
    '',
    foot
  ].join('\n');
}


export async function buildDailyMessage(
  ethDate,
  patientCount,
  income,
  doctorEarnings,
  doctorPct = null
) {
  const head = await header(
    '📊',
    'DAILY CLINIC REPORT',
    ethDate
  );
  const foot = await footer();

  const pct = Number.isFinite(Number(doctorPct))
    ? Number(doctorPct)
    : (Number(income)
        ? (Number(doctorEarnings) / Number(income)) * 100
        : 0);

  return [
    head,
    '',
    `👥 <b>PATIENTS</b>`,
    `<b>${Number(patientCount || 0)}</b>`,
    '',
    `💰 <b>INCOME</b>`,
    `<b>${money(income)} Birr</b>`,
    '',
    `📊 <b>DOCTOR SHARE</b>`,
    `<b>${pct.toFixed(2)}%</b>`,
    '',
    `👨‍⚕️ <b>DOCTOR EARNINGS</b>`,
    `<b>${money(doctorEarnings)} Birr</b>`,
    '',
    `✅ Daily report completed`,
    '',
    foot
  ].join('\n');
}

export async function buildMonthlyMessage(
  ethMonth,
  ethYear,
  patientCount,
  income,
  doctorEarnings,
  doctorPct = null
) {
  const label = `${ethMonth} ${ethYear}`.trim();

  const head = await header(
    '📅',
    'MONTHLY EARNINGS',
    label
  );
  const foot = await footer();

  const pct = Number.isFinite(Number(doctorPct))
    ? Number(doctorPct)
    : (Number(income)
        ? (Number(doctorEarnings) / Number(income)) * 100
        : 0);

  return [
    head,
    '',
    `🇪🇹 <b>${htmlEscape(label)}</b>`,
    '',
    `👥 <b>PATIENTS</b>`,
    `<b>${Number(patientCount || 0)}</b>`,
    '',
    `💰 <b>INCOME</b>`,
    `<b>${money(income)} Birr</b>`,
    '',
    `📊 <b>DOCTOR SHARE</b>`,
    `<b>${pct.toFixed(2)}%</b>`,
    '',
    `👨‍⚕️ <b>DOCTOR EARNINGS</b>`,
    `<b>${money(doctorEarnings)} Birr</b>`,
    '',
    `📐 <b>CALCULATION</b>`,
    `${money(income)} × ${pct.toFixed(2)}% ÷ 100`,
    `= <b>${money(doctorEarnings)} Birr</b>`,
    '',
    `📋 Monthly report generated`,
    '',
    foot
  ].join('\n');
}

export async function buildTestMessage(ethDate) {
  const head = await header(
    '🧪',
    'TELEGRAM CONNECTION TEST',
    ethDate
  );
  const foot = await footer();

  return [
    head,
    '',
    `✅ <b>CONNECTION SUCCESSFUL</b>`,
    '',
    `Telegram notifications are configured correctly.`,
    `The clinic can send automated reports to this chat.`,
    '',
    `📅 Ethiopian date: <b>${htmlEscape(ethDate || '-')}</b>`,
    '',
    foot
  ].join('\n');
}

export async function buildDeleteMessage(patientName) {
  const head = await header(
    '🗑️',
    'PATIENT RECORD DELETED'
  );
  const foot = await footer();

  return [
    head,
    '',
    `👤 <b>PATIENT</b>`,
    `Name: <b>${htmlEscape(patientName || '-')}</b>`,
    '',
    `🗑️ <b>RECORD REMOVED</b>`,
    `The patient record was removed from the clinic database.`,
    '',
    foot
  ].join('\n');
}
