/* Thai lunar calendar calculation adapted from KranaxALT/thailunar (MIT),
   itself based on Mark Hollow's pythaidate (MIT). See THAI-LUNAR-LICENSE.txt. */
(function () {
  'use strict';
  const DAYS_800 = 292207, EPOCH = 373, JDN_OFFSET = 1954167;
  const MONTHS = [0,5,6,7,8,9,10,11,12,1,2,3,4,8,88,5,6];
  const mod = (a,b) => ((a % b) + b) % b;
  const div = (a,b) => Math.floor(a/b);

  function julianDay(year,month,day) {
    const a=div(14-month,12), y=year+4800-a, m=month+12*a-3;
    return day+div(153*m+2,5)+365*y+div(y,4)-div(y,100)+div(y,400)-32045;
  }
  function rawYear(year) {
    const horakhun=div(year*DAYS_800+EPOCH,800)+1;
    const kammacapon=800-mod(year*DAYS_800+EPOCH,800);
    const avoQuot=div(horakhun*11+650,692);
    let avoman=mod(horakhun*11+650,692);
    if(avoman===0) avoman=692;
    let tithi=mod(avoQuot+horakhun,30);
    if(avoman===692) tithi--;
    const weekday=mod(horakhun,7);
    const nextHorakhun=div((year+1)*DAYS_800+EPOCH,800)+1;
    const nextTithi=mod(div(nextHorakhun*11+650,692)+nextHorakhun,30);
    let langsak=Math.max(1,tithi), nyd=langsak;
    if(nyd<6) nyd+=29;
    nyd=mod(weekday-nyd+1+35,7);
    const leapday=kammacapon<=207;
    let calType=tithi>24 || tithi<6 ? 'C' : 'A';
    if(tithi===25 && nextTithi===5) calType='A';
    if((leapday && avoman<=126) || (!leapday && avoman<=137)) calType=calType==='C' ? 'c' : 'B';
    const nextNyd=mod(nyd+({A:4,B:5,C:6,c:6})[calType],7);
    return {horakhun,tithi,langsak,nyd,nextNyd,leapday,calType,offset:false};
  }
  function resolvedYear(year) {
    const years=[-2,-1,0,1,2].map(offset=>rawYear(year+offset));
    if(years[2].tithi===24 && years[3].tithi===6) {
      for(const item of years) {item.calType='C';item.nextNyd=mod(item.nextNyd+2,7);}
    }
    for(let i=1;i<=3;i++) if(years[i].calType==='c') {
      const j=years[i].nyd===years[i-1].nextNyd ? 1 : -1;
      years[i+j].calType='B';
      years[i+j].nextNyd=mod(years[i+j].nextNyd+1,7);
    }
    for(let i=1;i<=3;i++) if(years[i-1].nextNyd!==years[i].nyd && years[i].nextNyd!==years[i+1].nyd) {
      years[i].offset=true;years[i].langsak++;
      years[i].nyd=mod(years[i].nyd+6,7);
      years[i].nextNyd=mod(years[i].nextNyd+6,7);
    }
    const current=years[2];
    if(current.calType==='c') current.calType='C';
    let offsetDays=current.langsak;
    if(offsetDays<6+(current.offset ? 1 : 0)) offsetDays+=29;
    return {...current,offsetDays};
  }
  const END_DAYS={
    A:[[383,16],[354,15],[324,12],[295,11],[265,10],[236,9],[206,8],[177,7],[147,6],[118,5],[88,4],[59,3],[29,2]],
    B:[[384,16],[355,15],[325,12],[296,11],[266,10],[237,9],[207,8],[178,7],[148,6],[119,5],[89,4],[59,3],[29,2]],
    C:[[384,15],[354,12],[325,11],[295,10],[266,9],[236,8],[207,7],[177,6],[148,5],[118,14],[88,13],[59,3],[29,2]]
  };
  function findDate(type,days) {
    for(const [end,slot] of END_DAYS[type]) if(days>end) return {month:MONTHS[slot],rawDay:days-end};
    return {month:MONTHS[1],rawDay:days};
  }
  function fromJulianDay(jd) {
    const hk=jd-JDN_OFFSET;
    if(hk<1) return null;
    let year=div(hk*800-EPOCH,DAYS_800), days;
    if(mod(hk,DAYS_800)===95333) {year--;days=365;}
    else days=hk-resolvedYear(year).horakhun;
    let data=resolvedYear(year), daysInYear=365+(data.leapday ? 1 : 0);
    while(days>daysInYear) {
      days-=daysInYear;year++;data=resolvedYear(year);
      daysInYear=365+(data.leapday ? 1 : 0);
    }
    const date=findDate(data.calType,data.offsetDays+days);
    return {...date,year};
  }
  function fromGregorian(year,month,day) {
    if(year<638 || month<1 || month>12 || day<1 || day>31) return null;
    const original=new Date(Date.UTC(year,month-1,day));
    if(original.getUTCFullYear()!==year || original.getUTCMonth()+1!==month || original.getUTCDate()!==day) return null;
    const jd=julianDay(year,month,day), current=fromJulianDay(jd);
    if(!current) return null;
    const next=fromJulianDay(jd+1);
    const rawDay=current.rawDay;
    return {
      phase:rawDay<=15 ? 'ขึ้น' : 'แรม',
      day:rawDay<=15 ? rawDay : rawDay-15,
      month:current.month===88 ? '๘ หลัง' : String(current.month),
      isWanPhra:rawDay===8 || rawDay===15 || rawDay===23 || current.month!==next.month
    };
  }
  window.ThaiLunar={fromGregorian};
})();
