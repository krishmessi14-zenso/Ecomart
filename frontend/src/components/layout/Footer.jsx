import { memo } from "react";
import { Link } from "react-router-dom";
import { Sprout } from "../icons/Icons.jsx";

function FooterBase() {
  return (
    <footer className="fc-footer">
      <div className="fc-footer-inner">
        <div>
          <div className="fc-footer-brand">
            <Sprout size={16} /> EcoMart
          </div>
          <p className="fc-footer-tag">
            Sustainable products marketplace. Connecting verified vendors with eco-conscious customers through transparent listings and carbon impact ratings.
          </p>
        </div>
        <div className="fc-footer-cols">
          <div>
            <div className="fc-footer-col-title">Platform</div>
            <Link to="/customer/marketplace">Marketplace</Link>
            <Link to="/support">Support</Link>
          </div>
          <div>
            <div className="fc-footer-col-title">For Vendors</div>
            <Link to="/register">List Your Products</Link>
            <Link to="/login">Vendor Sign In</Link>
          </div>
          <div>
            <div className="fc-footer-col-title">For Customers</div>
            <Link to="/register">Create Account</Link>
            <Link to="/login">Customer Sign In</Link>
          </div>
        </div>
      </div>
      <div className="fc-footer-copy">
        © 2026 EcoMart. Sustainable Products Marketplace.
      </div>
    </footer>
  );
}

export const Footer = memo(FooterBase);
export default Footer;
