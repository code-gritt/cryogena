import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import logo from "../assets/logo.png";
import { navItems } from "../constants";
import { Link, useNavigate } from "react-router-dom";
import useUserStore from "../../store/userStore";

const Navbar = () => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { user, clearUser } = useUserStore();
  const navigate = useNavigate();

  const toggleNavbar = () => setMobileDrawerOpen(!mobileDrawerOpen);

  const handleLogout = () => {
    clearUser();
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 py-3 backdrop-blur-lg border-b border-neutral-700/80">
      <div className="container px-4 mx-auto relative lg:text-sm">
        {/* Desktop Navbar */}
        <div className="flex justify-between items-center">
          <Link href="/">
            <div className="flex items-center flex-shrink-0">
              <img className="h-10 w-10 mr-2" src={logo} alt="Logo" />
              <span className="text-xl tracking-tight text-white">
                Cryogena
              </span>
            </div>
          </Link>

          <ul className="hidden lg:flex ml-14 space-x-12">
            {navItems.map((item, index) => (
              <li key={index}>
                <a
                  href={item.href}
                  className="text-white hover:text-orange-500"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden lg:flex justify-center space-x-6 items-center">
            {user ? (
              <>
                <span className="text-neutral-400">
                  Credits: {user.credits}
                </span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-orange-800 flex items-center justify-center text-white font-bold">
                  {user.avatarInitials}
                </div>
                <button
                  onClick={handleLogout}
                  className="py-2 px-3 border rounded-md text-white hover:text-orange-500 flex items-center"
                >
                  <LogOut size={20} className="mr-1" /> Logout
                </button>
              </>
            ) : (
              <>
                <a
                  href="/login"
                  className="py-2 px-3 border rounded-md text-white hover:text-orange-500"
                >
                  Sign In
                </a>
                <a
                  href="/register"
                  className="bg-gradient-to-r from-orange-500 to-orange-800 py-2 px-3 rounded-md text-white hover:from-orange-600 hover:to-orange-900"
                >
                  Create an account
                </a>
              </>
            )}
          </div>

          <div className="lg:hidden flex">
            <button onClick={toggleNavbar}>
              {mobileDrawerOpen ? (
                <X className="text-white" />
              ) : (
                <Menu className="text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed right-0 top-0 z-20 bg-neutral-900 w-full p-12 flex flex-col justify-center items-center lg:hidden">
            <ul className="space-y-4">
              {navItems.map((item, index) => (
                <li key={index} className="py-4">
                  <a
                    href={item.href}
                    className="text-white hover:text-orange-500"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex space-x-6 mt-6">
              {user ? (
                <>
                  <span className="text-neutral-400">
                    Credits: {user.credits}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-orange-800 flex items-center justify-center text-white font-bold">
                    {user.avatarInitials}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="py-2 px-3 border rounded-md text-white hover:text-orange-500 flex items-center"
                  >
                    <LogOut size={20} className="mr-1" /> Logout
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/login"
                    className="py-2 px-3 border rounded-md text-white hover:text-orange-500"
                  >
                    Sign In
                  </a>
                  <a
                    href="/register"
                    className="py-2 px-3 rounded-md bg-gradient-to-r from-orange-500 to-orange-800 text-white hover:from-orange-600 hover:to-orange-900"
                  >
                    Create an account
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
