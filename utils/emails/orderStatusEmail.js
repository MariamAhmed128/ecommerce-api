const orderStatusEmail = (order) => {

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8" />
        </head>

        <body style="
            font-family: Arial, sans-serif;
            background:#111827;
            color:#ffffff;
            padding:40px;
        ">

            <div style="
                max-width:600px;
                margin:auto;
                background:#1f2937;
                padding:30px;
                border-radius:12px;
            ">

                <h1>
                    Order Status Updated
                </h1>

                <p>
                    Hello <strong>${order.user.username}</strong>,
                </p>

                <p>
                    Your order
                    <strong>${order._id}</strong>
                    has been updated.
                </p>

                <p>
                    <strong>Current Status:</strong>
                    ${order.status}
                </p>

                <br>

                <p>
                    Thank you for shopping with Ecommerce.
                </p>

            </div>

        </body>

        </html>
    `;

};

module.exports = orderStatusEmail;