import {Router} from 'express';
import multer from 'multer';
import {Patient} from '../models/index.js';
import {auth} from '../middleware/auth.js';
import {ethiopianDate} from '../utils/ethiopian.js';

const r=Router();
r.use(auth);
const upload=multer({storage:multer.memoryStorage()});

function esc(v){
  return '"'+String(v??'').replaceAll('"','""')+'"';
}

r.get('/patients.csv',async(q,s)=>{
  const rows=await Patient.find({doctorId:q.doctor._id}).sort({gregDate:-1}).lean();
  const head=['id','greg_date','eth_date','patient_name','card_number','ticket_no','procedure','total_fee','doctor_pct','my_earning'];
  const lines=[head.join(',')];
  for(const p of rows){
    lines.push([p._id,p.gregDate,p.ethDate,p.patientName,p.cardNumber,p.ticketNo,p.procedure,p.totalFee,p.doctorPct,p.myEarning].map(esc).join(','));
  }
  s.set('content-type','text/csv');
  s.set('content-disposition','attachment; filename="patients.csv"');
  s.send(lines.join('\n'));
});

r.post('/patients.csv',upload.single('file'),async(q,s)=>{
  try{
    if(!q.file)return s.status(400).json({message:'Please select a CSV file.'});

    const text=q.file.buffer.toString('utf8');
    const lines=text.split(/\r?\n/).filter(Boolean);

    if(lines.length<2)return s.status(400).json({message:'CSV is empty'});

    const rows=[];

    for(const line of lines.slice(1)){
      const c=line.split(',').map(x=>x.replace(/^"|"$/g,''));

      if(c.length<8)continue;

      rows.push({
        gregDate:c[1],
        ethDate:c[2]||ethiopianDate(c[1]),
        patientName:c[3],
        cardNumber:c[4],
        ticketNo:c[5],
        procedure:c[6],
        totalFee:Number(c[7]||0),
        doctorPct:Number(c[8]||4),
        myEarning:Number(c[9]||0),
        doctorId:q.doctor._id
      });
    }

    if(rows.length)await Patient.insertMany(rows);

    s.json({imported:rows.length});
  }catch(e){
    s.status(500).json({message:e.message||'CSV import failed.'});
  }
});

export default r;
