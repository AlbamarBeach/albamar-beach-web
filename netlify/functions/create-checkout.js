const Stripe = require('stripe');

// Porcentaje de depósito que se cobra online al reservar. El resto se paga al llegar.
const DEPOSIT_RATIO = 0.25;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const siteUrl = process.env.URL || 'https://albamar-beach.netlify.app';

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: 'JSON inválido' };
  }

  const { checkin, checkout, nights, guests, total, name } = data;

  if (!checkin || !checkout || !nights || !total || total <= 0) {
    return { statusCode: 400, body: 'Faltan datos de la reserva' };
  }

  const depositCents = Math.round(total * DEPOSIT_RATIO * 100);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: data.email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: depositCents,
            product_data: {
              name: 'Depósito de reserva — Apartamento Albamar Beach',
              description: `Entrada ${checkin} · Salida ${checkout} · ${nights} noches · ${guests} huéspedes. Depósito del 25% (resto se paga al llegar).`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { checkin, checkout, nights: String(nights), guests: String(guests), total: String(total), name: name || '' },
      success_url: `${siteUrl}/pago-exitoso.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pago-cancelado.html`,
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
