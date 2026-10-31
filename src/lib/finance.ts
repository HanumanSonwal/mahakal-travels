export type RecordEntry = { _id?: string; date: string; status: 'Completed Trip'|'No Trip'|'Holiday'; collection: number; cng: number; toll: number; parking: number; food: number; maintenance: number; other: number; customExpenses: {name:string;amount:number}[]; notes: string; description?: string };
export type AppSettingsType = { vehicleName: string; monthlyEmi: number; monthlyDriverSalary: number; currency: string; businessStartDate: string };
export const daysInMonth = (ym: string) => { const [y,m]=ym.split('-').map(Number); return new Date(y,m,0).getDate(); };
export const monthKey = (date: string) => date.slice(0,7);
export const variableTotal = (r: RecordEntry) => [r.cng,r.toll,r.parking,r.food,r.maintenance,r.other].reduce((a,b)=>a+(Number(b)||0),0)+(r.customExpenses||[]).reduce((a,e)=>a+(Number(e.amount)||0),0);
export const dailyProfit = (r: RecordEntry, s: AppSettingsType) => Number(r.collection||0)-variableTotal(r)-(s.monthlyEmi+s.monthlyDriverSalary)/daysInMonth(monthKey(r.date));
export const money = (v:number, currency='INR') => new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:0}).format(v||0);
export const blankRecord = (date: string): RecordEntry => ({ date,status:'Completed Trip',collection:0,cng:0,toll:0,parking:0,food:0,maintenance:0,other:0,customExpenses:[],notes:'' });
