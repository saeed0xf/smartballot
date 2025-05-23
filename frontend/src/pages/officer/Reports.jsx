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
  
  // Fetch elections from remote database and load saved reports from localStorage
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
    
    // Load saved reports from localStorage
    try {
      const savedReports = localStorage.getItem('votesure_generated_reports');
      if (savedReports) {
        setGeneratedReports(JSON.parse(savedReports));
        console.log('Loaded reports from localStorage:', JSON.parse(savedReports).length);
      }
    } catch (error) {
      console.error('Error loading reports from localStorage:', error);
    }
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
          
        case 'candidate-performance':
          // For candidate performance, fetch all elections and aggregate candidate data
          const electionsResponse = await axios.get(
            `${API_URL}/officer/elections/all`,
            { headers }
          );
          
          // Initialize aggregated data structure
          const candidatePerformanceData = {
            elections: electionsResponse.data.elections || [],
            candidates: []
          };
          
          // Fetch detailed information for each election to get candidate data
          const candidatesMap = new Map();
          
          // Process only up to 5 most recent elections for performance reasons
          const recentElections = candidatePerformanceData.elections
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
            .slice(0, 5);
          
          // Fetch candidate data for each election
          for (const election of recentElections) {
            try {
              const electionDetailsResponse = await axios.get(
                `${API_URL}/officer/elections/${election._id}/results`,
                { headers }
              );
              
              if (electionDetailsResponse.data.candidates && 
                  electionDetailsResponse.data.candidates.length > 0) {
                
                // Add election info to each candidate
                electionDetailsResponse.data.candidates.forEach(candidate => {
                  const candidateKey = `${candidate.firstName || ''} ${candidate.middleName || ''} ${candidate.lastName || ''}`.trim();
                  
                  if (candidatesMap.has(candidateKey)) {
                    // Update existing candidate data
                    const existingData = candidatesMap.get(candidateKey);
                    existingData.totalVotes += candidate.votes || 0;
                    existingData.elections.push({
                      id: election._id,
                      title: election.title,
                      votes: candidate.votes || 0,
                      percentage: candidate.percentage || 0,
                      totalVotes: election.totalVotes || 0
                    });
                    
                    // Update averages and max values
                    existingData.avgPercentage = existingData.elections.reduce((sum, e) => sum + e.percentage, 0) / existingData.elections.length;
                    existingData.maxPercentage = Math.max(existingData.maxPercentage, candidate.percentage || 0);
                    existingData.totalElections = existingData.elections.length;
                  } else {
                    // Create new candidate entry
                    candidatesMap.set(candidateKey, {
                      name: candidateKey,
                      party: candidate.partyName || 'Independent',
                      gender: candidate.gender || 'N/A',
                      age: candidate.age || 'N/A',
                      totalVotes: candidate.votes || 0,
                      avgPercentage: candidate.percentage || 0,
                      maxPercentage: candidate.percentage || 0,
                      totalElections: 1,
                      elections: [{
                        id: election._id,
                        title: election.title,
                        votes: candidate.votes || 0,
                        percentage: candidate.percentage || 0,
                        totalVotes: election.totalVotes || 0
                      }]
                    });
                  }
                });
              }
            } catch (error) {
              console.error(`Error fetching details for election ${election._id}:`, error);
            }
          }
          
          // Convert map to array and sort by total votes
          candidatePerformanceData.candidates = Array.from(candidatesMap.values())
            .sort((a, b) => b.totalVotes - a.totalVotes);
          
          data = candidatePerformanceData;
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
      
      // Update state with the new report
      const updatedReports = [newReport, ...generatedReports];
      setGeneratedReports(updatedReports);
      
      // Save to localStorage
      try {
        localStorage.setItem('votesure_generated_reports', JSON.stringify(updatedReports));
        console.log('Saved reports to localStorage:', updatedReports.length);
      } catch (error) {
        console.error('Error saving reports to localStorage:', error);
      }
      
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
    } else if (reportType === 'candidate-performance' && reportData.candidates) {
      // Add Candidate Performance Summary sheet
      const summaryData = [
        ['Candidate Performance Analytics Report'],
        [''],
        ['Generated On', formatDate(new Date())],
        ['Total Candidates Analyzed', reportData.candidates.length.toString()],
        ['Elections Analyzed', reportData.elections.length.toString()],
        ['']
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
      
      // Add Candidate Performance sheet
      const candidatePerformanceData = [
        ['Rank', 'Candidate Name', 'Party', 'Total Votes', 'Avg Vote %', 'Max Vote %', 'Elections Contested', 'Gender', 'Age']
      ];
      
      reportData.candidates.forEach((candidate, index) => {
        candidatePerformanceData.push([
          index + 1,
          candidate.name,
          candidate.party,
          candidate.totalVotes,
          candidate.avgPercentage ? `${candidate.avgPercentage.toFixed(2)}%` : '0%',
          candidate.maxPercentage ? `${candidate.maxPercentage.toFixed(2)}%` : '0%',
          candidate.totalElections,
          candidate.gender,
          candidate.age
        ]);
      });
      
      const performanceSheet = XLSX.utils.aoa_to_sheet(candidatePerformanceData);
      XLSX.utils.book_append_sheet(wb, performanceSheet, 'Candidate Performance');
      
      // Add Election Details sheet
      if (reportData.elections.length > 0) {
        const electionDetailsData = [
          ['Election Title', 'Start Date', 'End Date', 'Total Votes', 'Region', 'Status']
        ];
        
        reportData.elections.forEach(election => {
          electionDetailsData.push([
            election.title || 'N/A',
            formatDate(election.startDate),
            formatDate(election.endDate),
            election.totalVotes || 0,
            election.region || 'N/A',
            election.isActive ? 'Active' : 'Completed'
          ]);
        });
        
        const electionsSheet = XLSX.utils.aoa_to_sheet(electionDetailsData);
        XLSX.utils.book_append_sheet(wb, electionsSheet, 'Elections');
      }
      
      // Add Individual Candidate Performance sheets
      // Limit to top 10 candidates to avoid too many sheets
      const topCandidates = reportData.candidates.slice(0, 10);
      
      topCandidates.forEach(candidate => {
        if (candidate.elections && candidate.elections.length > 0) {
          // Create sheet for each candidate's detailed performance
          const candidateSheetName = candidate.name.substring(0, 28); // Limit sheet name length
          const candidateDetailData = [
            [`Performance Details for ${candidate.name} (${candidate.party})`],
            [''],
            ['Total Votes Across All Elections', candidate.totalVotes.toString()],
            ['Average Vote Percentage', `${candidate.avgPercentage ? candidate.avgPercentage.toFixed(2) : 0}%`],
            ['Maximum Vote Percentage', `${candidate.maxPercentage ? candidate.maxPercentage.toFixed(2) : 0}%`],
            ['Total Elections Contested', candidate.totalElections.toString()],
            ['Gender', candidate.gender],
            ['Age', candidate.age.toString()],
            [''],
            ['Election-by-Election Performance'],
            [''],
            ['Election Title', 'Votes', 'Percentage', 'Total Election Votes', 'Date']
          ];
          
          // Add each election performance
          candidate.elections.forEach(election => {
            candidateDetailData.push([
              election.title || 'N/A',
              election.votes || 0,
              `${election.percentage ? election.percentage.toFixed(2) : 0}%`,
              election.totalVotes || 0,
              formatDate(reportData.elections.find(e => e._id === election.id)?.startDate) || 'N/A'
            ]);
          });
          
          const candidateDetailSheet = XLSX.utils.aoa_to_sheet(candidateDetailData);
          XLSX.utils.book_append_sheet(wb, candidateDetailSheet, candidateSheetName);
        }
      });
      
      // Add Comparative Analysis sheet
      const comparativeData = [
        ['Comparative Candidate Analysis'],
        [''],
        ['Candidate', 'Election 1', 'Election 2', 'Election 3', 'Election 4', 'Election 5']
      ];
      
      // Get the 5 most recent elections for comparison
      const recentElections = reportData.elections
        .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
        .slice(0, 5);
      
      // Update header with actual election names
      comparativeData[2] = ['Candidate', 
        ...recentElections.map(e => e.title || `Election ${e._id}`)
      ];
      
      // Add performance data for each candidate across these elections
      reportData.candidates.slice(0, 15).forEach(candidate => {
        const row = [candidate.name];
        
        recentElections.forEach(election => {
          const candidateElection = candidate.elections.find(e => e.id === election._id);
          row.push(candidateElection ? `${candidateElection.percentage.toFixed(2)}%` : 'N/A');
        });
        
        comparativeData.push(row);
      });
      
      const comparativeSheet = XLSX.utils.aoa_to_sheet(comparativeData);
      XLSX.utils.book_append_sheet(wb, comparativeSheet, 'Comparative Analysis');
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
    } else if (reportType === 'candidate-performance' && reportData.candidates) {
      // Create comprehensive CSV for candidate performance report
      // First section: Summary
      csvContent = 'Candidate Performance Analytics Report\n\n';
      csvContent += `Generated On,${formatDate(new Date())}\n`;
      csvContent += `Total Candidates Analyzed,${reportData.candidates.length}\n`;
      csvContent += `Elections Analyzed,${reportData.elections.length}\n\n`;
      
      // Second section: Candidate Performance Overview
      csvContent += 'CANDIDATE PERFORMANCE OVERVIEW\n';
      csvContent += 'Rank,Candidate Name,Party,Total Votes,Avg Vote %,Max Vote %,Elections Contested,Gender,Age\n';
      
      reportData.candidates.forEach((candidate, index) => {
        csvContent += `${index + 1},"${candidate.name}","${candidate.party}",${candidate.totalVotes},${candidate.avgPercentage ? candidate.avgPercentage.toFixed(2) : 0}%,${candidate.maxPercentage ? candidate.maxPercentage.toFixed(2) : 0}%,${candidate.totalElections},"${candidate.gender}","${candidate.age}"\n`;
      });
      
      csvContent += '\nELECTIONS INCLUDED\n';
      csvContent += 'Election Title,Start Date,End Date,Total Votes,Region,Status\n';
      
      reportData.elections.forEach(election => {
        csvContent += `"${election.title || 'N/A'}","${formatDate(election.startDate)}","${formatDate(election.endDate)}",${election.totalVotes || 0},"${election.region || 'N/A'}","${election.isActive ? 'Active' : 'Completed'}"\n`;
      });
      
      // Third section: Detailed candidate performance by election
      csvContent += '\nDETAILED CANDIDATE PERFORMANCE BY ELECTION\n';
      csvContent += 'Candidate,Party,Election,Votes,Percentage,Election Total Votes\n';
      
      reportData.candidates.forEach(candidate => {
        if (candidate.elections && candidate.elections.length > 0) {
          candidate.elections.forEach(election => {
            const electionDetails = reportData.elections.find(e => e._id === election.id);
            csvContent += `"${candidate.name}","${candidate.party}","${election.title || 'N/A'}",${election.votes || 0},${election.percentage ? election.percentage.toFixed(2) : 0}%,${election.totalVotes || 0}\n`;
          });
        }
      });
      
      fileName = `Candidate_Performance_Report_${new Date().toISOString().split('T')[0]}.csv`;
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
        return 'This report analyzes candidate performance across multiple elections, showing voting trends, comparative performance metrics, and election history for each candidate.';
      
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
  
  // Download a report from history
  const downloadReport = async (report) => {
    try {
      // First check if we need to regenerate the report
      if (!reportData) {
        // Get auth token
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        setLoading(true);
        
        // Fetch data based on report type
        let data = null;
        
        switch (report.type) {
          case 'election':
            // For simplicity, we'll assume election ID is in the report name
            const electionId = report.name.split(' ')[0]; // This is a simplification
            const electionResponse = await axios.get(
              `${API_URL}/officer/elections/${electionId}/results`, 
              { headers }
            );
            data = electionResponse.data;
            break;
            
          case 'voter-participation':
            const voterStatsResponse = await axios.get(
              `${API_URL}/officer/voters/stats`,
              { headers }
            );
            data = voterStatsResponse.data;
            break;
            
          case 'date-range':
          case 'regional':
            const allElectionsResponse = await axios.get(
              `${API_URL}/officer/elections/all`,
              { headers }
            );
            data = { elections: allElectionsResponse.data.elections };
            break;
            
          case 'candidate-performance':
            // Fetch all elections and aggregate candidate data
            const electionsResponse = await axios.get(
              `${API_URL}/officer/elections/all`,
              { headers }
            );
            
            // Initialize aggregated data structure
            const candidatePerformanceData = {
              elections: electionsResponse.data.elections || [],
              candidates: []
            };
            
            // Process only up to 5 most recent elections for performance reasons
            const recentElections = candidatePerformanceData.elections
              .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
              .slice(0, 5);
            
            // Fetch candidate data for each election
            const candidatesMap = new Map();
            for (const election of recentElections) {
              try {
                const electionDetailsResponse = await axios.get(
                  `${API_URL}/officer/elections/${election._id}/results`,
                  { headers }
                );
                
                if (electionDetailsResponse.data.candidates && 
                    electionDetailsResponse.data.candidates.length > 0) {
                  
                  // Process candidates
                  electionDetailsResponse.data.candidates.forEach(candidate => {
                    const candidateKey = `${candidate.firstName || ''} ${candidate.middleName || ''} ${candidate.lastName || ''}`.trim();
                    
                    if (candidatesMap.has(candidateKey)) {
                      // Update existing candidate data
                      const existingData = candidatesMap.get(candidateKey);
                      existingData.totalVotes += candidate.votes || 0;
                      existingData.elections.push({
                        id: election._id,
                        title: election.title,
                        votes: candidate.votes || 0,
                        percentage: candidate.percentage || 0,
                        totalVotes: election.totalVotes || 0
                      });
                      
                      // Update averages and max values
                      existingData.avgPercentage = existingData.elections.reduce((sum, e) => sum + e.percentage, 0) / existingData.elections.length;
                      existingData.maxPercentage = Math.max(existingData.maxPercentage, candidate.percentage || 0);
                      existingData.totalElections = existingData.elections.length;
                    } else {
                      // Create new candidate entry
                      candidatesMap.set(candidateKey, {
                        name: candidateKey,
                        party: candidate.partyName || 'Independent',
                        gender: candidate.gender || 'N/A',
                        age: candidate.age || 'N/A',
                        totalVotes: candidate.votes || 0,
                        avgPercentage: candidate.percentage || 0,
                        maxPercentage: candidate.percentage || 0,
                        totalElections: 1,
                        elections: [{
                          id: election._id,
                          title: election.title,
                          votes: candidate.votes || 0,
                          percentage: candidate.percentage || 0,
                          totalVotes: election.totalVotes || 0
                        }]
                      });
                    }
                  });
                }
              } catch (error) {
                console.error(`Error fetching details for election ${election._id}:`, error);
              }
            }
            
            // Convert map to array and sort by total votes
            candidatePerformanceData.candidates = Array.from(candidatesMap.values())
              .sort((a, b) => b.totalVotes - a.totalVotes);
            
            data = candidatePerformanceData;
            break;
            
          default:
            break;
        }
        
        setLoading(false);
        setReportData(data);
        
        // Now generate the report with the fetched data
        // Temporarily set reportType to match the report being downloaded
        const originalReportType = reportType;
        setReportType(report.type);
        
        if (report.format === 'excel') {
          generateExcelReport();
        } else if (report.format === 'csv') {
          generateCSVReport();
        }
        
        // Reset back to original report type
        setReportType(originalReportType);
        
      } else {
        // If we already have report data, just generate the report
        if (report.format === 'excel') {
          generateExcelReport();
        } else if (report.format === 'csv') {
          generateCSVReport();
        }
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert(`Error downloading report: ${error.message}`);
      setLoading(false);
    }
  };
  
  // Delete a report from history
  const deleteReport = (reportId) => {
    const updatedReports = generatedReports.filter(report => report.id !== reportId);
    setGeneratedReports(updatedReports);
    
    // Update localStorage
    try {
      localStorage.setItem('votesure_generated_reports', JSON.stringify(updatedReports));
      console.log('Updated reports in localStorage after deletion');
    } catch (error) {
      console.error('Error updating localStorage after deleting report:', error);
    }
    
    // If the deleted report was selected, clear selection
    if (selectedReport && selectedReport.id === reportId) {
      setSelectedReport(null);
    }
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
                              className="me-2"
                              onClick={() => downloadReport(report)}
                            >
                              <FaDownload className="me-1" /> Download
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this report?')) {
                                  deleteReport(report.id);
                                }
                              }}
                            >
                              Delete
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
                        <Button 
                          variant="outline-danger" 
                          className="me-2"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this report?')) {
                              deleteReport(selectedReport.id);
                            }
                          }}
                        >
                          Delete Report
                        </Button>
                        <Button 
                          variant="primary"
                          onClick={() => downloadReport(selectedReport)}
                        >
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
                
                {reportType === 'candidate-performance' && reportData.candidates && (
                  <div className="mb-4">
                    <Card className="border-0 shadow-sm mb-3">
                      <Card.Header className="bg-light">
                        <h6 className="mb-0">Candidate Performance Analytics</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row className="text-center mb-3">
                          <Col xs={6} md={3} className="mb-3">
                            <div className="border rounded p-3">
                              <h5 className="mb-1">{reportData.candidates.length}</h5>
                              <p className="text-muted small mb-0">Candidates Analyzed</p>
                            </div>
                          </Col>
                          <Col xs={6} md={3} className="mb-3">
                            <div className="border rounded p-3">
                              <h5 className="mb-1">{reportData.elections.length}</h5>
                              <p className="text-muted small mb-0">Elections Covered</p>
                            </div>
                          </Col>
                          <Col xs={6} md={3} className="mb-3">
                            <div className="border rounded p-3">
                              <h5 className="mb-1">
                                {reportData.candidates.length > 0 ? 
                                  reportData.candidates[0].name : 'N/A'}
                              </h5>
                              <p className="text-muted small mb-0">Top Performer</p>
                            </div>
                          </Col>
                          <Col xs={6} md={3} className="mb-3">
                            <div className="border rounded p-3">
                              <h5 className="mb-1">
                                {reportData.candidates.length > 0 ?
                                  reportData.candidates.reduce((max, c) => 
                                    Math.max(max, c.totalVotes), 0) : 0}
                              </h5>
                              <p className="text-muted small mb-0">Highest Vote Count</p>
                            </div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                    
                    <div className="mb-3">
                      <h6 className="mb-2">Top Candidates by Total Votes</h6>
                      {reportData.candidates && reportData.candidates.length > 0 ? (
                        <Table responsive size="sm" className="border">
                          <thead className="table-light">
                            <tr>
                              <th>Rank</th>
                              <th>Name</th>
                              <th>Party</th>
                              <th>Total Votes</th>
                              <th>Avg %</th>
                              <th>Elections</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.candidates.slice(0, 5).map((candidate, index) => (
                              <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{candidate.name}</td>
                                <td>{candidate.party}</td>
                                <td>{candidate.totalVotes}</td>
                                <td>
                                  <Badge bg="primary">
                                    {candidate.avgPercentage ? 
                                      `${candidate.avgPercentage.toFixed(2)}%` : '0%'}
                                  </Badge>
                                </td>
                                <td>{candidate.totalElections}</td>
                              </tr>
                            ))}
                            {reportData.candidates.length > 5 && (
                              <tr>
                                <td colSpan="6" className="text-center">
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
                    
                    <div>
                      <h6 className="mb-2">Elections Analyzed</h6>
                      <p className="text-muted small">
                        This report analyzes candidate performance across {reportData.elections.length} recent elections,
                        comparing vote counts, percentages, and consistency of performance.
                      </p>
                    </div>
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