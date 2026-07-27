import { useState } from "react";
import axios from "axios";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Checkout from "./Checkout";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function App() {
  const [clientSecret, setClientSecret] = useState("");

  const createOrder = async () => {
    const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/orders`,
      {
        paymentMethod: "stripe",
        shippingAddress: {
          fullName: "Mariam Ahmed",
          phone: "01000000000",
          country: "Egypt",
          city: "Cairo",
          address: "Nasr City",
          postalCode: "11765",
        },
      },
      {
        headers: {
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhNjUzYmQ3NDRjNzFhOWUzZTJiN2Q3ZiIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc4NTEyODE4OCwiZXhwIjoxNzg1MzAwOTg4fQ.QhLfZiPjvwuxwNoyph7v2c9QhTmak80XJ2sb5DGdXN8",
        },
      }
    );

    setClientSecret(res.data.data.clientSecret);
  };

  return (
    <>
      {!clientSecret ? (
        <button onClick={createOrder}>Create Order</button>
      ) : (
        <Elements
          stripe={stripePromise}
          options={{ clientSecret }}
        >
          <Checkout />
        </Elements>
      )}
    </>
  );
}

export default App;