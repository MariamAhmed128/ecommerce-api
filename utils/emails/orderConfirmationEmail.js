
const orderConfirmationEmail = (order, user) => {

    const itemsRows = order.items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${item.price} EGP</td>
            <td>${item.price * item.quantity} EGP</td>
        </tr>
    `).join("");

    return `
        <div style="font-family: Arial, sans-serif; line-height:1.6;">

            <h2>Order Confirmation</h2>

            <p>Hello <strong>${user.username}</strong>,</p>

            <p>
                Thank you for your order.
                Your order has been placed successfully.
            </p>

            <p>
                <strong>Order ID:</strong> ${order._id}
            </p>

            <table
                border="1"
                cellpadding="8"
                cellspacing="0"
                style="border-collapse:collapse;width:100%;text-align:center;"
            >
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                    </tr>
                </thead>

                <tbody>
                    ${itemsRows}
                </tbody>

            </table>

            <br>

            <p><strong>Subtotal:</strong> ${order.subtotal} EGP</p>

            <p><strong>Shipping:</strong> ${order.shippingFee} EGP</p>

            <p><strong>Tax:</strong> ${order.tax} EGP</p>

            <p><strong>Discount:</strong> ${order.discount} EGP</p>

            <p><strong>Total:</strong> ${order.totalPrice} EGP</p>

            <p>
                <strong>Payment Method:</strong>
                ${order.paymentMethod}
            </p>

            <hr>

            <p>
                Thank you for shopping with Ecommerce.
            </p>

        </div>
    `;

};

module.exports = orderConfirmationEmail;