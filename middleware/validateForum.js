const yup = require("yup");

async function validateForumTopic(req, res, next) {
    try {
        const Schema = yup.object().shape({
            title: yup.string()
                .min(5, "Title must be at least 5 characters long.")
                .max(100, "Title cannot exceed 100 characters.")
                .matches(/^[A-Za-z0-9\s.,!?']+$/, "Title can only contain letters, numbers, spaces, and some characters (.,!?).")
                .required("Title is required."),
            
            description: yup.string()
                .min(10, "Description must be at least 10 characters long.")
                .max(1000, "Description cannot exceed 1000 characters.")
                .matches(/^[A-Za-z0-9\s.,!?']+$/, "Description can only contain letters, numbers, spaces, and some characters (.,!?).")
                .required("Description is required."),
            

            
            tags: yup.array()
                .of(
                    yup.string().oneOf(
                        ["anxiety", "stress", "depression", "burnout", "studies", "loneliness", "motivation", "support", "insomnia", "pressure"],
                        "Invalid tag. Choose from the allowed tags."
                    )
                )
                .max(5, "You cannot add more than 5 tags.")
                .optional(),
        });

        await Schema.validate(req.body, { abortEarly: false });
        next();
    } catch (err) {
        return res.status(400).json({ errors: err.errors });
    }
}

// Middleware pour valider les données d'une réclamation
async function validateComplaint(req, res, next) {
    try {
        const Schema = yup.object().shape({
            subject: yup.string()
                .min(5, "Subject must be at least 5 characters long.")
                .max(100, "Subject cannot exceed 100 characters.")
                .matches(/^[A-Za-z0-9\s.,!?']+$/, "Subject can only contain letters, numbers, spaces, and some characters (.,!?').")
                .required("Subject is required."),

            description: yup.string()
                .min(10, "Description must be at least 10 characters long.")
                .max(1000, "Description cannot exceed 1000 characters.")
                .matches(/^[A-Za-z0-9\s.,!?']+$/, "Description can only contain letters, numbers, spaces, and some characters (.,!?').")
                .required("Description is required."),

            user_id: yup.string()
                .required("User ID is required.")
                .test("is-valid-objectid", "User ID must be a valid ObjectId.", (value) => {
                    return mongoose.Types.ObjectId.isValid(value);
                }),
        });

        // Valider les données du body et le user_id des paramètres
        await Schema.validate(
            { ...req.body, user_id: req.params.user_id },
            { abortEarly: false }
        );
        next();
    } catch (err) {
        return res.status(400).json({ errors: err.errors });
    }
}

module.exports = { validateForumTopic, validateComplaint };