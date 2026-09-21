import { Router } from 'express';
import { Doctor, Patient } from '../models/index.js';

import {
  sendTelegram,
  sendTelegramDocument,
  pendingOutbox,
  markOutboxSent,
  markOutboxFail,
  buildDailyMessage,
  buildMonthlyMessage
} from '../services/telegram.js';

import { driveBackup } from '../services/googleDrive.js';
import { createBackupFile } from '../services/backup.js';
import {
  ethiopianParts,
  isoToday
} from '../utils/ethiopian.js';

const r = Router();

function ok(req) {
  const supplied =
    req.get('x-cron-secret') ||
    req.query.secret ||
    req.query.key;

  return !process.env.CRON_SECRET ||
    supplied === process.env.CRON_SECRET;
}

async function processOutbox() {
  console.log('[Telegram Outbox] checking...');

  const rows = await pendingOutbox(10);

  console.log(
    `[Telegram Outbox] found ${rows.length} pending message(s)`
  );

  for (const row of rows) {
    try {
      console.log(
        `[Telegram Outbox] processing ${row._id} (attempt ${Number(row.attempts || 0) + 1})`
      );

      const doctor = await Doctor.findById(row.doctorId).lean();

      if (!doctor) {
        console.log(
          `[Telegram Outbox] doctor not found for ${row._id}`
        );

        await markOutboxFail(
          row._id,
          Number(row.attempts || 0) + 1,
          'Doctor not found'
        );

        continue;
      }

      const result = await sendTelegram(
        doctor,
        row.messageText
      );

      if (result.sent) {
        console.log(
          `[Telegram Outbox] sent ${row._id} (message ${result.messageId ?? 'unknown'})`
        );

        await markOutboxSent(row._id);
      } else {
        console.log(
          `[Telegram Outbox] not sent ${row._id}: ${result.reason || 'Telegram was not sent.'}`
        );

        await markOutboxFail(
          row._id,
          Number(row.attempts || 0) + 1,
          result.reason || 'Telegram was not sent.'
        );
      }
    } catch (e) {
      console.log(
        `[Telegram Outbox] failed ${row._id}: ${e.message}`
      );

      await markOutboxFail(
        row._id,
        Number(row.attempts || 0) + 1,
        e.message
      );
    }
  }
}

async function daily() {
  const iso = isoToday();
  const e = ethiopianParts(iso);

  for (
    const d of await Doctor.find({
      'telegram.enabled': true
    }).lean()
  ) {
    const rows = await Patient.find({
      doctorId: d._id,
      gregDate: iso
    }).lean();

    const income = rows.reduce(
      (a, x) => a + Number(x.totalFee || 0),
      0
    );

    const cut = rows.reduce(
      (a, x) => a + Number(x.myEarning || 0),
      0
    );

    const weighted = income
      ? rows.reduce(
          (a, x) =>
            a +
            Number(x.totalFee || 0) *
              Number(x.doctorPct || 0),
          0
        ) / income
      : 0;

    const message = await buildDailyMessage(
      `${e.month} ${e.day} ${e.year}`,
      rows.length,
      income,
      cut,
      weighted
    );

    await sendTelegram(d, message).catch(() => {});
  }
}

/**
 * Complete automatic backup.
 *
 * 1. Creates one real backup file.
 * 2. Uploads that file to Google Drive.
 * 3. Sends that same file to configured Telegram chats.
 */

