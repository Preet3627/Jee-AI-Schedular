
declare const gapi: any;

const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest", "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.events";

/**
 * Initializes the Google API client.
 * This function is called once the user is logged in and their Google Client ID is available.
 */
export function initClient(clientId: string, updateSigninStatus: (isSignedIn: boolean) => void, onError: (error: any) => void) {
  if (!clientId) {
      onError({ message: "Google Client ID is not configured in settings." });
      return;
  }
  
  // gapi.load can be slow, so we check if it's already initialized to avoid re-loading.
  if (gapi?.client?.drive) {
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    return;
  }
  
  gapi.load('client:auth2', async () => {
    try {
      await gapi.client.init({
        clientId: clientId,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES,
      });

      // Listen for sign-in state changes.
      gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

      // Handle the initial sign-in state.
      updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    } catch (error: any) {
       console.error("GAPI Init Error:", error);
       // Pass the full error object up to the caller for detailed logging
       onError(error);
    }
  });
}