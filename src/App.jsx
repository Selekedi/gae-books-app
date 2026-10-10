import { Route, HashRouter as Router, Routes } from "react-router-dom"
import LogIn from "./Pages/Login/Login"
import ProtectedRoute from "./utils/ProtectedRoute"

import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "./services/firebase/firebaseConfig"
import SplashScreen from "./Components/Loaders/SplashScreen"
import SignUp from "./Pages/SignUp/SignUp"
import Home from "./Pages/Home/Home"
import CashBook from "./Pages/CashBook/CashBook"

function App() {
  const [user,setUser] = useState(undefined)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth,(firebaseUser) => {
      setUser(firebaseUser)
    })

    return () => unsubscribe()
  },[])
  
  if(user === undefined) return <SplashScreen/>

  return (
   <Router>
    <Routes>
      <Route path="/login" element={<LogIn/>}/>
      <Route path="/sign-up" element={<SignUp/>}/>
      <Route element={<ProtectedRoute  user={user}/>}>
          <Route path="/" element={<Home/>}/>
          <Route path="/cash-book" element={<CashBook user={user}/>}/>
      </Route>
    </Routes>
   </Router>
  )
}

export default App
