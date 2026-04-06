// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCJSGFvPIgkdp_gbfOcMDs-dRxoDW7L56U",
  authDomain: "drider-earn.firebaseapp.com",
  projectId: "drider-earn",
  storageBucket: "drider-earn.firebasestorage.app",
  messagingSenderId: "119142900994",
  appId: "1:119142900994:web:738e2e4266eed4e6f24e1b",
  measurementId: "G-465BJQJFSV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
