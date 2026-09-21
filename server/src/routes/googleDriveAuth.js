import {Router} from 'express';
import {google} from 'googleapis';
import {Setting} from '../models/index.js';

const r=Router();

const REDIRECT_URI=process.env.GOOGLE_REDIRECT_URI||'http://localhost:5000/api/admin/google-drive/callback';

function oauthClient(){
  const {
    GOOGLE_CLIENT_ID:id,
    GOOGLE_CLIENT_SECRET:secret
  }=process.env;

  if(!id||!secret){
    throw new Error('Google Drive OAuth credentials are not configured.');
  }

  return new google.auth.OAuth2(
    id,
    secret,
    REDIRECT_URI
  );
}

r.get('/start',(req,res)=>{
  try{
    const auth=oauthClient();

    const url=auth.generateAuthUrl({
      access_type:'offline',
      prompt:'consent',
      scope:[
        'https://www.googleapis.com/auth/drive.file'
      ]
    });

    res.redirect(url);
  }catch(e){
    res.status(500).send(
      e.message||'Google OAuth setup failed.'
    );
  }
});

r.get('/callback',async(req,res)=>{
  try{
    const code=String(req.query.code||'');

    if(!code){
      return res.status(400).send(
        'Google authorization code is missing.'
      );
    }

    const auth=oauthClient();
    const {tokens}=await auth.getToken(code);

    if(!tokens.refresh_token){
      return res.status(400).send(
        'Google did not return a refresh token. Please authorize again.'
      );
    }

    await Setting.updateOne(
      {key:'google_drive_refresh_token'},
      {
        key:'google_drive_refresh_token',
        value:tokens.refresh_token
      },
      {upsert:true}
    );

    res.type('html').send(`
      <!doctype html>
      <html>
        <head>
          <title>Google Drive Connected</title>
          <style>
            body{
              font-family:Arial,sans-serif;
              max-width:600px;
              margin:80px auto;
              padding:20px;
              text-align:center;
            }
            .ok{
              color:#23734d;
              font-size:22px;
              font-weight:700;
            }
          </style>
        </head>
        <body>
          <div class="ok">Google Drive connected successfully.</div>
          <p>You can close this window and return to DrPatientLog.</p>
          <script>
            setTimeout(()=>{
              window.close();
            },1500);
          </script>
        </body>
      </html>
    `);
  }catch(e){
    res.status(500).send(
      `Google OAuth failed: ${e.message||'Unknown error'}`
    );
  }
});

export default r;
