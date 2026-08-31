import Login from "./Login";

export const AdminLogin = (props) => {
  return <Login initialRole="admin" {...props} />;
};

export default AdminLogin;
