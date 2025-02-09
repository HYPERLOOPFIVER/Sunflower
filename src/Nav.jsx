import { NavLink } from "react-router-dom";
import "./Nav.css";

const BottomNavbar = () => {
    return (
        <nav className="bottom-navbar">
            <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>
                🏠 Home
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => (isActive ? "active" : "")}>
                🔍 Search
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => (isActive ? "active" : "")}>
                👤 Profile
            </NavLink>
        </nav>
    );
};

export default BottomNavbar;
