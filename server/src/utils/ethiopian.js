export const ETH_MONTHS=['መስከረም','ጥቅምት','ህዳር','ታኅሣሥ','ጥር','የካቲት','መጋቢት','ሚያዝያ','ግንቦት','ሰኔ','ሐምሌ','ነሐሴ','ጳጉሜ'];
export function ethiopianParts(iso){const [yy,mm,dd]=iso.split('-').map(Number);const a=Math.floor((14-mm)/12),y=yy+4800-a,m=mm+12*a-3,jdn=dd+Math.floor((153*m+2)/5)+365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)-32045;const days=jdn-1724221,cycles=Math.floor(days/1461),rem=days%1461;let ey=cycles*4+1;if(rem>=365){if(rem<730){ey++;}else if(rem<1096){ey+=2;}else{ey+=3;}}let rd=rem;if(rem>=365){if(rem<730)rd-=365;else if(rem<1096)rd-=730;else rd-=1096;}let mi=Math.floor(rd/30);if(mi>12)mi=12;return {month:ETH_MONTHS[mi],monthIndex:mi+1,day:rd%30+1,year:ey};}
export const ethiopianDate=iso=>{const p=ethiopianParts(iso);return `${p.month} ${p.day} ${p.year}`};
export const isoToday=()=>{const d=new Date();return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Addis_Ababa'}).format(d)};
export function previousMonth(p){let i=p.monthIndex-2,y=p.year;if(i<0){i=12;y--;}return {month:ETH_MONTHS[i],monthIndex:i+1,year:y};}
export function monthStarted(current,target){const cur=current.year*13+current.monthIndex,t=target.year*13+target.monthIndex;return cur>t;}
