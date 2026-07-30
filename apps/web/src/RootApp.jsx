import App from "./App.jsx";
import AdminReviewPage from "./pages/AdminReviewPage.jsx";
import EligibilityPage from "./pages/EligibilityPage.jsx";

export default function RootApp() {
  const pathname =
    window.location.pathname;

  const isAdminRoute =
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  const isEligibilityRoute =
    pathname === "/eligibility" ||
    pathname.startsWith("/eligibility/");

  if (isAdminRoute) {
    return <AdminReviewPage />;
  }

  if (isEligibilityRoute) {
    return <EligibilityPage />;
  }

  return <App />;
}