/**
 * Enhanced debugging utilities for troubleshooting blockchain interactions
 */

const fs = require('fs');
const path = require('path');

// Directory for storing debug logs
const DEBUG_DIR = path.join(__dirname, '../../logs');

// Ensure logs directory exists
try {
  if (!fs.existsSync(DEBUG_DIR)) {
    fs.mkdirSync(DEBUG_DIR, { recursive: true });
  }
} catch (err) {
  console.error('Error creating debug logs directory:', err);
}

/**
 * Generate a detailed log for blockchain transactions
 * @param {String} operation - The operation being performed (e.g., 'createElection')
 * @param {Object} params - Parameters being sent to the blockchain
 * @param {Object} result - Result of the operation
 * @param {Error|null} error - Error object if operation failed
 */
const logBlockchainOperation = (operation, params, result, error = null) => {
  try {
    const timestamp = new Date().toISOString();
    const filename = `${timestamp.split('T')[0]}_blockchain_debug.log`;
    const logPath = path.join(DEBUG_DIR, filename);
    
    let logData = `\n============ BLOCKCHAIN OPERATION LOG: ${timestamp} ============\n`;
    logData += `OPERATION: ${operation}\n\n`;
    
    // Log parameters with proper formatting
    logData += "PARAMETERS:\n";
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key];
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            logData += `${key}: ${JSON.stringify(value, null, 2)}\n`;
          } else {
            logData += `${key}: ${value} (${typeof value})\n`;
          }
        } else {
          logData += `${key}: null or undefined\n`;
        }
      });
    } else {
      logData += "No parameters provided\n";
    }
    
    // Log result
    logData += "\nRESULT:\n";
    if (result) {
      if (typeof result === 'object') {
        logData += JSON.stringify(result, null, 2) + "\n";
      } else {
        logData += `${result}\n`;
      }
    } else {
      logData += "No result data\n";
    }
    
    // Log error if present
    if (error) {
      logData += "\nERROR:\n";
      if (error instanceof Error) {
        logData += `Message: ${error.message}\n`;
        logData += `Stack: ${error.stack}\n`;
      } else if (typeof error === 'object') {
        logData += JSON.stringify(error, null, 2) + "\n";
      } else {
        logData += `${error}\n`;
      }
    }
    
    logData += "===========================================================\n";
    
    // Append to log file
    fs.appendFileSync(logPath, logData);
    
    // Also log to console
    console.log(`[DEBUG] Blockchain operation '${operation}' logged to ${filename}`);
    
    return { success: true, logPath };
  } catch (err) {
    console.error('Error writing to blockchain debug log:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Log election data in detail to help with troubleshooting
 * @param {Object} electionData - The election data object
 * @param {String} source - Source of the data (e.g., 'database', 'frontend')
 */
const logElectionData = (electionData, source = 'unknown') => {
  try {
    const timestamp = new Date().toISOString();
    const filename = `${timestamp.split('T')[0]}_election_data.log`;
    const logPath = path.join(DEBUG_DIR, filename);
    
    let logData = `\n============ ELECTION DATA LOG: ${timestamp} ============\n`;
    logData += `SOURCE: ${source}\n\n`;
    
    // Log election data with proper formatting
    if (electionData) {
      logData += "ELECTION DATA:\n";
      logData += JSON.stringify(electionData, (key, value) => {
        // Handle special types like Date
        if (value instanceof Date) {
          return `Date(${value.toISOString()})`;
        }
        return value;
      }, 2);
      logData += "\n";
    } else {
      logData += "No election data provided\n";
    }
    
    logData += "===========================================================\n";
    
    // Append to log file
    fs.appendFileSync(logPath, logData);
    
    // Also log to console
    console.log(`[DEBUG] Election data from '${source}' logged to ${filename}`);
    
    return { success: true, logPath };
  } catch (err) {
    console.error('Error writing to election data log:', err);
    return { success: false, error: err.message };
  }
};

module.exports = {
  logBlockchainOperation,
  logElectionData
}; 