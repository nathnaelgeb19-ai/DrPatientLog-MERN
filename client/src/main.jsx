import React,{useEffect,useState,useRef,useCallback}from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,useNavigate,useLocation,Routes,Route,Link,Navigate}from'react-router-dom';import{LayoutDashboard,Users,UserRoundCog,CalendarDays,Settings,LogOut,Plus,Search,Menu,X,Stethoscope,ShieldCheck,ArrowUpRight,Trash2,Edit3,CheckCircle2,ReceiptText,ClipboardList,Database,Send,Download,Upload,RefreshCw,KeyRound,UserCog,Palette,Sun,Moon,Monitor,Bell,Clock,ChevronDown,FileText,Eye,EyeOff,Command,CornerDownLeft,Sparkles,TrendingUp,Wallet,Activity,ChevronRight,MoreHorizontal,PlusCircle,CircleDollarSign,ArrowRight,BarChart3,Info,Check,Lock,Star,UserPlus}from'lucide-react';import{AreaChart,Area,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer}from'recharts';import{api}from'./api';import{ethiopianDate}from'./ethiopian.js';import'./styles.css';import doctorLogo from './assets/aa-logo.svg';
const money=n=>`${Number(n||0).toFixed(2)} ETB`;
function PageHead({title,subtitle,action}){return <div className="page-head"><div><p className="eyebrow">DRPATIENTLOG</p><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>}
function Loading(){return <div className="loading"><div/><div/><div/></div>}
function Spinner(){return <span className="spinner" aria-hidden="true"/>}
function Btn({className='',loading=false,loadingText,children,disabled=false,...rest}){return <button className={loading?className+' is-loading':className} disabled={loading||disabled} aria-busy={loading?'true':undefined} {...rest}>{loading?<><Spinner/>{loadingText??children}</>:children}</button>}
function prefersReduced(){return typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches}
function Reveal({className='',delay=0,children,...rest}){const ref=useRef(null);useEffect(()=>{const el=ref.current;if(!el)return;if(prefersReduced()){el.classList.add('in');return}const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){el.classList.add('in');io.disconnect()}})},{threshold:.1,rootMargin:'0px 0px -40px 0px'});io.observe(el);return()=>io.disconnect()},[]);return <div ref={ref} className={('reveal '+className).trim()} style={{transitionDelay:`${delay}ms`}} {...rest}>{children}</div>}
function CountUp({value=0,format=v=>Math.round(v).toLocaleString(),duration=850}){const[n,setN]=useState(prefersReduced()?value:0);useEffect(()=>{if(prefersReduced()){setN(value);return}let raf,start;const tick=t=>{if(start===undefined)start=t;const p=Math.min(1,(t-start)/duration);setN(value*(1-Math.pow(1-p,3)));if(p<1)raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)},[value,duration]);return <>{format(n)}</>}
const ToastCtx=React.createContext(()=>{});
function ToastProvider({children}){const[items,setItems]=useState([]);const push=useCallback((message,type='success')=>{const id=Math.random().toString(36).slice(2);setItems(x=>[...x,{id,message,type}]);setTimeout(()=>setItems(x=>x.filter(i=>i.id!==id)),2800)},[]);return <ToastCtx.Provider value={push}>{children}<div className="toast-stack" role="status" aria-live="polite">{items.map(i=><div key={i.id} className={'toast'+(i.type==='error'?' error':'')}><span className="toast-icon">{i.type==='error'?<X size={15}/>:<Check size={15}/>}</span>{i.message}</div>)}</div></ToastCtx.Provider>}
const useToast=()=>React.useContext(ToastCtx);
function Modal({open,onClose,title,subtitle,children}){useEffect(()=>{if(!open)return;const on=e=>e.key==='Escape'&&onClose();window.addEventListener('keydown',on);return()=>window.removeEventListener('keydown',on)},[open,onClose]);if(!open)return null;return <div className="modal-overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal-panel" role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><div><h2>{title}</h2>{subtitle&&<p className="modal-sub">{subtitle}</p>}</div><button type="button" className="icon" aria-label="Close" onClick={onClose}><X size={18}/></button></div>{children}</div></div>}
function Switch({checked,onChange,label}){return <label className="switch"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} aria-label={label}/><span className="track"/><span className="thumb"/></label>}
function ScrollProgress(){const ref=useRef(null);useEffect(()=>{let raf;const on=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const h=document.documentElement,max=h.scrollHeight-h.clientHeight;if(ref.current)ref.current.style.transform=`scaleX(${max>0?h.scrollTop/max:0})`})};window.addEventListener('scroll',on,{passive:true});window.addEventListener('resize',on);on();return()=>{window.removeEventListener('scroll',on);window.removeEventListener('resize',on)}},[]);return <div className="scroll-progress" ref={ref}/>}
function CommandPalette({open,onClose,nav}){const[q,setQ]=useState(''),[idx,setIdx]=useState(0),inputRef=useRef(null),go=useNavigate();useEffect(()=>{if(open){setQ('');setIdx(0);const t=setTimeout(()=>inputRef.current?.focus(),40);return()=>clearTimeout(t)}},[open]);const actions=nav.flatMap(([to,label,I])=>({label,to,icon:I}));const f=q.trim()?actions.filter(a=>a.label.toLowerCase().includes(q.toLowerCase())):actions;useEffect(()=>setIdx(0),[q]);const choose=a=>{if(!a)return;go(a.to);onClose()};if(!open)return null;return <div className="cmd-overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="cmd-panel" role="dialog" aria-modal="true" aria-label="Command palette"><div className="cmd-search"><Search size={18}/><input ref={inputRef} value={q} placeholder="Search pages and actions…" onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setIdx(i=>Math.min(i+1,f.length-1))}else if(e.key==='ArrowUp'){e.preventDefault();setIdx(i=>Math.max(i-1,0))}else if(e.key==='Enter'){e.preventDefault();choose(f[idx])}else if(e.key==='Escape'){e.preventDefault();onClose()}}}/><kbd>ESC</kbd></div><div className="cmd-list">{f.length?f.map((a,i)=><button key={a.to} className={'cmd-item'+(i===idx?' active':'')} onMouseEnter={()=>setIdx(i)} onClick={()=>choose(a)}><a.icon size={17}/><span>{a.label}</span>{i===idx&&<CornerDownLeft size={14}/>}</button>):<div className="cmd-empty">{`No matches for "${q}".`}</div>}</div></div></div>}
function Shell({doctor,onLogout,children}){
  const loc=useLocation();
  const[open,setOpen]=useState(false);
  const[loggingOut,setLoggingOut]=useState(false);
  const[theme,setTheme]=useState(()=>localStorage.getItem('drpatientlog-theme')||'system');
  const[cmdOpen,setCmdOpen]=useState(false);
  const navRef=useRef(null);
  const[ind,setInd]=useState({top:0,height:0,show:false});

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

  const main=[
    ['/','Dashboard',LayoutDashboard],
    ['/patients','Patients',Users],
    ['/monthly','Monthly',CalendarDays]
  ];

  const admin=doctor.role==='admin'
    ?[['/doctors','Doctors',UserRoundCog],['/backup','Backup',Database],['/notifications','Notifications',Bell],['/settings','Settings',Settings]]
    :[];

  const nav=[...main,...admin];

  useEffect(()=>{
    const el=navRef.current;
    if(!el)return;
    const active=el.querySelector('a.active');
    if(active){
      setInd({top:active.offsetTop,height:active.offsetHeight,show:true});
    }else{
      setInd(i=>({...i,show:false}));
    }
  },[loc.pathname,doctor.role]);

  useEffect(()=>{
    const on=e=>{
      if((e.metaKey||e.ctrlKey)&&(e.key||'').toLowerCase()==='k'){
        e.preventDefault();
        setCmdOpen(v=>!v);
      }
    };
    window.addEventListener('keydown',on);
    return()=>window.removeEventListener('keydown',on);
  },[]);

  const ThemeIcon=theme==='dark'?Moon:theme==='light'?Sun:Monitor;
  const crumb=loc.pathname==='/'?['Dashboard']:loc.pathname.slice(1).split('/').filter(Boolean).map(s=>s.charAt(0).toUpperCase()+s.slice(1));
  const bottom=[['/','Home',LayoutDashboard],['/patients','Patients',Users],['/patients/new','',Plus],['/monthly','Monthly',CalendarDays]];
  const isMac=typeof navigator!=='undefined'&&/Mac/i.test(navigator.platform||navigator.userAgent||'');

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

      <nav ref={navRef}>
        <span
          className="nav-indicator"
          style={{transform:`translateY(${ind.top}px)`,height:ind.height,opacity:ind.show?1:0}}
          aria-hidden="true"
        />

        {main.map(([to,label,I])=>
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

        {admin.length>0&&<React.Fragment>
          <span className="nav-section">Administration</span>
          {admin.map(([to,label,I])=>
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
        </React.Fragment>}
      </nav>

      <Btn
        className="logout"
        loading={loggingOut}
        loadingText="Signing out…"
        onClick={async()=>{
          setLoggingOut(true);
          try{
            await onLogout();
          }finally{
            setLoggingOut(false);
          }
        }}
      >
        <span className="nav-icon">
          <LogOut size={18}/>
        </span>
        <span>Sign out</span>
      </Btn>

    </aside>

    <main>

      <header className="top">

      <ScrollProgress/>

      <button
          className="icon mobile top-menu-button"
          aria-label="Open navigation"
          onClick={()=>setOpen(true)}
        >
          <Menu size={21}/>
        </button>

        <div className="breadcrumb">
          <span className="crumb-root">Workspace</span>
          {crumb.map((c,i)=>
            <React.Fragment key={`${c}-${i}`}>
              <span className="crumb-sep">/</span>
              {i===crumb.length-1
                ?<span className="top-title">{c}</span>
                :<span className="crumb-root">{c}</span>}
            </React.Fragment>
          )}
        </div>

        <div className="top-actions">

          <button
            className="cmd-trigger"
            onClick={()=>setCmdOpen(true)}
            aria-label="Open command palette"
          >
            <Search size={16}/>
            <span>Search</span>
            <kbd>{isMac?'⌘K':'Ctrl K'}</kbd>
          </button>

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

              {[['system','System',Monitor],['light','Light',Sun],['dark','Dark',Moon]].map(([key,label,I])=>
                <button
                  key={key}
                  className={theme===key?'selected':''}
                  onClick={()=>applyTheme(key)}
                >
                  <I size={16}/>
                  <span>{label}</span>
                  {theme===key&&<CheckCircle2 size={15}/>}
                </button>
              )}

            </div>

          </div>

          <div className="mini-avatar">{doctor.name?.[0]}</div>

        </div>

      </header>

      <div className="content">
        <div className="route" key={loc.pathname}>
          {children}
        </div>
      </div>

    </main>

    {open&&<div className="sidebar-scrim" onClick={()=>setOpen(false)} aria-hidden="true"/>}

    <nav className="bottom-nav" aria-label="Primary">
      <div className="bottom-nav-inner">
        {bottom.map(([to,label,I])=>
          to==='/patients/new'
            ?<Link key={to} to={to} className="nav-fab" aria-label="New patient" onClick={()=>setOpen(false)}>
              <I size={24}/>
            </Link>
            :<Link key={to} to={to} className={loc.pathname===to?'active':''}>
              <I size={20}/>
              <span>{label}</span>
            </Link>
        )}
        <button
          type="button"
          className={['/doctors','/backup','/notifications','/settings'].includes(loc.pathname)?'active':''}
          onClick={()=>setOpen(true)}
          aria-label="More options"
        >
          <Menu size={20}/>
          <span>More</span>
        </button>
      </div>
    </nav>

    <CommandPalette open={cmdOpen} onClose={()=>setCmdOpen(false)} nav={nav}/>

  </div>
}
function AuthLayout({title,subtitle,points,clinic,children}){return <div className="auth">
  <aside className="auth-visual">
    <div className="auth-brand">
      <div className="logo"><Stethoscope size={20}/></div>
      <div><b>DrPatientLog</b>{clinic?.name&&<span>{clinic.name}</span>}</div>
    </div>
    {title?(
      <div className="auth-hero">
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {points&&points.map(([I,t,d])=>
          <div className="auth-point" key={t}>
            <span className="auth-point-icon"><I size={17}/></span>
            <div>
              <div>{t}</div>
              {d&&<div style={{fontWeight:400,opacity:.8,fontSize:'12.5px'}}>{d}</div>}
            </div>
          </div>
        )}
      </div>
    ):(
      <div className="auth-art">
        <div className="auth-art-glyph">
          <img className="auth-art-img" src={doctorLogo} alt="Clinic doctor logo"/>
        </div>
        <span className="auth-spark s1"/>
        <span className="auth-spark s2"/>
        <span className="auth-spark s3"/>
        <span className="auth-spark s4"/>
        <span className="auth-art-chip c1"><Activity size={18}/></span>
        <span className="auth-art-chip c2"><CalendarDays size={18}/></span>
        <span className="auth-art-chip c3"><Users size={18}/></span>
        {clinic?.name&&<span className="auth-art-pill"><Stethoscope size={18}/>{clinic.name}</span>}
      </div>
    )}
    <footer>© {new Date().getFullYear()} DrPatientLog · Secure clinical records</footer>
  </aside>
  <main className="auth-main">
    <div className="auth-card">{children}</div>
  </main>
</div>}
function Login({onLogin,clinic}){const[f,setF]=useState({username:'',password:''}),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[show,setShow]=useState(false);const go=async e=>{e.preventDefault();setBusy(true);try{onLogin((await api.post('/auth/login',f)).doctor)}catch(x){setErr(x.message)}finally{setBusy(false)}};return <AuthLayout clinic={clinic}>{(clinic?.short||clinic?.name)&&<p className="eyebrow brand">{clinic?.short||clinic?.name}</p>}<h1>Welcome back</h1><p className="sub">Sign in to your practice workspace.</p>{err&&<div className="error">{err}</div>}<form onSubmit={go}><label>Username<input autoComplete="username" required value={f.username} onChange={e=>setF({...f,username:e.target.value})}/></label><label>Password<span className="password-field"><input type={show?'text':'password'} autoComplete="current-password" required value={f.password} onChange={e=>setF({...f,password:e.target.value})}/><button type="button" className="password-toggle" title={show?'Hide password':'Show password'} aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button></span></label><Btn className="primary full" loading={busy} loadingText="Signing in…">Sign in <ArrowUpRight size={17}/></Btn></form><p className="auth-foot"><Link className="ghost full" to="/forgot">Forgot password?</Link></p></AuthLayout>}
function Setup({onLogin,clinic}){const[f,setF]=useState({name:'',username:'',password:'',email:''}),[err,setErr]=useState(''),[busy,setBusy]=useState(false);const go=async e=>{e.preventDefault();setBusy(true);try{onLogin((await api.post('/auth/setup',f)).doctor)}catch(x){setErr(x.message)}finally{setBusy(false)}};return <AuthLayout clinic={clinic} title="Set up your clinic workspace." subtitle="Create the first administrator account to get started." points={[[Sparkles,'One-time setup','Takes less than a minute.'],[ShieldCheck,'Secure from the start','Your data never leaves your server.'],[Users,'Ready for your team','Add doctors once you are in.']]}><p className="eyebrow">FIRST-TIME SETUP</p><h1>Create administrator</h1><p className="sub">Set up the first DrPatientLog account.</p>{err&&<div className="error">{err}</div>}<form onSubmit={go}>{[['name','Full name'],['username','Username'],['email','Email'],['password','Password']].map(([k,l])=><label key={k}>{l}<input type={k==='password'?'password':'text'} required={k!=='email'} value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}/></label>)}<Btn className="primary full" loading={busy} loadingText="Creating account…">Create administrator</Btn></form></AuthLayout>}
function Forgot({clinic}){const[email,setEmail]=useState(''),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);const go=async e=>{e.preventDefault();setBusy(true);try{const x=await api.post('/auth/forgot',{email});setMsg(x.resetToken?`Development reset token: ${x.resetToken}`:'If the account exists, reset instructions have been prepared.');}finally{setBusy(false)}};return <AuthLayout clinic={clinic} title="Locked out? We'll get you back in." subtitle="Enter your account email and we'll prepare reset instructions." points={[[KeyRound,'Secure reset','Reset links expire quickly.'],[ShieldCheck,'No data exposed','We never reveal whether an email exists.'],[Clock,'Quick recovery','Back to your records in moments.']]}><KeyRound size={30}/><h1>Reset password</h1><p className="sub">Enter the account email.</p>{msg&&<div className="note">{msg}</div>}<form onSubmit={go}><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><Btn className="primary full" loading={busy} loadingText="Generating…">Generate reset</Btn></form><p className="auth-foot"><Link to="/login">Back to sign in</Link></p></AuthLayout>}
function ResetPassword({clinic}){
 const params=new URLSearchParams(window.location.search),
 token=params.get('token')||'',
 [password,setPassword]=useState(''),
 [confirm,setConfirm]=useState(''),
 [msg,setMsg]=useState(''),
 [err,setErr]=useState(''),
 [done,setDone]=useState(false),
 [busy,setBusy]=useState(false);

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

   setBusy(true);
   try{
     await api.post('/auth/reset',{token,password});
     setDone(true);
     setMsg('Your password has been reset successfully.');
   }catch(e){
     setErr(e.message||'This reset link is invalid or expired.');
   }finally{
     setBusy(false);
   }
 };

 return <AuthLayout clinic={clinic} title="Choose a strong new password." subtitle="Your reset link is valid for a single use." points={[[Lock,'Strong passwords','At least 8 characters.'],[ShieldCheck,'Encrypted','Stored securely on your server.'],[CheckCircle2,'Back to work','Sign in again right after.']]}>
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

       <Btn className="primary full" loading={busy} loadingText="Resetting…">Reset password</Btn>
     </form>}

     <p className="auth-foot"><Link to="/login">{done?'Back to sign in':'Cancel'}</Link></p>
 </AuthLayout>
}function Stat({label,value,meta,icon:I}){return <div className="stat"><div className="stat-icon"><I size={19}/></div><span>{label}</span><strong>{value}</strong><small>{meta}</small></div>}
function PatientTable({rows,onEdit,onDelete}){const[deleting,setDeleting]=useState(null);const hasActions=!!(onEdit||onDelete);return <div className="table-wrap"><table>
<thead><tr><th scope="col">Patient</th><th scope="col">Card</th><th scope="col">Ticket</th><th scope="col">Procedure</th><th scope="col">Fee</th><th scope="col">Cut</th>{hasActions&&<th scope="col">Actions</th>}</tr></thead>
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
{hasActions&&<td className="row-actions">
  <span className="row-actions-inner">
  {onEdit&&<button className="icon patient-row-action-edit" title="Edit patient" onClick={()=>onEdit(r)}>
    <Edit3 size={15}/>
    <span>Edit</span>
  </button>}
  
  {onDelete&&<button className={'icon danger patient-row-action-delete'+(deleting===r._id?' is-loading':'')} title="Delete patient" disabled={deleting===r._id} onClick={async()=>{setDeleting(r._id);try{await onDelete(r)}finally{setDeleting(null)}}}>
    {deleting===r._id?<Spinner/>:<Trash2 size={15}/>}
    <span>Del</span>
  </button>}
  </span>
</td>}
</tr>):<tr><td colSpan={hasActions?7:6} className="empty">No records found.</td></tr>}</tbody></table></div>}
function Dashboard({clinic}){
  const[d,setD]=useState();
  const[err,setErr]=useState('');
  const[range,setRange]=useState('eth_month');

  useEffect(()=>{
    setErr('');
    api.get('/dashboard?range='+range)
      .then(setD)
      .catch(e=>setErr(e.message||'Unable to load dashboard.'));
  },[range]);

  if(err)return <div className="error">{err}</div>;
  if(!d)return <Loading/>;
  const income=Number(d.rangeIncome||0);
  const earnings=Number(d.rangeCut||0);
  const earningPct=income>0?Math.min(100,(earnings/income)*100):0;

  return <>
    <Reveal>
      <section className="hero">
        <div className="hero-row">
          <div>
            {(clinic?.short||clinic?.name)&&<p className="eyebrow brand">{clinic?.short||clinic?.name}</p>}
            <h1>{d.ethToday.month} {d.ethToday.day}, {d.ethToday.year}</h1>
            <p>Welcome back. Here is what's happening across your practice.</p>
          </div>

          <div className="hero-actions">
            <Link className="ghost" to="/monthly">
              <BarChart3 size={17}/>
              Monthly report
            </Link>
            <Link className="primary" to="/patients/new">
              <Plus size={18}/>
              New patient
            </Link>
          </div>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <span>Today's earnings</span>
            <strong><CountUp value={d.todayCut} format={v=>money(v)}/></strong>
          </div>
          <div className="hero-stat">
            <span>Range earnings</span>
            <strong><CountUp value={earnings} format={v=>money(v)}/></strong>
          </div>
          <div className="hero-stat">
            <span>Range income</span>
            <strong><CountUp value={income} format={v=>money(v)}/></strong>
          </div>
          <div className="hero-stat">
            <span>Visits in range</span>
            <strong><CountUp value={d.count}/></strong>
          </div>
        </div>
      </section>
    </Reveal>

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
      <Reveal delay={0}>
        <div className="dashboard-kpi dashboard-kpi-primary">
          <div className="dashboard-kpi-top">
            <span>Today's earnings</span>
            <div className="dashboard-kpi-icon"><ReceiptText size={19}/></div>
          </div>
          <strong><CountUp value={d.todayCut} format={v=>money(v)}/></strong>
          <small>Doctor earnings today</small>
        </div>
      </Reveal>

      <Reveal delay={70}>
        <div className="dashboard-kpi">
          <div className="dashboard-kpi-top">
            <span>Range earnings</span>
            <div className="dashboard-kpi-icon"><TrendingUp size={19}/></div>
          </div>
          <strong><CountUp value={d.rangeCut} format={v=>money(v)}/></strong>
          <small>Doctor earnings in selected period</small>
        </div>
      </Reveal>

      <Reveal delay={140}>
        <div className="dashboard-kpi">
          <div className="dashboard-kpi-top">
            <span>Clinic income</span>
            <div className="dashboard-kpi-icon"><Wallet size={19}/></div>
          </div>
          <strong><CountUp value={d.rangeIncome} format={v=>money(v)}/></strong>
          <small>Total recorded income</small>
        </div>
      </Reveal>

      <Reveal delay={210}>
        <div className="dashboard-kpi">
          <div className="dashboard-kpi-top">
            <span>Patients</span>
            <div className="dashboard-kpi-icon"><Users size={19}/></div>
          </div>
          <strong><CountUp value={d.count}/></strong>
          <small>Visits in selected period</small>
        </div>
      </Reveal>
    </div>

    <div className="dashboard-main-grid">

      <Reveal>
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
                <strong><CountUp value={income} format={v=>money(v)} duration={700}/></strong>
              </div>
              <b>{income>0?'100%':'0%'}</b>
            </div>

            <div className="dashboard-bar">
              <div style={{width:income>0?'100%':'0%'}}/>
            </div>

            <div className="dashboard-finance-row">
              <div>
                <span>Your earnings</span>
                <strong><CountUp value={earnings} format={v=>money(v)} duration={700}/></strong>
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
      </Reveal>

      <Reveal delay={90}>
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
      </Reveal>

    </div>

    <Reveal>
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

        {d.recent?.length
          ?<PatientTable rows={d.recent}/>
          :<div className="empty-state">
            <div className="empty-illustration"><ClipboardList size={28}/></div>
            <b>No visits recorded</b>
            <p>Record your first patient visit to see it appear here.</p>
            <Link className="primary" to="/patients/new" style={{marginTop:'6px'}}>
              <Plus size={17}/>New patient
            </Link>
          </div>}

      </section>
    </Reveal>
  </>
}
function Patients(){
  const[rows,setRows]=useState([]);
  const[q,setQ]=useState('');
  const[from,setFrom]=useState('');
  const[to,setTo]=useState('');
  const[busy,setBusy]=useState('');

  const load=()=>{
    setBusy('search');
    return api.get(`/patients?q=${encodeURIComponent(q)}&from=${from}&to=${to}`).then(setRows).finally(()=>setBusy(''));
  };

  useEffect(()=>{
    load();
  },[]);

  const clearFilters=()=>{
    setQ('');
    setFrom('');
    setTo('');
    setBusy('clear');
    api.get('/patients?q=&from=&to=').then(setRows).finally(()=>setBusy(''));
  };

  const del=async r=>{
    if(confirm(`Delete ${r.patientName}?`)){
      await api.del('/patients/'+r._id);
      load();
    }
  };

  const totalFees=rows.reduce((a,r)=>a+Number(r.totalFee||0),0);
  const totalCut=rows.reduce((a,r)=>a+Number(r.myEarning||0),0);
  const activeFilters=!!(q.trim()||from||to);

  return <>
    <PageHead
      title="Patients"
      subtitle="Search, filter and manage patient records"
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

        <Btn className="patients-filter-button" loading={busy==='search'} loadingText="Searching…" onClick={load}>
          <Search size={16}/>
          Search
        </Btn>

        <Btn className="patients-clear-button" loading={busy==='clear'} loadingText="Clearing…" onClick={clearFilters}>
          Clear
        </Btn>

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

        <div>
          <span>Total fees</span>
          <strong>{money(totalFees)}</strong>
        </div>

        <div>
          <span>Doctor earnings</span>
          <strong>{money(totalCut)}</strong>
        </div>

        <div className="patients-summary-note">
          {activeFilters?'Filters active':'Showing recorded visits'}
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
  const[busy,setBusy]=useState(false);
  const[sugBusy,setSugBusy]=useState(false);

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
    setBusy(true);

    try{
      await(editing?api.put('/patients/'+id,f):api.post('/patients',f));
      nav('/patients');
    }catch(x){
      setErr(x.message);
    }finally{
      setBusy(false);
    }
  };

  const suggest=async()=>{
    setSugBusy(true);
    try{
      const x=await api.get(
        '/patients/suggest-fee?procedure='+encodeURIComponent(f.procedure)
      );

      if(x.fee!=null){
        set('totalFee',x.fee);
      }else{
        alert('No preset fee for this procedure');
      }
    }finally{
      setSugBusy(false);
    }
  };

  const doctorEarning=
    Number(f.totalFee||0)*Number(f.doctorPct||0)/100;

  return <>
    <PageHead
      title={editing?'Edit patient':'New patient'}
      subtitle={editing?'Update the patient visit record.':'Record a new patient visit.'}
    />

    <div className="patient-form-layout">

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
                <Btn
                  type="button"
                  className="patient-suggest-button"
                  loading={sugBusy}
                  loadingText="…"
                  onClick={suggest}
                >
                  Suggest
                </Btn>
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
      </form>

      <aside className="patient-summary">
        <h3>{f.patientName?f.patientName:(editing?'Editing record':'New visit')}</h3>
        <p className="summary-sub">{f.procedure||'Fill in the treatment details to preview the summary.'}</p>

        <div className="summary-rows">
          <div className="summary-row"><span>Patient</span><b>{f.patientName||'—'}</b></div>
          <div className="summary-row"><span>Date</span><b>{f.ethDate||f.gregDate||'—'}</b></div>
          <div className="summary-row"><span>Card</span><b>{f.cardNumber||'—'}</b></div>
          <div className="summary-row"><span>Ticket</span><b>{f.ticketNo||'—'}</b></div>
          <div className="summary-row"><span>Fee</span><b>{money(f.totalFee)}</b></div>
          <div className="summary-row"><span>Doctor cut</span><b>{Number(f.doctorPct||0).toFixed(1)}%</b></div>

          <div className="summary-divider"/>

          <div className="summary-total">
            <span>Your earnings</span>
            <strong>{money(doctorEarning)}</strong>
          </div>
        </div>

        <div className="patient-summary-badge">
          <ShieldCheck size={14}/>
          Recorded on the clinic server
        </div>

        <div className="patient-form-actions">
          <button
            type="button"
            className="ghost"
            onClick={()=>nav('/patients')}
          >
            Cancel
          </button>

          <Btn className="primary patient-save-button" loading={busy} loadingText={editing?'Updating…':'Saving…'} disabled={busy} type="submit" onClick={save}>
            <CheckCircle2 size={18}/>
            {editing?'Update record':'Save patient record'}
          </Btn>
        </div>
      </aside>

    </div>
  </>
}
function Monthly(){
  const[d,setD]=useState();
  const[err,setErr]=useState('');
  const[loading,setLoading]=useState(true);
  const[busy,setBusy]=useState('');

  const load=()=>{
    setErr('');
    setLoading(true);

    api.get('/dashboard/monthly')
      .then(setD)
      .catch(e=>setErr(e.message||'Unable to load monthly report.'))
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{
    load();
  },[]);

  if(err)return <div className="error">{err}</div>;
  if(loading&&!d)return <Loading/>;  if(err)return <div className="error">{err}</div>;
  if(!d)return <Loading/>;

  const close=async m=>{
    if(confirm(`Mark ${m._id.month} ${m._id.year} as paid and closed?`)){
      setBusy('close:'+m._id.month+m._id.year);
      try{
        await api.post('/dashboard/monthly/close',{
          month:m._id.month,
          year:m._id.year
        });
        load();
      }catch(e){
        alert(e.message);
      }finally{
        setBusy('');
      }
    }
  };

  return <>
    <PageHead
      title="Monthly earnings"
      subtitle="Ethiopian-month percentage earnings and salary payment history."
    />

    <Reveal>
      <section className="monthly-chart-card">
        <div className="monthly-chart-head">
          <div>
            <span className="dashboard-kicker">Trend</span>
            <h2>Earnings trend</h2>
          </div>
          <span className="pill"><TrendingUp size={13}/> Based on recorded visits</span>
        </div>

        <div style={{height:270}}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={[...(d.months||[])].reverse().map(m=>({
                name:`${m._id.month.slice(0,3)} ${String(m._id.year).slice(-2)}`,
                earnings:Math.round(Number(m.payable||0))
              }))}
              margin={{top:14,right:8,left:-12,bottom:0}}
            >
              <defs>
                <linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35}/>
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line-2)" vertical={false}/>
              <XAxis dataKey="name" tick={{fill:'var(--muted)',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'var(--faint)',fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip
                formatter={v=>[money(v),'Doctor earnings']}
                contentStyle={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:'12px',fontSize:'12px',boxShadow:'var(--shadow-2)'}}
                labelStyle={{color:'var(--muted)',fontWeight:600}}
              />
              <Area type="monotone" dataKey="earnings" stroke="var(--accent)" strokeWidth={2.5} fill="url(#earningsFill)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </Reveal>

    <section className="monthly-report-card">

      <div className="monthly-report-header">
        <div>
          <span className="monthly-report-label">Financial history</span>
          <h2>Monthly report</h2>
          <p>Track clinic income, your percentage, and monthly payment status.</p>
        </div>

        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',justifyContent:'flex-end'}}>

          <Btn
            className="ghost monthly-telegram-button"
            loading={busy==='header'}
            loadingText="Sending…"
            onClick={async()=>{
              setBusy('header');
              try{
                await api.post('/telegram/monthly',{});
                alert('Monthly report sent');
              }catch(e){
                alert(e.message);
              }finally{
                setBusy('');
              }
            }}
          >
            <Send size={16}/>
            Send Telegram
          </Btn>
        </div>
      </div>

      <div className="monthly-table-wrap">
        <table className="monthly-table">

          <thead>
            <tr>
              <th scope="col">Ethiopian month</th>
              <th scope="col">Patients</th>
              <th scope="col">Income</th>
              <th scope="col">Doctor %</th>
              <th scope="col">Doctor earnings</th>
              <th scope="col">Status / action</th>
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
                          <span className="monthly-live-dot" aria-hidden="true"/>
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
        <Btn
          className="primary small monthly-close-button"
          loading={busy==='close:'+m._id.month+m._id.year}
          loadingText="Closing…"
          onClick={()=>close(m)}
        >
          <CheckCircle2 size={15}/>
          Paid & Close Month
        </Btn>
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

<Btn
  className="ghost small"
  loading={busy==='tg:'+m._id.month+m._id.year}
  loadingText="Sending…"
  onClick={async()=>{
    setBusy('tg:'+m._id.month+m._id.year);
    try{
      await api.post('/telegram/monthly-period',{
        month:m._id.month,
        year:m._id.year
      });
      alert('Monthly report sent');
    }catch(e){
      alert(e.message);
    }finally{
      setBusy('');
    }
  }}
>
  <Send size={14}/>
  Send Telegram
</Btn>

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
function Doctors(){
  const[rows,setRows]=useState([]);
  const[show,setShow]=useState(false);
  const[f,setF]=useState({name:'',username:'',password:'',email:'',role:'doctor',baseSalary:45000});
  const[busy,setBusy]=useState(false);
  const[rowBusy,setRowBusy]=useState('');
  const[loaded,setLoaded]=useState(false);
  const toast=useToast();
  const load=()=>api.get('/doctors').then(r=>{setRows(r);setLoaded(true)});

  useEffect(()=>{load()},[]);

  const add=async e=>{
    e.preventDefault();
    setBusy(true);
    try{
      await api.post('/doctors',f);
      setShow(false);
      setF({name:'',username:'',password:'',email:'',role:'doctor',baseSalary:45000});
      load();
      toast('Doctor account created');
    }catch(x){
      toast(x.message,'error');
    }finally{
      setBusy(false);
    }
  };

  const remove=async d=>{
    const p=prompt(`Enter ${d.name}'s password to delete this account:`);
    if(p){
      setRowBusy('del:'+d._id);
      try{
        await api.del('/doctors/'+d._id,{password:p});
        load();
        toast('Doctor removed');
      }catch(e){
        toast(e.message,'error');
      }finally{
        setRowBusy('');
      }
    }
  };

  const sw=async d=>{
    const p=prompt(`Enter ${d.name}'s password to switch to this account:`);
    if(p){
      setRowBusy('sw:'+d._id);
      try{
        await api.post('/doctors/'+d._id+'/switch',{password:p});
        toast('Switched account — reload to continue');
      }catch(e){
        toast(e.message,'error');
      }finally{
        setRowBusy('');
      }
    }
  };

  return <>
    <PageHead
      title="Doctors"
      subtitle="Manage accounts, roles and secure account switching."
      action={<button className="primary" onClick={()=>setShow(true)}><Plus size={18}/>Add doctor</button>}
    />

    <div className="doctor-grid">
      {rows.map(d=>
        <Reveal key={d._id}>
          <div className="doctor-card">
            <div className="doctor-card-head">
              <div className="avatar">{d.name?.[0]}</div>
              <div className="doctor-card-id">
                <b>{d.name}</b>
                <span>@{d.username}</span>
              </div>
              <span className="pill">{d.role}</span>
            </div>

            <div className="doctor-card-body">
              <div className="summary-rows">
                <div className="summary-row">
                  <span>Email</span>
                  <b>{d.email||'—'}</b>
                </div>
                <div className="summary-row">
                  <span>Base salary</span>
                  <b>{money(d.baseSalary)}</b>
                </div>
              </div>
            </div>

            <div className="doctor-card-actions">
              <Btn className="ghost small" loading={rowBusy==='sw:'+d._id} loadingText="Switching…" onClick={()=>sw(d)}>
                <RefreshCw size={14}/>
                Switch
              </Btn>
              <button
                className="icon danger"
                disabled={rowBusy==='del:'+d._id}
                onClick={()=>remove(d)}
                aria-label={`Delete ${d.name}`}
              >
                {rowBusy==='del:'+d._id?<Spinner/>:<Trash2 size={16}/>}
              </button>
            </div>
          </div>
        </Reveal>
      )}
    </div>

    {loaded&&rows.length===0&&(
      <div className="card empty-state">
        <div className="empty-illustration"><UserRoundCog size={26}/></div>
        <b>No doctor accounts</b>
        <p>Add your first doctor to start managing the team.</p>
      </div>
    )}

    <Modal open={show} onClose={()=>setShow(false)} title="Add doctor" subtitle="Create a new clinic account.">
      <form className="form" onSubmit={add}>
        <div className="form-grid">
          {[['name','Name'],['username','Username'],['password','Password'],['email','Email'],['baseSalary','Base salary']].map(([k,l])=>
            <label key={k}>{l}<input type={k==='password'?'password':'text'} required={['name','username','password'].includes(k)} value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}/></label>
          )}
          <label>
            Role
            <select value={f.role} onChange={e=>setF({...f,role:e.target.value})}>
              <option>doctor</option>
              <option>admin</option>
            </select>
          </label>
        </div>
        <div className="patient-form-actions">
          <button type="button" className="ghost" onClick={()=>setShow(false)}>Cancel</button>
          <Btn className="primary" loading={busy} loadingText="Creating…">Create doctor</Btn>
        </div>
      </form>
    </Modal>
  </>
}
function Backup(){
  const [status,setStatus]=useState(null);
  const [loading,setLoading]=useState(true);
  const [testing,setTesting]=useState(false);
  const [downloading,setDownloading]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [disconnecting,setDisconnecting]=useState(false);
  const [importing,setImporting]=useState(false);
  const [restoring,setRestoring]=useState(false);

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
    setDownloading(true);
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
    }finally{
      setDownloading(false);
    }
  };

  const restore=e=>{
    const file=e.target.files?.[0];
    if(!file)return;

    if(!window.confirm('Restore this database backup? The current database will be replaced.')){
      e.target.value='';
      return;
    }

    setRestoring(true);
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
        setRestoring(false);
      }
    };

    r.readAsText(file);
  };

  const importCsv=async e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    setImporting(true);
    try{
      const form=new FormData();
      form.append('file',file);
      const result=await api.post('/export/patients.csv',form);
      alert('CSV import completed. '+(result.imported||0)+' patient record(s) imported.');
    }catch(err){
      alert(err.message);
    }finally{
      e.target.value='';
      setImporting(false);
    }
  };

  const uploadGoogleDrive=async()=>{
    try{
      setUploading(true);
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
      setUploading(false);
    }
  };

  const testBackup=async()=>{
    try{
      setTesting(true);
      const result=await api.post('/admin/backup/test',{});

      const googleDriveOk = !!result.googleDrive?.uploaded;
      const telegramOk = Array.isArray(result.telegram)
        && result.telegram.some(x => x.sent);

      if(googleDriveOk && telegramOk){
        alert('Backup completed successfully. Google Drive and Telegram backups were sent.');
      }else if(telegramOk){
        alert(
          'Backup completed. Telegram backup was sent successfully. ' +
          `Google Drive: ${result.googleDrive?.reason || 'not uploaded'}.`
        );
      }else if(googleDriveOk){
        alert(
          'Backup completed. Google Drive backup was uploaded successfully. ' +
          'Telegram backup was not sent.'
        );
      }else{
        alert(
          result.googleDrive?.reason ||
          'Backup was not completed.'
        );
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

    setDisconnecting(true);
    try{
      await api.post('/admin/google-drive/disconnect',{});
      alert('Google Drive disconnected.');
      await loadStatus();
    }catch(e){
      alert(e.message);
    }finally{
      setDisconnecting(false);
    }
  };
  const statusReady=!loading && status?.backupDirReady;
  const googleConfigured=!loading && status?.googleDriveConfigured;

  return <>
    <PageHead
      title="Backup Center"
      subtitle="Protect your clinic data with local backups, cloud backups, and safe database recovery."
    />

    <section className="status-hero">
      <div className="status-hero-icon"><Database size={24}/></div>
      <div>
        <b>{loading?'Checking backup…':statusReady?'Backup system ready':'Backup not ready'}</b>
        <span>{loading?'Contacting the server…':statusReady?'Database and backup location verified':'Check your server configuration'}</span>
      </div>
      <div className="status-hero-meta">
        <div><small>Automatic backup</small><b>Daily at 19:00</b></div>
        <div><small>Google Drive</small><b>{loading?'…':googleConfigured?'Connected':'Not connected'}</b></div>
        <div><small>Database</small><b>MongoDB</b></div>
      </div>
    </section>

    <div className="grid-2">

      <section className="card">
        <div className="section-head">
          <div>
            <h2>Patient data</h2>
            <p>Export patient records to CSV or import records from a CSV file.</p>
          </div>
        </div>
        <div className="form-actions">
          <a className="ghost" href="/api/export/patients.csv">
            <Download size={16}/> Export Patient CSV
          </a>
          <label className={'ghost'+(importing?' is-loading':'')} style={{cursor:'pointer'}}>
            {importing?<><Spinner/>Importing…</>:<><Upload size={16}/>CSV import</>}
            <input type="file" accept=".csv,text/csv" onChange={importCsv} style={{display:'none'}}/>
          </label>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2>Local backup</h2>
            <p>Save a complete copy of your clinic database to this computer.</p>
          </div>
        </div>
        <div className="form-actions">
          <Btn className="primary" loading={downloading} loadingText="Downloading…" onClick={download}>
            <Download size={16}/>Download Backup
          </Btn>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2>Google Drive</h2>
            <p>Save a backup copy to Google Drive cloud storage.</p>
          </div>
        </div>
        <div className="form-actions">
          {!loading && googleConfigured ? (
            <div className="row-actions">
              <Btn className="primary" loading={uploading} loadingText="Uploading…" onClick={uploadGoogleDrive}>
                <Upload size={16}/>
                Upload Backup
              </Btn>

              <Btn className="ghost" loading={disconnecting} loadingText="Disconnecting…" onClick={disconnectGoogleDrive}>
                Disconnect
              </Btn>
            </div>
          ) : (
            <button className="primary" onClick={connectGoogleDrive} disabled={loading}>
              <Upload size={16}/>
              Connect Google Drive
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2>Disaster recovery</h2>
            <p>Restore your clinic data from a backup file.</p>
          </div>
        </div>
        <div className="form-actions">
          <label className={'primary'+(restoring?' is-loading':'')}>
            {restoring?<><Spinner/>Restoring…</>:<><Upload size={16}/>Choose Backup</>}
            <input hidden type="file" accept="application/json,.json" onChange={restore}/>
          </label>
        </div>
        <p className="note">Restoring replaces the current database. A safety copy is created first.</p>
      </section>

    </div>

    <section className="card">
      <div className="section-head">
        <div>
          <h2>Automatic backup</h2>
          <p>Production automatic backups are triggered by cron-job.org. You can also run a backup manually below.</p>
        </div>

        <Btn className="ghost" loading={loading} loadingText="Refreshing…" onClick={loadStatus}>
          <RefreshCw size={15}/>Refresh
        </Btn>
      </div>

      <div className="grid-2 card-elevated" style={{marginTop:'16px'}}>
        <div style={{padding:'17px'}}>
          <span style={{display:'block',fontSize:'12px',color:'var(--muted)',marginBottom:'6px'}}>
            Backup location
          </span>
          <b style={{display:'block',fontSize:'14px',lineHeight:'1.45',wordBreak:'break-all'}}>
            {status?.backupDir||'Checking...'}
          </b>
        </div>

        <div style={{padding:'17px'}}>
          <span style={{display:'block',fontSize:'12px',color:'var(--muted)',marginBottom:'6px'}}>
            Schedule
          </span>
          <b style={{display:'block',fontSize:'14px'}}>
            Daily at 19:00 via cron-job.org
          </b>
        </div>
      </div>

      <div className="form-actions">
        <Btn className="primary" loading={testing} loadingText="Running backup…" onClick={testBackup}>
          <RefreshCw size={16}/>
          Run Backup Now
        </Btn>
      </div>

      <div style={{marginTop:'14px',fontSize:'13px',lineHeight:'1.5',color:'var(--muted)'}}>
        {statusReady
          ? 'Backup location is ready.'
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
 [busy,setBusy]=useState(false),
 [savingTg,setSavingTg]=useState(false),
 [tab,setTab]=useState('telegram');

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
   setSavingTg(true);
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
   }finally{
     setSavingTg(false);
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

   <div className="tabs" role="tablist" aria-label="Notification sections">
     {[['telegram','Telegram'],['schedule','Schedules & reports']].map(([k,l])=>
       <button
         key={k}
         type="button"
         role="tab"
         aria-selected={tab===k}
         className={tab===k?'active':''}
         onClick={()=>setTab(k)}
       >
         {l}
       </button>
     )}
   </div>

   {tab==='telegram'&&(
     <div className="tab-panel">
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

         <div className="toggle-row">
           <div>
             <b>Enable Telegram reporting</b>
             <span>Turn on automated clinic notifications</span>
           </div>
           <Switch checked={!!tg.enabled} onChange={v=>setTg({...tg,enabled:v})} label="Enable Telegram reporting"/>
         </div>

         <div className="form-actions">
           <Btn className="primary" loading={savingTg} loadingText="Saving…" onClick={saveTelegram}>
             Save notification settings
           </Btn>
           {saved&&<span className="pill success">Saved</span>}
         </div>
       </section>
     </div>
   )}

   {tab==='schedule'&&(
     <div className="tab-panel">
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
           <Btn className="primary" loading={savingTg} loadingText="Saving…" onClick={saveTelegram}>
             Save notification settings
           </Btn>
           {saved&&<span className="pill success">Saved</span>}
         </div>
       </section>

       <section className="card form">
         <h2><Send size={19}/>Manual reports</h2>
         <p>Send a report immediately without waiting for the scheduled time.</p>

         <div className="form-actions">
           <Btn className="ghost" loading={busy} loadingText="Sending…" onClick={test}>
             <Send size={16}/>Send Telegram test
           </Btn>

           <Btn className="ghost" loading={busy} loadingText="Sending…" onClick={sendDaily}>
             <FileText size={16}/>Send today's daily report
           </Btn>
         </div>
       </section>
     </div>
   )}
 </>;
}

function SettingsPage(){
 const[doctor,setDoctor]=useState(null),
 [f,setF]=useState({}),
 [profile,setProfile]=useState({name:'',birthYear:'',email:''}),
 [username,setUsername]=useState(''),
 [password,setPassword]=useState(''),
 [saved,setSaved]=useState(false),
 [loginSaved,setLoginSaved]=useState(false),
 [savingProfile,setSavingProfile]=useState(false),
 [savingLogin,setSavingLogin]=useState(false),
 [savingSettings,setSavingSettings]=useState(false),
 [tab,setTab]=useState('profile');

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
   setSavingProfile(true);
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
   }finally{
     setSavingProfile(false);
   }
 };

 const saveLogin=async()=>{
   setSavingLogin(true);
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
   }finally{
     setSavingLogin(false);
   }
 };

 const save=async()=>{
   setSavingSettings(true);
   try{
     await api.put('/settings',f);
     setSaved(true);
     setTimeout(()=>setSaved(false),1800);
   }catch(e){
     alert(e.message);
   }finally{
     setSavingSettings(false);
   }
 };

 return <>
   <PageHead title="Settings" subtitle="Profile, login, clinic branding, theme, font, and options."/>

   <div className="tabs" role="tablist" aria-label="Settings sections">
     {[['profile','Profile'],['login','Login credentials'],['clinic','Appearance & clinic']].map(([k,l])=>
       <button
         key={k}
         type="button"
         role="tab"
         aria-selected={tab===k}
         className={tab===k?'active':''}
         onClick={()=>setTab(k)}
       >
         {l}
       </button>
     )}
   </div>

   {tab==='profile'&&(
     <div className="tab-panel">
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
           <Btn className="primary" loading={savingProfile} loadingText="Saving…" onClick={saveProfile}>Save profile</Btn>
           {saved&&<span className="pill success">Saved</span>}
         </div>
       </section>
     </div>
   )}

   {tab==='login'&&(
     <div className="tab-panel">
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
           <Btn className="primary" loading={savingLogin} loadingText="Updating…" onClick={saveLogin}>Update login</Btn>
           {loginSaved&&<span className="pill success">Updated</span>}
         </div>
       </section>
     </div>
   )}

   {tab==='clinic'&&(
     <div className="tab-panel">
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
           <Btn className="primary" loading={savingSettings} loadingText="Saving…" onClick={save}>Save settings</Btn>
           {saved&&<span className="pill success">Saved</span>}
         </div>
       </section>
     </div>
   )}
 </>;
}function App(){
  const[doctor,setDoctor]=useState(undefined),[setup,setSetup]=useState(false),[clinic,setClinic]=useState({});
  const lastActivity=useRef(Date.now());

  useEffect(()=>{
    api.get('/auth/clinic').then(setClinic).catch(()=>{});
  },[]);

  useEffect(()=>{
    api.get('/auth/status').then(x=>{
      if(x.setupRequired)setSetup(true);
      else api.get('/auth/me').then(x=>setDoctor(x.doctor)).catch(()=>setDoctor(null))
    }).catch(()=>setDoctor(null))
  },[]);

  useEffect(()=>{
    if(!doctor)return;

    const TIMEOUT=10*60*1000;
    const HEARTBEAT=2*60*1000;
    let timer;

    const logout=async()=>{
      try{await api.post('/auth/logout',{})}catch{}
      setDoctor(null);
    };

    const resetTimer=()=>{
      lastActivity.current=Date.now();
      clearTimeout(timer);
      timer=setTimeout(logout,TIMEOUT);
    };

    const events=['mousemove','mousedown','keydown','touchstart','scroll','click'];

    events.forEach(event=>
      window.addEventListener(event,resetTimer,{passive:true})
    );

    resetTimer();

    const heartbeat=setInterval(()=>{
      if(Date.now()-lastActivity.current<HEARTBEAT){
        api.get('/auth/me').then(x=>{
          if(x.doctor)setDoctor(x.doctor);
        }).catch(()=>setDoctor(null));
      }
    },HEARTBEAT);

    return()=>{
      clearTimeout(timer);
      clearInterval(heartbeat);
      events.forEach(event=>
        window.removeEventListener(event,resetTimer)
      );
    };
  },[doctor]);
if(doctor===undefined&&!setup)return <Loading/>;if(setup)return <Setup clinic={clinic} onLogin={d=>{setSetup(false);setDoctor(d)}}/>;if(!doctor)return <Routes><Route path="/forgot" element={<Forgot clinic={clinic}/>}/><Route path="/reset-password" element={<ResetPassword clinic={clinic}/>}/><Route path="*" element={<Login onLogin={setDoctor} clinic={clinic}/>}/></Routes>;return <Shell doctor={doctor} onLogout={async()=>{await api.post('/auth/logout',{});setDoctor(null)}}><Routes><Route path="/" element={<Dashboard clinic={clinic}/>}/><Route path="/patients" element={<Patients/>}/><Route path="/patients/new" element={<PatientForm/>}/><Route path="/patients/edit/:id" element={<PatientForm/>}/><Route path="/monthly" element={<Monthly/>}/><Route path="/doctors" element={doctor.role==='admin'?<Doctors/>:<Navigate to="/"/>}/><Route path="/backup" element={doctor.role==='admin'?<Backup/>:<Navigate to="/"/>}/><Route path="/notifications" element={doctor.role==='admin'?<NotificationsPage/>:<Navigate to="/"/>}/><Route path="/settings" element={doctor.role==='admin'?<SettingsPage/>:<Navigate to="/"/>}/><Route path="*" element={<Navigate to="/"/>}/></Routes></Shell>}
createRoot(document.getElementById('root')).render(<BrowserRouter><ToastProvider><App/></ToastProvider></BrowserRouter>);




