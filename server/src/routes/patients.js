import {Router} from 'express';
import {Patient,ProcedurePreset,AuditLog,Doctor} from '../models/index.js';
import {auth} from '../middleware/auth.js';
import {ethiopianDate,isoToday} from '../utils/ethiopian.js';
import {
  normalizePatient,
  buildPatientPayload,
  addPayment,
  recomputePatientTotals,
  orderTreatments,
  removeTreatment
} from '../utils/payments.js';
import {buildEarningMessage,buildDeleteMessage,buildTreatmentMessage,buildTreatmentUpdateMessage,buildTreatmentDeleteMessage,buildPaymentMessage,sendTelegram,queueTelegram} from '../services/telegram.js';

const r=Router();
r.use(auth);

const ensureTreatments=p=>normalizePatient(p);
const payload=(b,d,existingDoc=null)=>buildPatientPayload(b,d._id,existingDoc);

const sendOrQueue=async(doctorId,message)=>{
  try{
    const doctor=await Doctor.findById(doctorId).lean();
    const result=await sendTelegram(doctor,message);

    if(result.sent){
      return {sent:true,queued:false};
    }

    await queueTelegram(doctorId,message);
    return {
      sent:false,
      queued:true,
      reason:result.reason
    };
  }catch(e){
    try{
      await queueTelegram(doctorId,message);
      return {
        sent:false,
        queued:true,
        reason:e.message
      };
    }catch(queueError){
      return {
        sent:false,
        queued:false,
        reason:queueError.message
      };
    }
  }
};

r.get('/',async(q,s)=>{
  const filter={doctorId:q.doctor._id};
  const {q:term,from,to,hasBalance,balance}=q.query;
  if(from||to)filter.gregDate={...(from?{$gte:from}:{}),...(to?{$lte:to}:{})};
  if(term)filter.$or=['patientName','cardNumber','ticketNo','treatments.ticketNo','procedure'].map(k=>({[k]:{$regex:term,$options:'i'}}));
  if(balance==='due'||hasBalance==='true')filter.balance={$gt:0};
  else if(balance==='paid')filter.balance={$lte:0};
  const list=await Patient.find(filter).sort({gregDate:-1,createdAt:-1}).limit(500).lean();
  s.json(list.map(ensureTreatments).map(orderTreatments));
});

r.get('/balances',async(q,s)=>{
  const filter={doctorId:q.doctor._id,balance:{$gt:0}};
  const {q:term,from,to}=q.query;
  if(from||to)filter.gregDate={...(from?{$gte:from}:{}),...(to?{$lte:to}:{})};
  if(term)filter.$or=['patientName','cardNumber','ticketNo','treatments.ticketNo','procedure'].map(k=>({[k]:{$regex:term,$options:'i'}}));
  const list=await Patient.find(filter).sort({gregDate:-1,createdAt:-1}).limit(500).lean();
  s.json(list.map(ensureTreatments).map(orderTreatments));
});

r.get('/presets/list',async(q,s)=>s.json(await ProcedurePreset.find().sort({procedure:1}).lean()));

r.get('/suggest-fee',async(q,s)=>{
  const p=await ProcedurePreset.findOne({procedure:q.query.procedure});
  s.json({fee:p?.fee??null});
});

r.post('/presets',async(q,s)=>{
  const p=await ProcedurePreset.findOneAndUpdate(
    {procedure:q.body.procedure},
    {procedure:q.body.procedure,fee:Number(q.body.fee)},
    {upsert:true,new:true}
  );
  s.json(p);
});

r.get('/:id',async(q,s)=>{
  const p=await Patient.findOne({_id:q.params.id,doctorId:q.doctor._id}).lean();
  if(!p)return s.status(404).json({message:'Patient not found'});
  s.json(orderTreatments(ensureTreatments(p)));
});

r.post('/',async(q,s)=>{
  try{
    const p=await Patient.create(payload(q.body,q.doctor));

    await AuditLog.create({
      doctorId:q.doctor._id,
      doctorName:q.doctor.name,
      action:'create',
      entity:'patient',
      entityId:String(p._id),
      detail:p.patientName
    });

    const message=await buildEarningMessage({
      title:'New patient record',
      ethDate:p.ethDate,
      ticketNo:p.ticketNo,
      patientName:p.patientName,
      cardNumber:p.cardNumber,
      procedure:p.procedure,
      fee:p.totalFee,
      cut:p.myEarning,
      paid:p.paidAmount,
      balance:p.balance,
      paymentType:Number(p.balance||0)>0?'partial':'full'
    });

    const telegram=await sendOrQueue(p.doctorId,message);

    s.status(201).json({
      ...ensureTreatments(p.toObject()),
      telegram
    });
  }catch(e){
    s.status(400).json({message:e.message});
  }
});

