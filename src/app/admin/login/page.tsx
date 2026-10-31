'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, LoaderCircle, LockKeyhole } from 'lucide-react';

type AuthStatus={setupRequired:boolean;user:{name:string;email:string}|null};
const responseJson=async(res:Response)=>{const text=await res.text();try{return JSON.parse(text)}catch{return {error:'The server returned an invalid response. Restart the app and try again.'}}};

export default function LoginPage(){
 const [status,setStatus]=useState<AuthStatus|null>(null),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{fetch('/api/auth/status').then(responseJson).then(data=>{if(data.error){setError(data.error);return}if(data.user)window.location.replace('/');else setStatus(data)}).catch(()=>setError('Could not reach the authentication service. Check MongoDB and refresh.'))},[]);
 const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{const endpoint=status?.setupRequired?'/api/auth/setup':'/api/auth/login';const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password,role:'admin'})});const data=await responseJson(res);if(!res.ok)throw new Error(data.error||'Could not sign in.');window.location.assign('/')}catch(err){setError(err instanceof Error?err.message:'Could not sign in.')}finally{setBusy(false)}};
 return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><img src="/mahakal-travel.jpg" alt="Mahakal Travel logo"/><div><b>Mahakal</b><strong>TRAVEL</strong><small>VEHICLE FINANCE</small></div></div><div className="auth-heading"><span className="auth-icon"><LockKeyhole size={18}/></span><div><h1>{status?.setupRequired?'Set up your account':'Welcome back'}</h1><p>{status?.setupRequired?'Create the owner account to secure your dashboard.':'Sign in to continue to your dashboard.'}</p></div></div>
  {!status&&!error&&<div className="auth-loading"><LoaderCircle size={17} className="spin"/>Connecting securely…</div>}
  {error&&<div className="auth-error">{error}</div>}
  {status&&<form className="auth-form" onSubmit={submit}>{status.setupRequired&&<label>Your name<input autoComplete="name" value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={80}/></label>}<label>Email address<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" autoComplete={status.setupRequired?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={status.setupRequired?10:1} placeholder={status.setupRequired?'At least 10 characters':''}/></label>{status.setupRequired&&<small className="auth-hint">Your password is stored as a secure hash. Only one owner account can be created.</small>}<button className="auth-submit" disabled={busy}>{busy?<LoaderCircle size={17} className="spin"/>:<>{status.setupRequired?'Create secure account':'Sign in'}<ArrowRight size={17}/></>}</button></form>}
  <footer className="auth-footer">Your vehicle business, securely in view.<a href="/book">Looking for a ride? Browse trips <ArrowRight size={13}/></a></footer>
 </section><div className="auth-side"><div className="auth-side-inner"><span>MAHAKAL TRAVEL</span><h2>Every journey.<br/>Every rupee.<br/><i>Under control.</i></h2><p>Track collections, expenses and daily profit from one secure dashboard.</p><div className="auth-road"/></div></div></main>
}
