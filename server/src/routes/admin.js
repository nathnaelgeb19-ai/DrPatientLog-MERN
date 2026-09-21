import {Router} from 'express';
import {AuditLog,Doctor,Setting} from '../models/index.js';
import {automaticBackup} from './cron.js';
import {auth,adminOnly} from '../middleware/auth.js';
import {snapshot,restore,createBackupFile} from '../services/backup.js';
import {driveBackup} from '../services/googleDrive.js';
import {sendTelegram,buildTestMessage} from '../services/telegram.js';
import {ethiopianParts,isoToday} from '../utils/ethiopian.js';
import fs from 'fs/promises';

const r=Router();

r.use(auth);

r.get('/audit',adminOnly,async(q,s)=>
  s.json(await AuditLog.find().sort({createdAt:-1}).limit(500).lean())
);

r.get('/backup',adminOnly,async(q,s)=>{
  const data=await snapshot();
  s.set('content-type','application/json');
  s.set('content-disposition',`attachment; filename="drpatientlog-backup-${isoToday()}.json"`);
  s.send(JSON.stringify(data,null,2));
});

r.get('/backup/status',adminOnly,async(q,s)=>{
  const dir=process.env.BACKUP_DIR||'/tmp/drpatientlog-backups';

  let backupDirReady=false;
  try{
    await fs.mkdir(dir,{recursive:true});
    await fs.access(dir);
    backupDirReady=true;
  }catch{}

  const googleDriveConfigured=!!(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  await Setting.findOne({
    key:'google_drive_refresh_token'
  })
);

  s.json({
    database:'MongoDB',
    backupDir:dir,
    backupDirReady,
    googleDriveConfigured,
    automaticSchedule:process.env.DAILY_CRON||'0 19 * * *'
  });
});
r.post('/google-drive/upload',adminOnly,async(q,s)=>{
  try{
    const backup=await createBackupFile();
    const result=await driveBackup(backup);

    if(!result.uploaded){
      return s.status(400).json({ok:false,...result});
    }

    await AuditLog.create({
      doctorId:q.doctor._id,
      doctorName:q.doctor.name,
      action:'backup_upload',
      entity:'database',
      detail:'Manual backup uploaded to Google Drive'
    });

    s.json({ok:true,backupFile:{filename:backup.filename},googleDrive:result});
  }catch(e){
    s.status(500).json({ok:false,message:e.message||'Google Drive upload failed.'});
  }
});
r.post('/google-drive/disconnect',adminOnly,async(q,s)=>{
  await Setting.deleteOne({
    key:'google_drive_refresh_token'
  });

  s.json({
    disconnected:true
  });
});
r.post('/backup/test',adminOnly,async(q,s)=>{
  try{
    const result=await automaticBackup();

    await AuditLog.create({
      doctorId:q.doctor._id,
      doctorName:q.doctor.name,
      action:'backup_test',
      entity:'database',
      detail:'Manual automatic backup test. Google Drive uploaded: '+(result.googleDrive?.uploaded?'yes':'no')+'. Telegram recipients: '+(result.telegram?.length||0)+'.'
    });

    s.json(result);
  }catch(e){
    s.status(500).json({
      ok:false,
      message:e.message||'Backup test failed.'
    });
  }
});

r.post('/restore',adminOnly,async(q,s)=>{
  if(!q.body?.doctors||!q.body?.patients)
    return s.status(400).json({message:'Invalid backup file'});

  await snapshot();
  await restore(q.body);

  await AuditLog.create({
    doctorId:q.doctor._id,
    doctorName:q.doctor.name,
    action:'restore',
    entity:'database',
    detail:'Database restored from uploaded snapshot'
  });

  s.json({ok:true});
});

r.post('/telegram/test',async(q,s)=>{
  const d=await Doctor.findById(q.doctor._id);

  try{
    const message=await buildTestMessage(
        `${ethiopianParts(isoToday()).month} ${ethiopianParts(isoToday()).day} ${ethiopianParts(isoToday()).year}`
      );

      const result=await sendTelegram(d,message);

    if(!result.sent){
      return s.status(400).json({
        message:result.reason || 'Telegram message was not sent.'
      });
    }

    s.json(result);
  }catch(e){
    s.status(400).json({message:e.message});
  }
});

export default r;









