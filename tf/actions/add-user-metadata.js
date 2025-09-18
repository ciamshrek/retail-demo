
/**
 * Auth0 Action: Add User Metadata to Token
 * This action adds custom claims to the ID and access tokens
 */
exports.onExecutePostLogin = async (event, api) => {
  const { user } = event;
  const audience = event.secrets.API_AUDIENCE;

  // Add custom claims to the token
  if (event.authorization) {
    // Add user metadata to access token
    api.accessToken.setCustomClaim(`${audience}/user_id`, user.user_id);
    api.accessToken.setCustomClaim(`${audience}/email`, user.email);
    api.accessToken.setCustomClaim(`${audience}/name`, user.name);
    api.accessToken.setCustomClaim(`${audience}/picture`, user.picture);
    
    // Decode subject_token if present and add skyfire_act claim
    if (event.request && event.request.body && event.request.body.subject_token) {
      try {
        // Decode JWT without verification (since it was already validated in custom token exchange)
        const base64Payload = event.request.body.subject_token.split('.')[1];
        const decodedPayload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
        
        if (decodedPayload.sub) {
          api.accessToken.setCustomClaim(`${audience}/skyfire_act`, decodedPayload.sub);
        }
      } catch (error) {
        console.log('Error decoding subject_token:', error.message);
      }
    }
  }

  // Add custom claims to ID token
  api.idToken.setCustomClaim(`${audience}/user_id`, user.user_id);
  api.idToken.setCustomClaim(`${audience}/email`, user.email);
  api.idToken.setCustomClaim(`${audience}/name`, user.name);
  api.idToken.setCustomClaim(`${audience}/picture`, user.picture);
  

  
};
