// Import required libraries
const express = require('express');
const bodyParser = require('body-parser');
const stripe = require('stripe')('sk_test_51Q9sSHE1AF8nzqTaSsnaie0CWSIWxwBjkjZpStwoFY4RJvrb87nnRnJ3B5vvvaiTJFaSQJdbYX0wZHBqAmY2WI8z00hl0oFOC8'); // Replace with your actual Stripe secret key
const axios = require('axios');

// Create an Express app
const app = express();
app.use(bodyParser.json());

// Root route to indicate the server is running
app.get('/', (req, res) => {
  res.send('This is the Stripe Webhook Server.');
});

// Webhook route to handle Stripe events
app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = 'your_stripe_webhook_secret'; // Replace with your actual webhook secret

  let event;
  try {
    // Construct the event using the Stripe library
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    // Handle any errors that occur while verifying the signature
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Extract relevant data from the session
    const name = session.customer_details.name; // Get the customer's name
    const paymentStatus = session.payment_status; // Get the payment status
    const amountPaid = session.amount_total / 100; // Amount is in cents, convert to dollars

    try {
      // Send data to Airtable
      const airtableResponse = await axios.post('https://api.airtable.com/v0/appXwEBSWkI5b6Hos/BIAW api', {
        fields: {
          'Name': name,
          'Payment Status': paymentStatus,
          'Amount Paid': amountPaid
        }
      }, {
        headers: {
          Authorization: `Bearer patLvSOR7bLf2fFY2.49aae282bae66338f52438d10e3828a5e54f3c091c8ca2aaa5eaa807cde60be2`, // Replace with your actual Airtable API key
          'Content-Type': 'application/json'
        }
      });

      // Send success response back to Stripe
      res.status(200).send({ success: true });
    } catch (error) {
      // Log any error that occurs when sending to Airtable
      console.error('Error sending to Airtable:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    // Respond to unhandled event types
    res.status(400).send('Event type not handled.');
  }
});

// Start the server
const port = process.env.PORT || 3000; // Use the PORT from environment variables or default to 3000
app.listen(port, () => console.log(`Running webhook listener on port ${port}`));
