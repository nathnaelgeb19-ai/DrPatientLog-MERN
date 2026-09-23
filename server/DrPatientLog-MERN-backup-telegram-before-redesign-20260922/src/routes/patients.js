import {Router} from 'express';
import {Patient,ProcedurePreset,AuditLog,Doctor} from '../models/index.js';
import {auth} from '../middleware/auth.js';
import {ethiopianDate} from '../utils/ethiopian.js';
import {buildEarningMessage,buildDeleteMessage,sendTelegram,queueTelegram} from '../services/telegram.js';

const r=Router();
r.use(auth);

const payload=(b,d)=>{
  const fee=Number(b.totalFee||0),pct=Number(b.doctorPct??4);
  return {
    gregDate:b.gregDate,
    ethDate:b.ethDate||ethiopianDate(b.gregDate),
    patientName:(b.patientName||'').trim(),
    cardNumber:(b.cardNumber||'').trim(),
    ticketNo:(b.ticketNo||'').trim(),
    procedure:(b.procedure||'').trim(),
    totalFee:fee,
    doctorPct:pct,
    myEarning:Math.round(fee*pct)/100,
    doctorId:d._id
  };
};

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
  const {q:term,from,to}=q.query;
  if(from||to)filter.gregDate={...(from?{$gte:from}:{}),...(to?{$lte:to}:{})};
  if(term)filter.$or=['patientName','cardNumber','ticketNo','procedure'].map(k=>({[k]:{$regex:term,$options:'i'}}));
  s.json(await Patient.find(filter).sort({gregDate:-1,createdAt:-1}).limit(500).lean())
});

r.get('/:id',async(q,s)=>{
  const p=await Patient.findOne({_id:q.params.id,doctorId:q.doctor._id}).lean();
  if(!p)return s.status(404).json({message:'Patient not found'});
  s.json(p)
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

    const message=await buildEarningMessage(
      'New patient record',
      p.ethDate,
      p.ticketNo,
      p.patientName,
      p.cardNumber,
      p.procedure,
      p.totalFee,
      p.myEarning,
      p.doctorPct,
      p.doctorId
    );

    const telegram=await sendOrQueue(p.doctorId,message);

    s.status(201).json({
      ...p.toObject(),
      telegram
    });
  }catch(e){
    s.status(400).json({message:e.message})
  }
});

r.put('/:id',async(q,s)=>{
  try{
    const p=await Patient.findOne({
      _id:q.params.id,
      doctorId:q.doctor._id
    });

    if(!p)return s.status(404).json({message:'Patient not found'});

    Object.assign(p,payload(q.body,q.doctor));
    await p.save();

    await AuditLog.create({
      doctorId:q.doctor._id,
      doctorName:q.doctor.name,
      action:'update',
      entity:'patient',
      entityId:String(p._id),
      detail:`${p.patientName} - ${p.procedure} - ${p.totalFee.toFixed(2)}`
    });

    const message=await buildEarningMessage(
      'Record updated',
      p.ethDate,
      p.ticketNo,
      p.patientName,
      p.cardNumber,
      p.procedure,
      p.totalFee,
      p.myEarning,
      p.doctorPct,
      p.doctorId
    );

    const telegram=await sendOrQueue(p.doctorId,message);

    s.json({
      ...p.toObject(),
      telegram
    });
  }catch(e){
    s.status(400).json({message:e.message})
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
    s.status(400).json({message:e.message})
  }
});

r.get('/presets/list',async(q,s)=>s.json(await ProcedurePreset.find().sort({procedure:1}).lean()));

r.get('/suggest-fee',async(q,s)=>{
  const p=await ProcedurePreset.findOne({procedure:q.query.procedure});
  s.json({fee:p?.fee??null})
});

r.post('/presets',async(q,s)=>{
  const p=await ProcedurePreset.findOneAndUpdate(
    {procedure:q.body.procedure},
    {procedure:q.body.procedure,fee:Number(q.body.fee)},
    {upsert:true,new:true}
  );
  s.json(p)
});

export default r;



