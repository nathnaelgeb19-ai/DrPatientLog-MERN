import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Doctor,
  Patient,
  SalaryClosure,
  AuditLog,
  Setting,
  TelegramOutbox
} from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_FILE = path.join(
  process.env.USERPROFILE,
  'Downloads',
  'holy_bethel_data.json'
);

const EXCLUDED_SETTINGS = new Set([
  'google_drive_token',
  'postgres_test'
]);

function parseDate(value) {
  if (!value) return undefined;

  const d = new Date(String(value).replace(' ', 'T'));

  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return d;
}

function required(value, name) {
  if (value === undefined || value === null) {
    throw new Error(`Missing required field: ${name}`);
  }

  return value;
}

async function main() {
  console.log('\n=== DrPatientLog Flask → MERN Migration ===\n');

  if (!fs.existsSync(BACKUP_FILE)) {
    throw new Error(`Backup not found: ${BACKUP_FILE}`);
  }

  const raw = fs.readFileSync(BACKUP_FILE, 'utf8');
  const backup = JSON.parse(raw);

  console.log('Backup:', BACKUP_FILE);
  console.log('Doctors:', backup.doctors?.length || 0);
  console.log('Patients:', backup.patients?.length || 0);
  console.log('Audit logs:', backup.audit_log?.length || 0);
  console.log('Settings:', backup.settings?.length || 0);
  console.log('Salary closures:', backup.salary_closures?.length || 0);
  console.log('Telegram outbox:', backup.telegram_outbox?.length || 0);

  if (
    !Array.isArray(backup.doctors) ||
    !Array.isArray(backup.patients) ||
    !Array.isArray(backup.audit_log) ||
    !Array.isArray(backup.settings) ||
    !Array.isArray(backup.salary_closures) ||
    !Array.isArray(backup.telegram_outbox)
  ) {
    throw new Error('Backup structure is incomplete.');
  }

  console.log('\nConnecting to MongoDB...');

  await mongoose.connect(process.env.MONGODB_URI);

  console.log('Database:', mongoose.connection.name);

  /*
   * IMPORTANT:
   * This script replaces the local MERN test data.
   * It is intentionally NOT intended for production.
   */
  const collections = [
  'patients',
  'salaryclosures',
  'auditlogs',
  'telegramoutboxes',
  'doctors',
  'settings',
  'procedurepresets'
];
  console.log('\nClearing existing MERN test data...');

  for (const name of collections) {
    const collection = mongoose.connection.db.collection(name);
    const result = await collection.deleteMany({});
    console.log(`  ${name}: deleted ${result.deletedCount}`);
  }

  /*
   * Flask numeric doctor IDs → MongoDB ObjectIds
   */
  const doctorMap = new Map();

  console.log('\nImporting doctors...');

  for (const oldDoctor of backup.doctors) {
    const doctor = await Doctor.create({
      name: required(oldDoctor.name, 'doctor.name'),
      username: required(oldDoctor.username, 'doctor.username'),
      passwordHash: required(oldDoctor.password_hash, 'doctor.password_hash'),

      /*
       * Preserve the Flask value, but MERN does not use baseSalary
       * for patient earnings calculations.
       */
      baseSalary: Number(oldDoctor.base_salary || 0),

      birthYear: Number(oldDoctor.birth_year || 0),
      email: oldDoctor.email || '',
      role: oldDoctor.role || 'doctor',

      telegram: {
        botToken: oldDoctor.telegram_bot_token || '',
        chatId: oldDoctor.telegram_chat_id || '',
        enabled: !!oldDoctor.telegram_enabled
      },

      resetTokenHash: oldDoctor.reset_token_hash || undefined,
      resetTokenExpiresAt: parseDate(oldDoctor.reset_token_expires_at),

      createdAt: parseDate(oldDoctor.created_at),
      updatedAt: parseDate(oldDoctor.created_at)
    });

    doctorMap.set(String(oldDoctor.id), doctor._id);

    console.log(
      `  Flask doctor ${oldDoctor.id} → ${doctor.name} → ${doctor._id}`
    );
  }

  /*
   * Patients
   */
  console.log('\nImporting patients...');

  const patients = [];

  for (const oldPatient of backup.patients) {
    const doctorId = doctorMap.get(String(oldPatient.doctor_id));

    if (!doctorId) {
      throw new Error(
        `No Mongo doctor mapping for patient ${oldPatient.id}, doctor ${oldPatient.doctor_id}`
      );
    }

    patients.push({
      gregDate: required(oldPatient.greg_date, 'patient.greg_date'),
      ethDate: required(oldPatient.eth_date, 'patient.eth_date'),
      patientName: required(oldPatient.patient_name, 'patient.patient_name'),

      cardNumber:
        oldPatient.card_number === null ||
        oldPatient.card_number === undefined
          ? ''
          : String(oldPatient.card_number),

      ticketNo:
        oldPatient.ticket_no === null ||
        oldPatient.ticket_no === undefined
          ? ''
          : String(oldPatient.ticket_no),

      procedure: required(oldPatient.procedure, 'patient.procedure'),

      totalFee: Number(oldPatient.total_fee || 0),
      doctorPct: Number(oldPatient.doctor_pct ?? 4),

      /*
       * Preserve historical Flask calculation exactly.
       */
      myEarning: Number(oldPatient.my_earning || 0),

      doctorId,

      createdAt: parseDate(oldPatient.created_at),
      updatedAt: parseDate(oldPatient.created_at)
    });
  }

  if (patients.length) {
    await Patient.insertMany(patients);
  }

  console.log(`  Imported ${patients.length} patients.`);

  /*
   * Salary closures
   */
  console.log('\nImporting salary closures...');

  const closures = [];

  for (const oldClosure of backup.salary_closures) {
    const doctorId = doctorMap.get(String(oldClosure.doctor_id));

    if (!doctorId) {
      throw new Error(
        `No Mongo doctor mapping for salary closure ${oldClosure.id}`
      );
    }

    closures.push({
      doctorId,
      ethMonth: required(oldClosure.eth_month, 'salary_closure.eth_month'),
      ethYear: Number(required(oldClosure.eth_year, 'salary_closure.eth_year')),
      earnedAmount: Number(oldClosure.earned_amount || 0),
      paidDate: required(oldClosure.paid_date, 'salary_closure.paid_date'),
      paidEthDate: oldClosure.paid_eth_date || '',
      closedBy: oldClosure.closed_by || '',

      createdAt: parseDate(oldClosure.closed_at),
      updatedAt: parseDate(oldClosure.closed_at)
    });
  }

  if (closures.length) {
    await SalaryClosure.insertMany(closures);
  }

  console.log(`  Imported ${closures.length} salary closures.`);

  /*
   * Audit logs
   */
  console.log('\nImporting audit logs...');

  const auditLogs = [];

  for (const oldLog of backup.audit_log) {
    const doctorId = oldLog.doctor_id
      ? doctorMap.get(String(oldLog.doctor_id))
      : undefined;

    auditLogs.push({
      doctorId,
      doctorName: oldLog.doctor_name || '',
      action: oldLog.action || '',
      entity: oldLog.entity || '',
      entityId:
        oldLog.entity_id === null ||
        oldLog.entity_id === undefined
          ? ''
          : String(oldLog.entity_id),
      detail: oldLog.detail || '',

      createdAt: parseDate(oldLog.created_at),
      updatedAt: parseDate(oldLog.created_at)
    });
  }

  if (auditLogs.length) {
    await AuditLog.insertMany(auditLogs);
  }

  console.log(`  Imported ${auditLogs.length} audit logs.`);

  /*
   * Settings
   *
   * Flask-only PostgreSQL and Flask Google OAuth settings are deliberately
   * excluded. The MERN Google Drive integration has its own OAuth flow.
   */
  console.log('\nImporting settings...');

  const settings = [];

  for (const oldSetting of backup.settings) {
    if (EXCLUDED_SETTINGS.has(oldSetting.key)) {
      console.log(`  Skipped Flask-only setting: ${oldSetting.key}`);
      continue;
    }

    settings.push({
      key: required(oldSetting.key, 'setting.key'),
      value:
        oldSetting.value === null || oldSetting.value === undefined
          ? ''
          : String(oldSetting.value),

      createdAt: parseDate(oldSetting.created_at),
      updatedAt: parseDate(oldSetting.updated_at || oldSetting.created_at)
    });
  }

  if (settings.length) {
    await Setting.insertMany(settings);
  }

  console.log(`  Imported ${settings.length} settings.`);

  /*
   * Telegram outbox
   */
  console.log('\nImporting Telegram outbox...');

  const outbox = [];

  for (const oldMessage of backup.telegram_outbox) {
    const doctorId = doctorMap.get(String(oldMessage.doctor_id));

if (!doctorId) {
  console.log(
    `  Skipped orphaned Telegram outbox ${oldMessage.id} (Flask doctor ${oldMessage.doctor_id} no longer exists)`
  );
  continue;
}

    outbox.push({
      doctorId,
      messageText: required(
        oldMessage.message_text,
        'telegram_outbox.message_text'
      ),
      attempts: Number(oldMessage.attempts || 0),
      lastError: oldMessage.last_error || '',
      sentAt: parseDate(oldMessage.sent_at),

      createdAt: parseDate(oldMessage.created_at),
      updatedAt: parseDate(oldMessage.created_at)
    });
  }

  if (outbox.length) {
    await TelegramOutbox.insertMany(outbox);
  }

  console.log(`  Imported ${outbox.length} Telegram outbox records.`);

  /*
   * Verification
   */
  console.log('\n=== Verification ===');

  console.log('Doctors:', await Doctor.countDocuments());
  console.log('Patients:', await Patient.countDocuments());
  console.log('Audit logs:', await AuditLog.countDocuments());
  console.log('Settings:', await Setting.countDocuments());
  console.log('Salary closures:', await SalaryClosure.countDocuments());
  console.log('Telegram outbox:', await TelegramOutbox.countDocuments());

  const importedDoctors = await Doctor.find()
    .select('name username email role')
    .lean();

  console.log('\nImported doctors:');

  for (const d of importedDoctors) {
    console.log(
      `  ${d.name} | ${d.username} | ${d.email} | ${d.role}`
    );
  }

  console.log('\nMigration completed successfully.');
  console.log('The original Flask JSON backup was not modified.');

  await mongoose.disconnect();
}

main().catch(async error => {
  console.error('\nMIGRATION FAILED:');
  console.error(error.message);
  console.error(error.stack);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});