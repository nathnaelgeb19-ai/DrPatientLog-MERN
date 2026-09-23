import {Router} from 'express';
import {Doctor,Patient} from '../models/index.js';
import {auth} from '../middleware/auth.js';
import {
  sendTelegram,
  buildDailyMessage,
  buildMonthlyMessage
} from '../services/telegram.js';
import {ethiopianParts,isoToday} from '../utils/ethiopian.js';

const r=Router();

r.use(auth);

r.post('/daily',async(q,s)=>{
  const d=await Doctor.findById(q.doctor._id);
  const iso=isoToday();
  const e=ethiopianParts(iso);

  const rows=await Patient.find({
    doctorId:d._id,
    gregDate:iso
  }).lean();

  const income=rows.reduce(
    (a,x)=>a+Number(x.totalFee||0),
    0
  );

  const cut=rows.reduce(
    (a,x)=>a+Number(x.myEarning||0),
    0
  );

  const weighted=income
    ? rows.reduce(
        (a,x)=>a+
          (Number(x.totalFee||0)*Number(x.doctorPct||0)),
        0
      )/income
    : 0;

  try{
    const message=await buildDailyMessage(
      `${e.month} ${e.day} ${e.year}`,
      rows.length,
      income,
      cut,
      weighted
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

  const rows=await Patient.find({
    doctorId:d._id,
    ethDate:{$regex:` ${e.year}$`}
  }).lean();

  const income=rows.reduce(
    (a,x)=>a+Number(x.totalFee||0),
    0
  );

  const cut=rows.reduce(
    (a,x)=>a+Number(x.myEarning||0),
    0
  );

  const weighted=income
    ? rows.reduce(
        (a,x)=>a+
          (Number(x.totalFee||0)*Number(x.doctorPct||0)),
        0
      )/income
    : 0;

  let pagumeCarry=0;

  if(e.month==='መስከረም' && e.year){
    const pagumeRows=await Patient.find({
      doctorId:d._id,
      ethDate:{$regex:`^ጳጉሜ \\d{1,2} ${e.year-1}$`}
    }).lean();

    pagumeCarry=pagumeRows.reduce(
      (a,x)=>a+Number(x.myEarning||0),
      0
    );
  }

  try{
    const message=await buildMonthlyMessage(
      e.month,
      e.year,
      rows.length,
      income,
      cut,
      weighted,
      pagumeCarry
    );

    s.json(await sendTelegram(d,message));
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

  const rows=await Patient.find({
    doctorId:d._id,
    ethDate:{$regex:`^${month} \\d{1,2} ${year}$`}
  }).lean();

  const income=rows.reduce(
    (a,x)=>a+Number(x.totalFee||0),
    0
  );

  const cut=rows.reduce(
    (a,x)=>a+Number(x.myEarning||0),
    0
  );

  const weighted=income
    ? rows.reduce(
        (a,x)=>a+
          (Number(x.totalFee||0)*Number(x.doctorPct||0)),
        0
      )/income
    : 0;

  let pagumeCarry=0;

  if(month==='መስከረም' && year){
    const pagumeRows=await Patient.find({
      doctorId:d._id,
      ethDate:{$regex:`^ጳጉሜ \\d{1,2} ${year-1}$`}
    }).lean();

    pagumeCarry=pagumeRows.reduce(
      (a,x)=>a+Number(x.myEarning||0),
      0
    );
  }

  try{
    const message=await buildMonthlyMessage(
      month,
      year,
      rows.length,
      income,
      cut,
      weighted,
      pagumeCarry
    );

    s.json(await sendTelegram(d,message));
  }catch(err){
    s.status(400).json({message:err.message});
  }
});

export default r;
