const yup = require("yup");
const natural = require("natural");

// Outil d'analyse de sentiment
const sentimentAnalyzer = new natural.SentimentAnalyzer("English", null, "afinn");
const tokenizer = new natural.WordTokenizer();

function getPasswordStrength(password) {
    const tokens = tokenizer.tokenize(password);
    const sentiment = sentimentAnalyzer.getSentiment(tokens);
    const sentimentScore = sentiment > 0.5 ? 4 : sentiment > 0 ? 2 : 1;

    const lengthScore = password.length >= 12 ? 4 : password.length >= 8 ? 3 : 1;

    let complexityScore = 0;
    if (/[A-Z]/.test(password)) complexityScore += 2;
    if (/[a-z]/.test(password)) complexityScore += 2;
    if (/\d/.test(password)) complexityScore += 2;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) complexityScore += 2;

    const totalScore = sentimentScore + lengthScore + complexityScore;

    if (totalScore >= 12) return "STRONG";
    if (totalScore >= 8) return "MODERATE";
    return "WEAK";
}

async function validateUser(req, res, next) {
    try {
        const Schema = yup.object().shape({
            username: yup.string()
                .matches(/^[A-Za-z\s]+$/, "Le nom doit contenir uniquement des lettres et espaces.")
                .min(6, "Username must be at least 6 characters long.")
                .required("Nom d'utilisateur requis."),

            email: yup.string()
                .email("Format d'email invalide.")
                .matches(/^[a-zA-Z0-9._%+-]+@esprit\.tn$/, "L'email doit se terminer par @esprit.tn.")
                .required("Email requis."),

            dob: yup.date()
                .max(new Date(), "La date de naissance ne peut pas être dans le futur.")
                .test("is-18", "Vous devez avoir au moins 18 ans.", function (value) {
                    if (!value) return false;
                    const today = new Date();
                    const birthDate = new Date(value);
                    const age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    const dayDiff = today.getDate() - birthDate.getDate();
                    
                    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
                        return age - 1 >= 18;
                    }
                    return age >= 18;
                })
                .required("Date de naissance requise."),

            password: yup.string()
                .test("password-strength", "Mot de passe trop faible. Il doit être au moins MODERÉ.", function(value) {
                    return getPasswordStrength(value) !== "WEAK";
                })
                .required("Mot de passe requis."),

            speciality: yup.string()
                .oneOf(["A", "B", "TWIN", "SAE", "SE", "BI", "DS", "IOSYS", "SLEAM", "SIM", "NIDS", "INFINI"], "Spécialité invalide.")
                .required("Spécialité requise."),

            level: yup.number()
                .integer("Le niveau doit être un nombre.")
                .min(1, "Le niveau doit être au minimum 1.")
                .max(5, "Le niveau ne peut pas dépasser 5.")
                .required("Niveau requis."),
        });

        await Schema.validate(req.body, { abortEarly: false });
        next();
    } catch (err) {
        return res.status(400).json({ errors: err.errors });
    }
}

module.exports = validateUser;
