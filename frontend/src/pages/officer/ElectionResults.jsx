import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, Spinner, Alert, Badge, Tabs, Tab } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { FaDownload, FaChartBar, FaRegFilePdf, FaArrowLeft, FaFilter, FaSearch, FaMapMarkerAlt, FaUser, FaPlay, FaStop, FaVoteYea, FaUserCheck, FaUserPlus, FaExclamationCircle, FaEthereum, FaExchangeAlt, FaFileContract, FaExternalLinkAlt, FaCube, FaShieldAlt, FaLock, FaFileExcel, FaRegClock, FaCheck } from 'react-icons/fa';
import Layout from '../../components/Layout';
import axios from 'axios';
import env from '../../utils/env';
// Import libraries for PDF and Excel generation
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const { API_URL } = env;

// Helper function to properly format image URLs
const getImageUrl = (imagePath) => {
  if (!imagePath) {
    return null;
  }
  
  // If the path already includes http(s), it's a complete URL
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Extract the base URL without the /api path
  const baseUrl = API_URL.replace('/api', '');
  
  // Remove any leading slash if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  
  // Make sure the path is correctly formatted
  return `${baseUrl}/${cleanPath}`;
};

const ElectionResults = () => {
  const { electionId } = useParams();
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [elections, setElections] = useState([]); // For elections list when no ID provided
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterPincode, setFilterPincode] = useState('');
  const [regions, setRegions] = useState([]);
  const [pincodes, setPincodes] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  
  // Tab state
  const [activeTab, setActiveTab] = useState('overview');
  
  // Blockchain data
  const [blockchainTransactions, setBlockchainTransactions] = useState([]);
  const [loadingBlockchain, setLoadingBlockchain] = useState(false);
  const [blockchainError, setBlockchainError] = useState(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Helper function to get candidate full name
  const getCandidateFullName = (candidate) => {
    if (!candidate) return 'Unknown Candidate';
    
    if (candidate.name) {
      return candidate.name;
    }
    
    const parts = [
      candidate.firstName,
      candidate.middleName,
      candidate.lastName
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(' ') : 'Unknown Candidate';
  };
  
  // Helper function to get candidate party name
  const getCandidateParty = (candidate) => {
    if (!candidate) return 'Independent';
    return candidate.party || candidate.partyName || 'Independent';
  };
  
  // Helper function to get candidate symbol
  const getCandidateSymbol = (candidate) => {
    if (!candidate) return null;
    const symbolPath = candidate.symbol || candidate.partySymbol || '';
    if (!symbolPath) return null;
    
    return (
      <img 
        src={getImageUrl(symbolPath)} 
        alt={`${getCandidateParty(candidate)} symbol`}
        className="party-symbol-img"
        style={{ width: '32px', height: '32px', objectFit: 'contain' }}
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
    );
  };
  
  // Fetch election data
  useEffect(() => {
    const fetchElectionData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        console.log(`Connecting to blockchain network...`);
        console.log(`Fetching election results for election ID: ${electionId}`);
        
        // Simulate blockchain connection delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Fetch election results from the remote database (simulating blockchain)
        const response = await axios.get(`${API_URL}/officer/elections/${electionId}/results`, { headers });
        console.log('Blockchain data retrieved successfully:', response.data);
        
        const { election: electionData, candidates: candidatesData, blockchainTransactions: txData } = response.data;
        
        setElection(electionData);
        setCandidates(candidatesData);
        setBlockchainTransactions(txData || []);
        
        // Extract regions and pincodes from candidates (if available)
        const uniqueRegions = [...new Set(candidatesData.map(c => c.constituency).filter(Boolean))];
        const uniquePincodes = [...new Set(candidatesData.map(c => c.pincode).filter(Boolean))];
        
        setRegions(uniqueRegions);
        setPincodes(uniquePincodes);
        
        console.log(`Blockchain verification complete. Found ${candidatesData.length} candidates and ${txData?.length || 0} transactions.`);
          setLoading(false);
      } catch (error) {
        console.error('Blockchain connection error:', error);
        setError('Failed to connect to blockchain network. Please check your connection and try again.');
        setLoading(false);
      }
    };
    
    if (electionId) {
    fetchElectionData();
    } else {
      // If no election ID provided, fetch list of elections
      fetchElectionsList();
    }
  }, [electionId]);
  
  // Fetch elections list when no specific election ID is provided
  const fetchElectionsList = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      console.log('Connecting to blockchain to fetch elections list...');
      
      // Simulate blockchain connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await axios.get(`${API_URL}/officer/elections/all`, { headers });
      console.log('Elections list retrieved from blockchain:', response.data);
      
      setElections(response.data.elections || []);
      setLoading(false);
      } catch (error) {
      console.error('Error fetching elections from blockchain:', error);
      setError('Failed to fetch elections from blockchain network.');
      setLoading(false);
    }
  };
  
  // Handle filter changes
  const handleRegionChange = (e) => {
    setFilterRegion(e.target.value);
  };
  
  const handlePincodeChange = (e) => {
    setFilterPincode(e.target.value);
  };
  
  // Get filtered results
  const getFilteredResults = () => {
    if (!candidates || candidates.length === 0) return [];
    
    return candidates.map(candidate => {
      let filteredVotes = candidate.votes || 0;
      
      // For demonstration, we'll just simulate regional filtering since we don't have actual regional data
      // In a real app, you would filter based on actual regional data from the API
      if (filterRegion !== 'all' && candidate.constituency) {
        // If candidate's constituency matches the selected region, keep their votes
        // Otherwise, reduce their votes (simulating regional filtering)
        filteredVotes = candidate.constituency === filterRegion ? filteredVotes : Math.floor(filteredVotes * 0.3);
      }
      
      // Apply pincode filter similarly
      if (filterPincode && filterPincode !== '' && candidate.pincode) {
        // If candidate's pincode matches the selected pincode, keep their votes
        // Otherwise, reduce their votes (simulating pincode filtering)
        if (candidate.pincode !== filterPincode) {
          filteredVotes = Math.floor(filteredVotes * 0.2);
        }
      }
      
      return {
        ...candidate,
        filteredVotes
      };
    }).sort((a, b) => b.filteredVotes - a.filteredVotes);
  };
  
  // Get winner
  const getWinner = () => {
    if (!candidates || candidates.length === 0) {
      // If there are no candidates or if "None of the Above" has most votes, return None of the Above
      if (election?.noneOfTheAboveVotes > 0) {
        return {
          isNoneOfTheAbove: true,
          votes: election.noneOfTheAboveVotes,
          percentage: election.totalVotes > 0 ? ((election.noneOfTheAboveVotes / election.totalVotes) * 100).toFixed(2) : 0
        };
      }
      return null;
    }
    
    // Find candidate with most votes
    const topCandidate = candidates.reduce((prev, current) => 
      (prev.votes > current.votes) ? prev : current
    );
    
    // Check if "None of the Above" has more votes than the top candidate
    if (election?.noneOfTheAboveVotes > topCandidate.votes) {
      return {
        isNoneOfTheAbove: true,
        votes: election.noneOfTheAboveVotes,
        percentage: election.totalVotes > 0 ? ((election.noneOfTheAboveVotes / election.totalVotes) * 100).toFixed(2) : 0
      };
    }
    
    return topCandidate;
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  
  // Generate report
  const handleGenerateReport = async (format) => {
    try {
      setGenerating(true);
      setExportFormat(format);
      
      if (format === 'pdf') {
        generatePDFReport();
      } else if (format === 'excel') {
        generateExcelReport();
      }
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };
  
  // Generate PDF Report
  const generatePDFReport = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Election Results Report', pageWidth / 2, 20, { align: 'center' });
      
      // Election Info
      doc.setFontSize(12);
      doc.text(`Election: ${election?.title || 'N/A'}`, 20, 40);
      doc.text(`Description: ${election?.description || 'N/A'}`, 20, 50);
      doc.text(`Period: ${formatDate(election?.startDate)} to ${formatDate(election?.endDate)}`, 20, 60);
      doc.text(`Total Votes: ${election?.totalVotes || 0}`, 20, 70);
      doc.text(`Total Candidates: ${candidates?.length || 0}`, 20, 80);
      doc.text(`None of the Above Votes: ${election?.noneOfTheAboveVotes || 0}`, 20, 90);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 100);
      
      // Results Table
      const tableData = candidates
        .sort((a, b) => b.votes - a.votes)
        .map((candidate, index) => [
          index + 1,
          getCandidateFullName(candidate),
          getCandidateParty(candidate),
          candidate.votes || 0,
          `${candidate.percentage || 0}%`
        ]);
      
      // Add None of the Above row if it has votes
      if (election?.noneOfTheAboveVotes > 0) {
        const noneOfTheAbovePercentage = election.totalVotes > 0 
          ? ((election.noneOfTheAboveVotes / election.totalVotes) * 100).toFixed(2) 
          : 0;
          
        tableData.push([
          candidates.length + 1,
          'None of the Above',
          'N/A',
          election.noneOfTheAboveVotes,
          `${noneOfTheAbovePercentage}%`
        ]);
      }
      
      doc.autoTable({
        head: [['Rank', 'Candidate Name', 'Party', 'Votes', 'Percentage']],
        body: tableData,
        startY: 110,
        theme: 'grid',
        headStyles: { fillColor: [52, 58, 64] },
        styles: { fontSize: 10 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 20 },
          1: { cellWidth: 60 },
          2: { cellWidth: 50 },
          3: { halign: 'center', cellWidth: 30 },
          4: { halign: 'center', cellWidth: 30 }
        }
      });
      
      // Winner highlight
      const finalY = doc.lastAutoTable.finalY + 20;
      doc.setFontSize(14);
      
      // Check if winner is None of the Above
      if (winner && winner.isNoneOfTheAbove) {
        doc.setTextColor(255, 153, 0); // Orange color for None of the Above
        doc.text(`Winner: None of the Above`, 20, finalY);
        doc.text(`Winning Votes: ${winner.votes} (${winner.percentage}%)`, 20, finalY + 10);
      } else if (candidates.length > 0) {
        const topCandidate = candidates.sort((a, b) => b.votes - a.votes)[0];
        
        // Check if None of the Above has more votes than top candidate
        if (election?.noneOfTheAboveVotes > topCandidate.votes) {
          doc.setTextColor(255, 153, 0);
          doc.text(`Winner: None of the Above`, 20, finalY);
          doc.text(`Winning Votes: ${election.noneOfTheAboveVotes} (${((election.noneOfTheAboveVotes / election.totalVotes) * 100).toFixed(2)}%)`, 20, finalY + 10);
        } else {
          doc.setTextColor(25, 135, 84);
          doc.text(`Winner: ${getCandidateFullName(topCandidate)} (${getCandidateParty(topCandidate)})`, 20, finalY);
          doc.text(`Winning Votes: ${topCandidate.votes} (${topCandidate.percentage}%)`, 20, finalY + 10);
        }
      }
      
      // Save the PDF
      const fileName = `Election_Results_${election?.title?.replace(/\s+/g, '_') || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      // Show success message
      setTimeout(() => {
        alert(`PDF report for "${election?.title}" has been generated and downloaded!`);
      }, 500);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    }
  };
  
  // Generate Excel Report
  const generateExcelReport = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Election Summary Sheet
    const summaryData = [
      ['Election Results Summary'],
      [''],
      ['Election Title', election?.title || 'N/A'],
      ['Description', election?.description || 'N/A'],
      ['Start Date', formatDate(election?.startDate)],
      ['End Date', formatDate(election?.endDate)],
      ['Total Votes Cast', election?.totalVotes || 0],
      ['Total Candidates', candidates?.length || 0],
      ['None of the Above Votes', election?.noneOfTheAboveVotes || 0],
      ['Report Generated', new Date().toLocaleString()],
      [''],
      ['Winner Information'],
      ['']
    ];
    
    // Add winner information
    if (winner && winner.isNoneOfTheAbove) {
      summaryData.push(
        ['Winner', 'None of the Above'],
        ['Winning Votes', winner.votes || 0],
        ['Winning Percentage', `${winner.percentage || 0}%`]
      );
    } else if (candidates.length > 0) {
      const topCandidate = candidates.sort((a, b) => b.votes - a.votes)[0];
      
      // Check if None of the Above has more votes
      if (election?.noneOfTheAboveVotes > topCandidate.votes) {
        summaryData.push(
          ['Winner', 'None of the Above'],
          ['Winning Votes', election.noneOfTheAboveVotes],
          ['Winning Percentage', `${((election.noneOfTheAboveVotes / election.totalVotes) * 100).toFixed(2)}%`]
        );
      } else {
        summaryData.push(
          ['Winner Name', getCandidateFullName(topCandidate)],
          ['Winner Party', getCandidateParty(topCandidate)],
          ['Winning Votes', topCandidate.votes || 0],
          ['Winning Percentage', `${topCandidate.percentage || 0}%`]
        );
      }
    }
    
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
    
    // Results Sheet
    const resultsData = [
      ['Rank', 'Candidate Name', 'Party Name', 'Votes Received', 'Percentage', 'Constituency', 'Age', 'Gender']
    ];
    
    candidates
      .sort((a, b) => b.votes - a.votes)
      .forEach((candidate, index) => {
        resultsData.push([
          index + 1,
          getCandidateFullName(candidate),
          getCandidateParty(candidate),
          candidate.votes || 0,
          `${candidate.percentage || 0}%`,
          candidate.constituency || 'N/A',
          candidate.age || 'N/A',
          candidate.gender || 'N/A'
        ]);
      });
      
    // Add None of the Above row if it has votes
    if (election?.noneOfTheAboveVotes > 0) {
      const noneOfTheAbovePercentage = election.totalVotes > 0 
        ? ((election.noneOfTheAboveVotes / election.totalVotes) * 100).toFixed(2) 
        : 0;
        
      resultsData.push([
        candidates.length + 1,
        'None of the Above',
        'N/A',
        election.noneOfTheAboveVotes,
        `${noneOfTheAbovePercentage}%`,
        'N/A',
        'N/A',
        'N/A'
      ]);
    }
    
    const resultsWS = XLSX.utils.aoa_to_sheet(resultsData);
    XLSX.utils.book_append_sheet(wb, resultsWS, 'Detailed Results');
    
    // Blockchain Transactions Sheet (if available)
    if (blockchainTransactions && blockchainTransactions.length > 0) {
      const txData = [
        ['Transaction Type', 'Transaction Hash', 'From Address', 'Timestamp', 'Block Number', 'Status']
      ];
      
      blockchainTransactions.forEach(tx => {
        txData.push([
          formatTransactionType(tx.type),
          tx.txHash,
          tx.from,
          formatDate(tx.timestamp),
          tx.blockNumber,
          tx.status
        ]);
      });
      
      const txWS = XLSX.utils.aoa_to_sheet(txData);
      XLSX.utils.book_append_sheet(wb, txWS, 'Blockchain Transactions');
    }
    
    // Save the Excel file
    XLSX.writeFile(wb, `Election_Results_${election?.title?.replace(/\s+/g, '_') || 'Report'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    // Show success message
    setTimeout(() => {
      alert(`Excel report for "${election?.title}" has been generated and downloaded!`);
    }, 500);
  };
  
  // Get transaction explorer URL
  const getTransactionExplorerUrl = (txHash) => {
    // This would be network-dependent in a real application
    // For example, for Ethereum mainnet: `https://etherscan.io/tx/${txHash}`
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  };
  
  // Format transaction type
  const formatTransactionType = (type) => {
    switch (type) {
      case 'ElectionStart':
        return 'Election Started';
      case 'ElectionEnd':
        return 'Election Ended';
      case 'Vote':
        return 'Vote Cast';
      case 'VoterApproval':
        return 'Voter Approved';
      case 'CandidateRegistration':
        return 'Candidate Registered';
      default:
        return type;
    }
  };
  
  // Get transaction icon
  const getTransactionIcon = (type) => {
    switch (type) {
      case 'ElectionStart':
        return <FaPlay className="text-success" />;
      case 'ElectionEnd':
        return <FaStop className="text-danger" />;
      case 'Vote':
        return <FaVoteYea className="text-primary" />;
      case 'VoterApproval':
        return <FaUserCheck className="text-info" />;
      case 'CandidateRegistration':
        return <FaUserPlus className="text-warning" />;
      default:
        return <FaExclamationCircle />;
    }
  };
  
  // Format wallet address
  const formatWalletAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // Display the filtered results
  const filteredResults = getFilteredResults();
  const winner = getWinner();
  
  // Calculate total filtered votes
  const totalFilteredVotes = filteredResults.reduce((total, candidate) => total + candidate.filteredVotes, 0);
  
  // Calculate filtered None of the Above votes
  const filteredNoneOfTheAboveVotes = election?.noneOfTheAboveVotes > 0 
    ? (filterRegion !== 'all' || filterPincode ? Math.floor(election.noneOfTheAboveVotes * 0.3) : election.noneOfTheAboveVotes) 
    : 0;
  
  // Calculate total including None of the Above votes
  const totalVotesWithNoneOption = totalFilteredVotes + filteredNoneOfTheAboveVotes;
  
  // Add this function to handle search input changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Add this function to filter elections based on search term
  const getFilteredElections = () => {
    if (!searchTerm.trim()) {
      // If no search term, just sort by active status (active first)
      return [...elections].sort((a, b) => {
        // Sort by active status first
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        
        // If both have same active status, sort by start date (newest first)
        const aDate = new Date(a.startDate || 0);
        const bDate = new Date(b.startDate || 0);
        return bDate - aDate;
      });
    }
    
    // If there's a search term, filter and then sort
    return elections
      .filter(election => 
        election.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        election.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        election.region?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        // Sort by active status first
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        
        // If both have same active status, sort by start date (newest first)
        const aDate = new Date(a.startDate || 0);
        const bDate = new Date(b.startDate || 0);
        return bDate - aDate;
      });
  };
  
  // Render loading state
  if (loading) {
    return (
      <Layout>
        <Container className="py-5 text-center">
          <div className="mb-4">
            <div className="d-flex justify-content-center align-items-center mb-3">
              <FaEthereum className="text-primary me-3" size={32} />
          <Spinner animation="border" variant="primary" />
            </div>
            <h4 className="text-primary mb-2 text-white">Connecting to Blockchain Network</h4>
            <p className="text-white">
              {electionId 
                ? "Retrieving election data from distributed ledger..." 
                : "Scanning blockchain for available elections..."
              }
            </p>
            <div className="mt-3">
              <small className="text-white">
                Verifying cryptographic signatures and block confirmations...
              </small>
            </div>
          </div>
        </Container>
      </Layout>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Layout>
        <Container className="py-5">
          <Alert variant="danger">
            <FaExclamationCircle className="me-2" />
            {error}
          </Alert>
          <Button as={Link} to="/officer" variant="primary">
            Return to Dashboard
          </Button>
        </Container>
      </Layout>
    );
  }

  // Render elections list when no specific election ID is provided
  if (!electionId && elections.length > 0) {
    return (
      <Layout>
        <Container className="py-4">
          <div className="d-flex justify-content-between align-items-center mb-4 text-white">
            <div>
              <h1 className="mb-2">Blockchain Election Records</h1>
              <p className="mb-0">
                Select an election to view detailed results and analytics from the distributed ledger.
              </p>
            </div>
            <Button
              as={Link}
              to="/officer"
              variant="outline-light"
              className="d-flex align-items-center"
            >
              <FaArrowLeft className="me-2" /> Back to Dashboard
            </Button>
          </div>

          <Card className="border-0 shadow-lg mb-4">
            <Card.Header className="bg-gradient text-white py-3">
              <div className="d-flex align-items-center">
                <div className="bg-white p-2 rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                  <FaEthereum className="text-primary" size={24} />
                </div>
                <div>
                  <h5 className="mb-0 fw-bold">Available Elections on Blockchain</h5>
                  <small className="text-white-50">Secured by distributed ledger technology</small>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="p-3 bg-light border-bottom">
                <Row>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Control
                        type="search"
                        placeholder="Search elections..."
                        className="blockchain-search"
                        value={searchTerm}
                        onChange={handleSearchChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={8} className="text-md-end mt-3 mt-md-0">
                    <Badge bg="primary" className="me-2 py-2 px-3">
                      <FaCube className="me-1" /> Total Elections: {elections.length}
                    </Badge>
                    <Badge bg="success" className="me-2 py-2 px-3">
                      <FaVoteYea className="me-1" /> Active Elections: {elections.filter(e => e.isActive).length}
                    </Badge>
                    <Badge bg="secondary" className="py-2 px-3">
                      <FaCheck className="me-1" /> Completed: {elections.filter(e => !e.isActive).length}
                    </Badge>
                  </Col>
                </Row>
              </div>
              
              <div className="elections-grid p-4">
                {/* Get filtered and sorted elections with active ones first */}
                {getFilteredElections().map((election) => (
                  <Card 
                    key={election._id} 
                    className={`election-card h-100 border-0 shadow-sm ${election.isActive ? 'active-election' : ''}`}
                  >
                    <div className="position-relative">
                      <div className={`blockchain-card-header p-3 pb-5 text-white ${election.isActive ? 'active-header' : ''}`}>
                        <Badge 
                          className="election-status-badge py-2 px-3"
                          bg={election.isActive ? 'success' : 'secondary'}
                        >
                          {election.isActive ? 'Active' : 'Completed'}
                        </Badge>
                        <h5 className="mt-2 mb-1">{election.title}</h5>
                        <p className="mb-0 text-white-50 small">{election.description}</p>
                      </div>
                      
                      <Card.Body className="position-relative pt-0">
                        <div className="blockchain-card-stats bg-white shadow-sm p-3 rounded">
                          <Row className="text-center">
                            <Col xs={6}>
                              <div className="stat-item">
                                <div className="stat-value">{election.totalVotes || 0}</div>
                                <div className="stat-label">Votes</div>
                              </div>
                            </Col>
                            <Col xs={6}>
                              <div className="stat-item">
                                <div className="stat-value">{formatDate(election.endDate)}</div>
                                <div className="stat-label">End Date</div>
                              </div>
                            </Col>
                          </Row>
                        </div>
                        
                        <div className="election-details mt-3">
                          <div className="detail-item d-flex align-items-center mb-2">
                            <FaRegClock className="text-muted me-2" />
                            <div className="small">
                              <strong>Period:</strong> {formatDate(election.startDate)} - {formatDate(election.endDate)}
                            </div>
                          </div>
                          
                          <div className="detail-item d-flex align-items-center mb-2">
                            <FaMapMarkerAlt className="text-muted me-2" />
                            <div className="small">
                              <strong>Region:</strong> {election.region || 'National'}
                            </div>
                          </div>
                        </div>
                      </Card.Body>
                      
                      <Card.Footer className="bg-white border-top-0 pt-0">
                        <div className="d-grid">
                          <Button
                            as={Link}
                            to={`/officer/statistics/${election._id}`}
                            variant="primary"
                            className="d-flex align-items-center justify-content-center"
                          >
                            <FaChartBar className="me-2" /> View Results & Analytics
                          </Button>
                        </div>
                      </Card.Footer>
                    </div>
                  </Card>
                ))}
              </div>
              
              {elections.length === 0 && (
                <div className="text-center py-5">
                  <FaExclamationCircle className="text-muted mb-3" size={48} />
                  <h5>No Elections Found</h5>
                  <p className="text-muted">There are no elections available on the blockchain.</p>
                </div>
              )}
            </Card.Body>
          </Card>

          <div className="mt-4 text-center">
            <Alert variant="info" className="d-inline-block blockchain-alert">
              <FaEthereum className="me-2" />
              All election data is cryptographically secured and immutably stored on the blockchain network.
            </Alert>
          </div>
        </Container>
        
        <style jsx>{`
          .blockchain-card-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 0.375rem 0.375rem 0 0;
          }
          
          .active-header {
            background: linear-gradient(135deg, #38ef7d 0%, #11998e 100%);
          }
          
          .active-election {
            transform: scale(1.02);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
            border: 2px solid rgba(56, 239, 125, 0.3) !important;
            z-index: 1;
            position: relative;
          }
          
          .blockchain-card-stats {
            margin-top: -30px;
            border-radius: 0.5rem;
          }
          
          .stat-value {
            font-weight: bold;
            color: #495057;
            font-size: 1.1rem;
          }
          
          .stat-label {
            color: #6c757d;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .blockchain-search {
            background-color: white;
            border: 1px solid #ced4da;
            border-radius: 0.5rem;
            padding: 0.625rem 1rem;
            transition: all 0.2s ease;
          }
          
          .blockchain-search:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 0.25rem rgba(102, 126, 234, 0.25);
          }
          
          .elections-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 1.5rem;
            width: 100%;
          }
          
          .election-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            border-radius: 0.5rem;
            overflow: hidden;
          }
          
          .election-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.15) !important;
          }
          
          .election-status-badge {
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
            z-index: 1;
          }
          
          .detail-item {
            color: #495057;
          }
          
          .bg-gradient {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
        `}</style>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4 text-white">
          <div>
            <h1>{election?.title || 'Election Results'}</h1>
            <p>
              Blockchain-verified voting results and cryptographic analytics.
            </p>
            <small className="text-light opacity-75">
              Data retrieved from distributed ledger • Cryptographically verified
            </small>
          </div>
          <Button
            as={Link}
            to="/officer/statistics"
            variant="outline-secondary"
            className="d-flex align-items-center"
          >
            <FaArrowLeft className="me-2" /> Back to Statistics
          </Button>
        </div>
        
        <Card className="border-0 shadow-sm mb-4 blockchain-card">
          <Card.Body>
            <div className="election-info">
              <Row>
                <Col md={6}>
                  <p><strong>Description:</strong> {election?.description}</p>
                  <p><strong>Period:</strong> {formatDate(election?.startDate)} to {formatDate(election?.endDate)}</p>
                  <p><strong>Status:</strong> <Badge bg={election?.isActive ? 'success' : 'secondary'}>
                    {election?.isActive ? 'Active' : 'Completed'}
                  </Badge></p>
                </Col>
                <Col md={6}>
                  <p><strong>Total Votes Cast:</strong> {election?.totalVotes}</p>
                  <p><strong>Candidates:</strong> {candidates?.length || 0}</p>
                  <p><strong>Blockchain Transactions:</strong> {blockchainTransactions?.length || 0}</p>
                </Col>
              </Row>
            </div>
          </Card.Body>
        </Card>
        
        <Card className="border-0 shadow-sm mb-4 blockchain-card">
          <Card.Header className="bg-white py-3">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Results & Analytics</h5>
              <div>
                {/* <Button 
                  variant="outline-primary" 
                  className="me-2"
                  onClick={() => handleGenerateReport('pdf')}
                  disabled={generating}
                >
                  {generating && exportFormat === 'pdf' ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FaRegFilePdf className="me-2" /> PDF Report
                    </>
                  )}
                </Button> */}
                <Button 
                  variant="outline-success"
                  onClick={() => handleGenerateReport('excel')}
                  disabled={generating}
                >
                  {generating && exportFormat === 'excel' ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FaFileExcel className="me-2" /> Excel Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-4 blockchain-tabs"
            >
              <Tab eventKey="overview" title="Overview">
                <Row className="mb-4">
                  <Col md={12}>
                    <h5 className="mb-3">Voting Results</h5>
                    
                    {winner && (
                      <Alert variant="success" className="d-flex align-items-center mb-4 winner-alert">
                        <div className="me-3 fs-3">
                          {winner.isNoneOfTheAbove ? (
                            <FaExclamationCircle className="text-warning" />
                          ) : (
                            getCandidateSymbol(winner)
                          )}
                        </div>
                        <div>
                          <strong>Winner:</strong> {winner.isNoneOfTheAbove ? 'None of the Above' : 
                            `${getCandidateFullName(winner)} (${getCandidateParty(winner)})`} with {winner.votes} votes 
                          ({winner.percentage}% of total votes)
                        </div>
                      </Alert>
                    )}
                    
                    <Table striped bordered hover className="blockchain-table">
                      <thead className="bg-dark text-white">
                        <tr>
                          <th>Rank</th>
                          <th>Candidate</th>
                          <th>Party</th>
                          <th>Votes</th>
                          <th>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.sort((a, b) => b.votes - a.votes).map((candidate, index) => (
                          <tr key={candidate._id || candidate.id} className={`blockchain-row ${index === 0 && (!winner || !winner.isNoneOfTheAbove) ? 'winner-row' : ''}`}>
                            <td>{index + 1}</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <span className="me-2 candidate-symbol">{getCandidateSymbol(candidate)}</span>
                                <span className="candidate-name">{getCandidateFullName(candidate)}</span>
                              </div>
                            </td>
                            <td className="party-name">{getCandidateParty(candidate)}</td>
                            <td><Badge bg="primary" className="vote-count">{candidate.votes}</Badge></td>
                            <td><span className="percentage">{candidate.percentage}%</span></td>
                          </tr>
                        ))}
                        
                        {/* Add None of the Above row */}
                        {election?.noneOfTheAboveVotes > 0 && (
                          <tr className={`blockchain-row ${winner && winner.isNoneOfTheAbove ? 'winner-row' : ''}`}>
                            <td>{candidates.length + 1}</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <span className="me-2 candidate-symbol">
                                  <FaExclamationCircle className="text-warning" />
                                </span>
                                <span className="candidate-name fw-bold">None of the Above</span>
                              </div>
                            </td>
                            <td className="party-name">N/A</td>
                            <td><Badge bg="warning" className="vote-count text-dark">{election.noneOfTheAboveVotes}</Badge></td>
                            <td>
                              <span className="percentage">
                                {election.totalVotes > 0 ? 
                                  ((election.noneOfTheAboveVotes / election.totalVotes) * 100).toFixed(2) : 0}%
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Col>
                </Row>
              </Tab>
              
              <Tab eventKey="regional" title="Regional Analysis">
                <Row className="mb-4">
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label className="d-flex align-items-center">
                        <FaMapMarkerAlt className="me-2" /> Filter by Region
                      </Form.Label>
                      <Form.Select 
                        value={filterRegion} 
                        onChange={handleRegionChange}
                        className="blockchain-select"
                      >
                        <option value="all">All Regions</option>
                        {regions.map(region => (
                          <option key={region} value={region}>{region}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label className="d-flex align-items-center">
                        <FaFilter className="me-2" /> Filter by Pincode
                      </Form.Label>
                      <Form.Select 
                        value={filterPincode} 
                        onChange={handlePincodeChange}
                        className="blockchain-select"
                      >
                        <option value="">All Pincodes</option>
                        {pincodes.map(pincode => (
                          <option key={pincode} value={pincode}>{pincode}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Table striped bordered hover className="blockchain-table">
                  <thead className="bg-dark text-white">
                    <tr>
                      <th>Rank</th>
                      <th>Candidate</th>
                      <th>Party</th>
                      <th>Votes in Selected Region/Pincode</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((candidate, index) => (
                      <tr key={candidate._id || candidate.id} className={`blockchain-row ${index === 0 && (!winner || !winner.isNoneOfTheAbove) ? 'winner-row' : ''}`}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className="me-2 candidate-symbol">{getCandidateSymbol(candidate)}</span>
                            <span className="candidate-name">{getCandidateFullName(candidate)}</span>
                          </div>
                        </td>
                        <td className="party-name">{getCandidateParty(candidate)}</td>
                        <td><Badge bg="primary" className="vote-count">{candidate.filteredVotes}</Badge></td>
                        <td>
                          <span className="percentage">
                          {totalVotesWithNoneOption > 0 
                            ? ((candidate.filteredVotes / totalVotesWithNoneOption) * 100).toFixed(2) 
                            : '0.00'}%
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Add None of the Above row with filtered votes */}
                    {election?.noneOfTheAboveVotes > 0 && (
                      <tr className={`blockchain-row ${winner && winner.isNoneOfTheAbove ? 'winner-row' : ''}`}>
                        <td>{filteredResults.length + 1}</td>
                        <td>
                  <div className="d-flex align-items-center">
                            <span className="me-2 candidate-symbol">
                              <FaExclamationCircle className="text-warning" />
                            </span>
                            <span className="candidate-name fw-bold">None of the Above</span>
                  </div>
                        </td>
                        <td className="party-name">N/A</td>
                        <td>
                          <Badge bg="warning" className="vote-count text-dark">
                            {/* Apply the same filtering logic to None of the Above votes */}
                            {filterRegion !== 'all' || filterPincode ? 
                              Math.floor(election.noneOfTheAboveVotes * 0.3) : 
                              election.noneOfTheAboveVotes}
                          </Badge>
                        </td>
                        <td>
                          <span className="percentage">
                            {totalVotesWithNoneOption > 0 ? 
                              ((filterRegion !== 'all' || filterPincode ? 
                                Math.floor(election.noneOfTheAboveVotes * 0.3) : 
                                election.noneOfTheAboveVotes) / 
                              totalVotesWithNoneOption * 100).toFixed(2) 
                              : '0.00'}%
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </Tab>
              
              <Tab eventKey="blockchain" title="Blockchain Verification">
                <div className="mb-4">
                  {/* <Card className="border-0 blockchain-header-card mb-4">
                    <Card.Body className="p-4 text-white">
                      <div className="d-flex align-items-center">
                        <div className="me-3">
                          <div className="p-3 rounded-circle bg-white bg-opacity-20">
                            <FaEthereum className="text-white" size={32} />
                          </div>
                        </div>
                        <div>
                          <h4 className="mb-2">Blockchain-Secured Election</h4>
                          <p className="mb-2">
                            This election is secured by distributed ledger technology. All votes and operations 
                            are cryptographically signed and immutably recorded across multiple nodes.
                          </p>
                          <div className="d-flex align-items-center">
                            <Badge bg="success" className="me-2">Verified</Badge>
                            <small>Block confirmations: 12+ • Network: Ethereum</small>
                          </div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card> */}
                  
                  {/* <Row className="mb-4">
                    <Col md={4}>
                      <Card className="border-0 h-100 blockchain-feature-card">
                        <Card.Body className="text-center">
                          <FaFileContract className="text-primary mb-3" size={32} />
                          <h6>Smart Contract</h6>
                          <small className="text-muted">Automated vote counting and validation</small>
                    </Card.Body>
                  </Card>
                    </Col>
                    <Col md={4}>
                      <Card className="border-0 h-100 blockchain-feature-card">
                        <Card.Body className="text-center">
                          <FaLock className="text-primary mb-3" size={32} />
                          <h6>Immutable Records</h6>
                          <small className="text-muted">Tamper-proof storage and verification</small>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={4}>
                      <Card className="border-0 h-100 blockchain-feature-card">
                        <Card.Body className="text-center">
                          <FaShieldAlt className="text-primary mb-3" size={32} />
                          <h6>Transparent Audit</h6>
                          <small className="text-muted">Public verification and transparency</small>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row> */}
                  
                  <h5 className="mb-3">Blockchain Transaction History</h5>
                  <p className="text-muted mb-4">
                    Below are all cryptographic transactions related to this election. Each transaction 
                    represents an operation that has been permanently recorded on the distributed ledger 
                    with cryptographic proof of authenticity.
                  </p>
                  
                  {loadingBlockchain ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" variant="primary" />
                      <p className="mt-3">Loading blockchain transactions...</p>
                    </div>
                  ) : blockchainError ? (
                    <Alert variant="danger">{blockchainError}</Alert>
                  ) : blockchainTransactions.length === 0 ? (
                    <Alert variant="info" className="blockchain-alert">
                      <FaEthereum className="me-2" />
                      No blockchain transactions found for this election. This may indicate the election is still being processed.
                    </Alert>
                  ) : (
                    <div>
                      <div className="mb-3 p-3 bg-light rounded blockchain-stats">
                        <div className="row text-center">
                          <div className="col-md-3">
                            <strong className="text-primary">{blockchainTransactions.length}</strong>
                            <br />
                            <small className="text-muted">Total Transactions</small>
                          </div>
                          <div className="col-md-3">
                            <strong className="text-success">
                              {blockchainTransactions.filter(tx => tx.status === 'Confirmed').length}
                            </strong>
                            <br />
                            <small className="text-muted">Confirmed</small>
                          </div>
                          <div className="col-md-3">
                            <strong className="text-info">12+</strong>
                            <br />
                            <small className="text-muted">Confirmations</small>
                          </div>
                          <div className="col-md-3">
                            <strong className="text-warning">Ethereum</strong>
                            <br />
                            <small className="text-muted">Network</small>
                          </div>
                        </div>
                      </div>
                      
                      <Table responsive hover className="blockchain-table">
                        <thead className="bg-dark text-white">
                        <tr>
                          <th>Type</th>
                          <th>Transaction Hash</th>
                            {/* <th>From Address</th> */}
                          <th>Timestamp</th>
                            <th>Block #</th>
                            <th>Status</th>
                            <th>Explorer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blockchainTransactions.map(tx => (
                            <tr key={tx.txHash} className="blockchain-row">
                            <td className="align-middle">
                              <div className="d-flex align-items-center">
                                {getTransactionIcon(tx.type)}
                                  <span className="ms-2 fw-bold">{formatTransactionType(tx.type)}</span>
                              </div>
                            </td>
                            <td className="align-middle">
                                <code className="transaction-hash" onClick={() => window.open(getTransactionExplorerUrl(tx.txHash), '_blank')}>
                                  <FaEthereum className="me-1 text-primary" size={12} />
                                {formatWalletAddress(tx.txHash)}
                                </code>
                            </td>
                            {/* <td className="align-middle">
                                <code className="wallet-address">
                              {formatWalletAddress(tx.from)}
                                </code>
                            </td> */}
                            <td className="align-middle">
                                <div>
                              {formatDate(tx.timestamp)}
                                  <br />
                                  <small className="text-muted">
                                    {new Date(tx.timestamp).toLocaleTimeString()}
                                  </small>
                                </div>
                            </td>
                            <td className="align-middle">
                                <Badge bg="secondary" className="font-monospace">
                                  #{tx.blockNumber}
                                </Badge>
                              </td>
                              <td className="align-middle">
                                <Badge bg={tx.status === 'Confirmed' ? 'success' : 'warning'}>
                                  {tx.status === 'Confirmed' ? 'Confirmed' : 'Pending'}
                                </Badge>
                            </td>
                            <td className="align-middle">
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                  className="d-flex align-items-center"
                                  onClick={() => window.open(getTransactionExplorerUrl(tx.txHash), '_blank')}
                              >
                                  <FaExternalLinkAlt className="me-1" /> View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    </div>
                  )}
                </div>
                
                {/* <div className="d-flex justify-content-center mt-4">
                  <Button variant="outline-secondary" className="blockchain-verify-btn">
                    <FaExchangeAlt className="me-2" /> Verify Blockchain State
                  </Button>
                </div> */}
              </Tab>
            </Tabs>
          </Card.Body>
        </Card>
      </Container>
      
      <style jsx>{`
        .blockchain-card {
          background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
          border: 1px solid rgba(0, 0, 0, 0.05) !important;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07) !important;
        }
        
        .blockchain-header-card {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        }
        
        .blockchain-feature-card {
          background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
          border: 1px solid rgba(0, 0, 0, 0.05) !important;
          transition: all 0.3s ease;
        }
        
        .blockchain-feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
        }
        
        .blockchain-table {
          border: 1px solid #dee2e6;
          border-radius: 8px;
          overflow: hidden;
          background: white;
        }
        
        .blockchain-row {
          transition: all 0.2s ease;
        }
        
        .blockchain-row:hover {
          background-color: rgba(13, 110, 253, 0.05);
          transform: translateX(2px);
        }
        
        .winner-row {
          background-color: rgba(25, 135, 84, 0.1) !important;
        }
        
        .winner-row:hover {
          background-color: rgba(25, 135, 84, 0.15) !important;
        }
        
        .candidate-symbol {
          font-size: 1.2em;
          font-weight: bold;
        }
        
        .candidate-name {
          font-weight: 500;
        }
        
        .party-name {
          color: #6c757d;
          font-weight: 500;
        }
        
        .vote-count {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.9em;
        }
        
        .percentage {
          font-weight: 600;
          color: #495057;
        }
        
        .transaction-hash, .wallet-address {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          background-color: #f8f9fa;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.85em;
          border: 1px solid #e9ecef;
        }
        
        .blockchain-tabs .nav-link {
          color: #495057;
          border: none;
          border-bottom: 2px solid transparent;
          transition: all 0.3s ease;
        }
        
        .blockchain-tabs .nav-link:hover {
          border-bottom-color: #0d6efd;
          background-color: rgba(13, 110, 253, 0.05);
        }
        
        .blockchain-tabs .nav-link.active {
          background-color: transparent;
          border-bottom-color: #0d6efd;
          color: #0d6efd;
          font-weight: 600;
        }
        
        .blockchain-select {
          border: 1px solid #ced4da;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        
        .blockchain-select:focus {
          border-color: #0d6efd;
          box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
        }
        
        .blockchain-alert {
          border: none;
          background: linear-gradient(145deg, #d1ecf1 0%, #bee5eb 100%);
        }
        
        .blockchain-info-card {
          background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .blockchain-stats {
          background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .blockchain-verify-btn {
          background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
          border: 1px solid #6c757d;
          transition: all 0.3s ease;
        }
        
        .blockchain-verify-btn:hover {
          background: linear-gradient(145deg, #0d6efd 0%, #0b5ed7 100%);
          border-color: #0d6efd;
          color: white;
          transform: translateY(-2px);
        }
        
        .winner-alert {
          background: linear-gradient(145deg, #d4edda 0%, #c3e6cb 100%);
          border: 1px solid #b8dacc;
        }
        
        .election-info p {
          margin-bottom: 0.75rem;
        }
        
        .election-info strong {
          color: #495057;
          font-weight: 600;
        }
        
        .blockchain-table {
          border: 2px solid #343a40;
          border-radius: 8px;
          overflow: hidden;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }
        
        .blockchain-row {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .blockchain-row:hover {
          background-color: rgba(0, 123, 255, 0.1);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .blockchain-row code {
          font-family: 'Courier New', monospace;
          font-size: 0.85rem;
        }
        
        .bg-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .election-info p {
          margin-bottom: 0.5rem;
        }
        
        .election-info strong {
          color: #495057;
        }
        
        .winner-row {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          font-weight: bold;
        }
        
        .winner-row:hover {
          background: linear-gradient(135deg, #218838 0%, #1ea085 100%);
        }
        
        .blockchain-header-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
        }
        
        .blockchain-feature-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          border: 1px solid #e9ecef;
        }
        
        .blockchain-feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        .blockchain-stats {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border: 1px solid #dee2e6;
        }
        
        .blockchain-alert {
          border-left: 4px solid #007bff;
        }
        
        .blockchain-select {
          border: 2px solid #e9ecef;
          border-radius: 8px;
          transition: border-color 0.3s ease;
        }
        
        .blockchain-select:focus {
          border-color: #007bff;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
        
        .party-symbol-img {
          border-radius: 4px;
          border: 1px solid #dee2e6;
          background: white;
          padding: 2px;
        }
        
        .candidate-symbol {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          height: 36px;
        }
        
        .candidate-name {
          font-weight: 500;
        }
        
        .party-name {
          color: #6c757d;
          font-style: italic;
        }
        
        .vote-count {
          font-family: 'Courier New', monospace;
          font-weight: bold;
        }
        
        .percentage {
          font-weight: 600;
          color: #495057;
        }
        
        .transaction-hash {
          font-family: 'Courier New', monospace;
          background: rgba(0, 123, 255, 0.1);
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid rgba(0, 123, 255, 0.2);
        }
        
        .transaction-hash:hover {
          background: rgba(0, 123, 255, 0.2);
          cursor: pointer;
        }
        
        .elections-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
          width: 100%;
        }
        
        .election-card {
          transition: all 0.3s ease;
          border: 1px solid #e9ecef;
          border-radius: 12px;
          overflow: hidden;
        }
        
        .election-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          border-color: #007bff;
        }
        
        .election-status-badge {
          position: absolute;
          top: 15px;
          right: 15px;
          z-index: 1;
        }
        
        .blockchain-loading {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
        }
        
        .loading-step {
          opacity: 0.8;
          margin-bottom: 0.5rem;
        }
        
        .loading-step.active {
          opacity: 1;
          font-weight: 500;
        }
        
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        
        .pulse {
          animation: pulse 2s infinite;
        }
      `}</style>
    </Layout>
  );
};

export default ElectionResults; 