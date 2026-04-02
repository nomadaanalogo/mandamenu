import Stripe from 'stripe'

const isTest = process.env.STRIPE_TEST_MODE === 'true'

export const stripe = new Stripe(
  isTest ? process.env.STRIPE_SECRET_KEY_TEST! : process.env.STRIPE_SECRET_KEY!
)

export const PRICE_IDS: Record<string, string> = isTest
  ? {
      Basic:    process.env.STRIPE_PRICE_BASIC_TEST!,
      Standard: process.env.STRIPE_PRICE_STANDARD_TEST!,
      Premium:  process.env.STRIPE_PRICE_PREMIUM_TEST!,
    }
  : {
      Basic:    process.env.STRIPE_PRICE_BASIC!,
      Standard: process.env.STRIPE_PRICE_STANDARD!,
      Premium:  process.env.STRIPE_PRICE_PREMIUM!,
    }
