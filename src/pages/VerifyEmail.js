import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const verificationToken = searchParams.get('token'); // Verification token from email
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyEmailToken = async () => {
      console.log('Verification Token:', verificationToken); // Debug token
      if (!verificationToken) {
        setError('Invalid or missing verification token');
        setLoading(false);
        navigate('/signup', { replace: true, state: { error: 'Invalid or missing verification token' } });
        return;
      }

      try {
        // Call backend to verify the token
        console.log('Calling backend to verify token:', verificationToken);
        const response = await axios.get(
          `http://localhost:8080/auth/verify-email?token=${verificationToken}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('Backend response:', response.data); // Debug response
        const { token, message, authenticated } = response.data;
        if (authenticated && token) {
          localStorage.setItem('token', token);
          console.log('JWT Token stored:', token);
          setLoading(false);
          navigate('/dashboard', { replace: true, state: { message: message || 'Email verified successfully!' } });
        } else {
          throw new Error(message || 'Verification failed');
        }
      } catch (error) {
        console.error('Verification error:', error);
        console.log('Error response:', error.response?.data); // Debug error
        const errorMessage = error.response?.data?.message || 'Email verification failed';
        setError(errorMessage);
        setLoading(false);
        navigate('/signup', { replace: true, state: { error: errorMessage } });
      }
    };

    verifyEmailToken();
  }, [verificationToken, navigate]);

  return (
    <div className="verification-container">
      <div className="verification-message">
        <h2>Email Verification</h2>
        <p>
          {loading
            ? 'Please wait while we verify your email address...'
            : error
            ? `Verification failed: ${error}`
            : 'Verification complete. Redirecting to dashboard...'}
        </p>
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
};

export default VerifyEmail;