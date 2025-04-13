import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { voterService } from '../services/api';
import Navbar from '../components/Navbar';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalVoters: 0,
    maleVoters: 0,
    femaleVoters: 0,
    otherVoters: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVoterStats();
  }, []);

  const fetchVoterStats = async () => {
    try {
      setLoading(true);
      const voters = await voterService.getAllVoters();
      
      // Calculate stats
      const totalVoters = voters.length;
      const maleVoters = voters.filter(voter => voter.gender === 'Male').length;
      const femaleVoters = voters.filter(voter => voter.gender === 'Female').length;
      const otherVoters = voters.filter(voter => voter.gender === 'Other').length;
      
      setStats({
        totalVoters,
        maleVoters,
        femaleVoters,
        otherVoters
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching voter stats:', error);
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${color}`}>
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-500">{title}</h3>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className={`text-${color.replace('border-', '')} text-3xl`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome to ID Locker Voter Management System</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard 
                title="Total Voters" 
                value={stats.totalVoters} 
                icon="👥" 
                color="border-blue-500" 
              />
              <StatCard 
                title="Male Voters" 
                value={stats.maleVoters} 
                icon="👨" 
                color="border-green-500" 
              />
              <StatCard 
                title="Female Voters" 
                value={stats.femaleVoters} 
                icon="👩" 
                color="border-pink-500" 
              />
              <StatCard 
                title="Other Voters" 
                value={stats.otherVoters} 
                icon="👤" 
                color="border-purple-500" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-blue-600 text-white px-6 py-4 font-semibold">
                  Quick Actions
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex flex-col space-y-4">
                    <Link 
                      to="/voters" 
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-4 rounded-lg flex items-center"
                    >
                      <span className="mr-3 text-2xl">📋</span>
                      <span>View All Voters</span>
                    </Link>
                    <Link 
                      to="/voters/add" 
                      className="bg-green-50 hover:bg-green-100 text-green-700 p-4 rounded-lg flex items-center"
                    >
                      <span className="mr-3 text-2xl">➕</span>
                      <span>Add New Voter</span>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-blue-600 text-white px-6 py-4 font-semibold">
                  System Information
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-600 font-medium">Application:</span>
                      <span className="ml-2">ID Locker v1.0</span>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Environment:</span>
                      <span className="ml-2">Development</span>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">Last Updated:</span>
                      <span className="ml-2">{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 