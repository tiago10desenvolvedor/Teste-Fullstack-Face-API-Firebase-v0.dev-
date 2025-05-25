// src/firebase.ts
import { initializeApp, getApps } from "firebase/app"
import { getFirestore } from "firebase/firestore"

// Configuração do seu projeto Firebase — substitua pelos seus dados do Firebase Console
const firebaseConfig = { 
  apiKey : "AIzaSyDYoXC8n2jtd98mrES15EOs2Lotj4NISI8" , 
  authDomain : "testefullstack-50307.firebaseapp.com" , 
  projectId : "testefullstack-50307" , 
  storageBucket : "testefullstack-50307.appspot.com" , 
  messagingSenderId : "55881239095" , 
  appId : "1:55881239095:web:2a26505798f3e2aeaa4db2" , 
  measurementId : "G-P7563PVYVV" 
};

// Inicializa o Firebase app apenas se ainda não tiver sido inicializado (para evitar erros em hot reload)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0]

// Exporta o Firestore para usar no projeto
export const db = getFirestore(app)
