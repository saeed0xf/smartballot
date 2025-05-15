import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Alert, Badge, Table, Tabs, Tab, ListGroup, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaDownload, FaChartBar, FaFilePdf, FaFileExcel, FaFileAlt, FaArrowLeft, FaFilter, FaCalendarAlt, FaUsers, FaUserCheck, FaChartPie, FaMapMarkerAlt, FaSearch } from 'react-icons/fa';
import Layout from '../../components/Layout';

const Reports = () => {
  const [reportType, setReportType] = useState('election');
  const [electionId, setElectionId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [region, setRegion] = useState('');
  const [pincode, setPincode] = useState('');
  const [format, setFormat] = useState('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReports, setGeneratedReports] = useState([]);
  const [formError, setFormError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('generate');
  
  // Sample data
  const elections = [
    { id: 'e1', title: 'Lok Sabha Elections 2023', totalVoters: 1250, voterTurnout: '70%', startDate: '2023-10-15', endDate: '2023-10-30', regions: ['North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'] },
    { id: 'e2', title: 'Municipal Corporation Elections', totalVoters: 980, voterTurnout: '58%', startDate: '2023-09-01', endDate: '2023-09-15', regions: ['Central Delhi', 'North Delhi', 'South Delhi'] },
    { id: 'e3', title: 'State Assembly Elections', totalVoters: 1500, voterTurnout: '72%', startDate: '2023-08-01', endDate: '2023-08-10', regions: ['East Delhi', 'West Delhi'] },
    { id: 'e4', title: 'Panchayat Elections 2023', totalVoters: 750, voterTurnout: '85%', startDate: '2023-07-05', endDate: '2023-07-10', regions: ['Rural Delhi'] },
    { id: 'e5', title: 'School Board Elections', totalVoters: 450, voterTurnout: '65%', startDate: '2023-06-10', endDate: '2023-06-15', regions: ['Academic District'] }
  ];
  
  const regions = ['North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi', 'Rural Delhi', 'Academic District'];
  
  const pincodes = ['110001', '110002', '110003', '110005', '110006', '110007', '110008', '110009'];

  // Some sample previously generated reports
  useEffect(() => {
    // Simulating previously generated reports
    const previousReports = [
      {
        id: 'report-1667305200000',
        name: 'Lok Sabha Elections 2023 Report',
        type: 'election',
        format: 'pdf',
        date: '2023-11-01T10:00:00.000Z',
        status: 'completed',
        size: '2.5 MB'
      },
      {
        id: 'report-1667218800000',
        name: 'Voter Participation Statistics Report',
        type: 'voter-participation',
        format: 'excel',
        date: '2023-10-31T08:00:00.000Z',
        status: 'completed',
        size: '4.2 MB'
      },
      {
        id: 'report-1667132400000',
        name: 'North Delhi Region Election Report (Pincode: 110001)',
        type: 'regional',
        format: 'pdf',
        date: '2023-10-30T15:30:00.000Z',
        status: 'completed',
        size: '3.7 MB'
      }
    ];
    
    setGeneratedReports(previousReports);
  }, []);
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    
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
    
    if (reportType === 'regional' && !pincode) {
      setFormError('Please select a pincode');
      return;
    }
    
    // Show preview first
    setShowPreview(true);
    
    // Then generate report after user confirms
  };
  
  // Generate a report
  const generateReport = () => {
    setIsGenerating(true);
    
    // Simulate API call with timeout
    setTimeout(() => {
      const newReport = {
        id: `report-${Date.now()}`,
        name: getReportName(),
        type: reportType,
        format: format,
        date: new Date().toISOString(),
        status: 'completed',
        size: `${Math.floor(Math.random() * 10) + 1}.${Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 9)} MB`
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
    }, 2000);
  };
  
  // Cancel report generation
  const cancelReportGeneration = () => {
    setShowPreview(false);
  };
  
  // Get report name based on type
  const getReportName = () => {
    switch (reportType) {
      case 'election':
        const election = elections.find(e => e.id === electionId);
        return `${election?.title || 'Election'} Report`;
      
      case 'date-range':
        return `Elections Report (${formatDate(startDate)} to ${formatDate(endDate)})`;
      
      case 'regional':
        return `${region} Region Election Report (Pincode: ${pincode})`;
      
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
        const election = elections.find(e => e.id === electionId);
        return `This report contains comprehensive data about the ${election?.title} including vote counts, turnout statistics, demographic breakdowns, and regional analysis.`;
      
      case 'date-range':
        return `This report summarizes election activity between ${formatDate(startDate)} and ${formatDate(endDate)}, including comparative analytics across multiple elections during this period.`;
      
      case 'regional':
        return `This report provides detailed analysis of voting patterns in ${region} (Pincode: ${pincode}), including turnout rates, candidate performance, and demographic trends.`;
      
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
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1>Reports Center</h1>
            <p className="text-muted">
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
                          >
                            <option value="">Select an election</option>
                            {elections.map(election => (
                              <option key={election.id} value={election.id}>
                                {election.title}
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
                              >
                                <option value="">Select pincode</option>
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
                              label={<span><FaFilePdf className="text-danger me-1" /> PDF</span>}
                              name="formatGroup"
                              id="format-pdf"
                              value="pdf"
                              checked={format === 'pdf'}
                              onChange={(e) => setFormat(e.target.value)}
                              className="d-flex align-items-center"
                            />
                          </div>
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
                      
                      <div className="d-flex justify-content-end">
                        <Button 
                          type="submit" 
                          variant="primary"
                          disabled={isGenerating}
                        >
                          <FaFileAlt className="me-2" /> Preview Report
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
                            <Badge bg={report.format === 'pdf' ? 'danger' : (report.format === 'excel' ? 'success' : 'primary')}>
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
            <p>
              {getReportDescription()}
            </p>
            
            <h6 className="mt-4 mb-3">This report will include:</h6>
            <Row>
              <Col md={6}>
                <ListGroup variant="flush">
                  <ListGroup.Item className="d-flex align-items-center border-0 ps-0">
                    <FaChartBar className="text-primary me-2" /> 
                    Election Overview
                  </ListGroup.Item>
                  <ListGroup.Item className="d-flex align-items-center border-0 ps-0">
                    <FaUsers className="text-info me-2" /> 
                    Voter Demographics
                  </ListGroup.Item>
                  <ListGroup.Item className="d-flex align-items-center border-0 ps-0">
                    <FaMapMarkerAlt className="text-warning me-2" /> 
                    Regional Analysis
                  </ListGroup.Item>
                </ListGroup>
              </Col>
              <Col md={6}>
                <ListGroup variant="flush">
                  <ListGroup.Item className="d-flex align-items-center border-0 ps-0">
                    <FaChartPie className="text-success me-2" /> 
                    Turnout Statistics
                  </ListGroup.Item>
                  <ListGroup.Item className="d-flex align-items-center border-0 ps-0">
                    <FaChartBar className="text-danger me-2" /> 
                    Candidate Performance
                  </ListGroup.Item>
                  <ListGroup.Item className="d-flex align-items-center border-0 ps-0">
                    <FaCalendarAlt className="text-secondary me-2" /> 
                    Time-based Analysis
                  </ListGroup.Item>
                </ListGroup>
              </Col>
            </Row>
            
            <hr />
            
            <div className="d-flex align-items-center">
              <div>
                <h6 className="mb-1">Format: {format.toUpperCase()}</h6>
                <p className="text-muted mb-0 small">
                  {format === 'pdf' ? 'PDF format provides a complete formatted document with charts and tables.' : 
                   format === 'excel' ? 'Excel format allows for further data analysis and custom chart creation.' :
                   'CSV format provides raw data that can be imported into any analytics tool.'}
                </p>
              </div>
              <div className="ms-3">
                {format === 'pdf' ? <FaFilePdf size={32} className="text-danger" /> : 
                 format === 'excel' ? <FaFileExcel size={32} className="text-success" /> :
                 <FaFileAlt size={32} className="text-primary" />}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={cancelReportGeneration}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={generateReport}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  Generating...
                </>
              ) : (
                <>
                  <FaFileAlt className="me-2" /> Generate Report
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