import React,{useEffect,useState}from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,useNavigate,useLocation,useParams,Routes,Route,Link,Navigate}from'react-router-dom';import{LayoutDashboard,Users,UserRoundCog,CalendarDays,Settings,LogOut,Plus,Search,Menu,X,Stethoscope,ShieldCheck,ArrowUpRight,Trash2,Edit3,CheckCircle2,ReceiptText,ClipboardList,Database,Send,Download,Upload,RefreshCw,KeyRound,UserCog,Palette,Sun,Moon,Monitor,Bell,Clock,ChevronDown,FileText}from'lucide-react';import{api}from'./api';import{ethiopianDate}from'./ethiopian.js';import'./styles.css';
const money=n=>`${Number(n||0).toFixed(2)} ETB`;
function PageHead({title,subtitle,action}){return <div className="page-head"><div><p className="eyebrow">DRPATIENTLOG</p><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>}
function Loading(){return <div className="loading"><div/><div/><div/></div>}
function Shell({doctor,onLogout,children}){
  const loc=useLocation();
  const[open,setOpen]=useState(false);
  const[theme,setTheme]=useState(()=>localStorage.getItem('drpatientlog-theme')||'system');

  const applyTheme=value=>{
    setTheme(value);
    localStorage.setItem('drpatientlog-theme',value);

    if(value==='system'){
      document.documentElement.removeAttribute('data-theme');
    }else{
      document.documentElement.setAttribute('data-theme',value);
    }
  };

  useEffect(()=>{
    applyTheme(localStorage.getItem('drpatientlog-theme')||'system');
  },[]);

  useEffect(()=>{
    if(theme!=='system')return;

    const media=window.matchMedia('(prefers-color-scheme: dark)');
    const update=()=>{
      document.documentElement.removeAttribute('data-theme');
    };

    media.addEventListener?.('change',update);
    return()=>media.removeEventListener?.('change',update);
  },[theme]);

  const nav=[
    ['/','Dashboard',LayoutDashboard],
    ['/patients','Patients',Users],
    ['/monthly','Monthly',CalendarDays],
    ['/audit','Audit log',ClipboardList],
    ...(doctor.role==='admin'
      ?[['/doctors','Doctors',UserRoundCog],['/backup','Backup',Database],['/notifications','Notifications',Bell],['/settings','Settings',Settings]]
      :[])
  ];

  const ThemeIcon=theme==='dark'?Moon:theme==='light'?Sun:Monitor;

  return <div className="app">

    <aside className={open?'sidebar open':'sidebar'}>

      <div className="brand">
        <div className="logo">
          <Stethoscope size={22}/>
        </div>

        <div className="brand-copy">
          <b>DrPatientLog</b>
          <span>Clinical workspace</span>
        </div>

        <button
          className="icon mobile"
          aria-label="Close navigation"
          onClick={()=>setOpen(false)}
        >
          <X size={20}/>
        </button>
      </div>

      <div className="profile">
        <div className="avatar">{doctor.name?.[0]}</div>

        <div className="profile-copy">
          <b>{doctor.name}</b>
          <span>{doctor.role==='admin'?'Administrator':'Doctor'}</span>
        </div>
      </div>

      <nav>
        {nav.map(([to,label,I])=>
          <Link
            key={to}
            to={to}
            className={loc.pathname===to?'active':''}
            onClick={()=>setOpen(false)}
          >
            <span className="nav-icon">
              <I size={18}/>
            </span>
            <span>{label}</span>
          </Link>
        )}
      </nav>

      <button className="logout" onClick={onLogout}>
        <span className="nav-icon">
          <LogOut size={18}/>
        </span>
        <span>Sign out</span>
      </button>

    </aside>

    <main>

      <header className="top">

        <button
          className="icon mobile top-menu-button"
          aria-label="Open navigation"
          onClick={()=>setOpen(true)}
        >
          <Menu size={21}/>
        </button>

        <div className="top-title">
          {loc.pathname==='/'?'Dashboard':loc.pathname.slice(1).replaceAll('-',' ')}
        </div>

        <div className="top-actions">

          <span className="status">
            <span/>
            System ready
          </span>

          <div className="theme-control">

            <button
              className="theme-button"
              aria-label="Change appearance"
              title="Change appearance"
            >
              <ThemeIcon size={17}/>
              <span>
                {theme==='system'
                  ?'System'
                  :theme==='light'
                    ?'Light'
                    :'Dark'}
              </span>
              <ChevronDown className="theme-chevron" size={15} />
            </button>

            <div className="theme-menu">

              <button
                className={theme==='system'?'selected':''}
                onClick={()=>applyTheme('system')}
              >
                <Monitor size={16}/>
                <span>System</span>
                {theme==='system'&&<CheckCircle2 size={15}/>}
              </button>

              <button
                className={theme==='light'?'selected':''}
                onClick={()=>applyTheme('light')}
              >
                <Sun size={16}/>
                <span>Light</span>
                {theme==='light'&&<CheckCircle2 size={15}/>}
              </button>

              <button
                className={theme==='dark'?'selected':''}
                onClick={()=>applyTheme('dark')}
              >
                <Moon size={16}/>
                <span>Dark</span>
                {theme==='dark'&&<CheckCircle2 size={15}/>}
              </button>

            </div>

          </div>

          <div className="mini-avatar">{doctor.name?.[0]}</div>

        </div>

      </header>

      <div className="content">
        {children}
      </div>

    </main>

  </div>
}
function Login({onLogin}){const[f,setF]=useState({username:'',password:''}),[err,setErr]=useState('');const go=async e=>{e.preventDefault();try{onLogin((await api.post('/auth/login',f)).doctor)}catch(x){setErr(x.message)}};return <div className="auth"><div className="auth-card"><div className="logo big"><Stethoscope/></div><p className="eyebrow">HOLY BETHEL DENTAL CLINIC</p><h1>Welcome back</h1><p className="sub">Sign in to your practice workspace.</p>{err&&<div className="error">{err}</div>}<form onSubmit={go}><label>Username<input autoComplete="username" required value={f.username} onChange={e=>setF({...f,username:e.target.value})}/></label><label>Password<input type="password" autoComplete="current-password" required value={f.password} onChange={e=>setF({...f,password:e.target.value})}/></label><button className="primary full">Sign in <ArrowUpRight size={17}/></button></form><Link className="gate-link" to="/forgot">Forgot password?</Link></div></div>}
function Setup({onLogin}){const[f,setF]=useState({name:'',username:'',password:'',email:''}),[err,setErr]=useState('');const go=async e=>{e.preventDefault();try{onLogin((await api.post('/auth/setup',f)).doctor)}catch(x){setErr(x.message)}};return <div className="auth"><div className="auth-card"><div className="logo big"><Stethoscope/></div><p className="eyebrow">FIRST-TIME SETUP</p><h1>Create administrator</h1><p className="sub">Set up the first DrPatientLog account.</p>{err&&<div className="error">{err}</div>}<form onSubmit={go}>{[['name','Full name'],['username','Username'],['email','Email'],['password','Password']].map(([k,l])=><label key={k}>{l}<input type={k==='password'?'password':'text'} required={k!=='email'} value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}/></label>)}<button className="primary full">Create administrator</button></form></div></div>}
function Forgot(){const[email,setEmail]=useState(''),[msg,setMsg]=useState('');const go=async e=>{e.preventDefault();const x=await api.post('/auth/forgot',{email});setMsg(x.resetToken?`Development reset token: ${x.resetToken}`:'If the account exists, reset instructions have been prepared.');};return <div className="auth"><div className="auth-card"><KeyRound size={30}/><h1>Reset password</h1><p className="sub">Enter the account email.</p>{msg&&<div className="note">{msg}</div>}<form onSubmit={go}><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="primary full">Generate reset</button></form><Link className="gate-link" to="/login">Back to sign in</Link></div></div>}
function ResetPassword(){
 const params=new URLSearchParams(window.location.search),
 token=params.get('token')||'',
 [password,setPassword]=useState(''),
 [confirm,setConfirm]=useState(''),
 [msg,setMsg]=useState(''),
 [err,setErr]=useState(''),
 [done,setDone]=useState(false);

 const go=async e=>{
   e.preventDefault();
   setErr('');
   setMsg('');

   if(!token){
     setErr('This password reset link is missing its token.');
     return;
   }

   if(password.length<8){
     setErr('Password must be at least 8 characters.');
     return;
   }

   if(password!==confirm){
     setErr('Passwords do not match.');
     return;
   }

   try{
     await api.post('/auth/reset',{token,password});
     setDone(true);
     setMsg('Your password has been reset successfully.');
   }catch(e){
     setErr(e.message||'This reset link is invalid or expired.');
   }
 };

 return <div className="auth">
   <div className="auth-card">
     <KeyRound size={30}/>
     <h1>Set new password</h1>
     <p className="sub">Choose a new password for your DrPatientLog account.</p>

     {err&&<div className="error">{err}</div>}
     {msg&&<div className="note">{msg}</div>}

     {!done&&<form onSubmit={go}>
       <label>New password
         <input
           type="password"
           autoComplete="new-password"
           required
           minLength="8"
           value={password}
           onChange={e=>setPassword(e.target.value)}
         />
       </label>

       <label>Confirm new password
         <input
           type="password"
           autoComplete="new-password"
           required
           minLength="8"
           value={confirm}
           onChange={e=>setConfirm(e.target.value)}
         />
       </label>

       <button className="primary full">Reset password</button>
     </form>}

     <Link className="gate-link" to="/login">
       {done?'Back to sign in':'Cancel'}
     </Link>
   </div>
 </div>
}function Stat({label,value,meta,icon:I}){return <div className="stat"><div className="stat-icon"><I size={19}/></div><span>{label}</span><strong>{value}</strong><small>{meta}</small></div>}
function PatientTable({rows,onEdit,onDelete}){return <div className="table-wrap"><table>
<thead><tr><th>Patient</th><th>Card</th><th>Ticket</th><th>Procedure</th><th>Fee</th><th>Cut</th><th>Actions</th></tr></thead>
<tbody>{rows?.length?rows.map(r=><tr key={r._id}>
<td>
  <b>{r.patientName}</b>
  <small>{r.ethDate}</small>
  <small>{r.createdAt?new Date(r.createdAt).toLocaleString():''}</small>
</td>
<td>{r.cardNumber||' '}</td>
<td>{r.ticketNo||' '}</td>
<td>{r.procedure}</td>
<td>{money(r.totalFee)}</td>
<td><b>{money(r.myEarning)}</b></td>
<td className="row-actions">
  {onEdit&&<button className="icon patient-row-action-edit" title="Edit patient" onClick={()=>onEdit(r)}>
    <Edit3 size={15}/>
    <span>Edit</span>
  </button>}
  
  {onDelete&&<button className="icon danger patient-row-action-delete" title="Delete patient" onClick={()=>onDelete(r)}>
    <Trash2 size={15}/>
    <span>Del</span>
  </button>}
</td>
</tr>):<tr><td colSpan="7" className="empty">No records found.</td></tr>}</tbody></table></div>}
function Dashboard(){
  const[d,setD]=useState();
  const[err,setErr]=useState('');

  useEffect(()=>{
    setErr('');
    api.get('/dashboard?range='+range)
      .then(setD)
      .catch(e=>setErr(e.message||'Unable to load dashboard.'));
  },[range]);

  if(err)return <div className="error">{err}</div>;
  if(!d)return <Loading/>;
  const[range,setRange]=useState('eth_month');

  useEffect(()=>{
    api.get('/dashboard?range='+range).then(setD);
  },[range]);

  if(!d)return <Loading/>;

  const income=Number(d.rangeIncome||0);
  const earnings=Number(d.rangeCut||0);
  const earningPct=income>0?Math.min(100,(earnings/income)*100):0;

  return <>
    <PageHead
      title="Dashboard"
      subtitle={`${d.ethToday.month} ${d.ethToday.day}, ${d.ethToday.year}`}
      action={
        <Link className="primary dashboard-main-action" to="/patients/new">
          <Plus size={18}/>New Patient
        </Link>
      }
    />

    <div className="dashboard-toolbar">
      <div>
        <span className="dashboard-kicker">Practice overview</span>
        <h2>Your clinic at a glance</h2>
      </div>

      <select value={range} onChange={e=>setRange(e.target.value)}>
        <option value="today">Today</option>
        <option value="week">Last 7 days</option>
        <option value="eth_month">Ethiopian month</option>
        <option value="all">All time</option>
      </select>
    </div>

    <div className="dashboard-kpis">

      <div className="dashboard-kpi dashboard-kpi-primary">
        <div className="dashboard-kpi-top">
          <span>Today's earnings</span>
          <div className="dashboard-kpi-icon"><ReceiptText size={19}/></div>
        </div>
        <strong>{money(d.todayCut)}</strong>
        <small>Doctor earnings today</small>
      </div>

      <div className="dashboard-kpi">
        <div className="dashboard-kpi-top">
          <span>Range earnings</span>
          <div className="dashboard-kpi-icon"><ArrowUpRight size={19}/></div>
        </div>
        <strong>{money(d.rangeCut)}</strong>
        <small>Doctor earnings in selected period</small>
      </div>

      <div className="dashboard-kpi">
        <div className="dashboard-kpi-top">
          <span>Clinic income</span>
          <div className="dashboard-kpi-icon"><Stethoscope size={19}/></div>
        </div>
        <strong>{money(d.rangeIncome)}</strong>
        <small>Total recorded income</small>
      </div>

      <div className="dashboard-kpi">
        <div className="dashboard-kpi-top">
          <span>Patients</span>
          <div className="dashboard-kpi-icon"><Users size={19}/></div>
        </div>
        <strong>{d.count}</strong>
        <small>Visits in selected period</small>
      </div>

    </div>

    <div className="dashboard-main-grid">

      <section className="card dashboard-overview-card">
        <div className="section-head">
          <div>
            <span className="dashboard-kicker">Financial overview</span>
            <h2>Income & earnings</h2>
            <p>Selected period performance</p>
          </div>
        </div>

        <div className="dashboard-finance">

          <div className="dashboard-finance-row">
            <div>
              <span>Clinic income</span>
              <strong>{money(income)}</strong>
            </div>
            <b>{income>0?'100%':'0%'}</b>
          </div>

          <div className="dashboard-bar">
            <div style={{width:income>0?'100%':'0%'}}/>
          </div>

          <div className="dashboard-finance-row">
            <div>
              <span>Your earnings</span>
              <strong>{money(earnings)}</strong>
            </div>
            <b>{earningPct.toFixed(1)}%</b>
          </div>

          <div className="dashboard-bar earnings">
            <div style={{width:`${earningPct}%`}}/>
          </div>

        </div>

        <div className="dashboard-finance-summary">
          <div>
            <span>Today's earnings</span>
            <b>{money(d.todayCut)}</b>
          </div>

          <div>
            <span>Patients</span>
            <b>{d.count}</b>
          </div>
        </div>
      </section>

      <section className="card dashboard-actions-card">
        <div className="section-head">
          <div>
            <span className="dashboard-kicker">Quick actions</span>
            <h2>Clinic tools</h2>
            <p>Common tasks</p>
          </div>
        </div>

        <div className="dashboard-actions">

          <Link to="/patients/new" className="dashboard-action">
            <div className="dashboard-action-icon"><Plus size={19}/></div>
            <div>
              <b>New patient</b>
              <span>Record a new visit</span>
            </div>
          </Link>

          <Link to="/patients" className="dashboard-action">
            <div className="dashboard-action-icon"><Users size={19}/></div>
            <div>
              <b>Patients</b>
              <span>Search patient records</span>
            </div>
          </Link>

          <Link to="/monthly" className="dashboard-action">
            <div className="dashboard-action-icon"><ArrowUpRight size={19}/></div>
            <div>
              <b>Monthly earnings</b>
              <span>View your earnings</span>
            </div>
          </Link>

          <Link to="/backup" className="dashboard-action">
            <div className="dashboard-action-icon"><Database size={19}/></div>
            <div>
              <b>Backup center</b>
              <span>Protect clinic data</span>
            </div>
          </Link>

        </div>
      </section>

    </div>

    <section className="card dashboard-recent-card">

      <div className="section-head">
        <div>
          <span className="dashboard-kicker">Recent activity</span>
          <h2>Recent patients</h2>
          <p>Latest recorded visits</p>
        </div>

        <Link to="/patients" className="ghost">
          View all
        </Link>
      </div>

      <PatientTable rows={d.recent}/>

    </section>
  </>
}
function Patients(){
  const[rows,setRows]=useState([]);
  const[q,setQ]=useState('');
  const[from,setFrom]=useState('');
  const[to,setTo]=useState('');

  const load=()=>{
    api.get(`/patients?q=${encodeURIComponent(q)}&from=${from}&to=${to}`).then(setRows);
  };

  useEffect(()=>{
    load();
  },[]);

  const clearFilters=()=>{
    setQ('');
    setFrom('');
    setTo('');
    api.get('/patients?q=&from=&to=').then(setRows);
  };

  const del=async r=>{
    if(confirm(`Delete ${r.patientName}?`)){
      await api.del('/patients/'+r._id);
      load();
    }
  };

  return <>
    <PageHead
      title="Patients"
      subtitle="Patient records"
      action={
        <Link className="primary patients-new-button" to="/patients/new">
          <Plus size={18}/>
          New patient
        </Link>
      }
    />

    <section className="patients-workspace">

      <div className="patients-toolbar">

        <div className="patients-search">
          <Search size={18}/>
          <input
            placeholder="Search name, card, ticket or procedure"
            value={q}
            onChange={e=>setQ(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&load()}
          />
        </div>

        <div className="patients-date">
          <label>From</label>
          <input
            type="date"
            value={from}
            onChange={e=>setFrom(e.target.value)}
          />
        </div>

        <div className="patients-date">
          <label>To</label>
          <input
            type="date"
            value={to}
            onChange={e=>setTo(e.target.value)}
          />
        </div>

        <button className="patients-filter-button" onClick={load}>
          <Search size={16}/>
          Search
        </button>

        <button className="patients-clear-button" onClick={clearFilters}>
          Clear
        </button>

        <a className="patients-export-button" href="/api/export/patients.csv">
          <Download size={16}/>
          Export CSV
        </a>

      </div>

      <div className="patients-summary">
        <div>
          <span>Patient visits</span>
          <strong>{rows.length}</strong>
        </div>

        <div className="patients-summary-note">
          Showing recorded visits
        </div>
      </div>

      <div className="patients-table-wrap">
        <PatientTable
          rows={rows}
          onEdit={r=>window.location.href='/patients/edit/'+r._id}
          onDelete={del}
        />
      </div>

    </section>
  </>
}
function PatientForm(){
  const nav=useNavigate();
  const loc=useLocation();
  const editing=loc.pathname.includes('/edit/');
  const id=loc.pathname.split('/').pop();

  const[f,setF]=useState({
    gregDate:new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Addis_Ababa'}),
    ethDate:'',
    patientName:'',
    cardNumber:'',
    ticketNo:'',
    procedure:'',
    totalFee:'',
    doctorPct:4
  });

  const[presets,setPresets]=useState([]);
  const[err,setErr]=useState('');

  useEffect(()=>{
    api.get('/patients/presets/list').then(setPresets);

    if(editing){
      api.get('/patients/'+id).then(setF);
    }
  },[]);

  const set=(k,v)=>setF(x=>({...x,[k]:v}));

  useEffect(()=>{
    if(f.gregDate){
      try{
        set('ethDate',ethiopianDate(f.gregDate));
      }catch{}
    }
  },[f.gregDate]);

  const save=async e=>{
    e.preventDefault();

    try{
      await(editing?api.put('/patients/'+id,f):api.post('/patients',f));
      nav('/patients');
    }catch(x){
      setErr(x.message);
    }
  };

  const suggest=async()=>{
    const x=await api.get(
      '/patients/suggest-fee?procedure='+encodeURIComponent(f.procedure)
    );

    if(x.fee!=null){
      set('totalFee',x.fee);
    }else{
      alert('No preset fee for this procedure');
    }
  };

  const doctorEarning=
    Number(f.totalFee||0)*Number(f.doctorPct||0)/100;

  return <>
    <PageHead
      title={editing?'Edit patient':'New patient'}
      subtitle={editing?'Update the patient visit record.':'Record a new patient visit.'}
    />

    <form className="patient-form-card" onSubmit={save}>

      {err&&(
        <div className="patient-form-error">
          <span>{err}</span>
        </div>
      )}

      <div className="patient-form-section">
        <div className="patient-form-heading">
          <div className="patient-form-number">01</div>
          <div>
            <h2>Visit details</h2>
            <p>Date and patient identification</p>
          </div>
        </div>

        <div className="patient-form-grid">

          <label>
            <span>Gregorian date</span>
            <input
              type="date"
              required
              value={f.gregDate||''}
              onChange={e=>set('gregDate',e.target.value)}
            />
          </label>

          <label>
            <span>Ethiopian date</span>
            <input
              value={f.ethDate||'Calculated automatically'}
              readOnly
            />
          </label>

          <label className="patient-form-wide">
            <span>Patient name</span>
            <input
              required
              placeholder="Enter patient's full name"
              value={f.patientName||''}
              onChange={e=>set('patientName',e.target.value)}
            />
          </label>

          <label>
            <span>Card number</span>
            <input
              required
              placeholder="Patient card number"
              value={f.cardNumber||''}
              onChange={e=>set('cardNumber',e.target.value)}
            />
          </label>

          <label>
            <span>Ticket number <em>Optional</em></span>
            <input
              placeholder="Ticket number"
              value={f.ticketNo||''}
              onChange={e=>set('ticketNo',e.target.value)}
            />
          </label>

        </div>
      </div>

      <div className="patient-form-divider"/>

      <div className="patient-form-section">
        <div className="patient-form-heading">
          <div className="patient-form-number">02</div>
          <div>
            <h2>Treatment</h2>
            <p>Procedure and financial details</p>
          </div>
        </div>

        <div className="patient-form-grid">

          <label className="patient-form-wide">
            <span>Procedure</span>
            <input
              list="presets"
              required
              placeholder="Select or enter procedure"
              value={f.procedure||''}
              onChange={e=>set('procedure',e.target.value)}
            />
            <datalist id="presets">
              {presets.map(p=>(
                <option key={p._id} value={p.procedure}/>
              ))}
            </datalist>
          </label>

          <label>
            <span>Price (ETB)</span>
            <div className="patient-price-field">
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={f.totalFee??''}
                onChange={e=>set('totalFee',e.target.value)}
              />
              <button
                type="button"
                className="patient-suggest-button"
                onClick={suggest}
              >
                Suggest
              </button>
            </div>
          </label>

          <label>
            <span>Doctor cut</span>
            <div className="patient-percent-field">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={f.doctorPct??4}
                onChange={e=>set('doctorPct',e.target.value)}
              />
              <b>%</b>
            </div>
          </label>

        </div>
      </div>

      <div className="patient-earnings-card">
        <div className="patient-earnings-icon">
          <ReceiptText size={20}/>
        </div>

        <div>
          <span>Your earnings</span>
          <small>
            {Number(f.doctorPct||0).toFixed(1)}% of the recorded price
          </small>
        </div>

        <strong>{money(doctorEarning)}</strong>
      </div>

      <div className="patient-form-actions">

        <button
          type="button"
          className="ghost"
          onClick={()=>nav('/patients')}
        >
          Cancel
        </button>

        <button className="primary patient-save-button">
          <CheckCircle2 size={18}/>
          {editing?'Update record':'Save patient record'}
        </button>

      </div>

    </form>
  </>
}
function Monthly(){
  const[d,setD]=useState();
  const[err,setErr]=useState('');

  const load=()=>{
    setErr('');
    api.get('/dashboard/monthly')
      .then(setD)
      .catch(e=>setErr(e.message||'Unable to load monthly report.'));
  };

  useEffect(()=>{
    load();
  },[]);

  if(err)return <div className="error">{err}</div>;
  if(!d)return <Loading/>;

  const close=async m=>{
    if(confirm(`Mark ${m._id.month} ${m._id.year} as paid and closed?`)){
      try{
        await api.post('/dashboard/monthly/close',{
          month:m._id.month,
          year:m._id.year
        });
        load();
      }catch(e){
        alert(e.message);
      }
    }
  };

  return <>
    <PageHead
      title="Monthly earnings"
      subtitle="Ethiopian-month percentage earnings and salary payment history."
    />

    <section className="monthly-report-card">

      <div className="monthly-report-header">
        <div>
          <span className="monthly-report-label">Financial history</span>
          <h2>Monthly report</h2>
          <p>Track clinic income, your percentage, and monthly payment status.</p>
        </div>

        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',justifyContent:'flex-end'}}>

          <button
            className="ghost monthly-telegram-button"
            onClick={()=>
              api.post('/telegram/monthly',{})
                .then(()=>alert('Monthly report sent'))
                .catch(e=>alert(e.message))
            }
          >
            <Send size={16}/>
            Send Telegram
          </button>
        </div>
      </div>

      <div className="monthly-table-wrap">
        <table className="monthly-table">

          <thead>
            <tr>
              <th>Ethiopian month</th>
              <th>Patients</th>
              <th>Income</th>
              <th>Doctor %</th>
              <th>Doctor earnings</th>
              <th>Status / action</th>
            </tr>
          </thead>

          <tbody>
            {d.months.map(m=>(
              <tr
                key={m._id.month+m._id.year}
                className={m.isCurrent?'monthly-current-row':''}
              >

                <td>
                  <div className="monthly-month-cell">
                    <div className="monthly-month-icon">
                      <CalendarDays size={17}/>
                    </div>

                    <div>
                      <b>{m._id.month} {m._id.year}</b>

                      {m.isCurrent ? (
                        <small className="monthly-current-text">
                          Current month
                        </small>
                      ) : (
                        <small>
                          Completed month
                        </small>
                      )}
                    </div>
                  </div>
                </td>

                <td>
                  <span className="monthly-number">
                    {m.count}
                  </span>
                </td>

                <td>
                  <span className="monthly-money">
                    {money(m.income)}
                  </span>
                </td>

                <td>
                  <span className="monthly-percent">
                    {m.pct.toFixed(2)}%
                  </span>
                </td>

                <td>
                  <b className="monthly-earnings">
                    {money(m.payable)}
                  </b>

                  {m.pagumeCarry > 0 && (
                    <small
                      style={{
                        display:'block',
                        marginTop:'4px',
                        fontSize:'11px',
                        lineHeight:'1.3',
                        opacity:0.75
                      }}
                    >
                      Includes Pagume {m._id.year - 1} carryover: {money(m.pagumeCarry)} ETB
                    </small>
                  )}
                </td>

                <td>
  <div className="monthly-action-cell">

    <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>

      {m.canClose && !m.closed ? (
        <button
          className="primary small monthly-close-button"
          onClick={()=>close(m)}
        >
          <CheckCircle2 size={15}/>
          Paid & Close Month
        </button>
      ) : m.closed ? (
        <span className="pill success monthly-status-pill">
          <CheckCircle2 size={14}/>
          Paid & Closed
        </span>
      ) : (
        <span className="pill monthly-status-pill">
          {m.isCurrent ? 'Current month' : 'Completed month'}
        </span>
      )}

      <button
  className="ghost small"
  onClick={()=>{
    const apiBase = import.meta.env.VITE_API_URL || '/api';

    window.open(
      `${apiBase}/reports/monthly.html?month=${encodeURIComponent(m._id.month)}&year=${encodeURIComponent(m._id.year)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }}
>
  <FileText size={14}/>
  HTML Report
</button>

<button
  className="ghost small"
  onClick={()=>{
    api.post('/telegram/monthly-period',{
      month:m._id.month,
      year:m._id.year
    })
      .then(()=>alert('Monthly report sent'))
      .catch(e=>alert(e.message))
  }}
>
  <Send size={14}/>
  Send Telegram
</button>

    </div>

  </div>
</td>

              </tr>
            ))}
          </tbody>

        </table>
      </div>

    </section>
  </>
}
function Doctors(){const[rows,setRows]=useState([]),[show,setShow]=useState(false),[f,setF]=useState({name:'',username:'',password:'',email:'',role:'doctor',baseSalary:45000});const load=()=>api.get('/doctors').then(setRows);useEffect(()=>{load()},[]);const add=async e=>{e.preventDefault();try{await api.post('/doctors',f);setShow(false);setF({name:'',username:'',password:'',email:'',role:'doctor',baseSalary:45000});load()}catch(x){alert(x.message)}};const remove=async d=>{const p=prompt(`Enter ${d.name}'s password to delete this account:`);if(p){try{await api.del('/doctors/'+d._id,{password:p});load()}catch(e){alert(e.message)}}};const sw=async d=>{const p=prompt(`Enter ${d.name}'s password to switch to this account:`);if(p)alert((await api.post('/doctors/'+d._id+'/switch',{password:p})).doctor?'Switched. Reload the page to continue.':'Failed')};return <><PageHead title="Doctors" subtitle="Manage accounts, roles and secure account switching." action={<button className="primary" onClick={()=>setShow(!show)}><Plus size={18}/>Add doctor</button>}/>{show&&<form className="card form" onSubmit={add}><div className="form-grid">{[['name','Name'],['username','Username'],['password','Password'],['email','Email'],['baseSalary','Base salary']].map(([k,l])=><label key={k}>{l}<input type={k==='password'?'password':'text'} required={['name','username','password'].includes(k)} value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}/></label>)}<label>Role<select value={f.role} onChange={e=>setF({...f,role:e.target.value})}><option>doctor</option><option>admin</option></select></label></div><button className="primary">Create doctor</button></form>}<section className="card"><div className="table-wrap"><table><thead><tr><th>Doctor</th><th>Username</th><th>Email</th><th>Role</th><th>Salary</th><th/></tr></thead><tbody>{rows.map(d=><tr key={d._id}><td><b>{d.name}</b></td><td>{d.username}</td><td>{d.email||'—'}</td><td><span className="pill">{d.role}</span></td><td>{money(d.baseSalary)}</td><td className="row-actions"><button className="ghost small" onClick={()=>sw(d)}>Switch</button><button className="icon danger" onClick={()=>remove(d)}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div></section></>}
function Audit(){const[d,setD]=useState([]);useEffect(()=>{api.get('/admin/audit').then(setD)},[]);return <><PageHead title="Audit log" subtitle="Security and activity history."/><section className="card"><div className="table-wrap"><table><thead><tr><th>Time</th><th>Doctor</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead><tbody>{d.map(x=><tr key={x._id}><td>{new Date(x.createdAt).toLocaleString()}</td><td>{x.doctorName}</td><td>{x.action}</td><td>{x.entity}</td><td>{x.detail}</td></tr>)}</tbody></table></div></section></>}
function Backup(){
  const [status,setStatus]=useState(null);
  const [loading,setLoading]=useState(true);
  const [testing,setTesting]=useState(false);

  const loadStatus=async()=>{
    try{
      setLoading(true);
      setStatus(await api.get('/admin/backup/status'));
    }catch(e){
      alert(e.message);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{
    loadStatus();
  },[]);

  const download=async()=>{
    try{
      const b=await api.download('/admin/backup');
      const a=document.createElement('a');
      a.href=URL.createObjectURL(b);
      a.download='drpatientlog-backup.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    }catch(e){
      alert(e.message);
    }
  };

  const restore=e=>{
    const file=e.target.files?.[0];
    if(!file)return;

    if(!window.confirm('Restore this database backup? The current database will be replaced.')){
      e.target.value='';
      return;
    }

    const r=new FileReader();

    r.onload=async()=>{
      try{
        await api.post('/admin/restore',JSON.parse(r.result));
        alert('Database restored successfully.');
        location.reload();
      }catch(x){
        alert(x.message);
      }finally{
        e.target.value='';
      }
    };

    r.readAsText(file);
  };

  const importCsv=async e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    try{
      const form=new FormData();
      form.append('file',file);
      const result=await api.post('/export/patients.csv',form);
      alert('CSV import completed. '+(result.imported||0)+' patient record(s) imported.');
    }catch(err){
      alert(err.message);
    }finally{
      e.target.value='';
    }
  };

  const uploadGoogleDrive=async()=>{
    try{
      setTesting(true);
      const result=await api.post('/admin/google-drive/upload',{});
      if(result.ok){
        alert('Backup uploaded successfully to Google Drive.');
      }else{
        alert(result.reason||'Google Drive upload failed.');
      }
      await loadStatus();
    }catch(e){
      alert(e.message);
    }finally{
      setTesting(false);
    }
  };

  const testBackup=async()=>{
    try{
      setTesting(true);
      const result=await api.post('/admin/backup/test',{});

      if(result.ok){
        alert('Backup completed successfully. Google Drive and Telegram backup finished.');
      }else{
        alert(result.googleDrive?.reason||'Backup was not completed.');
      }

      await loadStatus();
    }catch(e){
      alert(e.message);
    }finally{
      setTesting(false);
    }
  };
  const connectGoogleDrive=()=>{
    window.location.href=(import.meta.env.VITE_API_URL||'/api')+'/admin/google-drive/start';
  };

  const disconnectGoogleDrive=async()=>{
    if(!window.confirm('Disconnect Google Drive from DrPatientLog?'))return;

    try{
      await api.post('/admin/google-drive/disconnect',{});
      alert('Google Drive disconnected.');
      await loadStatus();
    }catch(e){
      alert(e.message);
    }
  };
  const statusReady=!loading && status?.backupDirReady;
  const googleConfigured=!loading && status?.googleDriveConfigured;

  return <>
    <PageHead
      title="Backup Center"
      subtitle="Protect your clinic data with local backups, cloud backups, and safe database recovery."
    />

    <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'20px',marginBottom:'20px'}}>

      <section className="card form">
      <div className="section-head">
        <div>
          <h2>Patient Data</h2>
          <p>Export patient records to CSV or import patient records from a CSV file.</p>
        </div>
      </div>
      <div className="form-actions">
        <a className="ghost" href="/api/export/patients.csv" style={{display:'inline-flex'}}>
          <Download size={16}/> Export Patient CSV
        </a>
        <label className="ghost" style={{display:'inline-flex',cursor:'pointer'}}>
          Choose CSV File
          <input type="file" accept=".csv,text/csv" onChange={importCsv} style={{display:'none'}}/>
        </label>
      </div>
    </section>
    <section className="card">
        <div className="stat-icon"><Database size={19}/></div>
        <span style={{display:'block',fontSize:'13px',fontWeight:'600',color:'var(--muted)',marginBottom:'7px'}}>
          Local computer backup
        </span>
        <strong style={{display:'block',fontSize:'19px',lineHeight:'1.35',marginBottom:'9px'}}>
          Save a complete copy
        </strong>
        <p style={{margin:'0 0 20px',fontSize:'14px',lineHeight:'1.55',color:'var(--muted)'}}>
          Save a complete copy of your clinic database to your computer.
        </p>
        <button className="primary" onClick={download}>
          <Download size={16}/>Download Backup
        </button>
      </section>

      <section className="card">
        <div className="stat-icon"><Database size={19}/></div>
        <span style={{display:'block',fontSize:'13px',fontWeight:'600',color:'var(--muted)',marginBottom:'7px'}}>
          Backup status
        </span>
        <strong style={{display:'block',fontSize:'19px',lineHeight:'1.35',marginBottom:'12px'}}>
          {loading ? 'Checking...' : statusReady ? 'Ready' : 'Not ready'}
        </strong>

        <div style={{display:'grid',gap:'10px',fontSize:'13px',lineHeight:'1.45',color:'var(--muted)'}}>
          <div>Database: <b style={{color:'var(--ink)'}}>MongoDB</b></div>
          <div>Backup location: <b style={{color:'var(--ink)',wordBreak:'break-all'}}>{status?.backupDir||' '}</b></div>
          <div>Automatic backup: <b style={{color:'var(--ink)'}}>Daily at 19:00 via cron-job.org</b></div>
          <div>
            Google Drive:{' '}
            <b style={{color:googleConfigured?'#23734d':'var(--muted)'}}>
              {loading ? 'Checking...' : googleConfigured ? 'Connected' : 'Not connected'}
            </b>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="stat-icon"><Upload size={19}/></div>
        <span style={{display:'block',fontSize:'13px',fontWeight:'600',color:'var(--muted)',marginBottom:'7px'}}>
          Cloud backup
        </span>
        <strong style={{display:'block',fontSize:'19px',lineHeight:'1.35',marginBottom:'9px'}}>
          Google Drive
        </strong>
        <p style={{margin:'0 0 20px',fontSize:'14px',lineHeight:'1.55',color:'var(--muted)'}}>
          Save a backup copy to Google Drive.
        </p>
                {!loading && googleConfigured ? (
          <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
            <button className="primary" onClick={uploadGoogleDrive} disabled={testing}>
              <Upload size={16}/>
              {testing?'Uploading...':'Upload Backup'}
            </button>

            <button className="ghost" onClick={disconnectGoogleDrive}>
              Disconnect
            </button>
          </div>
        ) : (
          <button className="primary" onClick={connectGoogleDrive} disabled={loading}>
            <Upload size={16}/>
            Connect Google Drive
          </button>
        )}
      </section>

      <section className="card">
        <div className="stat-icon"><RefreshCw size={19}/></div>
        <span style={{display:'block',fontSize:'13px',fontWeight:'600',color:'var(--muted)',marginBottom:'7px'}}>
          Disaster recovery
        </span>
        <strong style={{display:'block',fontSize:'19px',lineHeight:'1.35',marginBottom:'9px'}}>
          Restore database
        </strong>
        <p style={{margin:'0 0 20px',fontSize:'14px',lineHeight:'1.55',color:'var(--muted)'}}>
          Restore your clinic data from a backup file.
        </p>
        <label className="primary">
          <Upload size={16}/>Choose Backup
          <input hidden type="file" accept="application/json,.json" onChange={restore}/>
        </label>
        <p style={{margin:'12px 0 0',fontSize:'12px',lineHeight:'1.45',color:'var(--muted)'}}>
          Restoring replaces the current database. A safety copy is created first.
        </p>
      </section>
    </div>

    <section className="card" style={{marginBottom:'20px'}}>
      <div className="section-head">
        <div>
          <h2>Automatic backup</h2>
          <p>Production automatic backups are triggered by cron-job.org. You can also run a backup manually below.</p>
        </div>

        <button className="ghost" onClick={loadStatus}>
          <RefreshCw size={15}/>Refresh
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginTop:'16px'}}>
        <div style={{background:'rgba(118,118,128,.06)',borderRadius:'14px',padding:'17px'}}>
          <span style={{display:'block',fontSize:'12px',color:'var(--muted)',marginBottom:'6px'}}>
            Backup location
          </span>
          <b style={{display:'block',fontSize:'14px',lineHeight:'1.45',wordBreak:'break-all'}}>
            {status?.backupDir||'Checking...'}
          </b>
        </div>

        <div style={{background:'rgba(118,118,128,.06)',borderRadius:'14px',padding:'17px'}}>
          <span style={{display:'block',fontSize:'12px',color:'var(--muted)',marginBottom:'6px'}}>
            Schedule
          </span>
          <b style={{display:'block',fontSize:'14px'}}>
            Daily at 19:00 via cron-job.org
          </b>
        </div>
      </div>

      <div className="form-actions">
        <button className="primary" onClick={testBackup} disabled={testing}>
          <RefreshCw size={16}/>
          {testing?'Running backup...':'Run Backup Now'}
        </button>
      </div>

      <div style={{marginTop:'15px',fontSize:'13px',lineHeight:'1.5',color:'var(--muted)'}}>
        {statusReady
          ? '? Backup location is ready.'
          : loading
            ? 'Checking backup location...'
            : 'Backup location is not ready.'}
      </div>
    </section>

    
  </>
}
function NotificationsPage(){
 const[tg,setTg]=useState({botToken:'',chatId:'',enabled:false}),
 [f,setF]=useState({telegram_daily_report_time:'19:00',telegram_monthly_report_time:'19:00'}),
 [saved,setSaved]=useState(false),
 [busy,setBusy]=useState(false);

 useEffect(()=>{
   Promise.all([
     api.get('/settings'),
     api.get('/auth/me')
   ]).then(([settings,me])=>{
     setF({
       telegram_daily_report_time:settings.telegram_daily_report_time||'19:00',
       telegram_monthly_report_time:settings.telegram_monthly_report_time||'19:00'
     });
     setTg({
       botToken:me.doctor.telegram?.botToken||'',
       chatId:me.doctor.telegram?.chatId||'',
       enabled:!!me.doctor.telegram?.enabled
     });
   });
 },[]);

 const saveTelegram=async()=>{
   try{
     const me=await api.get('/auth/me');
     await api.post('/doctors/'+me.doctor._id+'/telegram',tg);
     await api.put('/settings',{
       telegram_daily_report_time:f.telegram_daily_report_time,
       telegram_monthly_report_time:f.telegram_monthly_report_time
     });
     setSaved(true);
     setTimeout(()=>setSaved(false),1800);
   }catch(e){
     alert(e.message);
   }
 };

 const test=async()=>{
   try{
     setBusy(true);
     const out=await api.post('/admin/telegram/test',{});
     alert(out.sent?'Telegram test sent.':(out.reason||'Telegram message was not sent.'));
   }catch(e){
     alert(e.message);
   }finally{
     setBusy(false);
   }
 };

 const sendDaily=async()=>{
   try{
     setBusy(true);
     const out=await api.post('/telegram/daily',{});
     alert(out.sent?'Daily report sent.':(out.reason||'Daily report was not sent.'));
   }catch(e){
     alert(e.message);
   }finally{
     setBusy(false);
   }
 };

 return <>
   <PageHead title="Notifications" subtitle="Telegram connection and scheduled clinic reports."/>

   <section className="card form">
     <h2><Send size={19}/>Telegram</h2>
     <p>Configure the Telegram bot used for clinic notifications. Tokens remain server-side.</p>

     <div className="form-grid">
       <label>Bot token
         <input
           type="password"
           value={tg.botToken}
           onChange={e=>setTg({...tg,botToken:e.target.value})}
         />
       </label>

       <label>Chat ID
         <input
           value={tg.chatId}
           onChange={e=>setTg({...tg,chatId:e.target.value})}
         />
       </label>
     </div>

     <label className="toggle-row">
       <input
         type="checkbox"
         checked={!!tg.enabled}
         onChange={e=>setTg({...tg,enabled:e.target.checked})}
       />
       <span>Enable Telegram reporting</span>
     </label>
   </section>

   <section className="card form">
     <h2><Clock size={19}/>Report schedule</h2>

     <div className="form-grid">
       <label>Daily report time
         <input
           type="time"
           value={f.telegram_daily_report_time}
           onChange={e=>setF({...f,telegram_daily_report_time:e.target.value})}
         />
       </label>

       <label>Monthly report time
         <input
           type="time"
           value={f.telegram_monthly_report_time}
           onChange={e=>setF({...f,telegram_monthly_report_time:e.target.value})}
         />
       </label>
     </div>

     <div className="form-actions">
       <button className="primary" onClick={saveTelegram}>
         Save notification settings
       </button>
       {saved&&<span className="pill success">Saved</span>}
     </div>
   </section>

   <section className="card form">
     <h2><Send size={19}/>Manual reports</h2>
     <p>Send a report immediately without waiting for the scheduled time.</p>

     <div className="form-actions">
       <button className="ghost" disabled={busy} onClick={test}>
         <Send size={16}/>Send Telegram test
       </button>

       <button className="ghost" disabled={busy} onClick={sendDaily}>
         <FileText size={16}/>Send today's daily report
       </button>
     </div>
   </section>
 </>;
}

function SettingsPage(){
 const[doctor,setDoctor]=useState(null),
 [f,setF]=useState({}),
 [profile,setProfile]=useState({name:'',birthYear:'',email:''}),
 [username,setUsername]=useState(''),
 [password,setPassword]=useState(''),
 [saved,setSaved]=useState(false),
 [loginSaved,setLoginSaved]=useState(false);

 useEffect(()=>{
   Promise.all([
     api.get('/settings'),
     api.get('/auth/me')
   ]).then(([settings,me])=>{
     setF(settings);
     setDoctor(me.doctor);
     setProfile({
       name:me.doctor.name||'',
       birthYear:me.doctor.birthYear||'',
       email:me.doctor.email||''
     });
     setUsername(me.doctor.username||'');
   });
 },[]);

 const saveProfile=async()=>{
   try{
     const out=await api.put('/doctors/'+doctor._id,{
       name:profile.name,
       birthYear:profile.birthYear,
       email:profile.email,
       username:doctor.username
     });
     setDoctor(out);
     setProfile({
       name:out.name||'',
       birthYear:out.birthYear||'',
       email:out.email||''
     });
     setUsername(out.username||'');
     setSaved(true);
     setTimeout(()=>setSaved(false),1800);
   }catch(e){
     alert(e.message);
   }
 };

 const saveLogin=async()=>{
   try{
     const out=await api.put('/doctors/'+doctor._id,{
       name:doctor.name,
       birthYear:doctor.birthYear,
       email:doctor.email,
       username,
       password:password||undefined
     });
     setDoctor(out);
     setUsername(out.username||'');
     setPassword('');
     setLoginSaved(true);
     setTimeout(()=>setLoginSaved(false),1800);
   }catch(e){
     alert(e.message);
   }
 };

 const save=async()=>{
   try{
     await api.put('/settings',f);
     setSaved(true);
     setTimeout(()=>setSaved(false),1800);
   }catch(e){
     alert(e.message);
   }
 };

 return <>
   <PageHead title="Settings" subtitle="Profile, login, clinic branding, theme, font, and options."/>

   <section className="card form">
     <h2><UserCog size={19}/>Profile</h2>
     <p>Personal details used across the clinic.</p>

     <div className="form-grid">
       <label>Name
         <input
           value={profile.name}
           onChange={e=>setProfile({...profile,name:e.target.value})}
         />
       </label>

       <label>Birth year (password recovery)
         <input
           type="number"
           value={profile.birthYear}
           onChange={e=>setProfile({...profile,birthYear:e.target.value})}
         />
       </label>

       <label>Recovery email
         <input
           type="email"
           value={profile.email}
           onChange={e=>setProfile({...profile,email:e.target.value})}
         />
       </label>
     </div>

     <div className="form-actions">
       <button className="primary" onClick={saveProfile}>Save profile</button>
       {saved&&<span className="pill success">Saved</span>}
     </div>
   </section>

   <section className="card form">
     <h2><KeyRound size={19}/>Login credentials</h2>
     <p>Change username or password for this account.</p>

     <div className="form-grid">
       <label>Username
         <input
           value={username}
           onChange={e=>setUsername(e.target.value)}
         />
       </label>

       <label>New password (leave blank to keep)
         <input
           type="password"
           value={password}
           onChange={e=>setPassword(e.target.value)}
         />
       </label>
     </div>

     <div className="form-actions">
       <button className="primary" onClick={saveLogin}>Update login</button>
       {loginSaved&&<span className="pill success">Updated</span>}
     </div>
   </section>

   <section className="card form">
     <h2><Palette size={19}/>Appearance & clinic</h2>

     <div className="form-grid">
       <label>Clinic name
         <input
           value={f.clinic_name||''}
           onChange={e=>setF({...f,clinic_name:e.target.value})}
         />
       </label>

       <label>Short name
         <input
           value={f.clinic_name_short||''}
           onChange={e=>setF({...f,clinic_name_short:e.target.value})}
         />
       </label>

       <label>Language
         <select
           value={f.ui_language||'en'}
           onChange={e=>setF({...f,ui_language:e.target.value})}
         >
           <option value="en">English</option>
           <option value="am">Amharic</option>
         </select>
       </label>
     </div>

     <div className="form-actions">
       <button className="primary" onClick={save}>Save settings</button>
       {saved&&<span className="pill success">Saved</span>}
     </div>
   </section>
 </>;
}function App(){const[doctor,setDoctor]=useState(undefined),[setup,setSetup]=useState(false);useEffect(()=>{api.get('/auth/status').then(x=>{if(x.setupRequired)setSetup(true);else api.get('/auth/me').then(x=>setDoctor(x.doctor)).catch(()=>setDoctor(null))}).catch(()=>setDoctor(null))},[]);if(doctor===undefined&&!setup)return <Loading/>;if(setup)return <Setup onLogin={d=>{setSetup(false);setDoctor(d)}}/>;if(!doctor)return <Routes><Route path="/forgot" element={<Forgot/>}/><Route path="/reset-password" element={<ResetPassword/>}/><Route path="*" element={<Login onLogin={setDoctor}/>}/></Routes>;return <Shell doctor={doctor} onLogout={async()=>{await api.post('/auth/logout',{});setDoctor(null)}}><Routes><Route path="/" element={<Dashboard/>}/><Route path="/patients" element={<Patients/>}/><Route path="/patients/new" element={<PatientForm/>}/><Route path="/patients/edit/:id" element={<PatientForm/>}/><Route path="/monthly" element={<Monthly/>}/><Route path="/doctors" element={doctor.role==='admin'?<Doctors/>:<Navigate to="/"/>}/><Route path="/audit" element={<Audit/>}/><Route path="/backup" element={doctor.role==='admin'?<Backup/>:<Navigate to="/"/>}/><Route path="/notifications" element={doctor.role==='admin'?<NotificationsPage/>:<Navigate to="/"/>}/><Route path="/settings" element={doctor.role==='admin'?<SettingsPage/>:<Navigate to="/"/>}/><Route path="*" element={<Navigate to="/"/>}/></Routes></Shell>}
createRoot(document.getElementById('root')).render(<BrowserRouter><App/></BrowserRouter>);
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding:24px;font-family:Arial,sans-serif;color:#b91c1c;">
        <h2>App error</h2>
        <pre style="white-space:pre-wrap;word-break:break-word;">${event.error?.stack || event.message || 'Unknown error'}</pre>
      </div>
    `;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding:24px;font-family:Arial,sans-serif;color:#b91c1c;">
        <h2>App error</h2>
        <pre style="white-space:pre-wrap;word-break:break-word;">${event.reason?.stack || event.reason?.message || String(event.reason) || 'Unknown error'}</pre>
      </div>
    `;
  }
});













































