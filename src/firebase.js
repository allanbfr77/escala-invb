import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAbgPu2ilzgNu69b2uOjiM9SmYoqy_Kj8o",
  authDomain: "escala-lideres.firebaseapp.com",
  projectId: "escala-lideres",
  storageBucket: "escala-lideres.firebasestorage.app",
  messagingSenderId: "622766190731",
  appId: "1:622766190731:web:548848b2e775180376648e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);