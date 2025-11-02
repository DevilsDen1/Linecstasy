const { RecaptchaEnterpriseServiceClient } = require('@google-cloud/recaptcha-enterprise');
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// reCAPTCHA configuration
const projectID = "linecstasy-ai-sohbet";
const recaptchaKey = "6Lf_TP0rAAAAAAngfesV8j4OXH4YrooCY_P5yvys";

// Initialize the reCAPTCHA client
const client = new RecaptchaEnterpriseServiceClient();

// Verify reCAPTCHA token
async function verifyRecaptcha(token, recaptchaAction = 'LOGIN') {
  try {
    const projectPath = client.projectPath(projectID);
    
    // Build the assessment request
    const [response] = await client.createAssessment({
      assessment: {
        event: {
          token: token,
          siteKey: recaptchaKey,
        },
      },
      parent: projectPath,
    });

    // Check if the token is valid
    if (!response.tokenProperties.valid) {
      console.error(`The token is invalid: ${response.tokenProperties.invalidReason}`);
      return { success: false, error: 'Invalid reCAPTCHA token', reason: response.tokenProperties.invalidReason };
    }

    // Check if the expected action was executed
    if (response.tokenProperties.action !== recaptchaAction) {
      console.error(`Action mismatch: expected ${recaptchaAction}, got ${response.tokenProperties.action}`);
      return { success: false, error: 'Action mismatch' };
    }

    // Get the risk score
    const score = response.riskAnalysis.score;
    console.log(`reCAPTCHA score: ${score}`);
    
    // Check if the score meets your threshold (0.5 is a common threshold)
    if (score < 0.5) {
      console.log('reCAPTCHA score too low');
      return { success: false, error: 'reCAPTCHA verification failed', score };
    }

    return { success: true, score };
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return { success: false, error: error.message };
  }
}

// API endpoint for reCAPTCHA verification
app.post('/api/verify-recaptcha', async (req, res) => {
  const { token, action } = req.body;
  
  if (!token) {
    return res.status(400).json({ success: false, error: 'Token is required' });
  }

  const result = await verifyRecaptcha(token, action || 'LOGIN');
  
  if (result.success) {
    res.json({ success: true, score: result.score });
  } else {
    res.status(400).json(result);
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`reCAPTCHA verification service running on port ${PORT}`);
});

module.exports = { verifyRecaptcha };
