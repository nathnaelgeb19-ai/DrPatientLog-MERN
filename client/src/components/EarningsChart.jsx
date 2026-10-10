import{AreaChart,Area,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer}from'recharts';

const money=v=>`${Number(v||0).toFixed(2)} ETB`;

export default function EarningsChart({data}){
  return <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{top:14,right:8,left:-12,bottom:0}}>
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
  </ResponsiveContainer>;
}
