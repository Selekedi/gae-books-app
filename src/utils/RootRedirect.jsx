import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

function RootRedirect({ user }) {
  const [isAdmin, setIsAdmin] = useState(null);
  const [loadingClaims, setLoadingClaims] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoadingClaims(false);
      return;
    }

    // Fetch the claims asynchronously
    user.getIdTokenResult()
      .then((token) => {
        setIsAdmin(!!token.claims.admin);
      })
      .catch((error) => {
        console.error("Error getting user claims:", error);
        setIsAdmin(false); // Default fallback on error
      })
      .finally(() => {
        setLoadingClaims(false);
      });
  }, [user]);

  // 1. If user is logged out, send them straight to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. While waiting for the Firebase token to resolve, show a loading screen
  if (loadingClaims) {
    return <div>Loading your dashboard...</div>; // Replace with a nice Spinner component if you have one
  }

  // 3. Once claims are loaded, safely redirect based on the role
  if (isAdmin) {
    console.log("Redirecting Admin to /clients");
    return <Navigate to="/clients" replace />;
  } else {
    console.log(`Redirecting User to /userProfile/${user.uid}`);
    return <Navigate to={`/client/${user.uid}`} replace />;
  }
}

export default RootRedirect;

