const STRIPE_API_KEY = 'sk_test_51Q9sSHE1AF8nzqTaSsnaie0CWSIWxwBjkjZpStwoFY4RJvrb87nnRnJ3B5vvvaiTJFaSQJdbYX0wZHBqAmY2WI8z00hl0oFOC8';
const AIRTABLE_API_KEY = 'pat5uT8ZjmimQYGG1.8f89f2a5c193be276d2d57afc905617684aa22b377af9acd0ea09d58e4ca61a0';
const AIRTABLE_BASE_ID = 'appXwEBSWkI5b6Hos';
const AIRTABLE_TABLE_NAME = 'Donation Payments';

const POLLING_INTERVAL = 5000; // Poll every 5 seconds

// Fetch the latest data from Stripe
async function fetchLatestStripeData() {
    const stripeUrl = `https://api.stripe.com/v1/charges?limit=1`; // Limit to the latest charge
    try {
        const response = await fetch(stripeUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${STRIPE_API_KEY}`
            }
        });
        const data = await response.json();
        // console.log('Charges from Stripe:', data);

        return data.data[0]; // Return only the latest charge (0th index)
    } catch (error) {
        console.error('Error fetching data from Stripe:', error);
    }
}

// Fetch all records from Airtable
async function fetchAllAirtableRecords() {
    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;

    try {
        const response = await fetch(airtableUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`
            }
        });
        const data = await response.json();
        // console.log('Latest record from Airtable:', data);

        return data.records; // Return all records
    } catch (error) {
        console.error('Error fetching data from Airtable:', error);
    }
}

// Compare Stripe data with Airtable records based on Charge ID
function isSameRecordInAirtable(latestCharge, airtableRecords) {
    return airtableRecords.some(record => {
        const fields = record.fields;
        // Compare by a unique Stripe charge ID without saving it to Airtable
        return fields['Amount Paid'] === (latestCharge.amount / 100).toFixed(2) &&
               fields['Name'] === (latestCharge.billing_details?.name || 'No Name') &&
               fields['Payment Status'] === latestCharge.status;
    });
}

// Send the latest charge data to Airtable (without sending Charge ID)
async function sendLatestChargeToAirtable(latestCharge) {
    if (!latestCharge) {
        console.log("No latest charge to push to Airtable");
        return;
    }

    const record = {
        fields: {
            "Name": latestCharge.billing_details?.name || 'No Name',
            "Amount Paid": (latestCharge.amount / 100).toFixed(2), // Format as a string
            "Payment Status": latestCharge.status
        }
    };

    // console.log('Record to send to Airtable:', record); // Log the record to debug

    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;

    try {
        const response = await fetch(airtableUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ records: [record] }) // Wrap record in an array
        });

        const data = await response.json();

        if (response.status !== 200 && response.status !== 201) { // Check for both 200 and 201
            console.error('Error from Airtable:', data); // Log full error response
            throw new Error(`Airtable Error: ${JSON.stringify(data)}`);
        }

        // console.log('Record created in Airtable:', data.records[0].id);
    } catch (error) {
        console.error('Error sending charge to Airtable:', error);
    }
}

// Poll Stripe and Airtable every POLLING_INTERVAL
async function pollStripeAndAirtable() {
    try {
        // Fetch the latest data from Stripe and Airtable
        const latestStripeData = await fetchLatestStripeData();
        const airtableRecords = await fetchAllAirtableRecords(); // Change here

        // Compare and push to Airtable if not the same
        if (latestStripeData && !isSameRecordInAirtable(latestStripeData, airtableRecords)) { // Change here
            await sendLatestChargeToAirtable(latestStripeData); // Push only if different
        } else {
          
        }
    } catch (error) {
        // console.log("Data already exists in Airtable. No need to push.");  
    }
}

// Start polling at regular intervals without refreshing the page
setInterval(pollStripeAndAirtable, POLLING_INTERVAL);