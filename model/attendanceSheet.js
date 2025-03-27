const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Schéma pour la fiche de présence
const attendanceSheetSchema = new mongoose.Schema({
    date: { 
        type: Date, 
        required: true,
        default: Date.now 
    },
    subject: { 
        type: String, 
        required: true 
    },
    teacher: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    students: [{
        student: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        },
        present: { 
            type: Boolean, 
            default: false 
        }
    }],
    classLevel: { 
        type: Number, 
        required: true 
    },
    speciality: { 
        type: String,
        enum: ['A', 'B', 'P', 'TWIN', 'SAE', 'SE', 'BI', 'DS', 'IOSYS', 'SLEAM', 'SIM', 'NIDS', 'INFINI'],
        required: true 
    }
}, { timestamps: true });
const AttendanceSheet = mongoose.model("AttendanceSheet", attendanceSheetSchema);
module.exports = { AttendanceSheet };