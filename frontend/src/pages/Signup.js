import React, { useState } from "react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signup = () => {
    createUserWithEmailAndPassword(auth, email, password)
      .then(() => {
        alert("Signup Success ✅");
      })
      .catch((error) => {
        alert(error.message);
      });
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Signup</h2>
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
      <button onClick={signup}>Signup</button>
    </div>
  );
}

export default Signup;
