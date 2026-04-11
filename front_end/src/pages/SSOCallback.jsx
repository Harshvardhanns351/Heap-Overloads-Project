/**
 * /sso-callback  — Clerk finalizes the OAuth session here, then
 *                  redirects to /sso-exchange where we get the backend JWT.
 */
import { AuthenticateWithRedirectCallback } from '@clerk/react';

export default function SSOCallback() {
  return (
    <AuthenticateWithRedirectCallback
      afterSignInUrl="/sso-exchange"
      afterSignUpUrl="/sso-exchange"
      signInFallbackRedirectUrl="/sso-exchange"
      signUpFallbackRedirectUrl="/sso-exchange"
    />
  );
}
