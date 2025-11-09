import { h, createContext } from 'preact';
import { useState, useEffect, useContext } from 'preact/hooks';
import htm from 'htm';

const html = htm.bind(h);
const AuthContext = createContext();

let tokenClient;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [isGapiReady, setIsGapiReady] = useState(false);

  // 1. Fetch config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("config.json");
        const configData = await response.json();
        setConfig(configData);
      } catch (error) {
        console.error("Error loading config.json:", error);
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // 2. Initialize GAPI client for Drive API calls
  useEffect(() => {
    const initGapiClient = async () => {
      await new Promise((resolve) => gapi.load("client", resolve));
      await gapi.client.init({
        apiKey: config.api_key,
        discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
      });
      await gapi.client.load('oauth2', 'v2');
      setIsGapiReady(true);
    };

    if (config) {
      initGapiClient().catch(error => {
        console.error("Error initializing gapi client for Drive:", error);
        setLoading(false);
      });
    }
  }, [config]);

  // 3. Initialize GIS Token Client and check for stored token
  useEffect(() => {
    if (!config || !isGapiReady) return;

    const fetchUserProfile = async () => {
      try {
        const profileResponse = await gapi.client.oauth2.userinfo.get();
        const profile = profileResponse.result;
        setUser({
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
        });
      } catch (error) {
        console.error("Error fetching user profile:", error);
        // Token might be invalid, clear it
        localStorage.removeItem("google_auth_token");
        localStorage.removeItem("google_auth_token_expiry");
        gapi.client.setToken(null);
      } finally {
        setLoading(false);
      }
    };

    const handleTokenResponse = (tokenResponse) => {
      if (tokenResponse.error) {
        console.error("Google token error:", tokenResponse.error);
        setLoading(false);
        return;
      }
      const expiry = new Date().getTime() + tokenResponse.expires_in * 1000;
      localStorage.setItem("google_auth_token", JSON.stringify(tokenResponse));
      localStorage.setItem("google_auth_token_expiry", expiry);
      gapi.client.setToken(tokenResponse);
      fetchUserProfile();
    };

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: config.oauth_client,
      scope: "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
      callback: handleTokenResponse,
    });

    // Check for existing token
    const token = localStorage.getItem("google_auth_token");
    const expiry = localStorage.getItem("google_auth_token_expiry");
    if (token && expiry && new Date().getTime() < parseInt(expiry)) {
      gapi.client.setToken(JSON.parse(token));
      fetchUserProfile();
    } else {
      setLoading(false);
    }

  }, [config, isGapiReady]);

  const signIn = () => {
    setLoading(true);
    if (tokenClient) {
      tokenClient.requestAccessToken();
    } else {
      console.error("Token client not initialized.");
      setLoading(false);
    }
  };

  const signOut = () => {
    const token = gapi.client.getToken();
    if (token) {
      google.accounts.oauth2.revoke(token.access_token, () => {
        localStorage.removeItem("google_auth_token");
        localStorage.removeItem("google_auth_token_expiry");
        gapi.client.setToken("");
        setUser(null);
      });
    }
  };

  const value = { user, loading, signIn, signOut, isGapiReady };

  return html`
    <${AuthContext.Provider} value=${value}>
      ${children}
    <//>
  `;
}

export function useAuth() {
  return useContext(AuthContext);
}