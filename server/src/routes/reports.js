import {Router} from 'express';
import {Patient, Setting} from '../models/index.js';
import {auth} from '../middleware/auth.js';
import {ethiopianParts, isoToday} from '../utils/ethiopian.js';

const r = Router();
r.use(auth);

const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const escapeRegex = value => String(value ?? '')
  .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const money = value => Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

r.get('/monthly.html', async (q, s) => {
  try {
    const requestedMonth = q.query.month;
const requestedYear = Number(q.query.year);

let e;

if (requestedMonth && Number.isInteger(requestedYear) && requestedYear > 1900) {
  e = {
    month: requestedMonth,
    year: requestedYear
  };
} else {
  const reportDate = q.query.date || isoToday();
  e = ethiopianParts(reportDate);
}

    const monthPattern = `^${escapeRegex(e.month)} \\d{1,2} ${e.year}$`;

    const rows = await Patient.find({
      doctorId: q.doctor._id,
      ethDate: {$regex: monthPattern}
    })
      .sort({gregDate: 1, createdAt: 1})
      .lean();

    const clinicSetting = await Setting.findOne({key: 'clinic_name'}).lean();
    const clinicName = clinicSetting?.value || 'Holy Bethel Dental Clinic';

    const income = rows.reduce(
      (sum, row) => sum + Number(row.totalFee || 0),
      0
    );

    const earnings = rows.reduce(
      (sum, row) => sum + Number(row.myEarning || 0),
      0
    );

    const weightedPercentage = rows.reduce(
      (sum, row) =>
        sum + Number(row.totalFee || 0) * Number(row.doctorPct || 0),
      0
    );

    const percentage = income
      ? weightedPercentage / income
      : 0;

    const doctorName = q.doctor.name || q.doctor.username || 'Doctor';

    s.set('Content-Type', 'text/html; charset=utf-8');

    s.send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(e.month)} ${e.year} — Monthly Report</title>

<style>
  @page {
    size: A4;
    margin: 16mm 14mm 18mm;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background: #f3f5f7;
    color: #17202a;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    line-height: 1.45;
  }

  .page {
    max-width: 900px;
    margin: 32px auto;
    background: #fff;
    padding: 42px 46px;
    box-shadow: 0 8px 30px rgba(23, 32, 42, .08);
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    align-items: flex-start;
    border-bottom: 2px solid #17202a;
    padding-bottom: 20px;
  }

  .clinic {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -.3px;
  }

  .report-label {
    margin-top: 5px;
    color: #65727e;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
  }

  .report-date {
    text-align: right;
    color: #65727e;
    font-size: 12px;
  }

  h1 {
    margin: 28px 0 4px;
    font-size: 27px;
    letter-spacing: -.5px;
  }

  .subtitle {
    margin: 0 0 24px;
    color: #65727e;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 24px;
    margin-bottom: 22px;
    color: #4c5965;
  }

  .meta strong {
    color: #17202a;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin: 20px 0 24px;
  }

  .summary-card {
    border: 1px solid #dce1e5;
    border-radius: 10px;
    padding: 14px;
    background: #fafbfc;
  }

  .summary-card span {
    display: block;
    color: #65727e;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .7px;
    margin-bottom: 6px;
  }

  .summary-card strong {
    font-size: 16px;
  }

  .calculation {
    border: 1px solid #dce1e5;
    border-left: 4px solid #17202a;
    padding: 15px 17px;
    margin-bottom: 26px;
    background: #fafbfc;
  }

  .calculation-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .8px;
    color: #65727e;
    margin-bottom: 6px;
  }

  .formula {
    font-size: 17px;
    font-weight: 700;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    display: table-header-group;
  }

  th {
    background: #17202a;
    color: #fff;
    font-weight: 700;
    padding: 10px 8px;
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .45px;
  }

  td {
    padding: 9px 8px;
    border-bottom: 1px solid #e5e8eb;
    vertical-align: top;
  }

  tbody tr {
    page-break-inside: avoid;
  }

  .number {
    text-align: right;
    white-space: nowrap;
  }

  .patient {
    font-weight: 700;
  }

  .muted {
    color: #65727e;
  }

  .footer {
    margin-top: 28px;
    padding-top: 14px;
    border-top: 1px solid #dce1e5;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    color: #65727e;
    font-size: 11px;
  }

  .print-button {
    position: fixed;
    right: 22px;
    bottom: 22px;
    border: 0;
    border-radius: 9px;
    background: #17202a;
    color: #fff;
    padding: 12px 17px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 5px 18px rgba(23, 32, 42, .2);
  }

  @media (max-width: 700px) {
    .page {
      margin: 0;
      padding: 24px 18px;
    }

    .topbar {
      flex-direction: column;
    }

    .report-date {
      text-align: left;
    }

    .summary {
      grid-template-columns: repeat(2, 1fr);
    }

    table {
      font-size: 11px;
    }

    th,
    td {
      padding: 7px 5px;
    }
  }

  @media print {
    body {
      background: #fff;
    }

    .page {
      max-width: none;
      margin: 0;
      padding: 0;
      box-shadow: none;
    }

    .print-button {
      display: none;
    }

    .summary-card,
    .calculation {
      break-inside: avoid;
    }

    th {
      color: #000;
      background: #eee;
      border-bottom: 1px solid #999;
    }
  }
</style>
</head>

<body>
<button class="print-button" type="button" onclick="window.print()">
  Print / Save as PDF
</button>

<main class="page">

  <header class="topbar">
    <div>
      <div class="clinic">${escapeHtml(clinicName)}</div>
      <div class="report-label">Financial Report</div>
    </div>

    <div class="report-date">
      Ethiopian calendar<br>
      ${escapeHtml(e.month)} ${e.year}
    </div>
  </header>

  <h1>Monthly Earnings Report</h1>
  <p class="subtitle">
    Percentage-based doctor earnings for the selected Ethiopian month.
  </p>

  <div class="meta">
    <span><strong>Doctor:</strong> ${escapeHtml(doctorName)}</span>
    <span><strong>Month:</strong> ${escapeHtml(e.month)} ${e.year}</span>
    <span><strong>Patients:</strong> ${rows.length}</span>
  </div>

  <section class="summary">
    <div class="summary-card">
      <span>Patients</span>
      <strong>${rows.length}</strong>
    </div>

    <div class="summary-card">
      <span>Total income</span>
      <strong>${money(income)} ETB</strong>
    </div>

    <div class="summary-card">
      <span>Doctor percentage</span>
      <strong>${percentage.toFixed(2)}%</strong>
    </div>

    <div class="summary-card">
      <span>Doctor earnings</span>
      <strong>${money(earnings)} ETB</strong>
    </div>
  </section>

  <table>
    <thead>
      <tr>
        <th>Eth date</th>
        <th>Patient</th>
        <th>Card</th>
        <th>Procedure</th>
        <th class="number">Income</th>
        <th class="number">%</th>
        <th class="number">Earnings</th>
      </tr>
    </thead>

    <tbody>
      ${rows.length ? rows.map(row => `
        <tr>
          <td class="muted">${escapeHtml(row.ethDate)}</td>
          <td class="patient">${escapeHtml(row.patientName)}</td>
          <td>${escapeHtml(row.cardNumber)}</td>
          <td>${escapeHtml(row.procedure)}</td>
          <td class="number">${money(row.totalFee)}</td>
          <td class="number">${Number(row.doctorPct || 0).toFixed(2)}%</td>
          <td class="number">${money(row.myEarning)}</td>
        </tr>
      `).join('') : `
        <tr>
          <td colspan="7" class="muted" style="text-align:center;padding:24px">
            No patient records for this Ethiopian month.
          </td>
        </tr>
      `}
    </tbody>
  </table>

  <footer class="footer">
    <span>${escapeHtml(clinicName)}</span>
    <span>Generated from DrPatientLog</span>
  </footer>

</main>
</body>
</html>`);
  } catch (error) {
    console.error('Monthly HTML report error:', error);
    s.status(500).send('Unable to generate the monthly report.');
  }
});

export default r;



