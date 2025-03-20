import React, { useState, useContext, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import axios from 'axios';
import Layout from '../../components/Layout';
import { AuthContext } from '../../context/AuthContext';

const VoterRegistration = () => {
  const { connectWallet, isMetaMaskInstalled, registerVoter } = useContext(AuthContext);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const navigate = useNavigate();

  // Connect wallet on component mount
  useEffect(() => {
    const connectWalletOnLoad = async () => {
      try {
        if (isMetaMaskInstalled) {
          const address = await connectWallet();
          setWalletAddress(address);
        }
      } catch (err) {
        console.error('Error connecting wallet:', err);
        setError('Failed to connect to MetaMask. Please try again.');
      }
    };

    connectWalletOnLoad();
  }, [connectWallet, isMetaMaskInstalled]);

  // Validation schema
  const validationSchema = Yup.object({
    firstName: Yup.string().required('First name is required'),
    middleName: Yup.string(),
    lastName: Yup.string().required('Last name is required'),
    fatherName: Yup.string().required('Father\'s name is required'),
    gender: Yup.string().required('Gender is required').oneOf(['male', 'female', 'other'], 'Invalid gender selection'),
    dateOfBirth: Yup.date()
      .required('Date of birth is required')
      .test('is-18-plus', 'You must be at least 18 years old', function(value) {
        if (!value) return false;
        const today = new Date();
        const birthDate = new Date(value);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age >= 18;
      }),
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
    voterId: Yup.string().required('Voter ID is required'),
    voterIdImage: Yup.mixed().required('Voter ID image is required')
  });

  // Initial form values
  const initialValues = {
    firstName: '',
    middleName: '',
    lastName: '',
    fatherName: '',
    gender: '',
    dateOfBirth: '',
    email: '',
    voterId: '',
    voterIdImage: null
  };

  // Handle form submission
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      setError(null);
      setLoading(true);

      if (!walletAddress) {
        throw new Error('Wallet not connected. Please connect your MetaMask wallet.');
      }

      // Create form data
      const formData = new FormData();
      formData.append('firstName', values.firstName);
      formData.append('middleName', values.middleName || '');
      formData.append('lastName', values.lastName);
      formData.append('fatherName', values.fatherName);
      formData.append('gender', values.gender);
      formData.append('dateOfBirth', values.dateOfBirth);
      formData.append('email', values.email);
      formData.append('voterId', values.voterId);
      formData.append('walletAddress', walletAddress);

      // Calculate age from date of birth
      const birthDate = new Date(values.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      formData.append('age', age);

      // Add voter ID image
      if (values.voterIdImage) {
        console.log('Adding voter ID image:', values.voterIdImage.name);
        formData.append('voterIdImage', values.voterIdImage);
      } else {
        console.log('No voter ID image provided');
      }

      // Log formData entries for debugging
      for (let [key, value] of formData.entries()) {
        console.log(`FormData: ${key} = ${value instanceof File ? value.name : value}`);
      }

      // Submit registration
      await registerVoter(formData);

      toast.success('Registration submitted successfully! Please wait for admin approval.');
      resetForm();
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  if (!isMetaMaskInstalled) {
    return (
      <Layout>
        <Container className="py-5">
          <Alert variant="warning">
            <Alert.Heading>MetaMask is not installed</Alert.Heading>
            <p>You need to install MetaMask to register as a voter.</p>
            <hr />
            <div className="d-flex justify-content-end">
              <Button 
                variant="outline-primary" 
                href="https://metamask.io/download/" 
                target="_blank"
                rel="noopener noreferrer"
              >
                Install MetaMask
              </Button>
            </div>
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="voter-registration-container">
        <Card className="shadow-sm">
          <Card.Header className="bg-primary text-white text-center py-3">
            <h3>Voter Registration</h3>
          </Card.Header>
          <Card.Body className="p-4">
            {error && <Alert variant="danger">{error}</Alert>}
            
            {walletAddress ? (
              <Alert variant="success" className="mb-4">
                <strong>Wallet Connected:</strong> {walletAddress}
              </Alert>
            ) : (
              <Alert variant="warning" className="mb-4">
                <strong>Wallet Not Connected.</strong> Please connect your MetaMask wallet to continue.
                <div className="mt-2">
                  <Button 
                    variant="outline-primary" 
                    onClick={async () => {
                      try {
                        const address = await connectWallet();
                        setWalletAddress(address);
                      } catch (err) {
                        setError('Failed to connect wallet. Please try again.');
                      }
                    }}
                  >
                    Connect Wallet
                  </Button>
                </div>
              </Alert>
            )}
            
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({
                values,
                errors,
                touched,
                handleChange,
                handleBlur,
                handleSubmit,
                isSubmitting,
                setFieldValue
              }) => (
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>First Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="firstName"
                          value={values.firstName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.firstName && errors.firstName}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.firstName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Middle Name (Optional)</Form.Label>
                        <Form.Control
                          type="text"
                          name="middleName"
                          value={values.middleName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Last Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="lastName"
                          value={values.lastName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.lastName && errors.lastName}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.lastName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Father's Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="fatherName"
                          value={values.fatherName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.fatherName && errors.fatherName}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.fatherName}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Gender</Form.Label>
                        <Form.Select
                          name="gender"
                          value={values.gender}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.gender && errors.gender}
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          {errors.gender}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Date of Birth</Form.Label>
                    <Form.Control
                      type="date"
                      name="dateOfBirth"
                      value={values.dateOfBirth}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.dateOfBirth && errors.dateOfBirth}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.dateOfBirth}
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      You must be at least 18 years old to register.
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Email Address</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.email && errors.email}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.email}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Voter ID Number</Form.Label>
                    <Form.Control
                      type="text"
                      name="voterId"
                      value={values.voterId}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.voterId && errors.voterId}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.voterId}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Voter ID Image</Form.Label>
                    <Form.Control
                      type="file"
                      name="voterIdImage"
                      accept="image/*"
                      onChange={(e) => {
                        setFieldValue('voterIdImage', e.currentTarget.files[0]);
                      }}
                      isInvalid={touched.voterIdImage && errors.voterIdImage}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.voterIdImage}
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      Please upload a clear image of your voter ID card.
                    </Form.Text>
                  </Form.Group>

                  <div className="d-grid mt-4">
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={isSubmitting || loading || !walletAddress}
                    >
                      {isSubmitting || loading ? 'Submitting...' : 'Submit Registration'}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
};

export default VoterRegistration; 