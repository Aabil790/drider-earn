import React, { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        alert("Login Success ✅");
      })
      .catch((error) => {
        alert(error.message);
      });
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Login</h2>
      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      /><br/><br/>
      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      /><br/><br/>
      <button onClick={login}>Login</button>
    </div>
  );
}

export default Login;
