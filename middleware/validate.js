const yup = require("yup");
const natural = require("natural");
const sentimentAnalyzer = new natural.SentimentAnalyzer("English", null, "afinn");
const tokenizer = new natural.WordTokenizer();


function getPasswordStrength(password) {
       const tokens = tokenizer.tokenize(password);
    const sentiment = sentimentAnalyzer.getSentiment(tokens);
    const sentimentScore = sentiment > 0.5 ? 4 : sentiment > 0 ? 2 : 1;

    const lengthScore = password.length >= 12 ? 4 : password.length >= 8 ? 3 : 1;

    let complexityScore = 0;
    if (/[A-Z]/.test(password)) complexityScore += 2; // Contient une majuscule
    if (/[a-z]/.test(password)) complexityScore += 2; // Contient une minuscule
    if (/\d/.test(password)) complexityScore += 2; // Contient un chiffre
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) complexityScore += 2; // Contient un caractère spécial

    const totalScore = sentimentScore + lengthScore + complexityScore;

    if (totalScore >= 12) return "STRONG";
    if (totalScore >= 8) return "MODERATE";
    return "WEAK";
}

async function validateUser(req, res, next) {
    try {
        const Schema = yup.object().shape({
            username: yup.string()
                .matches(/^[A-Za-z\s]+$/, "Username must start with an uppercase letter and contain only letters.")
                .required("Username is required."),

            email: yup.string()
                .email("Invalid email format.")
                .matches(/^[a-zA-Z0-9._%+-]+@esprit\.tn$/, "Email must end with @esprit.tn.")
                .required("Email is required."),

            dob: yup.date()
                .max(new Date(), "Date of birth cannot be in the future.")
                .required("Date of birth is required."),

            // password: yup.string()
            //     .min(6, "Password must be at least 6 characters long.")
            //     .matches(/[0-9]/, "Password must contain at least one number.")
            //     .matches(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character.")
            //     .required("Password is required."),


            password: yup.string()
            .test("password-strength", "Password is too weak. It must be at least MODERATE.", function(value) {
                const strength = getPasswordStrength(value);
                return strength === "STRONG" || strength === "MODERATE"; // Accepter STRONG ou MODERATE
            })
            .required("Password is required."),

            speciality: yup.string()
                .oneOf(["A", "B", "TWIN", "SAE", "SE", "BI", "DS", "IOSYS", "SLEAM", "SIM", "NIDS", "INFINI"], "Invalid speciality.")
                .required("Speciality is required."),

            level: yup.number()
                .integer("Level must be a number.")
                .min(1, "Level must be at least 1.")
                .max(5, "Level must be at most 5.")
                .required("Level is required."),
        });

        await Schema.validate(req.body, { abortEarly: false });
        next();
    } catch (err) {
        return res.status(400).json({ errors: err.errors });
    }
}

module.exports = validateUser;
