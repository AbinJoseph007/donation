// Do not expose your API keys directly like this in production!
const STRIPE_API_KEY = 'sk_test_51Q9sSHE1AF8nzqTaSsnaie0CWSIWxwBjkjZpStwoFY4RJvrb87nnRnJ3B5vvvaiTJFaSQJdbYX0wZHBqAmY2WI8z00hl0oFOC8';
const AIRTABLE_API_KEY = 'pat5uT8ZjmimQYGG1.8f89f2a5c193be276d2d57afc905617684aa22b377af9acd0ea09d58e4ca61a0';
const AIRTABLE_BASE_ID = 'appXwEBSWkI5b6Hos';
const AIRTABLE_TABLE_NAME = 'Donation Payments';

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
        console.log('Charges from Stripe:', data);
        return data.data[0]; // Return only the latest charge (0th index)
    } catch (error) {
        console.error('Error fetching data from Stripe:', error);
    }
}

// Fetch the latest record from Airtable
async function fetchLatestAirtableRecord() {
    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?maxRecords=1&sort[0][field]=CreatedTime&sort[0][direction]=desc`;

    try {
        const response = await fetch(airtableUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`
            }
        });
        const data = await response.json();
        console.log('Latest record from Airtable:', data);
        return data.records[0]; // Return the latest record
    } catch (error) {
        console.error('Error fetching data from Airtable:', error);
    }
}

// Compare Stripe data with Airtable record
function isSameRecord(latestCharge, airtableRecord) {
    if (!airtableRecord) return false; // No record in Airtable yet

    const airtableFields = airtableRecord.fields;
    const amountPaid = (latestCharge.amount / 100).toFixed(2);
    const paymentStatus = latestCharge.status;

    // Compare fields
    return airtableFields['Name'] === (latestCharge.billing_details?.name || 'No Name') &&
           airtableFields['Amount Paid'] === amountPaid &&
           airtableFields['Payment Status'] === paymentStatus;
}

// Send the latest charge data to Airtable
async function sendLatestChargeToAirtable(latestCharge) {
    if (!latestCharge) {
        console.log("No latest charge to push to Airtable");
        return;
    }

    const record = {
        fields: {
            "Name": latestCharge.billing_details?.name || 'No Name',
            "Amount Paid": (latestCharge.amount / 100).toFixed(2), // Format as a string
            "Payment Status": latestCharge.status // Correct casing
        }
    };

    console.log('Record to send to Airtable:', record); // Log the record to debug

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

        console.log('Record created in Airtable:', data.records[0].id);
    } catch (error) {
        console.error('Error sending charge to Airtable:', error);
    }
}

// Run the integration
(async () => {
    const latestStripeData = await fetchLatestStripeData(); // Get the latest charge from Stripe
    const latestAirtableRecord = await fetchLatestAirtableRecord(); // Get the latest record from Airtable

    if (latestStripeData && !isSameRecord(latestStripeData, latestAirtableRecord)) {
        await sendLatestChargeToAirtable(latestStripeData); // Push only if different
    } else {
        console.log("Data already exists in Airtable. No need to push.");
    }
})();