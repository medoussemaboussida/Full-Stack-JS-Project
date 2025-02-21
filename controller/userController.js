const User = require('../model/user');
const bcrypt = require("bcrypt"); 
const jwt=require("jsonwebtoken")

//jwt config
const maxAge=1 * 60 ; //1hrs
const createtoken=(id,username)=>{
return jwt.sign({id,username},'randa',{expiresIn:maxAge})
}

//signup
module.exports.addStudent = async (req,res) => { 

    try{
        console.log(req.body);
        const{ username , dob , email, password,speciality,level}=req.body;
        const etatUser = "Actif"
        const photoUser= "Null"
        const roleUser = "student";
        const user = new User({username , email , dob , password , role:roleUser , etat:etatUser , user_photo:photoUser,speciality:speciality,level:level});
        const userAdded = await user.save()
        res.status(201).json(userAdded);
    }catch(err){
        res.status(500).json({message: err.message})
    }
} 
//login
module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Trouver l'utilisateur par email
        const user = await User.findOne({ email });
        if (user) {
             // Vérifier le mot de passe crypté
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Mot de passe incorrect" });
        }
        else {
                // Générer le token
                const token = createtoken(user._id);

                // Définir le cookie avec le token
                res.cookie('jwt-token', token, { httpOnly: true, maxAge: maxAge * 1000 });

                // Retourner l'utilisateur et le token
                return res.status(200).json({ user, token });
            } 
            throw new Error("Incorrect password or unauthorized role");
        }
        throw new Error("Incorrect email");
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

//utilise se methode pour recuperer le utiliseateur depuis token recuperé
module.exports.Session = async (req, res) => {
    try {
        const user = await User.findById(req.params.id); // Récupérer l'utilisateur par son ID
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ username: user.username }); // Retourner le username
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};