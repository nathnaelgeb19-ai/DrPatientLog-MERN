import React,{useEffect,useState,useRef,useCallback,lazy,Suspense}from'react';import{createRoot}from'react-dom/client';import{createPortal}from'react-dom';import{BrowserRouter,useNavigate,useLocation,Routes,Route,Link,Navigate}from'react-router-dom';import{LayoutDashboard,Users,UserRoundCog,CalendarDays,Settings,LogOut,Plus,Search,Menu,X,Stethoscope,ShieldCheck,ArrowUpRight,Trash2,Edit3,CheckCircle2,ReceiptText,ClipboardList,Database,Send,Download,Upload,RefreshCw,KeyRound,UserCog,Palette,Sun,Moon,Monitor,Bell,Clock,ChevronDown,ChevronLeft,ChevronRight,FileText,Eye,EyeOff,CornerDownLeft,Sparkles,TrendingUp,Activity,BarChart3,Check,Lock}from'lucide-react';import{api}from'./api';import{ethiopianDate,ETH_MONTHS,ethWeekday,ethMonthLength,ethPrevMonth,ethNextMonth}from'./ethiopian.js';import'./styles.css';import doctorLogo from './assets/aa-logo.svg';
const money=n=>`${Number(n||0).toFixed(2)} ETB`;
const EarningsChart=lazy(()=>import('./components/EarningsChart.jsx'));
function PageHead({title,subtitle,action}){return <div className="page-head"><div><p className="eyebrow">HAKIM</p><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>}
function Loading(){return <div className="loading"><div/><div/><div/></div>}
function Spinner(){return <span className="spinner" aria-hidden="true"/>}
function Btn({className='',loading=false,loadingText,children,disabled=false,...rest}){return <button className={loading?className+' is-loading':className} disabled={loading||disabled} aria-busy={loading?'true':undefined} {...rest}>{loading?<><Spinner/>{loadingText??children}</>:children}</button>}
function prefersReduced(){return typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches}
function Reveal({className='',delay=0,children,...rest}){const ref=useRef(null);useEffect(()=>{const el=ref.current;if(!el)return;if(prefersReduced()){el.classList.add('in');return}const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){el.classList.add('in');io.disconnect()}})},{threshold:.1,rootMargin:'0px 0px -40px 0px'});io.observe(el);return()=>io.disconnect()},[]);return <div ref={ref} className={('reveal '+className).trim()} style={{transitionDelay:`${delay}ms`}} {...rest}>{children}</div>}
function CountUp({value=0,format=v=>Math.round(v).toLocaleString(),duration=850}){const[n,setN]=useState(prefersReduced()?value:0);useEffect(()=>{if(prefersReduced()){setN(value);return}let raf,start;const tick=t=>{if(start===undefined)start=t;const p=Math.min(1,(t-start)/duration);setN(value*(1-Math.pow(1-p,3)));if(p<1)raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)},[value,duration]);return <>{format(n)}</>}
const ToastCtx=React.createContext(()=>{});
function ToastProvider({children}){const[items,setItems]=useState([]);const push=useCallback((message,type='success',opts={})=>{const id=Math.random().toString(36).slice(2);const item={id,message,type,title:opts.title,onClick:opts.onClick,duration:opts.duration||2800,position:opts.position||'bottom',className:opts.className};setItems(x=>[...x,item]);setTimeout(()=>setItems(x=>x.filter(i=>i.id!==id)),item.duration)},[]);const dismiss=id=>setItems(x=>x.filter(i=>i.id!==id));const renderItem=i=>{const warn=i.type==='warn';const err=i.type==='error';return <div key={i.id} className={'toast'+(err?' error':warn?' warn':'')+(i.onClick?' clickable':'')+(i.className?' '+i.className:'')} onClick={()=>{i.onClick&&i.onClick();dismiss(i.id)}}>{<span className="toast-icon">{err?<X size={15}/>:warn?<Bell size={15}/>:<Check size={15}/>}</span>}{(i.title||i.message)&&<div className="toast-body">{i.title&&<b className="toast-title">{i.title}</b>}<span className="toast-message">{i.message}</span></div>}<button type="button" className="toast-close" aria-label="Dismiss" onClick={e=>{e.stopPropagation();dismiss(i.id)}}><X size={14}/></button></div>};const top=items.filter(i=>i.position==='top');const bottom=items.filter(i=>i.position!=='top');return <ToastCtx.Provider value={push}>{children}{bottom.length>0&&<div className="toast-stack" role="status" aria-live="polite">{bottom.map(renderItem)}</div>}{top.length>0&&<div className="toast-stack top-right" role="status" aria-live="polite">{top.map(renderItem)}</div>}</ToastCtx.Provider>}
const useToast=()=>React.useContext(ToastCtx);
function Modal({open,onClose,title,subtitle,children}){useEffect(()=>{if(!open)return;const on=e=>e.key==='Escape'&&onClose();window.addEventListener('keydown',on);return()=>window.removeEventListener('keydown',on)},[open,onClose]);if(!open)return null;return createPortal(<div className="modal-overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal-panel" role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><div><h2>{title}</h2>{subtitle&&<p className="modal-sub">{subtitle}</p>}</div><button type="button" className="icon" aria-label="Close" onClick={onClose}><X size={18}/></button></div>{children}</div></div>,document.body)}
function Switch({checked,onChange,label}){return <label className="switch"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} aria-label={label}/><span className="track"/><span className="thumb"/></label>}
function ScrollProgress(){const ref=useRef(null);useEffect(()=>{let raf;const on=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const h=document.documentElement,max=h.scrollHeight-h.clientHeight;if(ref.current)ref.current.style.transform=`scaleX(${max>0?h.scrollTop/max:0})`})};window.addEventListener('scroll',on,{passive:true});window.addEventListener('resize',on);on();return()=>{window.removeEventListener('scroll',on);window.removeEventListener('resize',on)}},[]);return <div className="scroll-progress" ref={ref}/>}
function CommandPalette({open,onClose,nav}){const[q,setQ]=useState(''),[idx,setIdx]=useState(0),inputRef=useRef(null),go=useNavigate();useEffect(()=>{if(open){setQ('');setIdx(0);const t=setTimeout(()=>inputRef.current?.focus(),40);return()=>clearTimeout(t)}},[open]);const actions=nav.flatMap(([to,label,I])=>({label,to,icon:I}));const f=q.trim()?actions.filter(a=>a.label.toLowerCase().includes(q.toLowerCase())):actions;useEffect(()=>setIdx(0),[q]);const choose=a=>{if(!a)return;go(a.to);onClose()};if(!open)return null;return <div className="cmd-overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="cmd-panel" role="dialog" aria-modal="true" aria-label="Command palette"><div className="cmd-search"><Search size={18}/><input ref={inputRef} value={q} placeholder="Search pages and actions…" onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setIdx(i=>Math.min(i+1,f.length-1))}else if(e.key==='ArrowUp'){e.preventDefault();setIdx(i=>Math.max(i-1,0))}else if(e.key==='Enter'){e.preventDefault();choose(f[idx])}else if(e.key==='Escape'){e.preventDefault();onClose()}}}/><kbd>ESC</kbd></div><div className="cmd-list">{f.length?f.map((a,i)=><button key={a.to} className={'cmd-item'+(i===idx?' active':'')} onMouseEnter={()=>setIdx(i)} onClick={()=>choose(a)}><a.icon size={17}/><span>{a.label}</span>{i===idx&&<CornerDownLeft size={14}/>}</button>):<div className="cmd-empty">{`No matches for "${q}".`}</div>}</div></div></div>}
function Shell({doctor,onLogout,children,clinic}){
  const loc=useLocation();
  const[open,setOpen]=useState(false);
  const[loggingOut,setLoggingOut]=useState(false);
  const[theme,setTheme]=useState(()=>localStorage.getItem('hakim-theme')||'system');
  const[cmdOpen,setCmdOpen]=useState(false);
  const navRef=useRef(null);
  const[ind,setInd]=useState({top:0,height:0,show:false});
  const toast=useToast();
  const navigate=useNavigate();
  const remindSent=useRef(false);

  useEffect(()=>{
    if(remindSent.current)return;
    let cancelled=false;
    let idle;
    let timer;
    const load=()=>{
      if(cancelled||remindSent.current)return;
      api.get('/dashboard/monthly')
        .then(m=>{
          if(cancelled||remindSent.current)return;
          const pending=(m.months||[]).filter(x=>x.canClose&&!x.closed);
          if(!pending.length)return;
          remindSent.current=true;
          const total=pending.reduce((a,x)=>a+Number(x.payable||0),0);
          toast(
            pending.map(x=>`${x._id.month} ${x._id.year}: ${money(x.payable)}`).join('\n')+'\nTap to mark it paid and close the month.',
            'warn',
            {
              title:`Payment reminder: ${money(total)}`,
              className:'toast-reminder',
              duration:8000,
              position:'top',
              onClick:()=>navigate('/monthly')
            }
          );
        })
        .catch(()=>{});
    };
    if(typeof window!=='undefined'&&'requestIdleCallback' in window){
      idle=window.requestIdleCallback(load,{timeout:2500});
    }else{
      timer=setTimeout(load,1200);
    }
    return()=>{
      cancelled=true;
      if(idle!==undefined&&'cancelIdleCallback' in window)window.cancelIdleCallback(idle);
      if(timer)clearTimeout(timer);
    };
  },[]);

  const applyTheme=value=>{
    setTheme(value);
    localStorage.setItem('hakim-theme',value);

    if(value==='system'){
      document.documentElement.removeAttribute('data-theme');
    }else{
      document.documentElement.setAttribute('data-theme',value);
    }
  };

  useEffect(()=>{
    applyTheme(localStorage.getItem('hakim-theme')||'system');
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
    ['/balances','Outstanding Balances',ReceiptText],
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
  const bottom=[['/','Home',LayoutDashboard],['/patients','Patients',Users],['/patients/new','',Plus],['/balances','Balances',ReceiptText],['/monthly','Monthly',CalendarDays]];
  const isMac=typeof navigator!=='undefined'&&/Mac/i.test(navigator.platform||navigator.userAgent||'');

  return <div className="app">

    <aside className={open?'sidebar open':'sidebar'}>

      <div className="brand">
        <div className="logo">
          <Stethoscope size={22}/>
        </div>

        <div className="brand-copy">
          <b>Hakim</b>
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

    <div className="app-window">

    <header className="topbar">

      <ScrollProgress/>

      <Link to="/" className="brand" onClick={()=>setOpen(false)}>
        <div className="logo">
          <Stethoscope size={22}/>
        </div>
        <div className="brand-copy">
          <b>Hakim</b>
          <span>{clinic?.short||clinic?.name||'Clinical workspace'}</span>
        </div>
      </Link>

      <nav ref={navRef} className="topnav" aria-label="Primary">
        {main.map(([to,label,I])=>
          <Link
            key={to}
            to={to}
            className={loc.pathname===to?'active':''}
            aria-current={loc.pathname===to?'page':undefined}
            aria-label={label}
            title={label}
          >
            <span className="nav-icon"><I size={17}/></span>
            <span>{label}</span>
          </Link>
        )}

        {admin.length>0&&<React.Fragment>
          <span className="nav-divider" aria-hidden="true"/>
          {admin.map(([to,label,I])=>
            <Link
              key={to}
              to={to}
              className={loc.pathname===to?'active':''}
              aria-current={loc.pathname===to?'page':undefined}
              aria-label={label}
              title={label}
            >
              <span className="nav-icon"><I size={17}/></span>
              <span>{label}</span>
            </Link>
          )}
        </React.Fragment>}
      </nav>

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

        <button
          className="icon signout-button"
          aria-label="Sign out"
          title="Sign out"
          disabled={loggingOut}
          onClick={async()=>{
            setLoggingOut(true);
            try{
              await onLogout();
            }finally{
              setLoggingOut(false);
            }
          }}
        >
          {loggingOut?<Spinner/>:<LogOut size={18}/>}
        </button>

        <div className="mini-avatar" title={doctor.name}>{doctor.name?.[0]}</div>

      </div>

    </header>

    <main>

      <div className="content">
        <div className="route" key={loc.pathname}>
          {children}
        </div>
      </div>

    </main>

    </div>

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
      <div><b>Hakim</b>{clinic?.name&&<span>{clinic.name}</span>}</div>
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
    <footer>© {new Date().getFullYear()} Hakim · Secure clinical records</footer>
  </aside>
  <main className="auth-main">
    <div className="auth-card">{children}</div>
  </main>
</div>}
function Login({onLogin,clinic}){const[f,setF]=useState({username:'',password:''}),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[show,setShow]=useState(false);const nav=useNavigate();const go=async e=>{e.preventDefault();setBusy(true);try{await onLogin((await api.post('/auth/login',f)).doctor);nav('/',{replace:true})}catch(x){setErr(x.message)}finally{setBusy(false)}};return <AuthLayout clinic={clinic}>{(clinic?.short||clinic?.name)&&<p className="eyebrow brand">{clinic?.short||clinic?.name}</p>}<h1>Welcome back</h1><p className="sub">Sign in to your practice workspace.</p>{err&&<div className="error">{err}</div>}<form onSubmit={go}><label>Username<input autoComplete="username" required value={f.username} onChange={e=>setF({...f,username:e.target.value})}/></label><label>Password<span className="password-field"><input type={show?'text':'password'} autoComplete="current-password" required value={f.password} onChange={e=>setF({...f,password:e.target.value})}/><button type="button" className="password-toggle" title={show?'Hide password':'Show password'} aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button></span></label><Btn className="primary full" loading={busy} loadingText="Signing in…">Sign in <ArrowUpRight size={17}/></Btn></form><p className="auth-foot"><Link className="ghost full" to="/forgot">Forgot password?</Link></p></AuthLayout>}
function Setup({onLogin,clinic}){const[f,setF]=useState({name:'',username:'',password:'',email:''}),[err,setErr]=useState(''),[busy,setBusy]=useState(false);const nav=useNavigate();const go=async e=>{e.preventDefault();setBusy(true);try{await onLogin((await api.post('/auth/setup',f)).doctor);nav('/',{replace:true})}catch(x){setErr(x.message)}finally{setBusy(false)}};return <AuthLayout clinic={clinic} title="Set up your clinic workspace." subtitle="Create the first administrator account to get started." points={[[Sparkles,'One-time setup','Takes less than a minute.'],[ShieldCheck,'Secure from the start','Your data never leaves your server.'],[Users,'Ready for your team','Add doctors once you are in.']]}><p className="eyebrow">FIRST-TIME SETUP</p><h1>Create administrator</h1><p className="sub">Set up the first Hakim account.</p>{err&&<div className="error">{err}</div>}<form onSubmit={go}>{[['name','Full name'],['username','Username'],['email','Email'],['password','Password']].map(([k,l])=><label key={k}>{l}<input type={k==='password'?'password':'text'} required={k!=='email'} value={f[k]} onChange={e=>setF({...f,[k]:e.target.value})}/></label>)}<Btn className="primary full" loading={busy} loadingText="Creating account…">Create administrator</Btn></form></AuthLayout>}
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
     <p className="sub">Choose a new password for your Hakim account.</p>

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
}function PatientTable({rows,onEdit,onDelete,onDeleteTreatment,onNewTreatment,perTreatment=false,treatmentFilter=null}){
  const[deleting,setDeleting]=useState(null);
  const hasActions=!!(onEdit||onDelete||onDeleteTreatment||onNewTreatment);
  const items=[];
  (rows||[]).forEach(p=>{
    let list=perTreatment&&p.treatments&&p.treatments.length?p.treatments:[null];
    if(perTreatment&&treatmentFilter)list=list.filter(t=>treatmentFilter(t,p));
    if(!list.length)list=[null];
    list.forEach((t,i)=>items.push({key:String(p._id)+':'+(t?String(t._id??i):i),patient:p,treatment:t,isFirst:i===0,isOriginal:i===list.length-1}));
  });
  return <div className="table-wrap"><table>
<thead><tr><th scope="col">Patient</th><th scope="col">Card</th><th scope="col">Ticket</th><th scope="col">Procedure</th><th scope="col">Fee</th>{perTreatment&&<th scope="col">Paid</th>}{perTreatment&&<th scope="col">Balance</th>}<th scope="col">Cut</th>{hasActions&&<th scope="col">Actions</th>}</tr></thead>
<tbody>{items.length?items.map(it=>{
  const p=it.patient;
  const t=it.treatment;
  const procedure=t?t.procedure:p.procedure;
  const fee=t?Number(t.totalFee||0):Number(p.totalFee||0);
  const paid=t?Number(t.paidAmount||0):Number(p.paidAmount||0);
  const bal=t?Number(t.balance||0):Number(p.balance||0);
  const cut=t?Number(t.myEarning||0):Number(p.myEarning||0);
  return <tr key={it.key}>
<td>
  <b>{p.patientName}</b>
  <small>{perTreatment&&t?(t.ethDate||t.date||p.ethDate):p.ethDate}</small>
  <small>{p.createdAt?new Date(p.createdAt).toLocaleString():''}</small>
</td>
<td>{p.cardNumber||' '}</td>
<td>{(t&&t.ticketNo)||p.ticketNo||' '}</td>
<td>{procedure}</td>
<td>{money(fee)}{!perTreatment&&bal>0&&<span className="pill warn small" style={{marginLeft:6,fontSize:'10px'}} title="Outstanding balance">Bal: {money(bal)}</span>}</td>
{perTreatment&&<td>{money(paid)}</td>}
{perTreatment&&<td>{bal>0?<b style={{color:'var(--danger-text)'}}>{money(bal)}</b>:<span style={{color:'var(--muted)'}}>{money(0)}</span>}</td>}
<td><b>{money(cut)}</b></td>
{hasActions&&<td className="row-actions">
  <span className="row-actions-inner">
  {onEdit&&<button className="icon patient-row-action-edit" title="Edit patient" onClick={()=>onEdit(p)}>
    <Edit3 size={15}/>
    <span>Edit</span>
  </button>}

  {onNewTreatment&&<button className="icon patient-row-action-new" title="New treatment for this patient" onClick={()=>onNewTreatment(p)}>
    <Plus size={15}/>
    <span>Treatment</span>
  </button>}

  {onDeleteTreatment&&t&&<button className={'icon danger patient-row-action-delete patient-row-action-delete-treatment'+(deleting==='t:'+t._id?' is-loading':'')} title={`Delete treatment: ${procedure}`} disabled={deleting==='t:'+t._id} onClick={async()=>{setDeleting('t:'+t._id);try{await onDeleteTreatment(p,t)}finally{setDeleting(null)}}}>
    {deleting==='t:'+t._id?<Spinner/>:<Trash2 size={15}/>}
    <span>Del</span>
  </button>}

  {onDelete&&it.isOriginal&&<button className={'icon danger patient-row-action-delete patient-row-action-delete-patient'+(deleting==='p:'+p._id?' is-loading':'')} title={`Delete ${p.patientName} and all treatments`} disabled={deleting==='p:'+p._id} onClick={async()=>{setDeleting('p:'+p._id);try{await onDelete(p)}finally{setDeleting(null)}}}>
    {deleting==='p:'+p._id?<Spinner/>:<Trash2 size={15}/>}
    <span>Patient</span>
  </button>}
  </span>
</td>}
</tr>;
}):<tr><td colSpan={(perTreatment?8:6)+(hasActions?1:0)} className="empty">No records found.</td></tr>}</tbody></table></div>}
function Dashboard({clinic}){
  const[d,setD]=useState();
  const[err,setErr]=useState('');
  const[range,setRange]=useState('eth_month');
  const[months,setMonths]=useState([]);
  const[cal,setCal]=useState();
  const[calRef,setCalRef]=useState(null);
  const[calDay,setCalDay]=useState(null);
  const[calDayData,setCalDayData]=useState();

  useEffect(()=>{
    setErr('');
    api.get('/dashboard?range='+range)
      .then(setD)
      .catch(e=>setErr(e.message||'Unable to load dashboard.'));
  },[range]);

  useEffect(()=>{
    api.get('/dashboard/monthly')
      .then(m=>setMonths(m.months||[]))
      .catch(()=>{});
  },[]);

  useEffect(()=>{
    api.get('/dashboard/calendar'+(calRef?`?month=${encodeURIComponent(ETH_MONTHS[calRef.monthIndex-1])}&year=${calRef.year}`:''))
      .then(setCal).catch(()=>{});
  },[calRef]);

  useEffect(()=>{
    if(!cal||!calDay){setCalDayData(undefined);return;}
    api.get(`/dashboard/calendar?month=${encodeURIComponent(cal.month)}&year=${cal.year}&day=${calDay}`)
      .then(setCalDayData)
      .catch(()=>setCalDayData(undefined));
  },[cal,calDay]);

  if(err)return <div className="error">{err}</div>;
  if(!d)return <Loading/>;
  const income=Number(d.rangeIncome||0);
  const earnings=Number(d.rangeCut||0);
  const earningPct=income>0?Math.min(100,(earnings/income)*100):0;
  const trend=[...months].reverse().slice(-7);
  const trendMax=Math.max(1,...trend.map(m=>Number(m.payable||0)));
  const rangeLabel=({today:'Today',week:'Last 7 days',eth_month:'This Ethiopian month',all:'All time'})[range]||range;
  const calWeekdays=['እሁድ','ሰኞ','ማክሰ','ረቡዕ','ሐሙስ','ዓርብ','ቅዳሜ'];
  const calLen=cal?ethMonthLength(cal.year,cal.monthIndex):30;
  const calStart=cal?ethWeekday(cal.year,cal.monthIndex,1):0;
  const calVisit=cal?Object.fromEntries(cal.days.map(x=>[x.day,x])):{};
  const calIsCurrent=!!(cal&&d&&cal.month===d.ethToday.month&&cal.year===d.ethToday.year);
  const stepCal=n=>{if(!cal)return;setCalDay(null);setCalRef(n<0?ethPrevMonth(cal.monthIndex,cal.year):ethNextMonth(cal.monthIndex,cal.year));};
  const todayCal=()=>{setCalDay(null);setCalRef(null);};
  const pickDay=day=>setCalDay(cur=>cur===day?null:day);

  return <>
    <Reveal>
      <section className="hero">
        <div className="hero-row">
          <div>
            {(clinic?.short||clinic?.name)&&<p className="eyebrow brand">{clinic?.short||clinic?.name}</p>}
            <h1>Welcome back</h1>
            <p>{d.ethToday.month} {d.ethToday.day}, {d.ethToday.year} · Here is what's happening across your practice.</p>
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

    <div className="dashboard-main-grid">

      <div className="dashboard-main-col">

    <Reveal>
      <div className="dashboard-pulse">
        <div className="pulse-cell pulse-cell-accent">
          <span>Today's earnings</span>
          <strong><CountUp value={d.todayCut} format={v=>money(v)}/></strong>
        </div>
        <div className="pulse-cell">
          <span>Doctor earnings</span>
          <strong><CountUp value={d.rangeCut} format={v=>money(v)}/></strong>
        </div>
        <div className="pulse-cell">
          <span>Clinic income</span>
          <strong><CountUp value={d.rangeIncome} format={v=>money(v)}/></strong>
        </div>
        <div className="pulse-cell">
          <span>Visits</span>
          <strong><CountUp value={d.count}/></strong>
        </div>
        <div className="pulse-cell">
          <span>Outstanding balance</span>
          <strong style={{color:Number(d.outstanding)>0?'var(--danger-text)':'inherit'}}>
            <CountUp value={d.outstanding} format={v=>money(v)}/>
          </strong>
        </div>
        <div className="pulse-share">
          <div className="pulse-share-head">
            <span>Your share</span>
            <b>{earningPct.toFixed(1)}%</b>
          </div>
          <div className="dashboard-bar">
            <div style={{width:`${earningPct}%`}}/>
          </div>
          <small>{money(earnings)} of {money(income)}</small>
        </div>
      </div>
    </Reveal>

      <Reveal>
        <section className="card dashboard-overview-card">
          <div className="section-head">
            <div>
              <span className="dashboard-kicker">Analytics</span>
              <h2>Earnings trend</h2>
              <p>Doctor earnings by Ethiopian month</p>
            </div>
            <span className="pill"><TrendingUp size={13}/> Based on recorded visits</span>
          </div>

          {trend.length
            ?<>
              <div className="ref-chart" role="img" aria-label="Doctor earnings by month">
                {trend.map(m=>{
                  const value=Math.round(Number(m.payable||0));
                  const h=Math.max(6,Math.round((value/trendMax)*100));
                  return <div className="ref-chart-col" key={m._id.month+m._id.year}>
                    <div className="ref-bar-track">
                      <div
                        className={m.isCurrent?'ref-bar':'ref-bar muted'}
                        style={{height:`${h}%`}}
                        data-label={`${m._id.month} ${m._id.year}: ${money(value)}`}
                      />
                    </div>
                    <span className="ref-chart-label">{m._id.month.slice(0,3)} {String(m._id.year).slice(-2)}</span>
                  </div>;
                })}
              </div>

              <div className="ref-legend">
                <span><i/>Current month</span>
                <span><i className="is-muted"/>Earlier months</span>
              </div>
            </>
            :<div className="empty-state">
              <div className="empty-illustration"><BarChart3 size={26}/></div>
              <b>No monthly data yet</b>
              <p>Monthly earnings will appear here once visits are recorded.</p>
            </div>}
        </section>
      </Reveal>

      </div>

      <div className="dashboard-side">

        <Reveal delay={70}>
          <section className="card dashboard-cal-card">
            <div className="section-head">
              <div>
                <span className="dashboard-kicker">Calendar</span>
                <h2>{cal?`${cal.month} ${cal.year}`:'Loading…'}</h2>
                <p>Ethiopian month · visits per day</p>
              </div>
              <div className="cal-nav">
                {calRef&&<button type="button" className="ghost cal-today" onClick={todayCal}>Today</button>}
                <button type="button" className="icon" aria-label="Previous month" onClick={()=>stepCal(-1)} disabled={!cal}><ChevronLeft size={17}/></button>
                <button type="button" className="icon" aria-label="Next month" onClick={()=>stepCal(1)} disabled={!cal}><ChevronRight size={17}/></button>
              </div>
            </div>

            <div className="cal">
              <div className="cal-week">
                {calWeekdays.map(w=><span key={w}>{w}</span>)}
              </div>
              <div className="cal-grid">
                {Array.from({length:calStart},(_,i)=><span key={'b'+i} className="cal-cell cal-blank"/>)}
                {Array.from({length:calLen},(_,i)=>{
                  const day=i+1;
                  const v=calVisit[day];
                  const isToday=calIsCurrent&&d&&d.ethToday.day===day;
                  return <button type="button" key={day}
                    className={'cal-cell'+(isToday?' is-today':'')+(v?' has-visits':'')+(calDay===day?' is-selected':'')}
                    onClick={()=>pickDay(day)}
                    aria-pressed={calDay===day}
                    aria-label={`${cal?cal.month:''} ${day}, ${cal?cal.year:''}${v?` · ${v.count} payment${v.count>1?'s':''}`:' · no payments'}`}>
                    <span className="cal-num">{day}</span>
                    {v&&<i className="cal-dot"/>}
                  </button>;
                })}
              </div>
            </div>

            <div className="dashboard-finance-summary cal-summary">
              <div>
                <span>Payments this month</span>
                <b>{cal?cal.totalVisits:0}</b>
              </div>
              <div>
                <span>Clinic income</span>
                <b>{money(cal?cal.totalIncome:0)}</b>
              </div>
            </div>
          </section>
        </Reveal>

      </div>

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

    <Modal open={!!calDay} onClose={()=>setCalDay(null)}
      title={calDay&&cal?`${cal.month} ${calDay}, ${cal.year}`:'Visits'}
      subtitle={calDayData?`${calDayData.count} payment${calDayData.count===1?'':'s'} · clinic income ${money(calDayData.income)}`:'Loading…'}>
      {calDayData
        ? (calDayData.patients.length
          ? <ul className="cal-list cal-list-modal">
              {calDayData.patients.map((p,idx)=><li key={`${p._id||''}|${p.treatmentId||''}|${p.ethDate||''}|${p.amount??''}|${idx}`}>
                <div className="cal-list-main">
                  <b>{p.patientName}</b>
                  <span>{p.procedure||'—'}{p.cardNumber?` · ${p.cardNumber}`:''}</span>
                </div>
                <div className="cal-list-fig">
                  <b>{money(p.totalFee)}</b>
                  <span>{money(p.myEarning)}</span>
                </div>
              </li>)}
            </ul>
          : <div className="cal-empty">No payments recorded on this date.</div>)
        : <div className="cal-empty">Loading…</div>}
    </Modal>
  </>
}
function Patients(){
  const nav=useNavigate();
  const[rows,setRows]=useState([]);
  const[q,setQ]=useState('');
  const[from,setFrom]=useState('');
  const[to,setTo]=useState('');
  const[balance,setBalance]=useState('');
  const[busy,setBusy]=useState('');
  const[hideFilters,setHideFilters]=useState(false);
  const lastScrollY=useRef(0);

  useEffect(()=>{
    let ticking=false;
    const onScroll=()=>{
      if(ticking)return;
      ticking=true;
      requestAnimationFrame(()=>{
        const y=window.scrollY;
        const delta=y-lastScrollY.current;
        const threshold=window.innerHeight*.5;
        if(Math.abs(delta)>12){
          setHideFilters(delta>0&&y>threshold);
          lastScrollY.current=y;
        }
        ticking=false;
      });
    };
    window.addEventListener('scroll',onScroll,{passive:true});
    return()=>window.removeEventListener('scroll',onScroll);
  },[]);

  const buildQuery=(over={})=>{
    const v=k=>over[k]!==undefined?over[k]:{q,from,to,balance}[k];
    return `/patients?q=${encodeURIComponent(v('q'))}&from=${v('from')}&to=${v('to')}&balance=${v('balance')}`;
  };

  const load=(over={})=>{
    setBusy('search');
    return api.get(buildQuery(over)).then(setRows).finally(()=>setBusy(''));
  };

  const changeBalance=value=>{
    setBalance(value);
    load({balance:value});
  };

  useEffect(()=>{
    load();
  },[]);

  const clearFilters=()=>{
    setQ('');
    setFrom('');
    setTo('');
    setBalance('');
    setBusy('clear');
    api.get('/patients?q=&from=&to=&balance=').then(setRows).finally(()=>setBusy(''));
  };

  const del=async r=>{
    const count=(r.treatments&&r.treatments.length)||1;
    if(confirm(`Delete ${r.patientName}${count>1?` and all ${count} treatments`:''}? This cannot be undone.`)){
      await api.del('/patients/'+r._id);
      load();
    }
  };

  const delTreatment=async(r,t)=>{
    if(!t)return;
    const label=t.procedure||'this treatment';
    if(!confirm(`Delete the treatment "${label}" for ${r.patientName}? This cannot be undone.`))return;
    try{
      await api.del('/patients/'+r._id+'/treatments/'+t._id);
      load();
    }catch(e){
      alert(e.message||'Unable to delete treatment.');
    }
  };

  const totalFees=rows.reduce((a,r)=>a+Number(r.totalFee||0),0);
  const totalCut=rows.reduce((a,r)=>a+Number(r.myEarning||0),0);
  const totalBal=rows.reduce((a,r)=>a+Number(r.balance||0),0);
  const activeFilters=!!(q.trim()||from||to||balance);
  const treatmentFilter=balance==='due'
    ?t=>Number(t.balance||0)>0
    :balance==='paid'
      ?t=>Number(t.balance||0)<=0
      :null;

  return <>
    <PageHead
      title="Patients"
      subtitle="Search, filter and manage patient records"
      action={
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <Link className="ghost" to="/balances">
            <ReceiptText size={16}/>
            Balances
          </Link>
          <Link className="primary patients-new-button" to="/patients/new">
            <Plus size={18}/>
            New patient
          </Link>
        </div>
      }
    />

    <section className="patients-workspace">

      <div className={'patients-toolbar'+(hideFilters?' filters-hidden':'')}>

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
          <label>Balance</label>
          <select value={balance} onChange={e=>changeBalance(e.target.value)}>
            <option value="">All patients</option>
            <option value="due">With outstanding balance</option>
            <option value="paid">Fully settled</option>
          </select>
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

        {totalBal>0&&(
          <div>
            <span>Outstanding</span>
            <strong style={{color:'var(--danger-text)'}}>{money(totalBal)}</strong>
          </div>
        )}

        <div className="patients-summary-note">
          {activeFilters?'Filters active':'Showing recorded visits'}
        </div>
      </div>

      <div className="patients-table-wrap">
        <PatientTable
          rows={rows}
          perTreatment
          treatmentFilter={treatmentFilter}
          onEdit={r=>window.location.href='/patients/edit/'+r._id}
          onNewTreatment={r=>nav('/patients/'+r._id+'/treatment/new')}
          onDelete={del}
          onDeleteTreatment={delTreatment}
        />
      </div>

    </section>
  </>
}
function PatientForm(){
  const nav=useNavigate();
  const loc=useLocation();
  const addingTreatment=loc.pathname.includes('/treatment/new');
  const editing=loc.pathname.includes('/edit/');
  const id=addingTreatment?loc.pathname.split('/')[2]:loc.pathname.split('/').pop();

  const makeTreatment=(initial={})=>({
    id:Math.random().toString(36).slice(2,9),
    _id:initial._id,
    date:initial.date||'',
    ethDate:initial.ethDate||'',
    ticketNo:initial.ticketNo||'',
    procedure:initial.procedure||'',
    totalFee:initial.totalFee!=null?initial.totalFee:'',
    paymentType:initial.paymentType||(Number(initial.balance||0)>0?'partial':'full'),
    paidToday:initial.paidToday!=null?initial.paidToday:(initial.paidAmount!=null?initial.paidAmount:(initial.totalFee!=null?initial.totalFee:'')),
    balance:Number(initial.balance||0),
    payments:initial.payments||[]
  });

  const[f,setF]=useState({
    gregDate:new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Addis_Ababa'}),
    ethDate:'',
    patientName:'',
    firstName:'',
    lastName:'',
    cardNumber:'',
    ticketNo:'',
    doctorPct:4
  });

  const[treatments,setTreatments]=useState([makeTreatment()]);
  const[baseTreatments,setBaseTreatments]=useState([]);
  const[presets,setPresets]=useState([]);
  const[err,setErr]=useState('');
  const[busy,setBusy]=useState(false);
  const[sugBusy,setSugBusy]=useState(null);

  useEffect(()=>{
    api.get('/patients/presets/list').then(setPresets);

    if(editing||addingTreatment){
      api.get('/patients/'+id).then(p=>{
        const parts=(p.patientName||'').trim().split(/\s+/);
        const today=new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Addis_Ababa'});
        setF({
          ...p,
          gregDate:addingTreatment?today:(p.gregDate||today),
          ethDate:addingTreatment?'':p.ethDate,
          firstName:parts[0]||'',
          lastName:parts.slice(1).join(' '),
          doctorPct:p.doctorPct??4
        });
        if(addingTreatment){
          setBaseTreatments([...(p.treatments||[])].reverse());
          setTreatments([makeTreatment({date:today})]);
        }else if(p.treatments&&p.treatments.length){
          setTreatments([...p.treatments].reverse().map(t=>makeTreatment({
            _id:t._id,
            date:t.date,
            ethDate:t.ethDate,
            ticketNo:t.ticketNo,
            procedure:t.procedure,
            totalFee:t.totalFee,
            paymentType:t.paymentType||(Number(t.balance||0)>0?'partial':'full'),
            paidToday:t.paidAmount!=null?t.paidAmount:t.totalFee,
            balance:Number(t.balance||0),
            payments:t.payments||[]
          })));
        }else{
          setTreatments([makeTreatment({
            _id:p._id,
            date:p.gregDate,
            ethDate:p.ethDate,
            ticketNo:p.ticketNo,
            procedure:p.procedure,
            totalFee:p.totalFee,
            paymentType:Number(p.balance||0)>0?'partial':'full',
            paidToday:p.paidAmount!=null?p.paidAmount:(Number(p.balance||0)>0?p.totalFee-p.balance:p.totalFee),
            balance:Number(p.balance||0),
            payments:[]
          })]);
        }
      });
    }
  },[id,editing,addingTreatment]);

  const set=(k,v)=>setF(x=>({...x,[k]:v}));

  useEffect(()=>{
    if(f.gregDate){
      try{
        set('ethDate',ethiopianDate(f.gregDate));
      }catch{}
    }
  },[f.gregDate]);

  const updateTreatment=(idx,k,v)=>{
    setTreatments(prev=>{
      const next=[...prev];
      const cur={...next[idx],[k]:v};
      if(k==='paymentType'){
        if(v==='full'){
          cur.paidToday=cur.totalFee;
          cur.balance=0;
        }else{
          if(cur.paidToday===cur.totalFee){
            cur.paidToday='';
          }
          const fee=Number(cur.totalFee||0);
          const paid=Number(cur.paidToday||0);
          cur.balance=Math.max(0,Number((fee-paid).toFixed(2)));
        }
      }else if(k==='totalFee'){
        const fee=Number(v||0);
        if(cur.paymentType==='full'){
          cur.paidToday=v;
          cur.balance=0;
        }else{
          const paid=Number(cur.paidToday||0);
          cur.balance=Math.max(0,Number((fee-paid).toFixed(2)));
        }
      }else if(k==='paidToday'){
        const fee=Number(cur.totalFee||0);
        const paid=Number(v||0);
        cur.balance=Math.max(0,Number((fee-paid).toFixed(2)));
      }
      next[idx]=cur;
      return next;
    });
  };

  const addTreatment=()=>{
    setTreatments(prev=>[...prev,makeTreatment()]);
  };

  const removeTreatment=idx=>{
    if(treatments.length<=1)return;
    setTreatments(prev=>prev.filter((_,i)=>i!==idx));
  };

  const suggest=async idx=>{
    const item=treatments[idx];
    if(!item.procedure?.trim()){
      alert('Please enter or select a procedure first');
      return;
    }
    setSugBusy(idx);
    try{
      const x=await api.get(
        '/patients/suggest-fee?procedure='+encodeURIComponent(item.procedure)
      );
      if(x.fee!=null){
        updateTreatment(idx,'totalFee',x.fee);
      }else{
        alert('No preset fee for this procedure');
      }
    }finally{
      setSugBusy(null);
    }
  };

  const totalFee=Number(treatments.reduce((sum,t)=>sum+Number(t.totalFee||0),0).toFixed(2));
  const totalPaidToday=Number(treatments.reduce((sum,t)=>sum+Number(t.paidToday||0),0).toFixed(2));
  const totalBalance=Number(treatments.reduce((sum,t)=>sum+Number(t.balance||0),0).toFixed(2));
  const doctorEarning=Math.round(totalPaidToday*Number(f.doctorPct||0))/100;
  const pct=Number(f.doctorPct||0);
  const treatmentOffset=addingTreatment?baseTreatments.length:0;
  const treatmentNo=i=>`Treatment #${treatmentOffset+i+1}`;
  const breakdownRows=treatments
    .filter(t=>t.procedure.trim()||Number(t.totalFee)>0)
    .map((t,i)=>({
      key:t.id||('breakdown'+i),
      procedure:t.procedure.trim()||treatmentNo(i),
      ticket:(t.ticketNo||'').trim(),
      fee:Number(t.totalFee||0),
      received:Number(t.paidToday||0),
      balance:Number(t.balance||0),
      existing:!!t._id
    }));

  const fullName=[f.firstName,f.lastName].filter(Boolean).join(' ').trim();

  const nextOnEnter=e=>{
    if(e.key!=='Enter'||e.shiftKey||e.altKey||e.ctrlKey||e.metaKey)return;
    const t=e.target;
    if(!t||t.tagName!=='INPUT')return;
    const fields=[...e.currentTarget.querySelectorAll('input')].filter(el=>!el.disabled&&!el.readOnly);
    const i=fields.indexOf(t);
    if(i>-1&&i<fields.length-1){e.preventDefault();fields[i+1].focus();}
  };

  const save=async e=>{
    e.preventDefault();
    setBusy(true);
    setErr('');

    try{
      const validTreatments=treatments.filter(t=>t.procedure.trim()||Number(t.totalFee)>0);
      if(!validTreatments.length){
        throw new Error('Please add at least one treatment procedure.');
      }
      for(let i=0;i<validTreatments.length;i++){
        const t=validTreatments[i];
        if(!t.procedure.trim()){
          throw new Error(`${treatmentNo(i)} requires a procedure name.`);
        }
        if(t.totalFee===''||isNaN(Number(t.totalFee))||Number(t.totalFee)<0){
          throw new Error(`${treatmentNo(i)} requires a valid fee.`);
        }
        if(t.paymentType==='partial'){
          const paid=Number(t.paidToday||0);
          if(paid>Number(t.totalFee)){
            throw new Error(`${treatmentNo(i)}: Amount paid today cannot exceed treatment fee.`);
          }
        }
      }

      const data={
        ...f,
        patientName:fullName,
        doctorPct:Number(f.doctorPct||4),
        totalFee,
        myEarning:doctorEarning,
        paidAmount:totalPaidToday,
        balance:totalBalance,
        procedure:validTreatments.map(t=>t.procedure.trim()).join(', '),
        treatments:[
          ...(addingTreatment?baseTreatments.map(bt=>({
            _id:bt._id,
            date:bt.date,
            ethDate:bt.ethDate,
            ticketNo:bt.ticketNo,
            procedure:bt.procedure,
            totalFee:Number(bt.totalFee||0),
            doctorPct:Number(bt.doctorPct||f.doctorPct||4),
            paymentType:bt.paymentType,
            paidToday:Number(bt.paidAmount||0),
            paidAmount:Number(bt.paidAmount||0),
            balance:Number(bt.balance||0),
            payments:bt.payments||[]
          })):[]),
          ...validTreatments.map(t=>({
            _id:t._id,
            date:t.date||f.gregDate,
            ethDate:t.ethDate||f.ethDate,
            ticketNo:(t.ticketNo||'').trim(),
            procedure:t.procedure.trim(),
            totalFee:Number(t.totalFee||0),
            doctorPct:Number(f.doctorPct||4),
            myEarning:Math.round(Number(t.paidToday||0)*Number(f.doctorPct||4))/100,
            paymentType:t.paymentType,
            paidToday:Number(t.paidToday||0),
            paidAmount:Number(t.paidToday||0),
            balance:Number(t.balance||0),
            payments:t.payments||[]
          }))
        ]
      };

      await((editing||addingTreatment)?api.put('/patients/'+id,data):api.post('/patients',data));
      nav('/patients');
    }catch(x){
      setErr(x.message);
    }finally{
      setBusy(false);
    }
  };

  return <>
    <PageHead
      title={addingTreatment?'New treatment':editing?'Edit patient':'New patient'}
      subtitle={addingTreatment?`Record an additional treatment for ${fullName||'this patient'}.`:editing?'Update the patient visit record.':'Record a new patient visit.'}
    />

    <div className="patient-form-layout">

      <form className="patient-form-card" onSubmit={save} onKeyDown={nextOnEnter}>
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

            <label>
              <span>First name</span>
              <input
                required
                placeholder="First name"
                value={f.firstName||''}
                readOnly={addingTreatment}
                className={addingTreatment?'input-readonly-soft':undefined}
                onChange={e=>set('firstName',e.target.value)}
              />
            </label>

            <label>
              <span>Last name <em>Optional</em></span>
              <input
                placeholder="Last name"
                value={f.lastName||''}
                readOnly={addingTreatment}
                className={addingTreatment?'input-readonly-soft':undefined}
                onChange={e=>set('lastName',e.target.value)}
              />
            </label>

            <label>
              <span>Card number</span>
              <input
                required={!addingTreatment}
                placeholder="Patient card number"
                value={f.cardNumber||''}
                readOnly={addingTreatment}
                className={addingTreatment?'input-readonly-soft':undefined}
                onChange={e=>set('cardNumber',e.target.value)}
              />
            </label>

          </div>
        </div>

        <div className="patient-form-divider"/>

        <div className="patient-form-section">
          <div className="patient-form-heading">
            <div className="patient-form-number">02</div>
            <div>
              <h2>Treatments</h2>
              <p>Procedures, pricing, payment terms &amp; outstanding balances</p>
            </div>
          </div>

          <div className="treatments-stack">
            {treatments.map((t,idx)=>(
              <div key={t.id||idx} className="treatment-item-card">
                <div className="treatment-item-header">
                  <div className="treatment-item-title">
                    <span className="treatment-item-pill">{treatmentNo(idx)}</span>
                    {t.procedure&&<span className="treatment-item-name">{t.procedure}</span>}
                  </div>
                  {treatments.length>1&&(
                    <button
                      type="button"
                      className="icon danger treatment-remove-btn"
                      title="Remove treatment"
                      onClick={()=>removeTreatment(idx)}
                    >
                      <Trash2 size={15}/>
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="patient-form-grid">
                  <label className="patient-form-wide">
                    <span>Procedure</span>
                    <input
                      list="presets"
                      required
                      placeholder="Select or enter procedure"
                      value={t.procedure||''}
                      onChange={e=>updateTreatment(idx,'procedure',e.target.value)}
                    />
                  </label>

                  <label>
                    <span>Ticket number <em>Optional</em></span>
                    <input
                      placeholder="Ticket number"
                      value={t.ticketNo||''}
                      onChange={e=>updateTreatment(idx,'ticketNo',e.target.value)}
                    />
                  </label>

                  <label>
                    <span>Price (ETB)</span>
                    <div className="patient-price-field">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="0.00"
                        value={t.totalFee??''}
                        onChange={e=>updateTreatment(idx,'totalFee',e.target.value)}
                      />
                      <Btn
                        type="button"
                        className="patient-suggest-button"
                        loading={sugBusy===idx}
                        loadingText="…"
                        onClick={()=>suggest(idx)}
                      >
                        Suggest
                      </Btn>
                    </div>
                  </label>

                  <label>
                    <span>Payment type</span>
                    <div className="payment-type-selector">
                      <button
                        type="button"
                        className={'payment-type-btn'+(t.paymentType==='full'?' active':'')}
                        onClick={()=>updateTreatment(idx,'paymentType','full')}
                      >
                        Full Payment
                      </button>
                      <button
                        type="button"
                        className={'payment-type-btn'+(t.paymentType==='partial'?' active':'')}
                        onClick={()=>updateTreatment(idx,'paymentType','partial')}
                      >
                        Partial Payment
                      </button>
                    </div>
                  </label>

                  {t.paymentType==='partial'?(
                    <label>
                      <span>Amount received (ETB)</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={t.totalFee||undefined}
                        placeholder="0.00"
                        value={t.paidToday??''}
                        title={t._id?'Total received for this treatment. Changing it replaces the recorded amount.':'Initial payment received today'}
                        onChange={e=>updateTreatment(idx,'paidToday',e.target.value)}
                      />
                    </label>
                  ):(
                    <label>
                      <span>Amount received (ETB)</span>
                      <input
                        value={t.totalFee?`${money(t.totalFee)} (Full)`:'0.00 ETB'}
                        readOnly
                        className="input-readonly-soft"
                      />
                    </label>
                  )}

                  <div className="treatment-balance-badge-wrap">
                    <span>Outstanding balance</span>
                    <div className={'treatment-balance-badge'+(t.balance>0?' has-balance':'')}>
                      {t.balance>0?(
                        <>
                          <span className="balance-dot"/>
                          <strong>{money(t.balance)}</strong>
                          <small>Pending later settlement</small>
                        </>
                      ):(
                        <>
                          <Check size={14} className="balance-check"/>
                          <span>Fully paid (0.00 ETB)</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="ghost add-treatment-btn"
            onClick={addTreatment}
          >
            <Plus size={16}/>
            <span>Add another treatment</span>
          </button>

          <datalist id="presets">
            {presets.map(p=>(
              <option key={p._id} value={p.procedure}/>
            ))}
          </datalist>

          <div className="patient-form-divider"/>

          <div className="patient-form-grid">
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

          <div className="patient-earnings-text">
            <span>Your earnings</span>
            <small>
              {Number(f.doctorPct||0).toFixed(1)}% of the amount received
            </small>
          </div>

          <strong>{money(doctorEarning)}</strong>
        </div>
      </form>

      <aside className="patient-summary">
        <h3>{fullName||(addingTreatment?'New treatment':editing?'Editing record':'New visit')}</h3>
        <p className="summary-sub">{treatments.map(t=>t.procedure).filter(Boolean).join(', ')||'Fill in the treatment details to preview the summary.'}</p>

        {addingTreatment&&baseTreatments.length>0&&(
          <div className="patient-existing-treatments">
            <span className="patient-existing-title">Existing treatments (unchanged)</span>
            <div className="patient-existing-list">
              {baseTreatments.map((bt,bi)=>(
                <div key={bt._id||bi} className="patient-existing-item">
                  <b>{bt.procedure}</b>
                  <small>{bt.ticketNo?`Ticket #${bt.ticketNo} · `:''}Fee {money(bt.totalFee)} · Received {money(bt.paidAmount)} · Balance {money(bt.balance)}</small>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="summary-rows">
          <div className="summary-row"><span>Patient</span><b>{fullName||'—'}</b></div>
          <div className="summary-row"><span>Date</span><b>{f.ethDate||f.gregDate||'—'}</b></div>
          <div className="summary-row"><span>Card</span><b>{f.cardNumber||'—'}</b></div>
          <div className="summary-row"><span>Treatments</span><b>{treatments.filter(t=>t.procedure.trim()).length||1}</b></div>
          <div className="summary-row"><span>Doctor cut</span><b>{Number(f.doctorPct||0).toFixed(1)}%</b></div>
        </div>

        {breakdownRows.length>0&&(
          <div className="patient-breakdown">
            <span className="patient-existing-title">Per-treatment breakdown</span>
            <div className="patient-breakdown-list">
              {breakdownRows.map(r=>(
                <div key={r.key} className="patient-breakdown-item">
                  <div className="patient-breakdown-head">
                    <div className="patient-breakdown-title">
                      <b>{r.procedure}</b>
                      {r.ticket&&<span className="patient-breakdown-ticket">Ticket #{r.ticket}</span>}
                    </div>
                    {r.existing&&<span className="patient-breakdown-tag">recorded</span>}
                  </div>
                  <div className="patient-breakdown-money">
                    <span>Fee <b>{money(r.fee)}</b></span>
                    <span>Received <b>{money(r.received)}</b></span>
                    <span>Balance <b style={{color:r.balance>0?'var(--danger-text)':'inherit'}}>{money(r.balance)}</b></span>
                    <span>Earnings <b>{money(Math.round(r.received*pct)/100)}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="summary-rows">
          <div className="summary-row"><span>Total fee</span><b>{money(totalFee)}</b></div>
          <div className="summary-row"><span>Total received</span><b>{money(totalPaidToday)}</b></div>
          <div className="summary-row">
            <span>Outstanding balance</span>
            <b style={{color:totalBalance>0?'var(--danger-text)':'inherit'}}>
              {money(totalBalance)}
            </b>
          </div>

          <div className="summary-divider"/>

          <div className="summary-total">
            <span>Your earnings</span>
            <strong>{money(doctorEarning)}</strong>
          </div>
        </div>

        {totalBalance>0&&(
          <div className="patient-balance-notice">
            {money(totalBalance)} balance will be tracked in Outstanding Balances
          </div>
        )}

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

          <Btn className="primary patient-save-button" loading={busy} loadingText={addingTreatment?'Adding…':editing?'Updating…':'Saving…'} disabled={busy} type="submit" onClick={save}>
            <CheckCircle2 size={18}/>
            {addingTreatment?'Add treatment':editing?'Update record':'Save patient record'}
          </Btn>
        </div>
      </aside>

    </div>
  </>
}

function ReceivePaymentModal({patient,treatment,onClose,onSuccess}){
  const[amount,setAmount]=useState('');
  const[date,setDate]=useState(()=>new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Addis_Ababa'}));
  const[note,setNote]=useState('');
  const[ticketNo,setTicketNo]=useState(()=>treatment.ticketNo||patient.ticketNo||'');
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState('');
  const ref=useRef(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`);

  const bal=Number(treatment.balance||0);
  const numAmount=Number(amount||0);
  const newBalance=Math.max(0,Number((bal-numAmount).toFixed(2)));

  const payFull=()=>setAmount(bal.toFixed(2));

  const submit=async e=>{
    e.preventDefault();
    if(numAmount<=0){
      setErr('Payment amount must be greater than 0.');
      return;
    }
    if(numAmount>bal+0.001){
      setErr(`Payment cannot exceed the outstanding balance (${money(bal)}).`);
      return;
    }
    setBusy(true);
    setErr('');
    try{
      const res=await api.post(`/patients/${patient._id}/treatments/${treatment._id}/pay`,{
        amount:numAmount,
        date,
        ethDate:ethiopianDate(date),
        ticketNo:ticketNo.trim(),
        note:note.trim(),
        ref:ref.current
      });
      onSuccess(res.patient);
    }catch(x){
      if(/already recorded/i.test(x.message||'')){
        onSuccess();
        return;
      }
      setErr(x.message||'Payment recording failed.');
    }finally{
      setBusy(false);
    }
  };

  return <Modal
    open={true}
    onClose={onClose}
    title="Receive payment"
    subtitle={`${treatment.procedure} · ${patient.patientName}`}
  >
    <form onSubmit={submit}>
      {err&&<div className="error">{err}</div>}

      <div className="payment-summary-box">
        <div className="payment-summary-metric">
          <span>Treatment fee</span>
          <b>{money(treatment.totalFee)}</b>
        </div>
        <div className="payment-summary-metric">
          <span>Paid so far</span>
          <b>{money(treatment.paidAmount)}</b>
        </div>
        <div className="payment-summary-metric highlight">
          <span>Outstanding balance</span>
          <strong style={{color:'var(--danger-text)'}}>{money(bal)}</strong>
        </div>
      </div>

      <div className="payment-fields-grid">
        <label>
          <span>Payment date</span>
          <input
            type="date"
            required
            value={date}
            onChange={e=>setDate(e.target.value)}
          />
        </label>

        <label>
          <span>Ethiopian date</span>
          <input
            value={ethiopianDate(date)}
            readOnly
            className="input-readonly-soft"
          />
        </label>

        <label className="patient-form-wide">
          <span style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>Amount to pay (ETB)</span>
            <button
              type="button"
              onClick={payFull}
              style={{background:'none',border:'none',color:'var(--accent)',cursor:'pointer',fontSize:'12px',fontWeight:650}}
            >
              Pay full balance ({money(bal)})
            </button>
          </span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={bal}
            required
            placeholder="0.00"
            value={amount}
            onChange={e=>setAmount(e.target.value)}
            autoFocus
          />
        </label>

        <label className="patient-form-wide">
          <span>Ticket number <em>Optional</em></span>
          <input
            placeholder="e.g. 1024"
            value={ticketNo}
            onChange={e=>setTicketNo(e.target.value)}
          />
        </label>

        <label className="patient-form-wide">
          <span>Payment note / method <em>Optional</em></span>
          <input
            placeholder="e.g. Cash, CBE Birr, Telebirr, Installment"
            value={note}
            onChange={e=>setNote(e.target.value)}
          />
        </label>
      </div>

      <div className="payment-preview-card">
        <span>Remaining balance after payment:</span>
        <strong>{money(newBalance)}</strong>
      </div>

      <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20}}>
        <button type="button" className="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <Btn className="primary" loading={busy} loadingText="Recording payment…" type="submit">
          <CheckCircle2 size={16}/>
          Record payment
        </Btn>
      </div>
    </form>
  </Modal>;
}

function PaymentHistoryModal({patient,treatment,onClose,onChanged}){
  const[tx,setTx]=useState(treatment);
  const[editKey,setEditKey]=useState(null);
  const[form,setForm]=useState({amount:'',date:'',ticketNo:'',note:''});
  const[busy,setBusy]=useState('');
  const[err,setErr]=useState('');

  const payments=tx.payments||[];

  useEffect(()=>{setTx(treatment);setEditKey(null);},[treatment]);

  const startEdit=(p,idx)=>{
    if(busy)return;
    setErr('');
    setEditKey(p._id||('idx:'+idx));
    setForm({
      amount:String(p.amount??''),
      date:p.date||'',
      ticketNo:p.ticketNo||'',
      note:p.note||''
    });
  };

  const cancelEdit=()=>{
    setEditKey(null);
    setErr('');
  };

  const saveEdit=async(p,idx)=>{
    const amt=Number(form.amount);
    if(!(amt>0)){
      setErr('Payment amount must be greater than 0.');
      return;
    }
    setBusy('save:'+idx);
    setErr('');
    try{
      const res=await api.put(`/patients/${patient._id}/treatments/${treatment._id}/payments/${p._id||idx}`,{
        amount:amt,
        date:form.date,
        ethDate:form.date?ethiopianDate(form.date):undefined,
        ticketNo:form.ticketNo.trim(),
        note:form.note.trim()
      });
      setTx(res.treatment);
      setEditKey(null);
      onChanged&&onChanged(res.patient);
    }catch(x){
      setErr(x.message||'Could not update payment.');
    }finally{
      setBusy('');
    }
  };

  const removePayment=async(p,idx)=>{
    if(busy)return;
    if(!confirm(`Delete this ${money(p.amount)} payment? This cannot be undone.`))return;
    setBusy('del:'+idx);
    setErr('');
    try{
      const res=await api.del(`/patients/${patient._id}/treatments/${treatment._id}/payments/${p._id||idx}`);
      setTx(res.treatment);
      onChanged&&onChanged(res.patient);
    }catch(x){
      setErr(x.message||'Could not delete payment.');
    }finally{
      setBusy('');
    }
  };

  return <Modal
    open={true}
    onClose={onClose}
    title="Payment history"
    subtitle={`${treatment.procedure} · ${patient.patientName}`}
  >
    <div className="payment-history-wrap">
      <div className="payment-summary-box">
        <div className="payment-summary-metric">
          <span>Total fee</span>
          <b>{money(tx.totalFee)}</b>
        </div>
        <div className="payment-summary-metric">
          <span>Total paid</span>
          <b style={{color:'var(--mint-text)'}}>{money(tx.paidAmount)}</b>
        </div>
        <div className="payment-summary-metric">
          <span>Remaining balance</span>
          <b style={{color:Number(tx.balance||0)>0?'var(--danger-text)':'inherit'}}>
            {money(tx.balance)}
          </b>
        </div>
      </div>

      {err&&<div className="error" style={{marginTop:14}}>{err}</div>}

      {payments.length===0?(
        <div className="card" style={{padding:'28px',textAlign:'center',marginTop:16}}>
          <p style={{margin:0,color:'var(--muted)',fontSize:'14px'}}>
            No payment transactions recorded for this treatment.
          </p>
        </div>
      ):(
        <div className="table-wrap" style={{marginTop:16}}>
          <table className="payment-history-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Ticket</th>
                <th>Note / Method</th>
                <th>Recorded at</th>
                <th style={{textAlign:'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p,idx)=>{
                const key=p._id||('idx:'+idx);
                const editing=editKey===key;
                const rowBusy=busy.endsWith(':'+idx);

                return (
                  <tr key={key}>
                    <td>{idx+1}</td>
                    <td>
                      {editing?(
                        <input
                          type="date"
                          required
                          value={form.date}
                          onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                          style={{maxWidth:150}}
                        />
                      ):(
                        <>
                          <b>{p.ethDate||p.date}</b>
                          {p.ethDate&&p.date&&<small style={{display:'block',color:'var(--muted)',fontSize:'11px'}}>{p.date}</small>}
                        </>
                      )}
                    </td>
                    <td>
                      {editing?(
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={form.amount}
                          onChange={e=>setForm(f=>({...f,amount:e.target.value}))}
                          style={{maxWidth:110}}
                          autoFocus
                        />
                      ):(
                        <b style={{color:'var(--mint-text)'}}>{money(p.amount)}</b>
                      )}
                    </td>
                    <td>
                      {editing?(
                        <input
                          placeholder="Ticket"
                          value={form.ticketNo}
                          onChange={e=>setForm(f=>({...f,ticketNo:e.target.value}))}
                          style={{maxWidth:110}}
                        />
                      ):(
                        p.ticketNo||treatment.ticketNo||'—'
                      )}
                    </td>
                    <td>
                      {editing?(
                        <input
                          placeholder="Note / method"
                          value={form.note}
                          onChange={e=>setForm(f=>({...f,note:e.target.value}))}
                        />
                      ):(
                        p.note||'—'
                      )}
                    </td>
                    <td>
                      <small style={{color:'var(--muted)'}}>
                        {p.receivedAt?new Date(p.receivedAt).toLocaleString():'—'}
                      </small>
                    </td>
                    <td style={{textAlign:'right'}}>
                      <div style={{display:'inline-flex',gap:6,alignItems:'center'}}>
                        {editing?(
                          <>
                            <button
                              type="button"
                              className="primary small"
                              disabled={rowBusy}
                              onClick={()=>saveEdit(p,idx)}
                              title="Save payment"
                            >
                              <Check size={13}/>
                              {rowBusy?'Saving…':'Save'}
                            </button>
                            <button
                              type="button"
                              className="ghost small"
                              disabled={rowBusy}
                              onClick={cancelEdit}
                              title="Cancel"
                            >
                              <X size={13}/>
                            </button>
                          </>
                        ):(
                          <>
                            <button
                              type="button"
                              className="icon"
                              disabled={!!busy}
                              onClick={()=>startEdit(p,idx)}
                              title="Edit payment"
                            >
                              <Edit3 size={15}/>
                            </button>
                            <button
                              type="button"
                              className={'icon danger'+(busy==='del:'+idx?' is-loading':'')}
                              disabled={!!busy}
                              onClick={()=>removePayment(p,idx)}
                              title="Delete payment"
                            >
                              <Trash2 size={15}/>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{display:'flex',justifyContent:'flex-end',marginTop:22}}>
        <button type="button" className="ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  </Modal>;
}

function OutstandingBalances(){
  const[rows,setRows]=useState([]);
  const[q,setQ]=useState('');
  const[from,setFrom]=useState('');
  const[to,setTo]=useState('');
  const[busy,setBusy]=useState(false);
  const[payTarget,setPayTarget]=useState(null);
  const[historyTarget,setHistoryTarget]=useState(null);
  const toast=useToast();

  const load=()=>{
    setBusy(true);
    api.get(`/patients/balances?q=${encodeURIComponent(q)}&from=${from}&to=${to}`)
      .then(setRows)
      .finally(()=>setBusy(false));
  };

  useEffect(()=>{
    load();
  },[]);

  const clearFilters=()=>{
    setQ('');
    setFrom('');
    setTo('');
    setBusy(true);
    api.get('/patients/balances?q=&from=&to=')
      .then(setRows)
      .finally(()=>setBusy(false));
  };

  const totalBalance=rows.reduce((acc,r)=>acc+Number(r.balance||0),0);
  const totalTreatmentsWithBal=rows.reduce((acc,r)=>{
    return acc+(r.treatments?.filter(t=>Number(t.balance||0)>0).length||0);
  },0);
  const totalFees=rows.reduce((acc,r)=>acc+Number(r.totalFee||0),0);
  const totalPaid=rows.reduce((acc,r)=>acc+Number(r.paidAmount||0),0);

  return <>
    <PageHead
      title="Outstanding balances"
      subtitle="Track unpaid treatment balances, receive later payments, and review transaction history."
      action={
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <Link className="ghost" to="/patients">
            <Users size={16}/>
            All patients
          </Link>
          <Link className="primary" to="/patients/new">
            <Plus size={16}/>
            New patient
          </Link>
        </div>
      }
    />

    <section className="balances-workspace">
      <div className="balances-stats-grid">
        <div className="stat-card">
          <span>Total outstanding balance</span>
          <strong style={{color:totalBalance>0?'var(--danger-text)':'inherit'}}>
            {money(totalBalance)}
          </strong>
          <small>Awaiting settlement</small>
        </div>
        <div className="stat-card">
          <span>Patients with balance</span>
          <strong>{rows.length}</strong>
          <small>Active patient accounts</small>
        </div>
        <div className="stat-card">
          <span>Treatments pending</span>
          <strong>{totalTreatmentsWithBal}</strong>
          <small>Individual treatments</small>
        </div>
        <div className="stat-card">
          <span>Total collected so far</span>
          <strong style={{color:'var(--mint-text)'}}>{money(totalPaid)}</strong>
          <small>From {money(totalFees)} recorded</small>
        </div>
      </div>

      <div className="patients-toolbar">
        <div className="patients-search">
          <Search size={18}/>
          <input
            placeholder="Search patient, card, ticket or procedure"
            value={q}
            onChange={e=>setQ(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&load()}
          />
        </div>

        <div className="patients-date">
          <label>From</label>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)}/>
        </div>

        <div className="patients-date">
          <label>To</label>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)}/>
        </div>

        <Btn className="patients-filter-button" loading={busy} loadingText="Searching…" onClick={load}>
          <Search size={16}/>
          Search
        </Btn>

        <Btn className="patients-clear-button" onClick={clearFilters}>
          Clear
        </Btn>
      </div>

      <div className="balances-list">
        {rows.length===0?(
          <div className="card" style={{padding:'48px 24px',textAlign:'center'}}>
            <CheckCircle2 size={40} style={{color:'var(--mint)',margin:'0 auto 14px'}}/>
            <h3 style={{margin:'0 0 6px',fontFamily:'var(--font-display)',fontSize:'18px'}}>
              All accounts settled
            </h3>
            <p style={{margin:0,color:'var(--muted)',fontSize:'14px'}}>
              There are no outstanding treatment balances matching your current filters.
            </p>
          </div>
        ):(
          rows.map(patient=>(
            <div key={patient._id} className="balance-patient-card">
              <div className="balance-patient-header">
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                    <h3 className="balance-patient-name">{patient.patientName}</h3>
                    <span className="pill warn">
                      Total balance: {money(patient.balance)}
                    </span>
                  </div>
                  <div className="balance-patient-meta">
                    <span>Date: {patient.ethDate||patient.gregDate}</span>
                    {patient.cardNumber&&<span>Card: #{patient.cardNumber}</span>}
                    {patient.ticketNo&&<span>Ticket: #{patient.ticketNo}</span>}
                  </div>
                </div>
                <Link to={`/patients/edit/${patient._id}`} className="ghost small">
                  <Edit3 size={14}/>
                  Edit patient
                </Link>
              </div>

              <div className="balance-treatments-table-wrap">
                <table className="balance-treatments-table">
                  <thead>
                    <tr>
                      <th>Treatment</th>
                      <th>Price (Fee)</th>
                      <th>Paid today / so far</th>
                      <th>Outstanding balance</th>
                      <th>Status</th>
                      <th style={{textAlign:'right'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patient.treatments?.map((t,idx)=>{
                      const hasBal=Number(t.balance||0)>0;
                      return (
                        <tr key={t._id||idx} className={hasBal?'row-pending-balance':'row-settled'}>
                          <td>
                            <b>{t.procedure}</b>
                          </td>
                          <td>{money(t.totalFee)}</td>
                          <td>{money(t.paidAmount)}</td>
                          <td>
                            <b style={{color:hasBal?'var(--danger-text)':'var(--mint-text)'}}>
                              {money(t.balance)}
                            </b>
                          </td>
                          <td>
                            {hasBal?(
                              <span className="pill warn small">
                                {Number(t.paidAmount||0)>0?'Partial':'Unpaid'}
                              </span>
                            ):(
                              <span className="pill success small">Settled</span>
                            )}
                          </td>
                          <td style={{textAlign:'right'}}>
                            <div style={{display:'inline-flex',gap:8,alignItems:'center'}}>
                              {hasBal&&(
                                <Btn
                                  className="primary small"
                                  onClick={()=>setPayTarget({patient,treatment:t})}
                                >
                                  <ReceiptText size={14}/>
                                  Receive payment
                                </Btn>
                              )}
                              <button
                                type="button"
                                className="ghost small"
                                onClick={()=>setHistoryTarget({patient,treatment:t})}
                                title="View payment history"
                              >
                                <Clock size={14}/>
                                History ({t.payments?.length||0})
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </section>

    {payTarget&&(
      <ReceivePaymentModal
        patient={payTarget.patient}
        treatment={payTarget.treatment}
        onClose={()=>setPayTarget(null)}
        onSuccess={()=>{
          setPayTarget(null);
          toast(`Payment recorded for ${payTarget.patient.patientName}`,'success');
          load();
        }}
      />
    )}

    {historyTarget&&(
      <PaymentHistoryModal
        patient={historyTarget.patient}
        treatment={historyTarget.treatment}
        onClose={()=>setHistoryTarget(null)}
        onChanged={updated=>{
          if(updated){
            const t=(updated.treatments||[]).find(x=>String(x._id)===String(historyTarget.treatment._id));
            if(t)setHistoryTarget({patient:updated,treatment:t});
          }
          load();
        }}
      />
    )}
  </>;
}
function Monthly(){
  const[d,setD]=useState();
  const[err,setErr]=useState('');
  const[busy,setBusy]=useState('');

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
          <Suspense fallback={null}>
            <EarningsChart
              data={[...(d.months||[])].reverse().map(m=>({
                name:`${m._id.month.slice(0,3)} ${String(m._id.year).slice(-2)}`,
                earnings:Math.round(Number(m.payable||0))
              }))}
            />
          </Suspense>
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
      a.download='hakim-backup.json';
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
    if(!window.confirm('Disconnect Google Drive from Hakim?'))return;

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
        <div><small>Automatic backup</small><b>Daily on schedule</b></div>
        <div><small>Last automatic backup</small>
          <b style={status?.lastAutomaticBackup&&!status.lastAutomaticBackup.ok?{color:'var(--danger)'}:undefined}>
            {loading?'…':status?.lastAutomaticBackup
              ?(status.lastAutomaticBackup.ok?'Successful · '+status.lastAutomaticBackup.ethDate:'Failed · '+status.lastAutomaticBackup.ethDate)
              :'No automatic run yet'}
          </b>
        </div>
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
          <p>The server schedules a backup automatically every day. You can also run a backup manually below.</p>
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
            Daily · set in Notifications
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
 [f,setF]=useState({telegram_daily_report_time:'19:00',telegram_monthly_report_time:'19:00',telegram_backup_time:'19:00'}),
 [saved,setSaved]=useState(false),
[busy,setBusy]=useState(false),
  [savingTg,setSavingTg]=useState(false),
  [tab,setTab]=useState('telegram'),
  [lastMonthly,setLastMonthly]=useState(null);

 useEffect(()=>{
   Promise.all([
     api.get('/settings'),
     api.get('/auth/me')
   ]).then(([settings,me])=>{
     try{
       setLastMonthly(settings.last_monthly_report?JSON.parse(settings.last_monthly_report):null);
     }catch{}
setF({
       telegram_daily_report_time:settings.telegram_daily_report_time||'19:00',
       telegram_monthly_report_time:settings.telegram_monthly_report_time||'19:00',
       telegram_backup_time:settings.telegram_backup_time||'19:00'
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
       telegram_monthly_report_time:f.telegram_monthly_report_time,
       telegram_backup_time:f.telegram_backup_time
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

            <label>Automatic backup time
              <input
                type="time"
                value={f.telegram_backup_time}
                onChange={e=>setF({...f,telegram_backup_time:e.target.value})}
              />
            </label>
          </div>

          <p className="note">Reports and the automatic backup are sent by the server at these times (Africa/Addis_Ababa). The monthly report goes out on the last day of each Ethiopian month.</p>

          <div className="toggle-row">
            <div>
              <b>Last monthly report run</b>
              <span>
                {!lastMonthly&&'No run recorded yet. Deploy the latest server code so reports record their outcome here.'}
                {lastMonthly&&lastMonthly.skipped&&('Skipped on '+lastMonthly.ethDate+' — not Ethiopian month end.'+
                  (lastMonthly.reason?' ('+lastMonthly.reason+')':''))}
                {lastMonthly&&!lastMonthly.skipped&&(
                  (lastMonthly.telegram||[]).length
                   ? ('Ran on '+lastMonthly.ethDate+' · '+(lastMonthly.telegram||[]).map(t=>t.doctor+': '+(t.sent?'sent':(t.reason||'failed'))).join(' · '))
                   : 'Ran on '+lastMonthly.ethDate+' — no doctors with Telegram enabled.'
                )}
              </span>
            </div>
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
if(doctor===undefined&&!setup)return <Loading/>;if(setup)return <Setup clinic={clinic} onLogin={d=>{setSetup(false);setDoctor(d)}}/>;if(!doctor)return <Routes><Route path="/forgot" element={<Forgot clinic={clinic}/>}/><Route path="/reset-password" element={<ResetPassword clinic={clinic}/>}/><Route path="*" element={<Login onLogin={setDoctor} clinic={clinic}/>}/></Routes>;return <Shell doctor={doctor} clinic={clinic} onLogout={async()=>{await api.post('/auth/logout',{});setDoctor(null)}}><Routes><Route path="/" element={<Dashboard clinic={clinic}/>}/><Route path="/patients" element={<Patients/>}/><Route path="/patients/new" element={<PatientForm/>}/><Route path="/patients/edit/:id" element={<PatientForm/>}/><Route path="/patients/:id/treatment/new" element={<PatientForm/>}/><Route path="/balances" element={<OutstandingBalances/>}/><Route path="/outstanding-balances" element={<Navigate to="/balances" replace/>}/><Route path="/monthly" element={<Monthly/>}/><Route path="/doctors" element={doctor.role==='admin'?<Doctors/>:<Navigate to="/"/>}/><Route path="/backup" element={doctor.role==='admin'?<Backup/>:<Navigate to="/"/>}/><Route path="/notifications" element={doctor.role==='admin'?<NotificationsPage/>:<Navigate to="/"/>}/><Route path="/settings" element={doctor.role==='admin'?<SettingsPage/>:<Navigate to="/"/>}/><Route path="*" element={<Navigate to="/"/>}/></Routes></Shell>}
createRoot(document.getElementById('root')).render(<BrowserRouter><ToastProvider><App/></ToastProvider></BrowserRouter>);




