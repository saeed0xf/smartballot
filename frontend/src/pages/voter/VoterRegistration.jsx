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
    age: Yup.number()
      .required('Age is required')
      .min(18, 'You must be at least 18 years old')
      .max(120, 'Invalid age'),
    dateOfBirth: Yup.date().required('Date of birth is required'),
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
    voterId: Yup.string().required('Voter ID is required'),
    profileImage: Yup.mixed().required('Profile image is required')
  });

  // Initial form values
  const initialValues = {
    firstName: '',
    middleName: '',
    lastName: '',
    age: '',
    dateOfBirth: '',
    email: '',
    voterId: '',
    profileImage: null
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
      formData.append('age', values.age);
      formData.append('dateOfBirth', values.dateOfBirth);
      formData.append('email', values.email);
      formData.append('voterId', values.voterId);
      formData.append('profileImage', values.profileImage);
      formData.append('walletAddress', walletAddress);

      // Submit registration
      await registerVoter(formData);

      toast.success('Registration submitted successfully! Please wait for admin approval.');
      resetForm();
      navigate('/');
    } catch (err) {
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
                        <Form.Label>Age</Form.Label>
                        <Form.Control
                          type="number"
                          name="age"
                          value={values.age}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.age && errors.age}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.age}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Date of Birth</Form.Label>
                        <Form.Control
                          type="date"
                          name="dateOfBirth"
                          value={values.dateOfBirth}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.dateOfBirth && errors.dateOfBirth}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errors.dateOfBirth}
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>

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
                    <Form.Label>Profile Image</Form.Label>
                    <Form.Control
                      type="file"
                      name="profileImage"
                      accept="image/*"
                      onChange={(e) => {
                        setFieldValue('profileImage', e.currentTarget.files[0]);
                      }}
                      isInvalid={touched.profileImage && errors.profileImage}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.profileImage}
                    </Form.Control.Feedback>
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