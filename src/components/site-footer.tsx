export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-footer">
      <div className="mt-footer-inner">
        <div className="mt-footer-brand">
          <img src="/mahakal-logo.svg" alt="Mahakal Travels" />
          <p>Mahakal Travels — safe journey, better tomorrow. Book scheduled shared rides or hire a vehicle for the full day.</p>
        </div>
        <div>
          <h4>Book</h4>
          <a href="/#scheduled-trips">Scheduled trips</a>
          <a href="/#full-day">Full-day vehicle hire</a>
          <a href="/#popular-routes">Popular routes</a>
          <a href="/#offers">Offers</a>
        </div>
        <div>
          <h4>Your account</h4>
          <a href="/account">Login / Signup</a>
          <a href="/account#my-bookings">My bookings</a>
          <a href="/account#profile">Profile</a>
        </div>
        <div>
          <h4>Help</h4>
          <a href="/#how-to-book">How to book</a>
          <a href="/#faq">FAQs</a>
          <a href="/#about">About Mahakal Travels</a>
        </div>
      </div>
      <div className="mt-footer-bottom">
        <span>© {year} Mahakal Travels. All rights reserved.</span>
        <span>Need help? Contact your travel operator.</span>
      </div>
    </footer>
  );
}
