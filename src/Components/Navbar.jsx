import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BookOpen, LayoutDashboard, PlusCircle, List, LogOut, Menu, X, User, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Navbar.css';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  const displayName = user?.name || (user?.phone ? `+91 ${user.phone}` : user?.email || 'User');
  const userInitial = (user?.name || user?.email || 'U')[0].toUpperCase();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <NavLink to="/dashboard" className="navbar-brand" onClick={closeMenu}>
          <div className="brand-icon">
            <BookOpen size={20} />
          </div>
          <span className="brand-text">MiniLedger</span>
        </NavLink>

        {/* Hamburger Menu for Mobile */}
        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Navigation Links */}
        <div className={`nav-links ${menuOpen ? 'nav-open' : ''}`}>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/add-loan"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <PlusCircle size={18} />
            <span>Add Loan</span>
          </NavLink>

          <NavLink
            to="/loans"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <List size={18} />
            <span>Loan Ledger</span>
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={closeMenu}
          >
            <User size={18} />
            <span>Profile</span>
          </NavLink>

          <NavLink
            to="/admin"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={closeMenu}
            style={{ color: '#dc2626' }}
          >
            <ShieldAlert size={18} />
            <span>Admin & Refunds</span>
          </NavLink>

          <div className="nav-spacer"></div>

          {/* User Profile Badge (Clickable) */}
          {user && (
            <NavLink
              to="/profile"
              className="nav-user-badge"
              onClick={closeMenu}
              title="Click to view full profile & metrics"
              style={{ textDecoration: 'none', cursor: 'pointer' }}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayName}
                  className="user-nav-avatar"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="user-nav-initial">{userInitial}</div>
              )}
              <span className="nav-user-name">{displayName}</span>
            </NavLink>
          )}

          <button className="logout-btn" onClick={handleLogout} title="Log out">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
