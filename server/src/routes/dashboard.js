import {Router} from 'express';
import {Patient,SalaryClosure} from '../models/index.js';
import {auth} from '../middleware/auth.js';
import {ethiopianParts,ETH_MONTHS,isoToday,monthStarted} from '../utils/ethiopian.js';
import {normalizePatient,summarizeNormalized,summarizePayments} from '../utils/payments.js';

const r=Router();
r.use(auth);

const allPatients=doctorId=>Patient.find({doctorId}).lean();

const ethRegex=(month,year)=>new RegExp(`^${month} \\d+ ${year}$`);

const monthOfEth=ethDate=>{
  const parts=String(ethDate||'').trim().split(/\s+/);
  if(parts.length<3)return null;
  const year=Number(parts[parts.length-1]);
  if(!Number.isInteger(year)||year<1900)return null;
  return {month:parts.slice(0,-2).join(' ')||parts[0],year};
};

r.get('/',async(q,s)=>{
  const iso=isoToday();
  const e=ethiopianParts(iso);
  const range=q.query.range;

  let payFilter={};
  let patientInRange=()=>true;

  if(range==='today'){
    payFilter={date:iso};
    patientInRange=p=>p.gregDate===iso;
  }else if(range==='week'){
    const d=new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate()-6);
    const from=d.toISOString().slice(0,10);
    payFilter={dateFrom:from,dateTo:iso};
    patientInRange=p=>p.gregDate>=from&&p.gregDate<=iso;
  }else if(range!=='all'){
    const rx=ethRegex(e.month,e.year);
    payFilter={ethPattern:rx};
    patientInRange=p=>rx.test(p.ethDate||'');
  }

  const patients=await allPatients(q.doctor._id);
  const normalized=patients.map(normalizePatient);
  const today=summarizeNormalized(normalized,{date:iso});
  const rangeSum=summarizeNormalized(normalized,payFilter);
  const count=patients.filter(patientInRange).length;
  const outstanding=Number(
    normalized.reduce((sum,p)=>sum+Number(p.balance||0),0).toFixed(2)
  );

  const recent=(await Patient.find({doctorId:q.doctor._id})
    .sort({createdAt:-1})
    .limit(8)
    .lean()).map(normalizePatient);

  s.json({
    todayCut:today.cut,
    rangeCut:rangeSum.cut,
    rangeIncome:rangeSum.income,
    outstanding,
    count,
    recent,
    ethToday:e
  });
});

r.get('/monthly',async(q,s)=>{
  const [patients,closures]=await Promise.all([
    allPatients(q.doctor._id),
    SalaryClosure.find({doctorId:q.doctor._id}).lean()
  ]);

  const cur=ethiopianParts(isoToday());
  const map=new Map();
  const keyOf=mv=>`${mv.month} ${mv.year}`;
  const ensure=mv=>{
    const k=keyOf(mv);
    if(!map.has(k))map.set(k,{_id:{month:mv.month,year:mv.year},count:0,income:0,payable:0,weighted:0});
    return map.get(k);
  };

  for(const p of patients){
    const mv=monthOfEth(p.ethDate);
    if(mv)ensure(mv).count+=1;
  }

  for(const p of patients){
    for(const row of summarizePayments([p],{}).rows){
      const mv=monthOfEth(row.ethDate);
      if(!mv)continue;
      const m=ensure(mv);
      m.income+=row.totalFee;
      m.payable+=row.myEarning;
      m.weighted+=row.totalFee*Number(row.doctorPct||0);
    }
  }

  const months=[...map.values()].map(x=>{
    const closed=closures.find(c=>c.ethMonth===x._id.month&&c.ethYear===x._id.year);
    const prev=map.get(`${ETH_MONTHS[ETH_MONTHS.length-1]} ${x._id.year-1}`);
    const pagumeCarry=(x._id.month===ETH_MONTHS[0]&&prev)?Number(prev.payable||0):0;

    return {
      ...x,
      income:Number(x.income.toFixed(2)),
      payable:Number((x.payable+pagumeCarry).toFixed(2)),
      pagumeCarry:Number(pagumeCarry.toFixed(2)),
      pct:x.income?x.weighted/x.income:0,
      closed:!!closed,
      closure:closed||null,
      isCurrent:x._id.month===cur.month&&x._id.year===cur.year,
      canClose:monthStarted(cur,{month:x._id.month,monthIndex:ETH_MONTHS.indexOf(x._id.month)+1,year:x._id.year})&&x._id.month!=='ጳጉሜ'
    };
  }).sort((a,b)=>b._id.year-a._id.year||ETH_MONTHS.indexOf(b._id.month)-ETH_MONTHS.indexOf(a._id.month));

  s.json({months});
});

r.post('/monthly/close',async(q,s)=>{
  const {month,year}=q.body;
  const cur=ethiopianParts(isoToday());
  const idx=ETH_MONTHS.indexOf(month)+1;

  if(!monthStarted(cur,{month,monthIndex:idx,year}))
    return s.status(400).json({message:'The next Ethiopian month has not started yet.'});

  if(month==='ጳጉሜ')
    return s.status(400).json({message:'Pagume is carried into Meskerem.'});

  const existing=await SalaryClosure.findOne({
    doctorId:q.doctor._id,
    ethMonth:month,
    ethYear:Number(year)
  });

  if(existing)return s.status(409).json({message:'Month already closed'});

  const patients=await allPatients(q.doctor._id);
  const a=summarizePayments(patients,{ethPattern:ethRegex(month,year)});

  const c=await SalaryClosure.create({
    doctorId:q.doctor._id,
    ethMonth:month,
    ethYear:Number(year),
    earnedAmount:a.cut||0,
    paidDate:isoToday(),
    paidEthDate:`${cur.month} ${cur.day} ${cur.year}`,
    closedBy:q.doctor.name
  });

  s.json(c);
});

r.get('/calendar',async(q,s)=>{
  const cur=ethiopianParts(isoToday());
  const month=q.query.month||cur.month;
  const year=Number(q.query.year||cur.year);
  const mi=ETH_MONTHS.indexOf(month)+1;
  const patients=await allPatients(q.doctor._id);

  if(q.query.day){
    const day=Number(q.query.day);
    const sum=summarizePayments(patients,{ethPattern:new RegExp(`^${month} ${day} ${year}$`)});
    return s.json({
      month,
      monthIndex:mi,
      year,
      day,
      patients:sum.rows,
      count:sum.rows.length,
      cut:sum.cut,
      income:sum.income
    });
  }

  const sum=summarizePayments(patients,{ethPattern:ethRegex(month,year)});
  const dayMap=new Map();

  for(const row of sum.rows){
    const parts=String(row.ethDate||'').trim().split(/\s+/);
    const day=Number(parts[1]||0);
    if(!(day>0))continue;
    if(!dayMap.has(day))dayMap.set(day,{day,count:0,cut:0,income:0});
    const e=dayMap.get(day);
    e.count+=1;
    e.income+=row.totalFee;
    e.cut+=row.myEarning;
  }

  const days=[...dayMap.values()]
    .map(x=>({...x,income:Number(x.income.toFixed(2)),cut:Number(x.cut.toFixed(2))}))
    .sort((a,b)=>a.day-b.day);

  s.json({
    month,
    monthIndex:mi,
    year,
    days,
    totalVisits:days.reduce((a,d)=>a+d.count,0),
    totalIncome:Number(days.reduce((a,d)=>a+d.income,0).toFixed(2))
  });
});

export default r;
