import {Router} from 'express';
import {Doctor,Patient,SalaryClosure} from '../models/index.js';
import {auth} from '../middleware/auth.js';
import {
  sendTelegram,
  sendTelegramDocument,
  buildDailyMessage,
  buildMonthlyMessage
} from '../services/telegram.js';
import {buildMonthlyHtml} from './reports.js';
import {ethiopianParts,isoToday} from '../utils/ethiopian.js';
import {normalizePatient, summarizeNormalized} from '../utils/payments.js';

const r=Router();

r.use(auth);

r.post('/daily',async(q,s)=>{
  const d=await Doctor.findById(q.doctor._id);
  const iso=isoToday();
  const e=ethiopianParts(iso);

  const patients=await Patient.find({doctorId:d._id}).lean();
  const sum=summarizePayments(patients,{date:iso});
  const rows=sum.rows;
  const income=sum.income;
  const cut=sum.cut;
  const weighted=income?sum.weighted/income:0;

  try{
    const message=await buildDailyMessage(
      `${e.month} ${e.day} ${e.year}`,
      rows.length,
      income,
      cut,
      weighted,
      rows
    );

    const out=await sendTelegram(d,message);
    s.json(out);
  }catch(e){
    s.status(400).json({message:e.message});
  }
});

r.post('/monthly',async(q,s)=>{
  const d=await Doctor.findById(q.doctor._id);
  const e=ethiopianParts(isoToday());

  const patients=await Patient.find({doctorId:d._id}).lean();
  const normalized=patients.map(normalizePatient);
  const monthPattern=new RegExp(`^${e.month.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} \\d{1,2} ${e.year}$`);
  const sum=summarizeNormalized(normalized,{ethPattern:monthPattern});
  const rows=sum.rows;
  const income=sum.income;
  const cut=sum.cut;
  const weighted=income?sum.weighted/income:0;

  let pagumeCarry=0;

  if(e.month==='መስከረም' && e.year){
    pagumeCarry=summarizeNormalized(normalized,{
      ethPattern:new RegExp(`^ጳጉሜ \\d{1,2} ${e.year-1}$`)
    }).cut;
  }

  try{
    const closure=await SalaryClosure.findOne({
      doctorId:d._id,
      ethMonth:e.month,
      ethYear:e.year
    }).lean();

    const message=await buildMonthlyMessage(
      e.month,
      e.year,
      rows.length,
      income,
      cut,
      weighted,
      pagumeCarry,
      [],
      !!closure
    );

    let result;

    try{
      const html=await buildMonthlyHtml(
        d,
        {month:e.month,year:e.year}
      );

      const filename=
        `hakim-monthly-${e.month.replace(/\s+/g,'-')}-${e.year}.html`;

      result=await sendTelegramDocument(
        d,
        Buffer.from(html,'utf8'),
        filename,
        message.slice(0,1024)
      );
    }catch(htmlError){
      result=await sendTelegram(d,message);
    }

    s.json(result);
  }catch(err){
    s.status(400).json({message:err.message});
  }
});


r.post('/monthly-period',async(q,s)=>{
  const d=await Doctor.findById(q.doctor._id);
  const month=String(q.body?.month||'').trim();
  const year=Number(q.body?.year);

  if(!month || !Number.isInteger(year) || year<1900){
    return s.status(400).json({
      message:'Valid Ethiopian month and year are required.'
    });
  }

  const patients=await Patient.find({doctorId:d._id}).lean();
  const normalized=patients.map(normalizePatient);
  const sum=summarizeNormalized(normalized,{ethPattern:new RegExp(`^${month} \\d{1,2} ${year}$`)});
  const rows=sum.rows;
  const income=sum.income;
  const cut=sum.cut;
  const weighted=income?sum.weighted/income:0;

  let pagumeCarry=0;

  if(month==='መስከረም' && year){
    pagumeCarry=summarizeNormalized(normalized,{
      ethPattern:new RegExp(`^ጳጉሜ \\d{1,2} ${year-1}$`)
    }).cut;
  }

  try{
    const closure=await SalaryClosure.findOne({
      doctorId:d._id,
      ethMonth:month,
      ethYear:year
    }).lean();

    const message=await buildMonthlyMessage(
      month,
      year,
      rows.length,
      income,
      cut,
      weighted,
      pagumeCarry,
      [],
      !!closure
    );

    let result;

    try{
      const html=await buildMonthlyHtml(
        d,
        {month,year}
      );

      const filename=
        `hakim-monthly-${month.replace(/\s+/g,'-')}-${year}.html`;

      result=await sendTelegramDocument(
        d,
        Buffer.from(html,'utf8'),
        filename,
        message.slice(0,1024)
      );
    }catch(htmlError){
      result=await sendTelegram(d,message);
    }

    s.json(result);
  }catch(err){
    s.status(400).json({message:err.message});
  }
});

export default r;
