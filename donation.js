const express = require('express');
const bodyParser = require('body-parser');
const stripe = require('stripe')('sk_test_51Q9sSHE1AF8nzqTaSsnaie0CWSIWxwBjkjZpStwoFY4RJvrb87nnRnJ3B5vvvaiTJFaSQJdbYX0wZHBqAmY2WI8z00hl0oFOC8');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Root route to indicate the server is running
app.get('/', (req, res) => {
  res.send('This is the Stripe Webhook Server.');
});

// Webhook route
app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = 'your_stripe_webhook_secret'; // Replace with your actual webhook secret

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const name = session.customer_details.name;
    const paymentStatus = session.payment_status;
    const amountPaid = session.amount_total / 100; // Stripe sends in cents

    try {
      const airtableResponse = await axios.post('https://api.airtable.com/v0/appXwEBSWkI5b6Hos/BIAW api', {
        fields: {
          'Name': name,
          'Payment Status': paymentStatus,
          'Amount Paid': amountPaid
        }
      }, {
        headers: {
          Authorization: `Bearer patLvSOR7bLf2fFY2.49aae282bae66338f52438d10e3828a5e54f3c091c8ca2aaa5eaa807cde60be2`,
          'Content-Type': 'application/json'
        }
      });
      res.status(200).send({ success: true });
    } catch (error) {
      console.error('Error sending to Airtable:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.status(400).send('Event type not handled.');
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Running webhook listener on port ${port}`));
