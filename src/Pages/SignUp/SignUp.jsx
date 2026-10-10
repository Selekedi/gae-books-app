import { useState } from "react"
import FloatingLabelInput from "../../Components/FloatingInputs/FloatingLabelInput"
import FloatingLabelPasswordInput from "../../Components/FloatingInputs/FloatingLabelPasswordInput"
import FullScreenLoader from "../../Components/Loaders/FullScreenLoader"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "../../services/firebase/firebaseConfig"
import { registerUserWithProfile } from "../../Server/Server"
import isValidEmail from "../../utils/validateEmail"
import { useNavigate } from "react-router-dom"

export default function SignUp(){
    const [email,setEmail] = useState("")
    const [password,setPassword] = useState("")
    const [loading,setLoading] = useState(false)
    const [name,setName] = useState("")
    const [error,setError] = useState("")
    const navigate = useNavigate()

    const handleSubmit = async () => {
        setError("")
        if(!name){
            setError("name is required")
            return
        }
        if(!isValidEmail(email)){
            setError("email is invalid")
            return
        }
        if(password.length < 6){
            setError("password length should me 6 or more")
        }
        try {
            setLoading(true)
            const newUserId = await registerUserWithProfile(email,password,name)
            navigate("/")
        } catch (error) {
            console.error(error)
            if(error.code === "auth/email-already-in-use"){
                setError("This email is already registered.")
            }
        }finally {
            setLoading(false)
        }
    }
    return (
        <div>
            {loading && <FullScreenLoader/>}
            <h1>Log In</h1>
            <form onSubmit={handleSubmit}>
            	<FloatingLabelInput
                    id={"sign-up-name"}
                    label={"name of business"}
                    value={name}
                    onChange={(e) => {setName(e.target.value)}}
                />
    
                <FloatingLabelInput
                    id={"sign-up-email"}
                    label={"Email"}
                    value={email}
                    onChange={(e) => {setEmail(e.target.value)}}
                />
                <FloatingLabelPasswordInput
                    value={password}
                    onChange={(e) => {setPassword(e.target.value)}}
                />
                <button type={"submit"}>Sign Up</button>
                {error && <div style={{marginTop:"8px"}}>{error}</div>}
            </form>
        </div>
    )
}
