require('dotenv').config();
const Stripe = require('stripe');
const Airtable = require('airtable');

// Initialize Stripe and Airtable
const stripe = new Stripe(process.env.STRIPE_API_KEY);
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// Fetch data from Stripe
async function fetchStripeData() {
  try {
    const charges = await stripe.charges.list({ limit: 10 }); // Example: fetch last 10 charges
    console.log('Charges from Stripe:', charges);
    return charges;
  } catch (error) {
    console.error('Error fetching data from Stripe:', error);
  }
}

// Send data to Airtable
async function sendDataToAirtable(charges) {
  try {
    charges.data.forEach(charge => {
      base(process.env.AIRTABLE_TABLE_NAME).create({
        'Name': charge.name,
        'Payment Status':charge.paymentStatus,
        'Amount Paid': charge.amountPaid
      }, (err, record) => {
        if (err) {
          console.error('Error creating record in Airtable:', err);
          return;
        }
        console.log('Record created in Airtable:', record.getId());
      });
    });
  } catch (error) {
    console.error('Error sending data to Airtable:', error);
  }
}

// Run the integration
(async () => {
  const stripeData = await fetchStripeData();
  if (stripeData) {
    await sendDataToAirtable(stripeData);
  }
})();