r.put('/:id',async(q,s)=>{
  try{
    const p=await Patient.findOne({
      _id:q.params.id,
      doctorId:q.doctor._id
    });

    if(!p)return s.status(404).json({message:'Patient not found'});

    const beforeTreatments=ensureTreatments(p.toObject()).treatments;

    const knownIds=new Set((p.treatments||[]).map(t=>String(t._id)));
    knownIds.add(String(p._id));

    const rawList=Array.isArray(q.body.treatments)&&q.body.treatments.length
      ? q.body.treatments
      : null;

    const data=payload(q.body,q.doctor,p);

    // Treatments with no stored id (and not the legacy patient id) are brand new.
    const added=[];
    const changed=[];
    if(rawList){
      data.treatments.forEach((t,i)=>{
        const raw=rawList[i]||{};
        if(!raw._id||!knownIds.has(String(raw._id))){
          added.push(t);
          return;
        }
        const prev=beforeTreatments.find(x=>String(x._id)===String(t._id));
        if(!prev)return;
        const same=String(prev.procedure||'')===String(t.procedure||'')
          &&String(prev.ticketNo||'')===String(t.ticketNo||'')
          &&Number(prev.totalFee||0)===Number(t.totalFee||0)
          &&Number(prev.doctorPct||0)===Number(t.doctorPct||0)
          &&Number(prev.paidAmount||0)===Number(t.paidAmount||0);
        if(!same)changed.push(t);
      });
    }

    Object.assign(p,data);
    await p.save();

    await AuditLog.create({
      doctorId:q.doctor._id,
      doctorName:q.doctor.name,
      action:added.length?'add-treatment':'update',
      entity:'patient',
      entityId:String(p._id),
      detail:added.length
        ? `${p.patientName} - added ${added.map(t=>t.procedure).join(', ')}`
        : `${p.patientName} - ${p.procedure} - ${p.totalFee.toFixed(2)}`
    });

    let telegram;

    if(added.length){
      const results=[];
      for(const t of added){
        const message=await buildTreatmentMessage({
          ethDate:t.ethDate||p.ethDate,
          patientName:p.patientName,
          cardNumber:p.cardNumber,
          ticketNo:t.ticketNo||p.ticketNo,
          treatment:t
        });
        results.push(await sendOrQueue(p.doctorId,message));
      }
      telegram=results.length===1
        ? results[0]
        : {sent:results.every(r=>r.sent),queued:results.some(r=>r.queued),count:results.length};
    }else if(changed.length){
      const results=[];
      for(const t of changed){
        const message=await buildTreatmentUpdateMessage({
          ethDate:t.ethDate||p.ethDate,
          patientName:p.patientName,
          cardNumber:p.cardNumber,
          ticketNo:t.ticketNo||p.ticketNo,
          treatment:t
        });
        results.push(await sendOrQueue(p.doctorId,message));
      }
      telegram=results.length===1
        ? results[0]
        : {sent:results.every(r=>r.sent),queued:results.some(r=>r.queued),count:results.length};
    }else{
      const message=await buildEarningMessage({
        title:'Record updated',
        ethDate:p.ethDate,
        ticketNo:p.ticketNo,
        patientName:p.patientName,
        cardNumber:p.cardNumber,
        procedure:p.procedure,
        fee:p.totalFee,
        cut:p.myEarning,
        paid:p.paidAmount,
        balance:p.balance,
        paymentType:Number(p.balance||0)>0?'partial':'full'
      });
      telegram=await sendOrQueue(p.doctorId,message);
    }

    s.json({
      ...orderTreatments(ensureTreatments(p.toObject())),
      telegram
    });
  }catch(e){
    s.status(400).json({message:e.message});
  }
});

