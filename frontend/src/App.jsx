import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';

// Components
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import VoterRoute from './components/VoterRoute';
import OfficerRoute from './components/OfficerRoute';

// Pages
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import VoterRegistration from './pages/voter/VoterRegistration';
import VoterDashboard from './pages/voter/VoterDashboard';
import ViewCandidates from './pages/voter/ViewCandidates';
import CastVote from './pages/voter/CastVote';
import VerifyVote from './pages/voter/VerifyVote';
import AdminDashboard from './pages/admin/AdminDashboard';
import ApproveVoters from './pages/admin/ApproveVoters';
import ManageCandidates from './pages/admin/ManageCandidates';
import ManageElection from './pages/admin/ManageElection';
import ArchivedElections from './pages/admin/ArchivedElections';
import OfficerDashboard from './pages/officer/OfficerDashboard';
import ElectionResults from './pages/officer/ElectionResults';
import Reports from './pages/officer/Reports';
import VerificationCenter from './pages/officer/VerificationCenter';
import MonitorVoting from './pages/officer/MonitorVoting';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Container fluid className="p-0">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        
        {/* Voter Routes */}
        <Route path="/voter" element={<VoterRoute><VoterDashboard /></VoterRoute>} />
        <Route path="/voter/register" element={<PrivateRoute><VoterRegistration /></PrivateRoute>} />
        <Route path="/voter/candidates" element={<VoterRoute><ViewCandidates /></VoterRoute>} />
        <Route path="/voter/vote" element={<VoterRoute><CastVote /></VoterRoute>} />
        <Route path="/voter/verify" element={<VoterRoute><VerifyVote /></VoterRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/voters" element={<AdminRoute><ApproveVoters /></AdminRoute>} />
        <Route path="/admin/candidates" element={<AdminRoute><ManageCandidates /></AdminRoute>} />
        <Route path="/admin/election" element={<AdminRoute><ManageElection /></AdminRoute>} />
        {/* <Route path="/admin/archived-elections" element={<AdminRoute><ArchivedElections /></AdminRoute>} /> */}
        
        {/* Officer Routes */}
        <Route path="/officer" element={<OfficerRoute><OfficerDashboard /></OfficerRoute>} />
        <Route path="/officer/statistics" element={<OfficerRoute><ElectionResults /></OfficerRoute>} />
        <Route path="/officer/statistics/:electionId" element={<OfficerRoute><ElectionResults /></OfficerRoute>} />
        <Route path="/officer/reports" element={<OfficerRoute><Reports /></OfficerRoute>} />
        <Route path="/officer/verification" element={<OfficerRoute><VerificationCenter /></OfficerRoute>} />
        <Route path="/officer/monitor" element={<OfficerRoute><MonitorVoting /></OfficerRoute>} />
        
        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Container>
  );
}

export default App; 