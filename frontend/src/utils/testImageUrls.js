// Test script for image URL formatting
import { formatImageUrl } from './imageUtils';

// Test cases
const testCases = [
  {
    input: '/uploads/candidatePhoto-1742929578484-69305146.jpg',
    expected: 'http://localhost:5000/uploads/candidatePhoto-1742929578484-69305146.jpg',
    description: 'Path starting with /'
  },
  {
    input: 'uploads/candidatePhoto-1742929578484-69305146.jpg',
    expected: 'http://localhost:5000/uploads/candidatePhoto-1742929578484-69305146.jpg',
    description: 'Path without leading /'
  },
  {
    input: 'http://localhost:5000/uploads/candidatePhoto-1742929578484-69305146.jpg',
    expected: 'http://localhost:5000/uploads/candidatePhoto-1742929578484-69305146.jpg',
    description: 'Full URL'
  },
  {
    input: 'https://example.com/image.jpg',
    expected: 'https://example.com/image.jpg',
    description: 'External URL'
  },
  {
    input: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQE...',
    expected: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQE...',
    description: 'Data URL'
  },
  {
    input: 'blob:http://localhost:3000/1234-5678-9012',
    expected: 'blob:http://localhost:3000/1234-5678-9012',
    description: 'Blob URL'
  },
  {
    input: null,
    expected: '',
    description: 'Null input'
  },
  {
    input: undefined,
    expected: '',
    description: 'Undefined input'
  }
];

// Run tests
console.log('TESTING IMAGE URL FORMATTING');
console.log('============================');

testCases.forEach((test, index) => {
  const result = formatImageUrl(test.input);
  const pass = result === test.expected;
  
  console.log(`Test ${index + 1}: ${test.description}`);
  console.log(`Input:    ${test.input}`);
  console.log(`Expected: ${test.expected}`);
  console.log(`Actual:   ${result}`);
  console.log(`Result:   ${pass ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log('----------------------------');
});

// Export a function to run tests
export function runImageUrlTests() {
  let passCount = 0;
  
  testCases.forEach((test) => {
    const result = formatImageUrl(test.input);
    if (result === test.expected) {
      passCount++;
    }
  });
  
  console.log(`Passed ${passCount}/${testCases.length} tests`);
  return passCount === testCases.length;
}

// Run tests when this module is imported
runImageUrlTests(); 