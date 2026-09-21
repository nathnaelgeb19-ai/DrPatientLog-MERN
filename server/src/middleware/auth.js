import jwt from 'jsonwebtoken';import {Doctor} from '../models/index.js';
export async function auth(req,res,next){try{const token=req.cookies.dpl_session;if(!token)throw new Error();const p=jwt.verify(token,process.env.JWT_SECRET);const d=await Doctor.findById(p.id);if(!d)throw new Error();req.doctor=d;next()}catch{res.status(401).json({message:'Authentication required'})}}
export function adminOnly(req,res,next){if(req.doctor?.role!=='admin')return res.status(403).json({message:'Administrator access required'});next()}
