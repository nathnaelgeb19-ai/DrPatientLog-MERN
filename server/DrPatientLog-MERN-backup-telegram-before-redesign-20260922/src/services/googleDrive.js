import { google } from 'googleapis';
import fs from 'fs';
import { Setting } from '../models/index.js';

export async function getGoogleDriveRefreshToken() {
  const setting = await Setting.findOne({
    key: 'google_drive_refresh_token'
  }).lean();

  return setting?.value || '';
}

export async function driveBackup(backup) {
  const {
    GOOGLE_CLIENT_ID: id,
    GOOGLE_CLIENT_SECRET: secret,
    GOOGLE_DRIVE_FOLDER_ID: folder
  } = process.env;

  if (!id || !secret) {
    return {
      uploaded: false,
      reason: 'Google Drive OAuth credentials are not configured'
    };
  }

  const refresh = await getGoogleDriveRefreshToken();

  if (!refresh) {
    return {
      uploaded: false,
      reason: 'Google Drive is not connected'
    };
  }

  const auth = new google.auth.OAuth2(
    id,
    secret
  );

  auth.setCredentials({
    refresh_token: refresh
  });

  const drive = google.drive({
    version: 'v3',
    auth
  });

  const file = await drive.files.create({
    requestBody: {
      name: backup.filename,
      mimeType: 'application/json',
      parents: folder ? [folder] : undefined
    },
    media: {
      mimeType: 'application/json',
      body: fs.createReadStream(backup.filePath)
    },
    fields: 'id,name,webViewLink'
  });

  return {
    uploaded: true,
    file: file.data
  };
}