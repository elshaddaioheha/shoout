export const getFriendlyErrorMessage = (error: any): string => {
    const code = error?.code || error?.message || 'unknown';

    // Firebase Auth errors
    if (code.includes('email-already-in-use')) return "This email is already registered. Try logging in.";
    if (code.includes('invalid-email')) return "The email address is not valid.";
    if (code.includes('weak-password')) return "The password is too weak. Please use a stronger password.";
    if (code.includes('user-not-found') || code.includes('invalid-credential')) return "Incorrect email or password. Please try again.";
    if (code.includes('wrong-password')) return "Incorrect password. Please try again.";
    if (code.includes('too-many-requests')) return "Maximum attempts reached. Please try again later.";
    if (code.includes('network-request-failed')) return "Network error. Please check your internet connection.";
    if (code.includes('requires-recent-login')) return "For security, please log out and log in again before changing this.";

    // Google Sign-In SDK setup issues (Android DEVELOPER_ERROR / code 10)
    if (code.includes('DEVELOPER_ERROR') || code.includes('developer_error') || code === '10') {
        return "Google Sign-In is misconfigured. Please verify OAuth client IDs, SHA fingerprints, package name, and google-services.json.";
    }

    // Fallback exactly to message if provided, without the "Firebase:" prefix
    if (error?.message) {
        let msg = error.message;
        if (msg.startsWith('Firebase:')) {
            msg = msg.replace(/Firebase: /g, '').replace(/\(auth\/.*\)\.?/, '').trim();
        }
        return msg;
    }

    return "An unexpected error occurred. Please try again.";
};
