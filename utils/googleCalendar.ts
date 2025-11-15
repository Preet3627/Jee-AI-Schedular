
declare const gapi: any;

/**
 *  Prompts the user to sign in to their Google Account.
 */
export const handleSignIn = (): void => {
    if (gapi && gapi.auth2) {
       gapi.auth2.getAuthInstance().signIn();
    } else {
        console.error("Google Auth instance not initialized. Cannot sign in.");
        alert("Google services are not ready. Please try again in a moment.");
    }
};

/**
 *  Signs the user out of their Google Account.
 */
export const handleSignOut = (): void => {
    if (gapi && gapi.auth2) {
       gapi.auth2.getAuthInstance().signOut();
    } else {
        console.error("Google Auth instance not initialized. Cannot sign out.");
    }
};
