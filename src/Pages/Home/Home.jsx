import { Link } from "react-router-dom";

export default function Home(){

    return (
        <section>
            <h1>Wecome</h1>

            <div className="choices">
                <Link to={"/cash-book"}>
                    Cash Book
                </Link>
            </div>
        </section>
    )
}