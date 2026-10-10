import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore"
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../services/firebase/firebaseConfig"

const clientsRef = collection(db,"clients")
const transactionsRef = collection(db,"transaction")

export async function registerUserWithProfile(email, password, name) {
  try {
    // A. Create the authentication account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // B. Reference a document in the 'users' collection using the Auth UID
    const userDocRef = doc(db, "users", user.uid);

    // C. Write the custom profile data to Firestore
    await setDoc(userDocRef, {
      email: user.email,
      name
    });

    console.log("User authenticated and Firestore profile created successfully!");
    return user.uid;

  } catch (error) {
    console.error("Error during registration:", error.message);
    throw error;
  }
}

export async function logOut(){
  try {
    await signOut(auth)
  } catch (error) {
    console.error(error)
  }
}



export const getUserById = async (id) => {
    try {
        const userRef = doc(db,"users",id)
        const userSnapShot =  await getDoc(userRef)
        if(userSnapShot.exists){
            return ({id:userSnapShot.id,...userSnapShot.data()})
        }
    } catch (error) {
        
    }
}


export const addTransaction = async ({userId, type, details}) => {
    try {
        const transactionRef = doc(transactionsRef)
        const newTransactiion = await setDoc(transactionRef,{
            clientId:userId,
            type,
            ...details,
            createdAt:serverTimestamp()
        })
        return transactionRef.id
    } catch (error) {
        console.error(error)
    }
}

export const deleteTransactionById = async (id) => {
    try {
        const transactionRef = doc(db,"transaction",id)
        await deleteDoc(transactionRef)
    } catch (error) {
        console.error(error)
        throw error
    }
} 
