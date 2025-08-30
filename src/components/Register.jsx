import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock } from "lucide-react";
import SwirlingEffectSpinner from "./loader";
import useUserStore from "../../store/userStore";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useUserStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "https://cryogena-backend.onrender.com/graphql/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `
            mutation Register($username: String!, $email: String!, $password: String!) {
              register(username: $username, email: $email, password: $password) {
                user {
                  id
                  username
                  email
                  credits
                  avatarInitials
                }
                token
              }
            }
          `,
            variables: { username, email, password },
          }),
        }
      );

      const { data, errors } = await response.json();

      if (errors) {
        setError(errors[0].message);
        setLoading(false);
        return;
      }

      if (data.register) {
        setUser(data.register.user, data.register.token);
        navigate("/dashboard");
      }
    } catch (err) {
      setError("Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900">
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
          <SwirlingEffectSpinner />
        </div>
      )}
      <div className="bg-neutral-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-white mb-6">
          Register for Cryogena
        </h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <User
              className="absolute top-3 left-3 text-neutral-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:border-orange-500"
              required
            />
          </div>
          <div className="relative">
            <Mail
              className="absolute top-3 left-3 text-neutral-400"
              size={20}
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:border-orange-500"
              required
            />
          </div>
          <div className="relative">
            <Lock
              className="absolute top-3 left-3 text-neutral-400"
              size={20}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-md bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:border-orange-500"
              required
            />
          </div>
          <button
            Tina
            type="submit"
            className="w-full py-2 px-4 bg-gradient-to-r from-orange-500 to-orange-800 text-white rounded-md hover:from-orange-600 hover:to-orange-900"
            disabled={loading}
          >
            Register
          </button>
        </form>
        <p className="text-center text-neutral-400 mt-4">
          Already have an account?{" "}
          <a href="/login" className="text-orange-500 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;
