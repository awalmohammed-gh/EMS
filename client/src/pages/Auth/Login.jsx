import EmployeeLoginPage from "./EmployeeLoginPage";
import AdminLoginPage from "./AdminLoginPage";

/**
 * Login Component (Compatibility wrapper)
 * Directs to the dedicated EmployeeLoginPage or AdminLoginPage
 */
export const Login = ({ initialRole = "employee", ...props }) => {
  if (initialRole === "admin") {
    return <AdminLoginPage {...props} />;
  }
  return <EmployeeLoginPage {...props} />;
};

export default Login;