async function monthly() {
  const now = isoToday();
  const current = ethiopianParts(now);

  const monthNames = [
    'መስከረም',
    'ጥቅምት',
    'ኅዳር',
    'ታኅሣሥ',
    'ጥር',
    'የካቲት',
    'መጋቢት',
    'ሚያዝያ',
    'ግንቦት',
    'ሰኔ',
    'ሐምሌ',
    'ነሐሴ',
    'ጳጉሜ'
  ];

  const currentIndex = monthNames.indexOf(current.month);
  const previousIndex = currentIndex > 0 ? currentIndex - 1 : 12;
  const previousMonth = monthNames[previousIndex];
  const previousYear = currentIndex > 0 ? current.year : current.year - 1;

  const pattern = '^' + previousMonth + ' \\d{1,2} ' + previousYear + '$';

  for (const d of await Doctor.find({
    'telegram.enabled': true
  }).lean()) {
    const rows = await Patient.find({
      doctorId: d._id,
      ethDate: { $regex: pattern }
    }).lean();

    const income = rows.reduce(
      (sum, row) => sum + Number(row.totalFee || 0),
      0
    );

    const doctorEarnings = rows.reduce(
      (sum, row) => sum + Number(row.myEarning || 0),
      0
    );

    const weighted = rows.reduce(
      (sum, row) =>
        sum +
        Number(row.totalFee || 0) *
        Number(row.doctorPct || 0),
      0
    );

    const pct = income ? weighted / income : 0;

    const message = await buildMonthlyMessage(
      previousMonth,
      previousYear,
      rows.length,
      income,
      doctorEarnings,
      pct
    );

    await sendTelegram(d, message).catch(error => {
      console.log(
        '[Monthly Report] Telegram failed for ' +
        d.name +
        ': ' +
        error.message
      );
    });
  }
}
async function automaticBackup() {
  console.log('[Automatic Backup] starting...');

  const backup = await createBackupFile();

  console.log(
    `[Automatic Backup] created ${backup.filePath}`
  );

  const backupResult = await driveBackup(backup);

  console.log(
    `[Automatic Backup] Google Drive: ${
      backupResult.uploaded
        ? 'uploaded'
        : backupResult.reason || 'not uploaded'
    }`
  );

  const now = isoToday();
  const e = ethiopianParts(now);

  const telegramResults = [];

  for (
    const d of await Doctor.find({
      'telegram.enabled': true
    }).lean()
  ) {
    try {
      const caption =
        `ðŸ—„ï¸ DrPatientLog Automatic Backup\n\n` +
        `Date: ${e.month} ${e.day} ${e.year}\n` +
        `Backup file: ${backup.filename}`;

      const result = await sendTelegramDocument(
        d,
        await import('fs/promises').then(fs =>
          fs.readFile(backup.filePath)
        ),
        backup.filename,
        caption
      );

      telegramResults.push({
        doctor: d.name,
        sent: !!result.sent,
        reason: result.reason || ''
      });

      console.log(
        `[Automatic Backup] Telegram ${d.name}: ${
          result.sent
            ? 'backup file sent'
            : result.reason || 'not sent'
        }`
      );
    } catch (error) {
      telegramResults.push({
        doctor: d.name,
        sent: false,
        reason:
          error.message ||
          'Telegram backup upload failed'
      });

      console.log(
        `[Automatic Backup] Telegram failed for ${d.name}: ${error.message}`
      );
    }
  }

  return {
    ok:
      backupResult.uploaded ||
      telegramResults.some(x => x.sent),

    backupFile: {
      filename: backup.filename
    },

    googleDrive: backupResult,

    telegram: telegramResults
  };
}

r.post('/monthly-report', async (q, s) => {
  if (!ok(q)) return s.sendStatus(403);

  try {
    await monthly();
    s.json({ ok: true });
  } catch (e) {
    console.error('[Monthly Report] failed:', e);

    s.status(500).json({
      ok: false,
      message: e.message || 'Monthly report failed.'
    });
  }
});
r.post('/daily', async (q, s) => {
  if (!ok(q)) return s.sendStatus(403);

  await daily();

  s.json({ ok: true });
});

r.post('/backup', async (q, s) => {
  if (!ok(q)) return s.sendStatus(403);

  const backup = await createBackupFile();

  s.json(
    await driveBackup(backup)
  );
});

r.post('/automatic-backup', async (q, s) => {
  if (!ok(q)) return s.sendStatus(403);

  try {
    const result = await automaticBackup();

    s.json(result);
  } catch (e) {
    console.error(
      '[Automatic Backup] failed:',
      e
    );

    s.status(500).json({
      ok: false,
      message:
        e.message ||
        'Automatic backup failed.'
    });
  }
});

export {
  daily,
  processOutbox,
  automaticBackup
};

export default r;


