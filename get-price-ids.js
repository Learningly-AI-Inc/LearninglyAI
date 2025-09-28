// Script to get price IDs from product IDs
// Run this with: node get-price-ids.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'your_stripe_secret_key_here');

async function getPriceIds() {
  try {
    console.log('Fetching price IDs for your products...\n');
    
    // Your product IDs
    const freemiumProductId = 'prod_T4pBu37GhWbvsC';
    const premiumProductId = 'prod_T4pBIbtWpXJo6c';
    
    // Get prices for Freemium product
    console.log('Freemium Product (prod_T4pBu37GhWbvsC):');
    const freemiumPrices = await stripe.prices.list({
      product: freemiumProductId,
      active: true,
    });
    
    if (freemiumPrices.data.length > 0) {
      freemiumPrices.data.forEach(price => {
        console.log(`  Price ID: ${price.id}`);
        console.log(`  Amount: ${price.unit_amount} ${price.currency.toUpperCase()}`);
        console.log(`  Interval: ${price.recurring?.interval || 'one-time'}`);
        console.log(`  Type: ${price.type}`);
        console.log('');
      });
    } else {
      console.log('  No active prices found for Freemium product');
    }
    
    // Get prices for Premium product
    console.log('Premium Product (prod_T4pBIbtWpXJo6c):');
    const premiumPrices = await stripe.prices.list({
      product: premiumProductId,
      active: true,
    });
    
    if (premiumPrices.data.length > 0) {
      premiumPrices.data.forEach(price => {
        console.log(`  Price ID: ${price.id}`);
        console.log(`  Amount: ${price.unit_amount} ${price.currency.toUpperCase()}`);
        console.log(`  Interval: ${price.recurring?.interval || 'one-time'}`);
        console.log(`  Type: ${price.type}`);
        console.log('');
      });
    } else {
      console.log('  No active prices found for Premium product');
    }
    
    console.log('Copy the price IDs above to your .env.local file:');
    console.log('STRIPE_FREEMIUM_PRICE_ID=price_xxxxx');
    console.log('STRIPE_PREMIUM_PRICE_ID=price_xxxxx');
    console.log('STRIPE_PREMIUM_YEARLY_PRICE_ID=price_xxxxx # if you have a yearly price');
    
  } catch (error) {
    console.error('Error fetching price IDs:', error.message);
    console.log('\nMake sure you have:');
    console.log('1. Set your STRIPE_SECRET_KEY environment variable');
    console.log('2. Installed stripe package: npm install stripe');
    console.log('3. The product IDs are correct');
  }
}

getPriceIds();
