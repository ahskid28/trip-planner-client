"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const signup = async () => {
    if (!name || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Signup failed");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      router.push("/");
    } catch (error) {
      console.error(error);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">

        {/* Logo Section */}
        <div className="mb-8 text-center">
          <div className="text-6xl">✈️</div>

          <h2 className="mt-3 text-2xl font-bold text-white">
            Smart Travel Planner
          </h2>

          <p className="mt-2 text-sm text-purple-200">
            Create your account and start planning amazing trips
          </p>
        </div>

        {/* Name */}
        <input
          className="mb-4 w-full rounded-xl border border-white/20 bg-white/90 px-4 py-3 text-slate-900 shadow-md outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Email */}
        <input
          type="email"
          className="mb-4 w-full rounded-xl border border-white/20 bg-white/90 px-4 py-3 text-slate-900 shadow-md outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password */}
        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            className="w-full rounded-xl border border-white/20 bg-white/90 px-4 py-3 pr-14 text-slate-900 shadow-md outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-sm font-medium text-purple-700"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {/* Signup Button */}
        <button
          onClick={signup}
          disabled={loading}
          className="w-full rounded-xl bg-linear-to-r from-pink-500 via-purple-600 to-blue-600 py-3 font-semibold text-white shadow-lg transition duration-300 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="h-px flex-1 bg-white/20"></div>
          <span className="px-3 text-sm text-white/70">or</span>
          <div className="h-px flex-1 bg-white/20"></div>
        </div>

        {/* Login Link */}
        <button
          onClick={() => router.push("/login")}
          className="w-full rounded-xl border border-white/20 bg-white/10 py-3 font-medium text-white transition hover:bg-white/20"
        >
          Already have an account? Login
        </button>
      </div>
    </main>
  );
}