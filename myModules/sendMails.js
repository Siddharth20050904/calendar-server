// Importing required modules
const hbs = require('nodemailer-express-handlebars');
const nodemailer = require('nodemailer');
const path = require('path');
const dotenv = require("dotenv");

// Loading environment variables from .env file
dotenv.config();

// Function to send emails to students
exports.sendEmails = async function(students, e) {
    // Creating a nodemailer transporter
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'replyn418@gmail.com', // Gmail account used for sending emails
            pass: process.env.MAIL_PASS // Gmail account password from environment variables
        }
    });

    // Handlebars options for email template rendering
    const handlebarOptions = {
        viewEngine: {
            partialsDir: path.resolve('./views/'), // Directory for partials
            defaultLayout: false, // Disabling default layout
        },
        viewPath: path.resolve('./views/'), // Directory for email templates
    };

    // Using handlebars for email template rendering
    transporter.use('compile', hbs(handlebarOptions));

    // Iterating through each student
    for (const user of students) {
        if (user.email) {
            const mailOptions = {
                from: '"IIT Goa Calendar"',
                template: "mail", 
                to: user.email, 
                subject: `Updated Event :${e.eventTitle.replace(/#/g,"'").replace(/~/g,'"')}`,
                context: { 
                    name: user.name,
                    faculty: e.faculty_name,
                    title: e.eventTitle.replace(/#/g,"'").replace(/~/g,'"'),
                    date: e.date, 
                    month: e.month, 
                    year: e.year, 
                    description: e.eventDescription.replace(/#/g,"'").replace(/~/g,'"')
                },
            };
            try {
                // Sending email
                await transporter.sendMail(mailOptions);
            } catch (error) {
                // Handling nodemailer errors
                console.log(`Nodemailer error sending email to ${user.email}`, error);
            }
        }
    }
}
