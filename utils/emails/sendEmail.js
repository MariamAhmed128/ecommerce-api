const nodemailer = require("nodemailer");

const sendEmail = async (email, subject, message) => {

    const transporter = nodemailer.createTransport({

        service: "gmail",

        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },

        tls: {
            rejectUnauthorized: false
        }

    });

    // await transporter.sendMail({

    //     from: process.env.EMAIL_USER,

    //     to: email,

    //     subject,

    //     html: message

    // });
    const info = await transporter.sendMail({

    from: process.env.EMAIL_USER,

    to: email,

    subject,

    html: message

});

console.log(info);

};

module.exports = sendEmail;