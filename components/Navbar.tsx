import Link from "next/link";
import Image from "next/image";
const Navbar = () => {
    return (
        <header>
            <nav>
                <Link href='/' className="logo">
                    <Image src={"/icons/logo.png"} alt="logo" width={20} height={20}/>
                    <p>DevEvent</p>
                </Link>
                <ul>
                    <li><Link href={'/'}>Home</Link></li>
                    <li><Link href={'/'}>Events</Link></li>
                    <li><Link href={'/'}>Create Event</Link></li>
                </ul>            </nav>
        </header>
    )
}
export default Navbar
