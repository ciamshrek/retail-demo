
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
    
    // Add app metadata if it exists
    if (user.app_metadata) {
      api.accessToken.setCustomClaim(`${audience}/app_metadata`, user.app_metadata);
    }
    
    // Add user metadata if it exists
    if (user.user_metadata) {
      api.accessToken.setCustomClaim(`${audience}/user_metadata`, user.user_metadata);
    }
  }

  // Add custom claims to ID token
  api.idToken.setCustomClaim(`${audience}/user_id`, user.user_id);
  api.idToken.setCustomClaim(`${audience}/email`, user.email);
  api.idToken.setCustomClaim(`${audience}/name`, user.name);
  api.idToken.setCustomClaim(`${audience}/picture`, user.picture);
  
  // Set last login time
  api.user.setUserMetadata('last_login', new Date().toISOString());
};
