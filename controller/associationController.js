const Association = require("../model/association");
const User = require("../model/user");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, JPG, and PNG images are allowed!"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
}).single("logo_association");

// Add a new association
exports.addAssociation = async (req, res) => {
  console.time("addAssociation");
  upload(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err.message);
      return res.status(400).json({ message: err.message });
    }
    try {
      console.log("Request body:", req.body);
      console.log("File:", req.file);
      console.log("User ID from token:", req.userId);

      const { Name_association, Description_association, contact_email_association, support_type } = req.body;
      if (!Name_association || !Description_association || !contact_email_association || !support_type || !req.file) {
        return res.status(400).json({ message: "All fields and logo are required" });
      }

      const user = await User.findById(req.userId);
      console.log("User:", user ? { id: user._id, role: user.role, email: user.email, association_id: user.association_id } : null);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.role !== "association_member") {
        return res.status(403).json({ message: "Only association members can add an association" });
      }
      if (user.association_id) {
        return res.status(400).json({ message: "User is already linked to an association" });
      }

      const logoPath = `/Uploads/${req.file.filename}`;
      const newAssociation = new Association({
        Name_association,
        Description_association,
        contact_email_association,
        support_type,
        logo_association: logoPath,
        created_by: req.userId,
      });

      const savedAssociation = await newAssociation.save();
      console.log(`✅ Association "${Name_association}" created. ID: ${savedAssociation._id}`);

      user.association_id = savedAssociation._id;
      await user.save({ validateModifiedOnly: true }); // Skip validation of unchanged fields like email
      console.log(`✅ User ${user.username} linked to association ${savedAssociation._id}`);

      console.timeEnd("addAssociation");
      res.status(201).json({
        message: "Association added successfully",
        association_id: savedAssociation._id.toString(),
        data: savedAssociation,
      });
    } catch (error) {
      console.error("Error in addAssociation:", error.stack);
      if (error.code === 11000 && error.keyPattern.contact_email_association) {
        return res.status(409).json({
          message: `The email ${req.body.contact_email_association} is already used`,
        });
      }
      if (error.name === "ValidationError") {
        const errors = Object.keys(error.errors).reduce((acc, key) => {
          if (key === "created_by" && error.errors[key].message.includes("association_member")) {
            acc[key] = "The creator must be an association_member user.";
          } else if (key === "contact_email_association") {
            acc[key] = error.errors[key].message || "Invalid email format for association contact email.";
          } else {
            acc[key] = error.errors[key].message;
          }
          return acc;
        }, {});
        console.log("Validation errors:", errors);
        return res.status(400).json({ message: "Validation error", errors });
      }
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });
};

// Get all associations (for back-office)
exports.getAssociations = async (req, res, next) => {
    console.time("getAssociations");
    console.log("Starting getAssociations for user:", req.userId);
    try {
      console.log("Association model:", Association ? "Loaded" : "Not found");
      console.log("User model:", User ? "Loaded" : "Not found");
      console.log("MongoDB connection state:", mongoose.connection.readyState);
  
      if (!Association) {
        throw new Error("Association model not found");
      }
      if (!User) {
        throw new Error("User model not found");
      }
      if (mongoose.connection.readyState !== 1) {
        throw new Error(`Database not connected (state: ${mongoose.connection.readyState})`);
      }
  
      console.log("Executing query: Association.find({})");
      const associations = await Association.find({})
        .select("Name_association Description_association contact_email_association logo_association support_type isApproved created_by createdAt")
        .populate({
          path: "created_by",
          select: "username email",
          options: { strictPopulate: false },
        })
        .sort({ createdAt: -1 })
        .lean();
  
      console.log("Query completed. Found:", associations.length, "associations");
      res.status(200).json(associations || []);
    } catch (error) {
      console.error("Error in getAssociations:", {
        message: error.message,
        stack: error.stack,
        userId: req.userId,
      });
      next(error);
    } finally {
      console.timeEnd("getAssociations");
    }
  };

