import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCJSGFvPIgkdp_gbfOcMDs-dRxoDW7L56U",
  authDomain: "drider-earn.firebaseapp.com",
  projectId: "drider-earn",
  storageBucket: "drider-earn.firebasestorage.app",
  messagingSenderId: "119142900994",
  appId: "1:119142900994:web:738e2e4266eed4e6f24e1b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