const handlePayment=async(q,s,treatmentId)=>{
  try{
    const p=await Patient.findOne({
      _id:q.params.id,
      doctorId:q.doctor._id
    });

    if(!p)return s.status(404).json({message:'Patient not found'});

    const data=ensureTreatments(p.toObject());
    const targetId=treatmentId||q.body.treatmentId||String(data.treatments?.[0]?._id||'');
    const t=data.treatments?.find(x=>String(x._id)===String(targetId));

    if(!t)return s.status(404).json({message:'Treatment not found'});

    const date=q.body.date||isoToday();
    const ethDate=q.body.ethDate||ethiopianDate(date);
    const note=(q.body.note||'').trim();
    const ref=(q.body.ref||'').trim();

    const result=addPayment(t,{
      amount:Number(q.body.amount||0),
      date,
      ethDate,
      note,
      ref,
      receivedAt:new Date()
    });

    if(!result.ok){
      if(result.duplicate){
        return s.status(409).json({
          message:result.error,
          duplicate:true,
          patient:orderTreatments(ensureTreatments(p.toObject()))
        });
      }
      return s.status(400).json({message:result.error});
    }

    recomputePatientTotals(data);

    p.treatments=data.treatments;
    p.totalFee=data.totalFee;
    p.paidAmount=data.paidAmount;
    p.balance=data.balance;
    p.myEarning=data.myEarning;
    p.procedure=data.procedure;

    await AuditLog.create({
      doctorId:q.doctor._id,
      doctorName:q.doctor.name,
      action:'payment',
      entity:'treatment',
      entityId:String(t._id),
      detail:`Received ${result.payment.amount.toFixed(2)} ETB for ${t.procedure} (${p.patientName}). Commission: ${result.payment.commission.toFixed(2)} ETB. Remaining balance: ${t.balance.toFixed(2)} ETB`
    });

    await p.save();

    const message=await buildPaymentMessage({
      ethDate,
      patientName:p.patientName,
      cardNumber:p.cardNumber,
      ticketNo:t.ticketNo||p.ticketNo,
      treatment:t,
      payment:result.payment
    });

    const telegram=await sendOrQueue(p.doctorId,message);

    s.json({
      ok:true,
      patient:orderTreatments(ensureTreatments(p.toObject())),
      treatment:t,
      payment:result.payment,
      telegram
    });
  }catch(e){
    s.status(400).json({message:e.message});
  }
};

r.post('/:id/treatments/:treatmentId/pay',(q,s)=>handlePayment(q,s,q.params.treatmentId));
r.post('/:id/pay',(q,s)=>handlePayment(q,s));

r.delete('/:id/treatments/:treatmentId',async(q,s)=>{
  try{
    const p=await Patient.findOne({
      _id:q.params.id,
      doctorId:q.doctor._id
    });

    if(!p)return s.status(404).json({message:'Patient not found'});

    const result=removeTreatment(p.toObject(),q.params.treatmentId);

    if(!result.ok){
      const status=result.error==='Treatment not found.'?404:400;
      return s.status(status).json({message:result.error});
    }

    const removed=result.removed;

    // Write the surviving treatments back explicitly so a legacy patient (whose
    // synthetic treatment borrows the patient id) is persisted correctly.
    p.treatments=result.patient.treatments.map(t=>({
      _id:t._id&&String(t._id)!==String(p._id)?t._id:undefined,
      date:t.date,
      ethDate:t.ethDate,
      ticketNo:t.ticketNo,
      procedure:t.procedure,
      totalFee:t.totalFee,
      doctorPct:t.doctorPct,
      paymentType:t.paymentType,
      paidAmount:t.paidAmount,
      balance:t.balance,
      payments:t.payments
    }));

    recomputePatientTotals(p);
    await p.save();

    await AuditLog.create({
      doctorId:q.doctor._id,
      doctorName:q.doctor.name,
      action:'delete-treatment',
      entity:'treatment',
      entityId:String(removed._id),
      detail:`${p.patientName} - removed ${removed.procedure} (${Number(removed.totalFee||0).toFixed(2)} ETB)`
    });

    const message=await buildTreatmentDeleteMessage({
      ethDate:removed.ethDate||removed.date||p.ethDate,
      patientName:p.patientName,
      cardNumber:p.cardNumber,
      ticketNo:removed.ticketNo||p.ticketNo,
      treatment:removed
    });

    const telegram=await sendOrQueue(p.doctorId,message);

    s.json({
      ok:true,
      patient:orderTreatments(ensureTreatments(p.toObject())),
      telegram
    });
  }catch(e){
    s.status(400).json({message:e.message});
  }
});

r.delete('/:id',async(q,s)=>{
  try{
    const p=await Patient.findOneAndDelete({
      _id:q.params.id,
      doctorId:q.doctor._id
    });

    if(!p)return s.status(404).json({message:'Patient not found'});

    await AuditLog.create({
      doctorId:q.doctor._id,
      doctorName:q.doctor.name,
      action:'delete',
      entity:'patient',
      entityId:String(q.params.id),
      detail:p.patientName
    });

    const message=await buildDeleteMessage(p.patientName);
    const telegram=await sendOrQueue(p.doctorId,message);

    s.json({
      ok:true,
      telegram
    });
  }catch(e){
    s.status(400).json({message:e.message});
  }
});

export default r;
