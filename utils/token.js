import jwt from 'jsonwebtoken'
const genToken= async (userid)=>{

try{
 const token = jwt.sign({ userId: userid }, process.env.JWT_SECRET, { expiresIn: "7d" });

    console.log("hello this is utils token",token)
    return token;


}catch(error)
{
      console.log(error)
}

}

export default genToken