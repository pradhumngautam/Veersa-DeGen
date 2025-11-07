import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Sidebar.css";

export default function Sidebar({ isOpen, setIsOpen }) {
  const { userProfile, signOut } = useAuth();
  const location = useLocation();
  const role = userProfile?.role;

  const patientNavItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: "📊",
    },
    {
      path: "/patient-chat",
      label: "AI Chat",
      icon: "💬",
    },
    {
      path: "/medical-records",
      label: "Medical Records",
      icon: "📋",
    },
  ];

  const doctorNavItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: "📊",
    },
  ];

  const navItems = role === "patient" ? patientNavItems : doctorNavItems;

  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">🏥</div>
            <div className="logo-text">
              <h2>Veersa</h2>
              <p>DeGen Health</p>
            </div>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive: active }) =>
                    `nav-item ${active || isActive(item.path) ? "active" : ""}`
                  }
                  onClick={() => setIsOpen(false)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {userProfile?.profile?.first_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="user-details">
              <p className="user-name">
                {userProfile?.profile?.first_name}{" "}
                {userProfile?.profile?.last_name}
              </p>
              <p className="user-role">
                {role === "patient" ? "Patient" : "Doctor"}
              </p>
            </div>
          </div>
          <button className="sidebar-signout-btn" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
