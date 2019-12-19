import firebaseApp from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/functions';

const DEBUG = false;

const firebaseConfig = {
    apiKey: "AIzaSyDbI_bmAmgbarX7cAqoXXESz-BfPZzHUh0",
    authDomain: "airly-collector-2.firebaseapp.com",
    databaseURL: "https://airly-collector-2.firebaseio.com",
    projectId: "airly-collector-2",
    storageBucket: "airly-collector-2.appspot.com",
    messagingSenderId: "1059575110841",
    appId: "1:1059575110841:web:e9ee0d36d0b8a60f820f68",
    measurementId: "G-J9HRYEV84W"
};
firebaseApp.initializeApp(firebaseConfig);
if (DEBUG) {
    firebaseApp.functions().useFunctionsEmulator('http://localhost:3081');
}
export default firebaseApp;
