import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'Mahakal Travels | Book Trips & Full-Day Rides Online', description:'Book scheduled shared rides and full-day vehicle hire with Mahakal Travels.', icons:{icon:'/mahakal-icon.svg'} };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
