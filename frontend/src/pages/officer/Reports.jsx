import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Alert, Badge, Table, Tabs, Tab, ListGroup, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaDownload, FaChartBar, FaFilePdf, FaFileExcel, FaFileAlt, FaArrowLeft, FaFilter, FaCalendarAlt, FaUsers, FaUserCheck, FaChartPie, FaMapMarkerAlt, FaSearch } from 'react-icons/fa';
import Layout from '../../components/Layout';
import axios from 'axios';
import env from '../../utils/env';
import * as XLSX from 'xlsx';

const { API_URL } = env;

const Reports = () => {
  const [reportType, setReportType] = useState('election');
  const [electionId, setElectionId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [region, setRegion] = useState('');
  const [pincode, setPincode] = useState('');
  const [format, setFormat] = useState('excel');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReports, setGeneratedReports] = useState([]);
  const [formError, setFormError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('generate');
  const [elections, setElections] = useState([]);
  const [regions, setRegions] = useState([]);
  const [pincodes, setPincodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);
  
  // Fetch elections from remote database
  useEffect(() => {
    const fetchElections = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Get auth token
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        // Fetch all elections
        const response = await axios.get(`${API_URL}/officer/elections/all`, { headers });
        console.log('Elections fetched:', response.data);
        
        if (response.data && response.data.elections) {
          setElections(response.data.elections);
          
          // Extract unique regions and pincodes from elections
          const allRegions = response.data.elections
            .map(e => e.region)
            .filter(Boolean);
          
          const allPincodes = response.data.elections
            .map(e => e.pincode)
            .filter(Boolean);
          
          setRegions([...new Set(allRegions)]);
          setPincodes([...new Set(allPincodes)]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching elections:', error);
        setError('Failed to fetch elections from the database. Please try again.');
        setLoading(false);
      }
    };
    
    fetchElections();
    
    // Fetch previous reports (if we had a real API for this)
    // For now, we'll keep track of generated reports in state
  }, []);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setReportData(null);
    
    // Validate form
    if (reportType === 'election' && !electionId) {
      setFormError('Please select an election');
      return;
    }
    
    if (reportType === 'date-range' && (!startDate || !endDate)) {
      setFormError('Please select both start and end dates');
      return;
    }
    
    if (reportType === 'regional' && !region) {
      setFormError('Please select a region');
      return;
    }
    
    // Fetch data based on report type
    try {
      setLoading(true);
      
      // Get auth token
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      let data = null;
      
      switch (reportType) {
        case 'election':
          // Fetch specific election data
          const electionResponse = await axios.get(
            `${API_URL}/officer/elections/${electionId}/results`, 
            { headers }
          );
          data = electionResponse.data;
          break;
          
        case 'voter-participation':
          // Fetch voter statistics
          const voterStatsResponse = await axios.get(
            `${API_URL}/officer/voters/stats`,
            { headers }
          );
          data = voterStatsResponse.data;
          break;
          
        case 'date-range':
          // For date range, we need to fetch all elections and filter
          const allElectionsResponse = await axios.get(
            `${API_URL}/officer/elections/all`,
            { headers }
          );
          
          // Filter elections by date range
          const startDateObj = new Date(startDate);
          const endDateObj = new Date(endDate);
          
          data = {
            elections: allElectionsResponse.data.elections.filter(election => {
              const electionStartDate = new Date(election.startDate);
              return electionStartDate >= startDateObj && electionStartDate <= endDateObj;
            })
          };
          break;
          
        case 'regional':
          // For regional reports, fetch all elections and filter by region
          const regionalElectionsResponse = await axios.get(
            `${API_URL}/officer/elections/all`,
            { headers }
          );
          
          data = {
            elections: regionalElectionsResponse.data.elections.filter(election => 
              election.region === region && 
              (!pincode || election.pincode === pincode)
            )
          };
          break;
          
        default:
          break;
      }
      
      setReportData(data);
      setLoading(false);
      
      // Show preview
      setShowPreview(true);
      
    } catch (error) {
      console.error('Error fetching report data:', error);
      setFormError(`Failed to fetch data: ${error.message}`);
      setLoading(false);
    }
  };
  
  // Generate report in the selected format
  const generateReport = () => {
    setIsGenerating(true);
    
    try {
      if (format === 'excel') {
        generateExcelReport();
      } else if (format === 'csv') {
        generateCSVReport();
      }
      
      // Create a record of the generated report
      const newReport = {
        id: `report-${Date.now()}`,
        name: getReportName(),
        type: reportType,
        format: format,
        date: new Date().toISOString(),
        status: 'completed',
        size: calculateReportSize() 
      };
      
      setGeneratedReports(prev => [newReport, ...prev]);
      setIsGenerating(false);
      setShowPreview(false);
      
      // Reset form if needed
      if (reportType === 'date-range') {
        setStartDate('');
        setEndDate('');
      }
      
      // Switch to history tab
      setActiveTab('history');
      
      // Show success message
      alert(`Report "${newReport.name}" has been generated successfully!`);
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert(`Error generating report: ${error.message}`);
      setIsGenerating(false);
    }
  };
  
  // Generate Excel report
  const generateExcelReport = () => {
    if (!reportData) return;
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Add sheets based on report type
    if (reportType === 'election' && reportData.election) {
      // Add Election Summary sheet
      const electionSummaryData = [
        ['Election Summary'],
        [''],
        ['Title', reportData.election.title || 'N/A'],
        ['Description', reportData.election.description || 'N/A'],
        ['Start Date', formatDate(reportData.election.startDate)],
        ['End Date', formatDate(reportData.election.endDate)],
        ['Total Votes', reportData.election.totalVotes || 0],
        ['Voter Turnout', reportData.election.voterTurnout || 'N/A'],
        ['Status', reportData.election.isActive ? 'Active' : 'Completed'],
        ['None of the Above Votes', reportData.election.noneOfTheAboveVotes || 0],
        ['']
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(electionSummaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Election Summary');
      
      // Add Candidates sheet
      if (reportData.candidates && reportData.candidates.length > 0) {
        const candidatesData = [
          ['Rank', 'Name', 'Party', 'Votes', 'Percentage', 'Gender', 'Age', 'Constituency']
        ];
        
        reportData.candidates.forEach((candidate, index) => {
          candidatesData.push([
            index + 1,
            `${candidate.firstName || ''} ${candidate.middleName || ''} ${candidate.lastName || ''}`.trim(),
            candidate.partyName || 'Independent',
            candidate.votes || 0,
            `${candidate.percentage || 0}%`,
            candidate.gender || 'N/A',
            candidate.age || 'N/A',
            candidate.constituency || 'N/A'
          ]);
        });
        
        const candidatesSheet = XLSX.utils.aoa_to_sheet(candidatesData);
        XLSX.utils.book_append_sheet(wb, candidatesSheet, 'Candidates');
      }
      
      // Add Blockchain Transactions sheet
      if (reportData.blockchainTransactions && reportData.blockchainTransactions.length > 0) {
        const transactionsData = [
          ['Transaction Hash', 'Type', 'Timestamp', 'From Address', 'Status', 'Block Number']
        ];
        
        reportData.blockchainTransactions.forEach(tx => {
          transactionsData.push([
            tx.txHash || 'N/A',
            tx.type || 'N/A',
            formatDate(tx.timestamp),
            tx.from || 'N/A',
            tx.status || 'N/A',
            tx.blockNumber || 'N/A'
          ]);
        });
        
        const txSheet = XLSX.utils.aoa_to_sheet(transactionsData);
        XLSX.utils.book_append_sheet(wb, txSheet, 'Blockchain Transactions');
      }
    } else if (reportType === 'voter-participation' && reportData) {
      // Add Voter Participation sheet
      const voterData = [
        ['Voter Participation Summary'],
        [''],
        ['Total Voters', reportData.totalVoters || 0],
        ['Pending Voters', reportData.pendingVoters || 0],
        ['Rejected Voters', reportData.rejectedVoters || 0],
        ['Active Voters', reportData.activeVoters || 0]
      ];
      
      const voterSheet = XLSX.utils.aoa_to_sheet(voterData);
      XLSX.utils.book_append_sheet(wb, voterSheet, 'Voter Participation');
    } else if ((reportType === 'date-range' || reportType === 'regional') && reportData.elections) {
      // Add Elections sheet
      const electionsData = [
        ['Title', 'Description', 'Start Date', 'End Date', 'Status', 'Total Votes', 'Voter Turnout', 'Region', 'Pincode']
      ];
      
      reportData.elections.forEach(election => {
        electionsData.push([
          election.title || 'N/A',
          election.description || 'N/A',
          formatDate(election.startDate),
          formatDate(election.endDate),
          election.isActive ? 'Active' : 'Completed',
          election.totalVotes || 0,
          election.voterTurnout || 'N/A',
          election.region || 'N/A',
          election.pincode || 'N/A'
        ]);
      });
      
      const electionsSheet = XLSX.utils.aoa_to_sheet(electionsData);
      XLSX.utils.book_append_sheet(wb, electionsSheet, 'Elections');
    }
    
    // Generate filename
    const fileName = `${getReportName().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Write and download file
    XLSX.writeFile(wb, fileName);
  };
  
  // Generate CSV report
  const generateCSVReport = () => {
    if (!reportData) return;
    
    let csvContent = '';
    let fileName = '';
    
    if (reportType === 'election' && reportData.election) {
      // Create CSV for election report
      csvContent = 'Title,Description,Start Date,End Date,Total Votes,Voter Turnout,Status\n';
      csvContent += `"${reportData.election.title || 'N/A'}","${reportData.election.description || 'N/A'}","${formatDate(reportData.election.startDate)}","${formatDate(reportData.election.endDate)}",${reportData.election.totalVotes || 0},"${reportData.election.voterTurnout || 'N/A'}","${reportData.election.isActive ? 'Active' : 'Completed'}"\n\n`;
      
      if (reportData.candidates && reportData.candidates.length > 0) {
        csvContent += 'Rank,Name,Party,Votes,Percentage,Gender,Age,Constituency\n';
        
        reportData.candidates.forEach((candidate, index) => {
          const name = `${candidate.firstName || ''} ${candidate.middleName || ''} ${candidate.lastName || ''}`.trim();
          csvContent += `${index + 1},"${name}","${candidate.partyName || 'Independent'}",${candidate.votes || 0},"${candidate.percentage || 0}%","${candidate.gender || 'N/A'}","${candidate.age || 'N/A'}","${candidate.constituency || 'N/A'}"\n`;
        });
      }
      
      fileName = `${reportData.election.title.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (reportType === 'voter-participation' && reportData) {
      // Create CSV for voter participation
      csvContent = 'Total Voters,Pending Voters,Rejected Voters,Active Voters\n';
      csvContent += `${reportData.totalVoters || 0},${reportData.pendingVoters || 0},${reportData.rejectedVoters || 0},${reportData.activeVoters || 0}\n`;
      
      fileName = `Voter_Participation_Report_${new Date().toISOString().split('T')[0]}.csv`;
    } else if ((reportType === 'date-range' || reportType === 'regional') && reportData.elections) {
      // Create CSV for elections list
      csvContent = 'Title,Description,Start Date,End Date,Status,Total Votes,Voter Turnout,Region,Pincode\n';
      
      reportData.elections.forEach(election => {
        csvContent += `"${election.title || 'N/A'}","${election.description || 'N/A'}","${formatDate(election.startDate)}","${formatDate(election.endDate)}","${election.isActive ? 'Active' : 'Completed'}",${election.totalVotes || 0},"${election.voterTurnout || 'N/A'}","${election.region || 'N/A'}","${election.pincode || 'N/A'}"\n`;
      });
      
      fileName = `${getReportName().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    }
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Calculate approximate report size
  const calculateReportSize = () => {
    if (!reportData) return '0 KB';
    
    // Estimate size based on data
    let sizeInKB = 0;
    
    if (reportType === 'election') {
      sizeInKB = 10; // Base size for header info
      
      // Add size for candidates
      if (reportData.candidates) {
        sizeInKB += reportData.candidates.length * 2;
      }
      
      // Add size for transactions
      if (reportData.blockchainTransactions) {
        sizeInKB += reportData.blockchainTransactions.length * 1.5;
      }
    } else if (reportType === 'voter-participation') {
      sizeInKB = 5; // Small fixed size
    } else if ((reportType === 'date-range' || reportType === 'regional') && reportData.elections) {
      sizeInKB = 5 + (reportData.elections.length * 3);
    }
    
    // Add format overhead
    if (format === 'excel') {
      sizeInKB *= 1.2; // Excel files are slightly larger
    }
    
    // Return size with units
    if (sizeInKB < 1000) {
      return `${Math.round(sizeInKB * 10) / 10} KB`;
    } else {
      return `${Math.round(sizeInKB / 100) / 10} MB`;
    }
  };
  
  // Cancel report generation
  const cancelReportGeneration = () => {
    setShowPreview(false);
  };
  
  // Get report name based on type
  const getReportName = () => {
    switch (reportType) {
      case 'election':
        if (reportData && reportData.election) {
          return `${reportData.election.title || 'Election'} Report`;
        }
        
        const election = elections.find(e => e._id === electionId);
        return `${election?.title || 'Election'} Report`;
      
      case 'date-range':
        return `Elections Report (${formatDate(startDate)} to ${formatDate(endDate)})`;
      
      case 'regional':
        return `${region} Region Election Report${pincode ? ` (Pincode: ${pincode})` : ''}`;
      
      case 'voter-participation':
        return 'Voter Participation Statistics Report';
      
      case 'candidate-performance':
        return 'Candidate Performance Analytics Report';
      
      default:
        return 'Election Report';
    }
  };
  
  // Get report description
  const getReportDescription = () => {
    switch (reportType) {
      case 'election':
        const election = reportData?.election || elections.find(e => e._id === electionId);
        return `This report contains comprehensive data about the ${election?.title} including vote counts, turnout statistics, demographic breakdowns, and regional analysis.`;
      
      case 'date-range':
        return `This report summarizes election activity between ${formatDate(startDate)} and ${formatDate(endDate)}, including comparative analytics across multiple elections during this period.`;
      
      case 'regional':
        return `This report provides detailed analysis of voting patterns in ${region}${pincode ? ` (Pincode: ${pincode})` : ''}, including turnout rates, candidate performance, and demographic trends.`;
      
      case 'voter-participation':
        return 'This report offers comprehensive data on voter engagement, demographic breakdowns, turnout rates by region, and comparison with previous elections.';
      
      case 'candidate-performance':
        return 'This report analyzes candidate performance across various demographics, regions, and other metrics to provide insights into voting patterns.';
      
      default:
        return 'Election report with detailed analytics and statistics.';
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  // Filter reports based on search term
  const filteredReports = generatedReports.filter(report => {
    if (!searchTerm) return true;
    
    const searchValue = searchTerm.toLowerCase();
    return (
      report.name.toLowerCase().includes(searchValue) ||
      report.type.toLowerCase().includes(searchValue) ||
      report.format.toLowerCase().includes(searchValue) ||
      formatDate(report.date).toLowerCase().includes(searchValue)
    );
  });
  
  // View report details
  const viewReportDetails = (report) => {
    setSelectedReport(report);
  };
  
  return (
    <Layout>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4 text-white">
          <div>
            <h1>Reports Center</h1>
            <p className="">
              Generate and manage election reports and analytics.
            </p>
          </div>
          <Button
            as={Link}
            to="/officer"
            variant="outline-secondary"
            className="d-flex align-items-center"
          >
            <FaArrowLeft className="me-2" /> Back to Dashboard
          </Button>
        </div>
        
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-4"
        >
          <Tab eventKey="generate" title="Generate Reports">
            <Row>
              <Col lg={8}>
                <Card className="border-0 shadow-sm mb-4">
                  <Card.Header className="bg-white py-3">
                    <h5 className="mb-0">Report Generator</h5>
                  </Card.Header>
                  <Card.Body>
                    {formError && (
                      <Alert variant="danger">{formError}</Alert>
                    )}
                    
                    <Form onSubmit={handleSubmit}>
                      <Form.Group className="mb-3">
                        <Form.Label>Report Type</Form.Label>
                        <Form.Select 
                          value={reportType} 
                          onChange={(e) => setReportType(e.target.value)}
                        >
                          <option value="election">Single Election Report</option>
                          <option value="date-range">Date Range Report</option>
                          <option value="regional">Regional Report</option>
                          <option value="voter-participation">Voter Participation Report</option>
                          <option value="candidate-performance">Candidate Performance Report</option>
                        </Form.Select>
                      </Form.Group>
                      
                      {reportType === 'election' && (
                        <Form.Group className="mb-3">
                          <Form.Label>Select Election</Form.Label>
                          <Form.Select 
                            value={electionId} 
                            onChange={(e) => setElectionId(e.target.value)}
                            disabled={loading}
                          >
                            <option value="">Select an election</option>
                            {elections.map(election => (
                              <option key={election._id} value={election._id}>
                                {election.title} ({formatDate(election.startDate)} - {formatDate(election.endDate)})
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      )}
                      
                      {reportType === 'date-range' && (
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Start Date</Form.Label>
                              <Form.Control 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)} 
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>End Date</Form.Label>
                              <Form.Control 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)} 
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                      )}
                      
                      {reportType === 'regional' && (
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Region</Form.Label>
                              <Form.Select 
                                value={region} 
                                onChange={(e) => setRegion(e.target.value)}
                                disabled={loading}
                              >
                                <option value="">Select region</option>
                                {regions.map(r => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Pincode</Form.Label>
                              <Form.Select 
                                value={pincode} 
                                onChange={(e) => setPincode(e.target.value)}
                                disabled={loading}
                              >
                                <option value="">All pincodes</option>
                                {pincodes.map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        </Row>
                      )}
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Report Format</Form.Label>
                        <div className="d-flex flex-wrap">
                          <div className="me-4 mb-2">
                            <Form.Check
                              type="radio"
                              label={<span><FaFileExcel className="text-success me-1" /> Excel</span>}
                              name="formatGroup"
                              id="format-excel"
                              value="excel"
                              checked={format === 'excel'}
                              onChange={(e) => setFormat(e.target.value)}
                              className="d-flex align-items-center"
                            />
                          </div>
                          <div className="mb-2">
                            <Form.Check
                              type="radio"
                              label={<span><FaFileAlt className="text-primary me-1" /> CSV</span>}
                              name="formatGroup"
                              id="format-csv"
                              value="csv"
                              checked={format === 'csv'}
                              onChange={(e) => setFormat(e.target.value)}
                              className="d-flex align-items-center"
                            />
                          </div>
                        </div>
                      </Form.Group>
                      
                      {/* Display API errors */}
                      {error && (
                        <Alert variant="danger" className="mt-3">
                          {error}
                        </Alert>
                      )}
                      
                      <div className="d-flex justify-content-end">
                        <Button 
                          type="submit" 
                          variant="primary"
                          disabled={loading || isGenerating}
                        >
                          {loading ? (
                            <>
                              <Spinner size="sm" animation="border" className="me-2" />
                              Loading Data...
                            </>
                          ) : (
                            <>
                              <FaFileAlt className="me-2" /> Preview Report
                            </>
                          )}
                        </Button>
                      </div>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col lg={4}>
                <Card className="border-0 shadow-sm mb-4">
                  <Card.Header className="bg-white py-3">
                    <h5 className="mb-0">Report Types</h5>
                  </Card.Header>
                  <Card.Body>
                    <div className="mb-3 pb-3 border-bottom">
                      <div className="d-flex align-items-center mb-2">
                        <div className="text-primary me-2">
                          <FaChartBar />
                        </div>
                        <h6 className="mb-0">Single Election Report</h6>
                      </div>
                      <p className="text-muted small mb-0">Complete data for a specific election, including voter turnout, candidate performance, and regional statistics.</p>
                    </div>
                    
                    <div className="mb-3 pb-3 border-bottom">
                      <div className="d-flex align-items-center mb-2">
                        <div className="text-success me-2">
                          <FaCalendarAlt />
                        </div>
                        <h6 className="mb-0">Date Range Report</h6>
                      </div>
                      <p className="text-muted small mb-0">Aggregate statistics for all elections held within a specified time period.</p>
                    </div>
                    
                    <div className="mb-3 pb-3 border-bottom">
                      <div className="d-flex align-items-center mb-2">
                        <div className="text-warning me-2">
                          <FaMapMarkerAlt />
                        </div>
                        <h6 className="mb-0">Regional Report</h6>
                      </div>
                      <p className="text-muted small mb-0">Detailed analysis of voting patterns by geographic region and pincode.</p>
                    </div>
                    
                    <div className="mb-3 pb-3 border-bottom">
                      <div className="d-flex align-items-center mb-2">
                        <div className="text-info me-2">
                          <FaUsers />
                        </div>
                        <h6 className="mb-0">Voter Participation</h6>
                      </div>
                      <p className="text-muted small mb-0">Comprehensive data on voter engagement, turnout rates, and demographic analysis.</p>
                    </div>
                    
                    <div className="mb-3">
                      <div className="d-flex align-items-center mb-2">
                        <div className="text-danger me-2">
                          <FaChartPie />
                        </div>
                        <h6 className="mb-0">Candidate Performance</h6>
                      </div>
                      <p className="text-muted small mb-0">Detailed metrics on candidate performance across different demographics and regions.</p>
                    </div>
                  </Card.Body>
                </Card>

                <Card className="border-0 shadow-sm mb-4 bg-light">
                  <Card.Body className="p-3">
                    <div className="d-flex align-items-center mb-2">
                      <FaUserCheck className="text-success me-2" />
                      <h6 className="mb-0">Report Security</h6>
                    </div>
                    <p className="small text-muted mb-0">
                      All generated reports are secured with blockchain verification and can be validated
                      using the VoteSure report verification system.
                    </p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>
          
          <Tab eventKey="history" title="Report History">
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white py-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap">
                  <h5 className="mb-0">Generated Reports</h5>
                  <Form.Group className="d-flex align-items-center mb-0 mt-2 mt-md-0">
                    <FaSearch className="text-muted position-absolute ms-3" style={{ zIndex: 1 }} />
                    <Form.Control
                      type="text"
                      placeholder="Search reports..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="ps-5 border-0 shadow-sm"
                      style={{ width: '250px' }}
                    />
                  </Form.Group>
                </div>
              </Card.Header>
              <Card.Body>
                {filteredReports.length === 0 ? (
                  <p className="text-muted text-center py-3">
                    {searchTerm ? 'No reports match your search criteria' : 'No reports have been generated yet'}
                  </p>
                ) : (
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>Report Name</th>
                        <th>Type</th>
                        <th>Format</th>
                        <th>Date Generated</th>
                        <th>Size</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReports.map(report => (
                        <tr key={report.id}>
                          <td className="fw-semibold">{report.name}</td>
                          <td>
                            <Badge bg="info">{report.type}</Badge>
                          </td>
                          <td>
                            <Badge bg={report.format === 'excel' ? 'success' : 'primary'}>
                              {report.format.toUpperCase()}
                            </Badge>
                          </td>
                          <td>{formatDate(report.date)}</td>
                          <td>{report.size}</td>
                          <td>
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              className="me-2"
                              onClick={() => viewReportDetails(report)}
                            >
                              <FaChartBar className="me-1" /> View
                            </Button>
                            <Button 
                              variant="outline-success" 
                              size="sm"
                            >
                              <FaDownload className="me-1" /> Download
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
            
            {selectedReport && (
              <Card className="border-0 shadow-sm mb-4">
                <Card.Header className="bg-white py-3">
                  <h5 className="mb-0">Report Details: {selectedReport.name}</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <ListGroup variant="flush">
                        <ListGroup.Item className="ps-0 border-0">
                          <strong>Report ID:</strong> {selectedReport.id}
                        </ListGroup.Item>
                        <ListGroup.Item className="ps-0 border-0">
                          <strong>Type:</strong> {selectedReport.type}
                        </ListGroup.Item>
                        <ListGroup.Item className="ps-0 border-0">
                          <strong>Format:</strong> {selectedReport.format.toUpperCase()}
                        </ListGroup.Item>
                        <ListGroup.Item className="ps-0 border-0">
                          <strong>Generated:</strong> {formatDate(selectedReport.date)}
                        </ListGroup.Item>
                        <ListGroup.Item className="ps-0 border-0">
                          <strong>Size:</strong> {selectedReport.size}
                        </ListGroup.Item>
                      </ListGroup>
                    </Col>
                    <Col md={6}>
                      <div className="p-3 bg-light rounded">
                        <h6>Report Preview</h6>
                        <p className="text-muted small mb-0">
                          This report contains statistical data, charts, and analytics for the specified election or criteria.
                          Download the full report to view detailed information.
                        </p>
                      </div>
                      <div className="mt-3 d-flex justify-content-end">
                        <Button variant="primary">
                          <FaDownload className="me-2" /> Download Full Report
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}
          </Tab>
        </Tabs>
        
        {/* Report Preview Modal */}
        <Modal
          show={showPreview}
          onHide={cancelReportGeneration}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Report Preview: {getReportName()}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {reportData ? (
              <>
                <p>
                  {getReportDescription()}
                </p>
                
                <h6 className="mt-4 mb-3">This report will include:</h6>
                
                {reportType === 'election' && reportData.election && (
                  <div className="mb-4">
                    <Card className="border-0 shadow-sm mb-3">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Election: {reportData.election.title}</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <small className="text-muted d-block mb-1">Period</small>
                            <p className="mb-3">{formatDate(reportData.election.startDate)} - {formatDate(reportData.election.endDate)}</p>
                            
                            <small className="text-muted d-block mb-1">Status</small>
                            <Badge bg={reportData.election.isActive ? "success" : "secondary"}>
                              {reportData.election.isActive ? "Active" : "Completed"}
                            </Badge>
                          </Col>
                          <Col md={6}>
                            <small className="text-muted d-block mb-1">Total Votes</small>
                            <p className="mb-3">{reportData.election.totalVotes || 0}</p>
                            
                            <small className="text-muted d-block mb-1">Voter Turnout</small>
                            <p className="mb-0">{reportData.election.voterTurnout || 'N/A'}</p>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                    
                    <div className="mb-3">
                      <h6 className="mb-2">Candidate Results ({reportData.candidates?.length || 0} candidates)</h6>
                      {reportData.candidates && reportData.candidates.length > 0 ? (
                        <Table responsive size="sm" className="border">
                          <thead className="table-light">
                            <tr>
                              <th>Rank</th>
                              <th>Name</th>
                              <th>Party</th>
                              <th>Votes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.candidates.slice(0, 5).map((candidate, index) => (
                              <tr key={candidate._id}>
                                <td>{index + 1}</td>
                                <td>
                                  {`${candidate.firstName || ''} ${candidate.middleName || ''} ${candidate.lastName || ''}`.trim()}
                                </td>
                                <td>{candidate.partyName || 'Independent'}</td>
                                <td>
                                  <Badge bg="primary">{candidate.votes} ({candidate.percentage}%)</Badge>
                                </td>
                              </tr>
                            ))}
                            {reportData.candidates.length > 5 && (
                              <tr>
                                <td colSpan="4" className="text-center">
                                  <small className="text-muted">
                                    + {reportData.candidates.length - 5} more candidates
                                  </small>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </Table>
                      ) : (
                        <p className="text-muted">No candidate data available</p>
                      )}
                    </div>
                    
                    {reportData.blockchainTransactions && reportData.blockchainTransactions.length > 0 && (
                      <div>
                        <h6 className="mb-2">Blockchain Transactions ({reportData.blockchainTransactions.length})</h6>
                        <p className="text-muted small">
                          Report will include {reportData.blockchainTransactions.length} blockchain transactions
                          related to this election.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {reportType === 'voter-participation' && reportData && (
                  <div className="mb-4">
                    <Row>
                      <Col md={6} className="mb-3">
                        <Card className="h-100 border-0 shadow-sm">
                          <Card.Body className="text-center">
                            <h3 className="mb-1">{reportData.totalVoters || 0}</h3>
                            <p className="text-muted mb-0">Total Voters</p>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Card className="h-100 border-0 shadow-sm">
                          <Card.Body className="text-center">
                            <h3 className="mb-1">{reportData.activeVoters || 0}</h3>
                            <p className="text-muted mb-0">Active Voters</p>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Card className="h-100 border-0 shadow-sm">
                          <Card.Body className="text-center">
                            <h3 className="mb-1">{reportData.pendingVoters || 0}</h3>
                            <p className="text-muted mb-0">Pending Approval</p>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={6} className="mb-3">
                        <Card className="h-100 border-0 shadow-sm">
                          <Card.Body className="text-center">
                            <h3 className="mb-1">{reportData.rejectedVoters || 0}</h3>
                            <p className="text-muted mb-0">Rejected Voters</p>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                )}
                
                {(reportType === 'date-range' || reportType === 'regional') && reportData.elections && (
                  <div className="mb-4">
                    <h6 className="mb-2">Elections ({reportData.elections.length})</h6>
                    {reportData.elections.length > 0 ? (
                      <Table responsive size="sm" className="border">
                        <thead className="table-light">
                          <tr>
                            <th>Title</th>
                            <th>Period</th>
                            <th>Status</th>
                            <th>Votes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.elections.slice(0, 5).map(election => (
                            <tr key={election._id}>
                              <td>{election.title}</td>
                              <td>{formatDate(election.startDate)} - {formatDate(election.endDate)}</td>
                              <td>
                                <Badge bg={election.isActive ? "success" : "secondary"}>
                                  {election.isActive ? "Active" : "Completed"}
                                </Badge>
                              </td>
                              <td>{election.totalVotes || 0}</td>
                            </tr>
                          ))}
                          {reportData.elections.length > 5 && (
                            <tr>
                              <td colSpan="4" className="text-center">
                                <small className="text-muted">
                                  + {reportData.elections.length - 5} more elections
                                </small>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    ) : (
                      <p className="text-muted">No elections found for the selected criteria</p>
                    )}
                  </div>
                )}
                
                <hr />
                
                <div className="d-flex align-items-center">
                  <div>
                    <h6 className="mb-1">Format: {format.toUpperCase()}</h6>
                    <p className="text-muted mb-0 small">
                      {format === 'excel' ? 'Excel format allows for further data analysis and custom chart creation.' :
                       'CSV format provides raw data that can be imported into any analytics tool.'}
                    </p>
                  </div>
                  <div className="ms-3">
                    {format === 'excel' ? <FaFileExcel size={32} className="text-success" /> :
                     <FaFileAlt size={32} className="text-primary" />}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Preparing report preview...</p>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={cancelReportGeneration}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={generateReport}
              disabled={isGenerating || !reportData}
            >
              {isGenerating ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  Generating...
                </>
              ) : (
                <>
                  <FaDownload className="me-2" /> Generate {format.toUpperCase()} Report
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
};

export default Reports; 