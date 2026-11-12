'use client';

import { ArrowRight, BadgePercent, ChevronDown, CircleHelp, LogOut, Ticket, UserRound } from 'lucide-react';

type Props = {
  customer: { name?: string } | null;
  ready: boolean;
  onLogout: () => void;
  loginHref: string;
};

export default function SiteHeader({ customer, ready, onLogout, loginHref }: Props) {
  return (
    <header className="booking-top mt-header">
      <a className="booking-brand" href="/">
        <img src="/mahakal-logo.svg" alt="Mahakal Travels" />
      </a>
      <nav className={`customer-nav ${customer ? 'is-authenticated' : 'is-guest'}`} aria-label="Customer navigation">
        <a className="mt-nav-extra" href="/#offers"><BadgePercent size={17} />Offers</a>
        <a className="mt-nav-extra" href="/account#my-bookings"><Ticket size={17} />Track Booking</a>
        <a className="mt-nav-extra" href="/#faq"><CircleHelp size={17} />Need Help?</a>
        {customer ? (
          <>
            <a className="mt-nav-find" href="/#scheduled-trips">Find my trip</a>
            <details className="profile-menu">
              <summary><span className="profile-avatar"><UserRound size={16} /></span>{customer.name?.split(' ')[0] || 'Profile'}<ChevronDown size={15} /></summary>
              <div className="profile-dropdown">
                <a href="/account#profile">Profile</a>
                <a href="/account#my-bookings">My bookings</a>
                <button type="button" onClick={onLogout}><LogOut size={16} />Logout</button>
              </div>
            </details>
          </>
        ) : ready ? (
          <a className="header-login" href={loginHref}><UserRound size={17} />Login / Signup <ArrowRight size={15} /></a>
        ) : null}
      </nav>
    </header>
  );
}
