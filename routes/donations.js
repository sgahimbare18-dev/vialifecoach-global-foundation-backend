const express = require('express');
const crypto = require('crypto');
const https = require('https');
const { catchAsync, AppError } = require('../utils/errorHandler');
const Donation = require('../models/DonationSupabase');
const { sendEmail, emailTemplates } = require('../utils/mailer');
const { emitAdminEvent } = require('../utils/realtime');

const router = express.Router();

const ALLOWED_FREQUENCIES = new Set(['once', 'weekly', 'monthly', 'quarterly', 'yearly']);
const FLUTTERWAVE_INTERVAL_MAP = {
  weekly: 'weekly',
  monthly: 'monthly',
  quarterly: 'quarterly',
  yearly: 'yearly'
};
const flutterwavePlanCache = new Map();

const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new AppError('Stripe is not configured. Please set STRIPE_SECRET_KEY.', 500);
  }
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16'
  });
};

const getFlutterwaveClient = () => {
  if (!process.env.FLW_SECRET_KEY || !process.env.FLW_PUBLIC_KEY) {
    throw new AppError('Flutterwave is not configured. Please set FLW_PUBLIC_KEY and FLW_SECRET_KEY.', 500);
  }
  const Flutterwave = require('flutterwave-node-v3');
  return new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);
};

const buildReference = (prefix) => {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
};

const flutterwaveRequest = (path, payload) => {
  if (!process.env.FLW_SECRET_KEY) {
    throw new AppError('Flutterwave is not configured. Please set FLW_SECRET_KEY.', 500);
  }

  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const request = https.request({
      hostname: 'api.flutterwave.com',
      path,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (response) => {
      let raw = '';
      response.on('data', (chunk) => {
        raw += chunk;
      });
      response.on('end', () => {
        try {
          const parsed = raw ? JSON.parse(raw) : {};
          if (response.statusCode && response.statusCode >= 400) {
            return reject(new AppError(parsed?.message || 'Flutterwave request failed', response.statusCode));
          }
          return resolve(parsed);
        } catch (error) {
          return reject(error);
        }
      });
    });

    request.on('error', reject);
    request.write(body);
    request.end();
  });
};

const getFlutterwavePlanId = async (frequency, currency) => {
  const interval = FLUTTERWAVE_INTERVAL_MAP[frequency];
  if (!interval) {
    throw new AppError('Unsupported donation frequency for subscriptions', 400);
  }

  const planKey = `${frequency}:${currency}`;
  if (flutterwavePlanCache.has(planKey)) {
    return flutterwavePlanCache.get(planKey);
  }

  const planName = `Vialifecoach ${frequency} donation (${currency})`;
  const response = await flutterwaveRequest('/v3/payment-plans', {
    name: planName,
    interval,
    currency
  });

  if (response?.status !== 'success' || !response?.data?.id) {
    throw new AppError(response?.message || 'Unable to create payment plan', 400);
  }

  flutterwavePlanCache.set(planKey, response.data.id);
  return response.data.id;
};

