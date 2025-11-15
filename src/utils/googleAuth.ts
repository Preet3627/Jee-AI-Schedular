declare global {
  interface Window {
    gapi: any;
  }
}

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

let authInstance: any = null;

export const initClient = (
  clientId: string,
  onAuthChange: (isSignedIn: boolean) => void,
  onError: (error: any) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    window.gapi.load('client:auth2', async () => {
      try {
        await window.gapi.client.init({
          clientId: clientId,
          scope: `${CALENDAR_SCOPE} ${DRIVE_SCOPE}`,
          discoveryDocs: [
            'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
            'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
          ],
        });
        
        authInstance = window.gapi.auth2.getAuthInstance();
        authInstance.isSignedIn.listen(onAuthChange);
        onAuthChange(authInstance.isSignedIn.get());
        resolve();
      } catch (error) {
        onError(error);
        reject(error);
      }
    });
  });
};

export const getAuthInstance = () => {
  return authInstance;
};

export const handleSignIn = () => {
  if (authInstance) {
    return authInstance.signIn();
  }
  return Promise.reject(new Error('Google Auth instance not initialized.'));
};

export const handleSignOut = () => {
  if (authInstance) {
    authInstance.signOut();
  }
};

export const getIsSignedIn = (): boolean => {
  try {
    return authInstance && authInstance.isSignedIn.get();
  } catch (e) {
    return false;
  }
};

export const getCurrentUserProfile = () => {
    if (getIsSignedIn()) {
        return authInstance.currentUser.get().getBasicProfile();
    }
    return null;
}
