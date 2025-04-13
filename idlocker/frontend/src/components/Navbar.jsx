import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gradient-to-r from-indigo-700 to-purple-800 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          ID Locker
        </Link>
        
        {user && (
          <div className="flex items-center space-x-6">
            <Link to="/" className="hover:text-purple-200 font-medium transition duration-200">
              Dashboard
            </Link>
            <Link to="/voters" className="hover:text-purple-200 font-medium transition duration-200">
              Voters
            </Link>
            <Link to="/voters/add" className="hover:text-purple-200 font-medium transition duration-200">
              Add Voter
            </Link>
            <div className="flex items-center ml-6 border-l border-purple-500 pl-6">
              <span className="mr-4 text-purple-100">
                <span className="opacity-80">Welcome,</span> {user.username}
              </span>
              <button 
                onClick={handleLogout}
                className="bg-purple-900 hover:bg-purple-950 text-white font-medium py-2 px-4 rounded-lg transition duration-200 shadow hover:shadow-md"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 