const sendDonationReceipt = async (donation) => {
  if (!donation || !donation.donor_email) return;
  try {
    const template = emailTemplates.donationReceipt(donation);
    await sendEmail({
      to: donation.donor_email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  } catch (error) {
    console.error('Failed to send donation receipt:', error.message);
  }
};

router.post('/checkout', catchAsync(async (req, res, next) => {
  const {
    amount,
    currency = 'USD',
    frequency = 'once',
    paymentMethod = 'card',
    firstName,
    lastName,
    name,
    email,
    phone,
    anonymous = false,
    updates = true
  } = req.body;

  const amountNumber = Number(amount);
  if (!amountNumber || amountNumber <= 0) {
    return next(new AppError('Donation amount must be greater than 0', 400));
  }

  if (!email) {
    return next(new AppError('Email is required for donation receipts', 400));
  }

  if (!ALLOWED_FREQUENCIES.has(frequency)) {
    return next(new AppError('Invalid donation frequency', 400));
  }

  const donorName = name || `${firstName || ''} ${lastName || ''}`.trim() || 'Donor';

  const payment = paymentMethod.toLowerCase();

  if (payment === 'mpesa' && !phone) {
    return next(new AppError('Phone number is required for M-Pesa payments', 400));
  }

  if (payment === 'mpesa' && frequency !== 'once') {
    return next(new AppError('M-Pesa recurring donations are not available yet. Please use Card for subscriptions.', 400));
  }

  const effectiveCurrency = payment === 'mpesa' ? 'KES' : currency.toUpperCase();

  const donation = await Donation.create({
    provider: payment === 'mpesa' ? 'flutterwave' : payment === 'card' ? 'flutterwave' : 'bank',
    provider_reference: null,
    payment_method: payment,
    amount: amountNumber,
    currency: effectiveCurrency,
    frequency,
    status: 'initiated',
    donor_name: anonymous ? null : donorName,
    donor_email: email,
    donor_phone: phone || null,
    is_anonymous: !!anonymous,
    metadata: {
      updates: !!updates
    }
  });

  emitAdminEvent('donation.created', {
    id: donation.id,
    status: donation.status,
    amount: donation.amount,
    currency: donation.currency,
    frequency: donation.frequency
  });

  if (payment === 'bank') {
    const reference = buildReference('bank');
    const updatedDonation = await Donation.updateById(donation.id, {
      provider_reference: reference,
      status: 'pending'
    });

    emitAdminEvent('donation.updated', {
      id: updatedDonation?.id || donation.id,
      status: updatedDonation?.status || 'pending',
      reference
    });

    return res.status(200).json({
      status: 'success',
      provider: 'bank',
      reference,
      message: 'Bank transfer initiated. Please complete your transfer using the provided details.'
    });
  }

  if (payment === 'mpesa') {
    const flw = getFlutterwaveClient();
    const txRef = buildReference('don');
    const payload = {
      tx_ref: txRef,
      amount: amountNumber,
      currency: 'KES',
      email,
      phone_number: phone,
      fullname: donorName,
      meta: {
        donation_id: donation.id,
        frequency,
        anonymous: !!anonymous
      }
    };

    const response = await flw.MobileMoney.mpesa(payload);
    if (!response || response.status !== 'success') {
      throw new AppError(response?.message || 'Unable to initiate M-Pesa payment', 400);
    }

    const updatedDonation = await Donation.updateById(donation.id, {
      provider_reference: txRef,
      status: 'pending',
      metadata: {
        updates: !!updates,
        flw_ref: response?.data?.flw_ref || null
      }
    });

    emitAdminEvent('donation.updated', {
      id: updatedDonation?.id || donation.id,
      status: updatedDonation?.status || 'pending',
      reference: txRef
    });

    return res.status(200).json({
      status: 'success',
      provider: 'flutterwave',
      reference: txRef,
      message: 'M-Pesa prompt sent. Please enter your PIN on your phone to complete the donation.'
    });
  }

  if (payment !== 'card') {
    return next(new AppError('Unsupported payment method', 400));
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const successUrl = `${frontendUrl}/donation-success.html`;
  const txRef = buildReference('don');

  const isRecurring = frequency !== 'once';
  const paymentPlanId = isRecurring ? await getFlutterwavePlanId(frequency, effectiveCurrency) : null;

  const paymentPayload = {
    tx_ref: txRef,
    amount: amountNumber,
    currency: effectiveCurrency,
    redirect_url: successUrl,
    customer: {
      email,
      name: donorName,
      phonenumber: phone || undefined
    },
    customizations: {
      title: 'Vialifecoach Donation',
      description: 'Donation to support healing and empowerment programs'
    },
    meta: {
      donation_id: donation.id,
      frequency,
      anonymous: !!anonymous
    },
    payment_options: 'card',
    ...(paymentPlanId ? { payment_plan: paymentPlanId } : {})
  };

  const response = await flutterwaveRequest('/v3/payments', paymentPayload);
  const checkoutLink = response?.data?.link;

  if (response?.status !== 'success' || !checkoutLink) {
    throw new AppError(response?.message || 'Unable to initialize card payment', 400);
  }

  const updatedDonation = await Donation.updateById(donation.id, {
    provider_reference: txRef,
    status: 'pending',
    metadata: {
      updates: !!updates,
      payment_plan: paymentPlanId || null
    }
  });

  emitAdminEvent('donation.updated', {
    id: updatedDonation?.id || donation.id,
    status: updatedDonation?.status || 'pending',
    reference: txRef
  });

  res.status(200).json({
    status: 'success',
    provider: 'flutterwave',
    checkout_url: checkoutLink,
    reference: txRef
  });
}));

router.get('/status/:reference', catchAsync(async (req, res, next) => {
  const { reference } = req.params;

  const donation = await Donation.findByReference(reference);
  if (!donation) {
    return next(new AppError('Donation not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      donation
    }
  });
}));

router.post('/webhook/stripe', catchAsync(async (req, res, next) => {
  const stripe = getStripeClient();
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return next(new AppError('Stripe webhook secret not configured', 500));
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const session = event.data.object;

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const existing = await Donation.findByReference(session.id);
    if (existing && existing.status === 'succeeded') {
      return res.json({ received: true });
    }
    const updated = await Donation.updateByReference(session.id, {
      status: 'succeeded',
      subscription_id: session.subscription || null
    });
    await sendDonationReceipt(updated);
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    await Donation.updateByReference(session.id, {
      status: 'failed'
    });
  }

  res.json({ received: true });
}));

router.post('/webhook/flutterwave', catchAsync(async (req, res, next) => {
  const secretHash = process.env.FLW_WEBHOOK_SECRET_HASH;
  if (secretHash) {
    const verifHash = req.headers['verif-hash'];
    const signature = req.headers['flutterwave-signature'];

    if (verifHash) {
      if (verifHash !== secretHash) {
        return res.status(401).send('Unauthorized');
      }
    } else if (signature) {
      const expected = crypto
        .createHmac('sha256', secretHash)
        .update(req.body)
        .digest('hex');
      if (signature !== expected) {
        return res.status(401).send('Unauthorized');
      }
    } else {
      return res.status(401).send('Unauthorized');
    }
  }

  const payload = JSON.parse(req.body.toString());
  const data = payload?.data || payload;
  const status = data?.status;
  const txRef = data?.tx_ref;
  const flwRef = data?.flw_ref;

  let newStatus = 'pending';
  if (status === 'successful') newStatus = 'succeeded';
  if (status === 'failed') newStatus = 'failed';
  if (status === 'cancelled') newStatus = 'cancelled';

  if (txRef) {
    const existing = await Donation.findByReference(txRef);
    if (existing && existing.status === 'succeeded' && newStatus === 'succeeded') {
      return res.json({ received: true });
    }
    const existingMeta = existing?.metadata || {};
    const updated = await Donation.updateByReference(txRef, {
      status: newStatus,
      metadata: {
        ...existingMeta,
        flw_ref: flwRef || existingMeta.flw_ref || null
      }
    });
    if (newStatus === 'succeeded') {
      await sendDonationReceipt(updated);
    }
  } else if (flwRef) {
    const existing = await Donation.findByReference(flwRef);
    if (existing && existing.status === 'succeeded' && newStatus === 'succeeded') {
      return res.json({ received: true });
    }
    const existingMeta = existing?.metadata || {};
    const updated = await Donation.updateByReference(flwRef, {
      status: newStatus,
      metadata: {
        ...existingMeta,
        flw_ref: flwRef
      }
    });
    if (newStatus === 'succeeded') {
      await sendDonationReceipt(updated);
    }
  }

  res.json({ received: true });
}));

module.exports = router;
