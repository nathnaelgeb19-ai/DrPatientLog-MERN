import {
  Doctor,
  Patient,
  SalaryClosure,
  AuditLog,
  Setting,
  ProcedurePreset
} from '../models/index.js';

import fs from 'fs/promises';
import path from 'path';

export async function snapshot() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    doctors: await Doctor.find().lean(),
    patients: await Patient.find().lean(),
    salaryClosures: await SalaryClosure.find().lean(),
    auditLog: await AuditLog.find().lean(),
    settings: await Setting.find().lean(),
    procedurePresets: await ProcedurePreset.find().lean()
  };
}

export async function createBackupFile() {
  const data = await snapshot();

  const dir =
    process.env.BACKUP_DIR ||
    '/tmp/drpatientlog-backups';

  await fs.mkdir(dir, { recursive: true });

  const filename =
    `drpatientlog-backup-${
      new Date().toISOString().replaceAll(':', '-')
    }.json`;

  const filePath = path.join(dir, filename);

  await fs.writeFile(
    filePath,
    JSON.stringify(data, null, 2),
    'utf8'
  );

  return {
    filePath,
    filename,
    data
  };
}

export async function restore(data) {
  const safety = await snapshot();

  const dir =
    process.env.BACKUP_DIR ||
    '/tmp/drpatientlog-backups';

  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(
    path.join(dir, `safety-${Date.now()}.json`),
    JSON.stringify(safety, null, 2)
  );

  for (
    const M of [
      Doctor,
      Patient,
      SalaryClosure,
      AuditLog,
      Setting,
      ProcedurePreset
    ]
  ) {
    await M.deleteMany({});
  }

  if (data.doctors?.length)
    await Doctor.insertMany(data.doctors);

  if (data.patients?.length)
    await Patient.insertMany(data.patients);

  if (data.salaryClosures?.length)
    await SalaryClosure.insertMany(data.salaryClosures);

  if (data.auditLog?.length)
    await AuditLog.insertMany(data.auditLog);

  if (data.settings?.length)
    await Setting.insertMany(data.settings);

  if (data.procedurePresets?.length)
    await ProcedurePreset.insertMany(data.procedurePresets);
}