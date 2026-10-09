/* One-off helper to remove a doctor (and their patients) from a database.
   Safe by default: it only lists matches and deletes nothing unless --yes is passed.

   Target MongoDB Atlas by setting MONGODB_URI in the shell (a shell value wins
   over server/.env):

     $env:MONGODB_URI="mongodb+srv://user:pass@cluster/drpatientlog"
     node scripts/delete-doctor.js Edom --yes

   Flags:
     --id             match the argument as an exact _id instead of name/username
     --keep-patients  delete the doctor but leave their patient records
     --allow-admin    permit deleting an admin account
     --yes, -y        actually perform the deletion (otherwise dry run) */
import 'dotenv/config';
import mongoose from 'mongoose';
import {Doctor, Patient} from '../src/models/index.js';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('-')));
const term = args.find((a) => !a.startsWith('-'));
const byId = flags.has('--id');
const keepPatients = flags.has('--keep-patients');
const allowAdmin = flags.has('--allow-admin');
const confirmed = flags.has('--yes') || flags.has('-y');

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const redact = (uri) => uri.replace(/\/\/([^@/]+)@/, '//***@');

if (!term) {
  console.error('Usage: node scripts/delete-doctor.js <name|username|id> [--id] [--keep-patients] [--allow-admin] [--yes]');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('Set MONGODB_URI to the database you want to modify.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
console.log(`Connected to ${redact(process.env.MONGODB_URI)}`);

const query = byId
  ? {_id: term}
  : {$or: [{name: new RegExp(escapeRegExp(term), 'i')}, {username: new RegExp(`^${escapeRegExp(term)}$`, 'i')}]};

const doctors = await Doctor.find(query).lean();
if (!doctors.length) {
  console.log(`No doctors matched "${term}".`);
  await mongoose.disconnect();
  process.exit(0);
}

console.log(`Matched ${doctors.length} doctor(s):`);
for (const d of doctors) {
  const count = await Patient.countDocuments({doctorId: d._id});
  console.log(`  - ${d.name} (@${d.username}, ${d.role}, ${d.email || 'no email'}) _id=${d._id} patients=${count}`);
}

const admins = doctors.filter((d) => d.role === 'admin');
if (admins.length && !allowAdmin) {
  console.error(`\nRefusing: ${admins.length} matched account(s) are admins. Re-run with --allow-admin if you really mean to remove them.`);
  await mongoose.disconnect();
  process.exit(1);
}

if (!confirmed) {
  console.log('\nDry run only — nothing deleted. Re-run with --yes to delete these doctor(s)' + (keepPatients ? ' (keeping patients).' : ' and their patients.'));
  await mongoose.disconnect();
  process.exit(0);
}

let removedDoctors = 0;
let removedPatients = 0;
for (const d of doctors) {
  if (!keepPatients) removedPatients += (await Patient.deleteMany({doctorId: d._id})).deletedCount;
  await Doctor.deleteOne({_id: d._id});
  removedDoctors += 1;
}
console.log(`\nDeleted ${removedDoctors} doctor(s)` + (keepPatients ? '.' : ` and ${removedPatients} patient record(s).`));

await mongoose.disconnect();