// Get association by ID
exports.getAssociationById = async (req, res, next) => {
    try {
      const { id } = req.params;
      console.log(`Fetching association by ID: ${id}`);
      const association = await Association.findById(id)
        .populate("created_by", "username email")
        .lean();
      if (!association) {
        return res.status(404).json({ message: "Association not found" });
      }
      res.status(200).json(association);
    } catch (error) {
      console.error("Error in getAssociationById:", error.stack);
      next(error);
    }
  };
// Update association by ID
exports.updateAssociation = async (req, res, next) => {
    try {
      const { id } = req.params;
      console.log(`Updating association with ID: ${id}`);
      const updatedAssociation = await Association.findByIdAndUpdate(id, req.body, { new: true });
      if (!updatedAssociation) {
        return res.status(404).json({ message: "Association not found" });
      }
      console.log(`Association ${id} updated successfully`);
      res.status(200).json(updatedAssociation);
    } catch (error) {
      console.error("Error in updateAssociation:", error.stack);
      next(error);
    }
  };

// Delete association by ID
exports.deleteAssociation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid association ID" });
    }

    const association = await Association.findById(id);
    if (!association) {
      return res.status(404).json({ message: "Association not found" });
    }

    // Check if user is authorized (optional, add if needed)
    if (association.created_by.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized to delete this association" });
    }

    // Unlink from users
    await User.updateMany({ association_id: id }, { $unset: { association_id: "" } });

    await Association.findByIdAndDelete(id);
    console.log(`✅ Association "${association.Name_association}" deleted successfully.`);

    res.status(200).json({ message: "Association deleted successfully" });
  } catch (error) {
    console.error("Error in deleteAssociation:", error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Get approved associations
exports.getApprovedAssociations = async (req, res) => {
    try {
      console.log("Fetching approved associations for user:", req.userId);
      const associations = await Association.find({ isApproved: true }).select(
        "Name_association support_type logo_association createdAt facebook twitter linkedin youtube"
      );
      if (!associations.length) {
        return res.status(404).json({ message: "No approved associations found" });
      }
      res.status(200).json(associations);
    } catch (error) {
      console.error("Error in getApprovedAssociations:", error.stack);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  };

// Toggle association approval
exports.toggleApproval = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { isApproved } = req.body;
      console.log(`Toggling approval for association ID: ${id}, isApproved: ${isApproved}`);
      const association = await Association.findByIdAndUpdate(
        id,
        { isApproved },
        { new: true }
      );
      if (!association) {
        return res.status(404).json({ message: "Association not found" });
      }
      console.log(`Association ${id} approval set to: ${isApproved}`);
      res.status(200).json({ data: association });
    } catch (error) {
      console.error("Error in toggleApproval:", error.stack);
      next(error);
    }
};

// Check if user has an association
exports.checkAssociation = async (req, res) => {
  try {
    console.log("Checking association for user:", req.userId);
    const association = await Association.findOne({ created_by: req.userId });
    res.status(200).json({
      hasAssociation: !!association,
      associationId: association ? association._id : null,
    });
  } catch (error) {
    console.error("Error in checkAssociation:", error.stack);
    res.status(500).json({ message: "Error checking association", error: error.message });
  }
};

// Get support type statistics
exports.getSupportTypeStats = async (req, res) => {
  try {
    console.log("Fetching support type statistics for user:", req.userId);

    const stats = await Association.aggregate([
      { $match: { isApproved: true } },
      { $group: { _id: "$support_type", count: { $sum: 1 } } },
      { $project: { support_type: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);

    const total = stats.reduce((sum, stat) => sum + stat.count, 0);

    const completeStats = ["Financial", "Material", "Educational", "Other"].map((type) => {
      const stat = stats.find((s) => s.support_type === type) || { count: 0 };
      return {
        support_type: type,
        count: stat.count,
        percentage: total > 0 ? ((stat.count / total) * 100).toFixed(2) : 0,
      };
    });

    console.log("Support type stats:", completeStats);

    res.status(200).json({
      message: "Support type statistics retrieved successfully",
      data: completeStats,
      total,
    });
  } catch (error) {
    console.error("Error in getSupportTypeStats:", error.stack);
    res.status(500).json({
      message: "Failed to fetch support type statistics",
      error: error.message,
    });
  }
};