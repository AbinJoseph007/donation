const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const stripe = require('stripe')('your_stripe_secret_key');
const axios = require('axios');

app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = 'your_stripe_webhook_secret';

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Extract relevant data from Stripe session
    const name = session.customer_details.name;
    const paymentStatus = session.payment_status;
    const amountPaid = session.amount_total / 100; // Stripe sends in cents

    // Send data to Airtable
    try {
      const airtableResponse = await axios.post('https://api.airtable.com/v0/your_base_id/tableneww', {
        fields: {
          'Name': name,
          'Payment Status': paymentStatus,
          'Amount Paid': amountPaid
        }
      }, {
        headers: {
          Authorization: `Bearer your_airtable_api_key`,
          'Content-Type': 'application/json'
        }
      });
      res.status(200).send({ success: true });
    } catch (error) {
      console.error('Error sending to Airtable:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.status(400).end();
  }
});

// Start the server
app.listen(3000, () => console.log('Running webhook listener on port 3000'));
