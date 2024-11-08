const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const morgan = require("morgan");
const winston = require("winston");
const { duration } = require("@material-ui/core");

const app = express();

//Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

//Establish MongoDB
mongoose.connect(
    process.env.MONGODB_URL || "mongodb: //localhost: 27017/StudentManager",
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }
)
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.error("MongoDB connection error: ", err));

//Configure Winston Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({filename: 'error.log', level: 'error'}),
        new winston.transports.File({filename: 'combined.log'}),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

app.use(
    morgan(":method :url :status :response-time ms - :res[content-length]")
);

//Custom API Logger Middleware
const apiLogger = (req, res, next) => {
    const start = Date.now();
    req.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            params: req.params,
            query: req.query,
            body: req.method !== 'GET' ? req.body : undefined
        });
    });
    next();
};

//Error Handling Middleware
app.use((err, req, next) => {
    logger.error({
        message: err.message,
        stack: err.stack,
        method: req.method,
        path: req.path,
        params: req.params,
        query: req.query,
        body: req.method !== 'GET' ? req.body: undefined
    });
    res.status(500).json({message: 'Internal server error'});
});

//Function to generate unique 8-digit student number
const generateStudentNumber = () => {
    return Math.floor(10000000 + Math.random() * 900000000).toString();
}

//Schema for student
const studentSchema = new mongoose.Schema({
    fname: {
        type: String,
        required: [true, "First name is required"]
    },
    lname: {
        type: String,
        required: [true, "Last name is required"]
    },
    gender: {
        type: String,
        enum: ["male", "female", "other"],
        default: "other",
        required: [true, "Gender is required"]
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        match: [/^\S+@\S+\.\S+$/, "Please use a valid email address."]

    },
    idNum: {
        type: String,
        required: [true, "ID number is required"],
        unique: true,
        match: [/^\d{13}$/, "ID number must be 13 digits."]


    },
    studentNumber: {
        type: String,
        unique: true,
        default: generateStudentNumber
    }
    ,
    course: {
        type: String,
        required: true
    },
    enrollmentDate: {
        type: Date,
        required: [true, "Enrollment date is required"]
    },
    status:{
        type: String,
        enum: ["active", "inactive"],
        default: "active",
        required: [true, "Status is required"]
    },
},
    {
        timestamps: true,   
});

const student = mongoose.model("Student", studentSchema);

const courseSchema = new mongoose.Mongoose.Schema({
    name:{
        type: String,
        required: [true, "Course name is required"]
    },
    description: {
        type: String,
        required: [true, "Course decription is required"]
    },
    duration: {
        type: Number,
        required: [true, "Course duration is required"]
    },
    status: {
        type: String,
        enm:["active", "inactive"],
        default: "active"
    }
},{
    timestamps: true
});

const Course = mongoose.model("Course", courseSchema);

//Routes
//Course Routes

app.get('/api/courses', async(req, res) =>{
    try{
        const courses = await Course.find().sort({name: 1});
        logger.info(`Retrieved ${courses.length} courses successfully`);
        res.json(courses);
    }
    catch (error){
        logger.error("Error fetching courses: ", error);
        res.status(500).json({ message: error.message});
    }
})

