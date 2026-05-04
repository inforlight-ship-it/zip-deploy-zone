import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Intercepts Supabase auth hash fragments (recovery, invite, signup)
 * on any route and redirects to the correct handler page.
 */
const AuthHashRouter = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    // Handle error fragments (e.g. otp_expired)
    if (hash.includes("error=")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const errorDesc = params.get("error_description") || "Link inválido ou expirado.";
      // Redirect to auth with error info
      navigate(`/auth?error=${encodeURIComponent(errorDesc)}`, { replace: true });
      return;
    }

    // Handle recovery tokens → reset password page
    if (hash.includes("type=recovery")) {
      navigate(`/reset-password${hash}`, { replace: true });
      return;
    }

    // Handle invite tokens → reset password page (user sets their password)
    if (hash.includes("type=invite")) {
      navigate(`/reset-password${hash}`, { replace: true });
      return;
    }

    // Handle signup confirmation → auth page
    if (hash.includes("type=signup")) {
      navigate(`/auth${hash}`, { replace: true });
      return;
    }

    // Handle magiclink → auth page
    if (hash.includes("type=magiclink")) {
      navigate(`/auth${hash}`, { replace: true });
      return;
    }
  }, [location.hash, navigate]);

  return null;
};

export default AuthHashRouter;
