import { BiParty } from "react-icons/bi";
import { Link } from "react-router-dom";
import './link.css';
import { MdPrivacyTip } from "react-icons/md";
export default function Kgon (){

        
return(
            <>
             
                      <h1 className="logio">IDK</h1>
            
                    
          <div className="natio">
          <h1 className="logio">IDK</h1>
            <center>   <Link to="/kuo" className="profile-ink">
            <BiParty className="profile-ion" />
            <span>Party Mode</span>
          </Link>
          <Link to="https://gliders4599.netlify.app/" className="profile-lnk">
            <MdPrivacyTip className="profile-ion" />
            Privacy Policy
          </Link>
          
          </center></div>
            </>
        )
    
}