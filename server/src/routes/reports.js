import {Router} from 'express';
import {Patient, Setting} from '../models/index.js';
import {auth} from '../middleware/auth.js';
import {ethiopianParts, isoToday, ETH_MONTHS} from '../utils/ethiopian.js';

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
        let pagumeCarry = 0;

    if (e.month === ETH_MONTHS[0] && e.year) {
      const previousYear = e.year - 1;
      const pagumePattern = `^${escapeRegex(ETH_MONTHS[ETH_MONTHS.length - 1])} \\d{1,2} ${previousYear}$`;

      const pagumeRows = await Patient.find({
        doctorId: q.doctor._id,
        ethDate: {$regex: pagumePattern}
      }).lean();

      pagumeCarry = pagumeRows.reduce(
        (sum, row) => sum + Number(row.myEarning || 0),
        0
      );
    }

    const payableEarnings = earnings + pagumeCarry;

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
    margin: 12mm 12mm 16mm;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    background: #eef3f8;
    color: #172033;
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    font-size: 13px;
    line-height: 1.5;
  }

  .page {
    max-width: 920px;
    margin: 30px auto;
    background: #fff;
    min-height: 100vh;
    box-shadow: 0 12px 40px rgba(20, 40, 70, .12);
  }

  .topbar {
    position: relative;
    display: flex;
    justify-content: space-between;
    gap: 30px;
    align-items: center;
    padding: 30px 36px;
    color: #fff;
    background: linear-gradient(135deg, #123b63 0%, #176b87 55%, #1c8a83 100%);
    overflow: hidden;
  }

  .topbar::after {
    content: "";
    position: absolute;
    width: 230px;
    height: 230px;
    right: -80px;
    top: -110px;
    border-radius: 50%;
    background: rgba(255,255,255,.08);
  }

  .topbar::before {
    content: "";
    position: absolute;
    width: 150px;
    height: 150px;
    right: 120px;
    bottom: -105px;
    border-radius: 50%;
    background: rgba(255,255,255,.06);
  }

  .clinic {
    position: relative;
    z-index: 1;
    font-size: 25px;
    font-weight: 800;
    letter-spacing: -.5px;
  }

  .report-label {
    position: relative;
    z-index: 1;
    margin-top: 5px;
    color: rgba(255,255,255,.82);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: 600;
  }

  .report-date {
    position: relative;
    z-index: 1;
    text-align: right;
    color: rgba(255,255,255,.9);
    font-size: 12px;
    line-height: 1.7;
  }

  .report-date br + * {
    font-weight: 700;
  }

  h1 {
    margin: 32px 36px 5px;
    font-size: 29px;
    line-height: 1.2;
    letter-spacing: -.7px;
    color: #132238;
  }

  .subtitle {
    margin: 0 36px 22px;
    color: #64748b;
    font-size: 13px;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 0 36px 24px;
  }

  .meta span {
    padding: 8px 12px;
    border-radius: 8px;
    background: #f1f6fa;
    border: 1px solid #dbe7ef;
    color: #536579;
    font-size: 12px;
  }

  .meta strong {
    color: #17324d;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin: 0 36px 22px;
  }

  .summary-card {
    position: relative;
    min-height: 94px;
    padding: 16px 17px;
    border: 1px solid #dce7ef;
    border-radius: 12px;
    background: linear-gradient(145deg, #ffffff, #f7fafc);
    box-shadow: 0 4px 12px rgba(30, 60, 90, .05);
    overflow: hidden;
  }

  .summary-card::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: #2a7f9e;
  }

  .summary-card:nth-child(1)::before {
    background: #2878b5;
  }

  .summary-card:nth-child(2)::before {
    background: #2d9275;
  }

  .summary-card:nth-child(3)::before {
    background: #8a63b8;
  }

  .summary-card:nth-child(4)::before {
    background: #d58b32;
  }

  .summary-card span {
    display: block;
    color: #718096;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .9px;
    margin-bottom: 7px;
    font-weight: 700;
  }

  .summary-card strong {
    display: block;
    color: #172033;
    font-size: 19px;
    line-height: 1.25;
  }

  .summary-card small {
    display: block;
    margin-top: 7px;
    color: #b16c1f;
    font-size: 10px;
    line-height: 1.35;
    font-weight: 600;
  }

  table {
    width: calc(100% - 72px);
    margin: 0 36px;
    border-collapse: separate;
    border-spacing: 0;
    border: 1px solid #dbe5ec;
    border-radius: 11px;
    overflow: hidden;
  }

  thead {
    display: table-header-group;
  }

  th {
    background: #173b5f;
    color: #fff;
    font-weight: 700;
    padding: 11px 9px;
    text-align: left;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .5px;
    border: 0;
  }

  th:first-child {
    border-top-left-radius: 10px;
  }

  th:last-child {
    border-top-right-radius: 10px;
  }

  td {
    padding: 9px;
    border-bottom: 1px solid #e8eef3;
    vertical-align: top;
    color: #263548;
    background: #fff;
  }

  tbody tr:nth-child(even) td {
    background: #f8fbfd;
  }

  tbody tr:last-child td {
    border-bottom: 0;
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
    color: #173b5f;
  }

  .muted {
    color: #718096;
  }

  .carryover-box {
    margin: 0 36px 26px;
    padding: 19px 20px;
    border: 1px solid #e7c98f;
    border-left: 5px solid #d58b32;
    border-radius: 12px;
    background: linear-gradient(135deg, #fffaf0, #fffdf8);
    box-shadow: 0 4px 12px rgba(170, 110, 25, .07);
  }

  .carryover-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 17px;
  }

  .carryover-label {
    color: #a76518;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.2px;
  }

  .carryover-title {
    margin-top: 3px;
    color: #513b20;
    font-size: 15px;
    font-weight: 700;
  }

  .carryover-badge {
    flex-shrink: 0;
    padding: 5px 10px;
    border-radius: 20px;
    background: #f3d9aa;
    color: #8a5718;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: .8px;
  }

  .carryover-details {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1.15fr;
    align-items: center;
    gap: 12px;
  }

  .carryover-item {
    padding: 12px 14px;
    border-radius: 9px;
    background: rgba(255,255,255,.78);
    border: 1px solid rgba(213,139,50,.2);
  }

  .carryover-item span {
    display: block;
    color: #806d55;
    font-size: 10px;
    margin-bottom: 4px;
  }

  .carryover-item strong {
    display: block;
    color: #3d3020;
    font-size: 16px;
  }

  .carryover-symbol {
    color: #b47727;
    font-size: 21px;
    font-weight: 800;
    text-align: center;
  }

  .carryover-total {
    background: #fff2d9;
    border-color: #e4bc70;
  }

  .carryover-total span {
    color: #98651f;
  }

  .carryover-total strong {
    color: #925a12;
    font-size: 18px;
  }

  @media (max-width: 700px) {
    .carryover-box {
      margin-left: 20px;
      margin-right: 20px;
    }

    .carryover-details {
      grid-template-columns: 1fr;
      gap: 7px;
    }

    .carryover-symbol {
      line-height: 1;
    }
  }

  @media print {
    .carryover-box,
    .carryover-item,
    .carryover-total {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
  .footer {
    margin: 28px 36px 0;
    padding: 15px 0 28px;
    border-top: 1px solid #dbe5ec;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    color: #7a8795;
    font-size: 10px;
  }

  .print-button {
    position: fixed;
    right: 22px;
    bottom: 22px;
    z-index: 100;
    border: 0;
    border-radius: 10px;
    background: #173b5f;
    color: #fff;
    padding: 12px 18px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 7px 22px rgba(20, 50, 80, .25);
  }

  .print-button:hover {
    background: #125e79;
  }

  @media (max-width: 700px) {
    body {
      background: #fff;
    }

    .page {
      margin: 0;
      box-shadow: none;
    }

    .topbar {
      flex-direction: column;
      align-items: flex-start;
      padding: 25px 20px;
    }

    .report-date {
      text-align: left;
    }

    h1 {
      margin-left: 20px;
      margin-right: 20px;
      font-size: 25px;
    }

    .subtitle {
      margin-left: 20px;
      margin-right: 20px;
    }

    .meta {
      margin-left: 20px;
      margin-right: 20px;
    }

    .summary {
      grid-template-columns: repeat(2, 1fr);
      margin-left: 20px;
      margin-right: 20px;
    }

    table {
      width: calc(100% - 40px);
      margin-left: 20px;
      margin-right: 20px;
      font-size: 11px;
    }

    th,
    td {
      padding: 7px 5px;
    }

    .carryover-box {
    margin: 0 36px 26px;
    padding: 19px 20px;
    border: 1px solid #e7c98f;
    border-left: 5px solid #d58b32;
    border-radius: 12px;
    background: linear-gradient(135deg, #fffaf0, #fffdf8);
    box-shadow: 0 4px 12px rgba(170, 110, 25, .07);
  }

  .carryover-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 17px;
  }

  .carryover-label {
    color: #a76518;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.2px;
  }

  .carryover-title {
    margin-top: 3px;
    color: #513b20;
    font-size: 15px;
    font-weight: 700;
  }

  .carryover-badge {
    flex-shrink: 0;
    padding: 5px 10px;
    border-radius: 20px;
    background: #f3d9aa;
    color: #8a5718;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: .8px;
  }

  .carryover-details {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1.15fr;
    align-items: center;
    gap: 12px;
  }

  .carryover-item {
    padding: 12px 14px;
    border-radius: 9px;
    background: rgba(255,255,255,.78);
    border: 1px solid rgba(213,139,50,.2);
  }

  .carryover-item span {
    display: block;
    color: #806d55;
    font-size: 10px;
    margin-bottom: 4px;
  }

  .carryover-item strong {
    display: block;
    color: #3d3020;
    font-size: 16px;
  }

  .carryover-symbol {
    color: #b47727;
    font-size: 21px;
    font-weight: 800;
    text-align: center;
  }

  .carryover-total {
    background: #fff2d9;
    border-color: #e4bc70;
  }

  .carryover-total span {
    color: #98651f;
  }

  .carryover-total strong {
    color: #925a12;
    font-size: 18px;
  }

  @media (max-width: 700px) {
    .carryover-box {
      margin-left: 20px;
      margin-right: 20px;
    }

    .carryover-details {
      grid-template-columns: 1fr;
      gap: 7px;
    }

    .carryover-symbol {
      line-height: 1;
    }
  }

  @media print {
    .carryover-box,
    .carryover-item,
    .carryover-total {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
  .footer {
      margin-left: 20px;
      margin-right: 20px;
    }
  }

  @media print {
    body {
      background: #fff;
    }

    .page {
      max-width: none;
      min-height: auto;
      margin: 0;
      box-shadow: none;
    }

    .print-button {
      display: none;
    }

    .topbar {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .summary-card,
    .summary-card::before,
    th,
    tbody tr:nth-child(even) td {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .summary-card {
      break-inside: avoid;
    }

    table {
      break-inside: auto;
    }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    th {
      background: #173b5f !important;
      color: #fff !important;
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
      <strong>${money(payableEarnings)} ETB</strong>
    </div>
  </section>

  ${pagumeCarry > 0 ? `
  <section class="carryover-box">
    <div class="carryover-header">
      <div>
        <div class="carryover-label">Pagume carryover</div>
        <div class="carryover-title">Previous Ethiopian year carried forward</div>
      </div>
      <div class="carryover-badge">CARRYOVER</div>
    </div>

    <div class="carryover-details">
      <div class="carryover-item">
        <span>Meskerem ${e.year} earnings</span>
        <strong>${money(earnings)} ETB</strong>
      </div>

      <div class="carryover-symbol">+</div>

      <div class="carryover-item">
        <span>Pagume ${e.year - 1} carried forward</span>
        <strong>${money(pagumeCarry)} ETB</strong>
      </div>

      <div class="carryover-symbol">=</div>

      <div class="carryover-item carryover-total">
        <span>Total payable</span>
        <strong>${money(payableEarnings)} ETB</strong>
      </div>
    </div>
  </section>
  ` : ''}

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





