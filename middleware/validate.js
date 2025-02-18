const yup = require("yup");

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

            password: yup.string()
                .min(6, "Password must be at least 6 characters long.")
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
