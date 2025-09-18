const { jwtVerify } = require("jose");

const jwksUri = "https://shrek-skyfire-demo.us.auth0.com/.well-known/jwks.json";
const fetchTimeout = 5000; // 5 seconds

const validIssuer = "https://shrek-skyfire-demo.us.auth0.com/"; // Replace with your issuer

/**
 * Handler to be executed while executing a custom token exchange request
 * @param {Event} event - Details about the incoming token exchange request.
 * @param {CustomTokenExchangeAPI} api - Methods and utilities to define token exchange process.
 */
exports.onExecuteCustomTokenExchange = async (event, api) => {
  const { isValid, payload } = await validateToken(
    event.transaction.subject_token,
  );

  // Apply your authorization policy as required to determine if the request is valid.
  // Use api.access.deny() to reject the transaction in those cases.

  if (!isValid) {
    // Mark the subject token as invalid and fail the transaction.
    api.access.rejectInvalidSubjectToken("Invalid subject_token");
  } else {
    // Set the user in the current request as authenticated, using the user ID from the subject token.
    api.authentication.setUserById(payload.sub);
  }

  /**
   * Validate the subject token
   * @param {string} subjectToken
   * @returns {Promise<{ isValid: boolean, payload?: object }>} Payload of the token
   */
  async function validateToken(subjectToken) {
    try {
      const { payload, protectedHeader } = await jwtVerify(
        subjectToken,
        async (header) => await getPublicKey(header.kid),
        {
          issuer: validIssuer,
        },
      );

      // Perform additional validation on the token payload as required

      return { isValid: true, payload };
    } catch (/** @type {any} */ error) {
      if (error.message === "Error fetching JWKS") {
        throw new Error("Internal error - retry later");
      } else {
        console.log("Token validation failed:", error.message);
        return { isValid: false };
      }
    }
  }

  /**
   * Get the public key to use for key verification. Load from the actions cache if available, otherwise
   * fetch the key from the JWKS endpoint and store in the cache.
   * @param {string} kid - kid (Key ID) of the key to be used for verification
   * @returns {Promise<Object>}
   */
  async function getPublicKey(kid) {
    const cachedKey = api.cache.get(kid);
    if (!cachedKey) {
      console.log(`Key ${kid} not found in cache`);
      const key = await fetchKeyFromJWKS(kid);
      api.cache.set(kid, JSON.stringify(key), { ttl: 600000 });
      return key;
    } else {
      return JSON.parse(cachedKey.value);
    }
  }

  /**
   * Fetch public signing key from the provided JWKS endpoint, to use for token verification
   * @param {string} kid - kid (Key ID) of the key to be used for verification
   * @returns {Promise<object>}
   */
  async function fetchKeyFromJWKS(kid) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), fetchTimeout);

    /** @type {any} */
    const response = await fetch(jwksUri);

    if (!response.ok) {
      console.log(`Error fetching JWKS. Response status: ${response.status}`);
      throw new Error("Error fetching JWKS");
    }
    const jwks = await response.json();
    const key = jwks.keys.find((key) => key.kid === kid);
    if (!key) {
      throw new Error("Key not found in JWKS");
    }
    return key;
  }
};