import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { voterService, SERVER_URL } from '../services/api';
import Navbar from '../components/Navbar';

const VoterDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [voter, setVoter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVoterDetails();
  }, [id]);

  const fetchVoterDetails = async () => {
    try {
      setLoading(true);
      const data = await voterService.getVoterById(id);
      setVoter(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching voter details:', error);
      toast.error('Failed to load voter details');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this voter?')) {
      try {
        await voterService.deleteVoter(id);
        toast.success('Voter deleted successfully');
        navigate('/voters');
      } catch (error) {
        console.error('Error deleting voter:', error);
        toast.error('Failed to delete voter');
      }
    }
  };

  // Helper to get full name with middle name if available
  const getFullName = () => {
    if (!voter) return '';
    return voter.middleName 
      ? `${voter.firstName} ${voter.middleName} ${voter.lastName}`
      : `${voter.firstName} ${voter.lastName}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!voter) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Voter Not Found</h1>
            <p className="text-gray-700 mb-6">The voter you are looking for does not exist or has been removed.</p>
            <Link to="/voters" className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-medium py-2 px-4 rounded-lg transition shadow-md hover:shadow-lg">
              Back to Voters List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center">
          <Link to="/voters" className="text-indigo-600 hover:text-indigo-800 mr-4">
            ← Back to Voters
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Voter Details</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-800">
              {getFullName()}
            </h2>
            <div className="space-x-2">
              <Link
                to={`/voters/edit/${voter._id}`}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition"
              >
                Edit
              </Link>
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Voter Photo */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Voter Photo</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {voter.photoUrl ? (
                    <div className="relative pb-[100%] sm:pb-[75%] md:pb-0 md:h-[300px] lg:h-[400px]">
                      <img 
                        src={`${SERVER_URL}${voter.photoUrl}`} 
                        alt={getFullName()}
                        className="absolute inset-0 w-full h-full object-cover md:relative"
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-100 h-64 flex items-center justify-center">
                      <p className="text-gray-500">No photo available</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Full Name</p>
                    <p className="text-base text-gray-900">{getFullName()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Father's Name</p>
                    <p className="text-base text-gray-900">{voter.fatherName || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Gender</p>
                    <p className="text-base text-gray-900">{voter.gender || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                    <p className="text-base text-gray-900">
                      {voter.dateOfBirth ? new Date(voter.dateOfBirth).toLocaleDateString() : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Age</p>
                    <p className="text-base text-gray-900">{voter.age || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Voter ID</p>
                    <p className="text-base text-gray-900">{voter.voterId || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone Number</p>
                    <p className="text-base text-gray-900">{voter.phoneNumber || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email Address</p>
                    <p className="text-base text-gray-900">{voter.email || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pincode</p>
                    <p className="text-base text-gray-900">{voter.pincode || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Address</p>
                    <p className="text-base text-gray-900">{voter.address || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Polling Station</p>
                  <p className="text-base text-gray-900">{voter.pollingStation || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Ward</p>
                  <p className="text-base text-gray-900">{voter.ward || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Constituency</p>
                  <p className="text-base text-gray-900">{voter.constituency || 'Not specified'}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500">Notes</p>
                <p className="text-base text-gray-900">{voter.notes || 'No notes'}</p>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-6">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Created: {new Date(voter.createdAt).toLocaleString()}</span>
                {voter.updatedAt && (
                  <span>Last Updated: {new Date(voter.updatedAt).toLocaleString()}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoterDetails; 