import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/storage";
import "firebase/compat/database";

export const firebaseConfig = {
  apiKey: "AIzaSyChxzqLaLTuN5cV1LV92yF6tRPh8ZV7FeI",
  authDomain: "anushabazaar-2288e.firebaseapp.com",
  projectId: "anushabazaar-2288e",
  storageBucket: "anushabazaar-2288e.firebasestorage.app",
  messagingSenderId: "64875938387",
  databaseURL: "https://anushabazaar-2288e-default-rtdb.firebaseio.com",
  // Intentionally omitted appId. Supplying an Android appId to Web SDK triggers auth/internal-error
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export { firebase };
export default firebase;
