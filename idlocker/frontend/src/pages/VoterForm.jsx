import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { voterService, SERVER_URL } from '../services/api';
import Navbar from '../components/Navbar';

const VoterForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [errors, setErrors] = useState({});
  const [voter, setVoter] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    fatherName: '',
    dateOfBirth: '',
    voterId: '',
    email: '',
    phoneNumber: '',
    pincode: '',
    gender: '',
    address: '',
    pollingStation: '',
    ward: '',
    constituency: ''
  });

  useEffect(() => {
    if (isEditMode) {
      fetchVoterDetails();
    }
  }, [id]);

  const fetchVoterDetails = async () => {
    try {
      setLoading(true);
      const data = await voterService.getVoterById(id);
      // Format date for input field if exists
      if (data.dateOfBirth) {
        const dateObj = new Date(data.dateOfBirth);
        const formattedDate = dateObj.toISOString().split('T')[0];
        data.dateOfBirth = formattedDate;
      }
      
      // Ensure middleName is never null
      const formattedData = {
        ...data,
        middleName: data.middleName || ''
      };
      
      setVoter(formattedData);
      if (data.photoUrl) {
        setPhotoPreview(data.photoUrl.startsWith('http') ? data.photoUrl : `${SERVER_URL}${data.photoUrl}`);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching voter details:', error);
      toast.error('Failed to load voter details');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVoter(prevVoter => ({
      ...prevVoter,
      [name]: value
    }));
    
    // Clear errors when user makes changes
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // Validate age - must be at least 18 years old
    if (voter.dateOfBirth) {
      const birthDate = new Date(voter.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 18) {
        newErrors.dateOfBirth = 'Voter must be at least 18 years old';
      }
    }
    
    // Validate required fields
    if (!voter.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!voter.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!voter.fatherName.trim()) newErrors.fatherName = 'Father\'s name is required';
    if (!voter.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!voter.voterId.trim()) newErrors.voterId = 'Voter ID is required';
    if (!voter.email.trim()) newErrors.email = 'Email is required';
    if (!voter.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    if (!voter.pincode.trim()) newErrors.pincode = 'Pincode is required';
    if (!voter.gender) newErrors.gender = 'Gender is required';
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (voter.email && !emailRegex.test(voter.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Validate phone number (basic validation)
    const phoneRegex = /^\d{10,15}$/;
    if (voter.phoneNumber && !phoneRegex.test(voter.phoneNumber.replace(/\D/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }
    
    // Validate pincode (6 digits for Indian pincode)
    const pincodeRegex = /^\d{6}$/;
    if (voter.pincode && !pincodeRegex.test(voter.pincode.trim())) {
      newErrors.pincode = 'Please enter a valid 6-digit pincode';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      // Scroll to the first error
      const firstError = document.querySelector('.error-message');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setSubmitting(true);
    
    try {
      const formData = new FormData();
      
      // Append all voter data to form data
      Object.keys(voter).forEach(key => {
        // Make sure empty strings for optional fields are not sent
        if (voter[key] !== null && voter[key] !== undefined) {
          formData.append(key, voter[key]);
        }
      });
      
      // Append photo if selected with a custom filename
      if (photoFile) {
        // Create a customized file name: voterId_timestamp.extension
        const fileExtension = photoFile.name.split('.').pop();
        const timestamp = new Date().getTime();
        const customFileName = `${voter.voterId.replace(/\s+/g, '_')}_${timestamp}.${fileExtension}`;
        
        // Create a new file with the custom name to preserve the extension
        const renamedFile = new File([photoFile], customFileName, {
          type: photoFile.type
        });
        
        formData.append('photo', renamedFile);
      }
      
      let result;
      if (isEditMode) {
        result = await voterService.updateVoter(id, formData);
        toast.success('Voter updated successfully');
        navigate(`/voters/${id}`);
      } else {
        result = await voterService.createVoter(formData);
        toast.success('Voter added successfully');
        navigate(`/voters/${result._id}`);
      }
    } catch (error) {
      console.error('Error saving voter:', error);
      
      // Check for specific field errors returned from the server
      if (error.response && error.response.data) {
        const { message, field } = error.response.data;
        
        if (field) {
          // Set specific field error
          setErrors(prev => ({
            ...prev,
            [field]: message
          }));
          
          // Scroll to the error field
          const errorField = document.getElementById(field);
          if (errorField) {
            errorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            errorField.focus();
          }
          
          toast.error(message);
        } else {
          toast.error(isEditMode ? 'Failed to update voter' : 'Failed to add voter');
        }
      } else {
        toast.error(isEditMode ? 'Failed to update voter' : 'Failed to add voter');
      }
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center">
          <Link to={isEditMode ? `/voters/${id}` : "/voters"} className="text-indigo-600 hover:text-indigo-800 mr-4 transition duration-200">
            <span className="inline-flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">{isEditMode ? 'Edit Voter' : 'Add New Voter'}</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={voter.firstName}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200`}
                      />
                      {errors.firstName && <p className="error-message mt-1 text-sm text-red-600">{errors.firstName}</p>}
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={voter.lastName}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200`}
                      />
                      {errors.lastName && <p className="error-message mt-1 text-sm text-red-600">{errors.lastName}</p>}
                    </div>

                    <div>
                      <label htmlFor="middleName" className="block text-sm font-medium text-gray-700 mb-1">
                        Middle Name <span className="text-gray-400">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        id="middleName"
                        name="middleName"
                        value={voter.middleName || ''}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border ${errors.middleName ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200`}
                      />
                    </div>

                    <div>
                      <label htmlFor="fatherName" className="block text-sm font-medium text-gray-700 mb-1">
                        Father's Name *
                      </label>
                      <input
                        type="text"
                        id="fatherName"
                        name="fatherName"
                        value={voter.fatherName}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border ${errors.fatherName ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200`}
                      />
                      {errors.fatherName && <p className="error-message mt-1 text-sm text-red-600">{errors.fatherName}</p>}
                    </div>

                    <div>
                      <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                        Gender *
                      </label>
                      <select
                        id="gender"
                        name="gender"
                        value={voter.gender || ''}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border ${errors.gender ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200`}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.gender && <p className="error-message mt-1 text-sm text-red-600">{errors.gender}</p>}
                    </div>

                    <div>
                      <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth * <span className="text-gray-400">(Must be 18+)</span>
                      </label>
                      <input
                        type="date"
                        id="dateOfBirth"
                        name="dateOfBirth"
                        value={voter.dateOfBirth || ''}
                        onChange={handleChange}
                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                        className={`w-full px-3 py-2 border ${errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200`}
                      />
                      {errors.dateOfBirth && <p className="error-message mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>}
                    </div>

                    <div>
                      <label htmlFor="voterId" className="block text-sm font-medium text-gray-700 mb-1">
                        Voter ID *
                      </label>
                      <input
                        type="text"
                        id="voterId"
                        name="voterId"
                        value={voter.voterId || ''}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border ${errors.voterId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200`}
                      />
                      {errors.voterId && <p className="error-message mt-1 text-sm text-red-600">{errors.voterId}</p>}
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={voter.email || ''}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200`}
                      />
                      {errors.email && <p className="error-message mt-1 text-sm text-red-600">{errors.email}</p>}
                    </div>

                    <div>
                      <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={voter.phoneNumber || ''}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border ${errors.phoneNumber ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200`}
                      />
                      {errors.phoneNumber && <p className="error-message mt-1 text-sm text-red-600">{errors.phoneNumber}</p>}
                    </div>

                    <div>
                      <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-1">
                        Pincode *
                      </label>
                      <input
                        type="text"
                        id="pincode"
                        name="pincode"
                        value={voter.pincode || ''}
                        onChange={handleChange}
                        placeholder="6-digit pincode"
                        className={`w-full px-3 py-2 border ${errors.pincode ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200`}
                      />
                      {errors.pincode && <p className="error-message mt-1 text-sm text-red-600">{errors.pincode}</p>}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Photo {!isEditMode && '*'}
                  </label>
                  <div className="mt-1 flex flex-col items-center">
                    {photoPreview ? (
                      <div className="mb-3 relative group">
                        <img 
                          src={photoPreview.startsWith('data:') ? photoPreview : photoPreview.startsWith('http') ? photoPreview : `${SERVER_URL}${photoPreview}`} 
                          alt="Preview" 
                          className="h-40 w-40 object-cover rounded-md border-2 border-gray-200 transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-md"></div>
                      </div>
                    ) : (
                      <div className="mb-3 border-2 border-dashed border-gray-300 h-40 w-40 flex flex-col items-center justify-center rounded-md bg-gray-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-gray-500 text-sm">No photo</span>
                      </div>
                    )}
                    <div className="w-full">
                      <label 
                        htmlFor="photo" 
                        className="flex items-center justify-center w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer transition duration-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                        </svg>
                        {photoPreview ? 'Change Photo' : 'Upload Photo'}
                      </label>
                      <input
                        type="file"
                        id="photo"
                        name="photo"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                        required={!isEditMode && !photoPreview}
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        JPG, PNG or GIF, max 5MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="pollingStation" className="block text-sm font-medium text-gray-700 mb-1">
                    Polling Station <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    id="pollingStation"
                    name="pollingStation"
                    value={voter.pollingStation || ''}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border ${errors.pollingStation ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200`}
                  />
                </div>

                <div>
                  <label htmlFor="ward" className="block text-sm font-medium text-gray-700 mb-1">
                    Ward <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    id="ward"
                    name="ward"
                    value={voter.ward || ''}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border ${errors.ward ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200`}
                  />
                </div>

                <div>
                  <label htmlFor="constituency" className="block text-sm font-medium text-gray-700 mb-1">
                    Constituency <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    id="constituency"
                    name="constituency"
                    value={voter.constituency || ''}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border ${errors.constituency ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address <span className="text-gray-400">(Optional)</span>
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={voter.address || ''}
                  onChange={handleChange}
                  rows="3"
                  className={`w-full px-3 py-2 border ${errors.address ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200`}
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <Link
                  to={isEditMode ? `/voters/${id}` : '/voters'}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition duration-200"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-medium rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-md hover:shadow-lg"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>{isEditMode ? 'Update Voter' : 'Add Voter'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoterForm; 