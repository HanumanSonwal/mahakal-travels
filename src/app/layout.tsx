import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'Mahakal Travel | Vehicle Finance', description:'Income and expense management for Mahakal Travel.', icons:{icon:'/mahakal-travel.jpg'} };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
