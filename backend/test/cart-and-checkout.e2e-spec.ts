import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, uniqueEmail, API_PREFIX } from './utils/test-app';

const CART_SESSION_HEADER = 'x-cart-session';
const SEEDED_SLUG = 'vietnam-roasted-cashew-w320';

describe('Cart + Checkout (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let variantId: string;
  let variantPrice: number;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();

    const productRes = await request(server).get(`${API_PREFIX}/catalog/products/${SEEDED_SLUG}`);
    expect(productRes.status).toBe(200);
    const variant = productRes.body.variants.find((v: any) => v.weightLabel === '500g') ??
      productRes.body.variants[0];
    variantId = variant.id;
    variantPrice = variant.price;
  });

  afterAll(async () => {
    await app.close();
  });

  it('guest cart flow: create session, add item, update quantity, checkout with COD, track order, cart empties', async () => {
    // 1. GET /cart as a guest with no session header -> 200, server issues a session id.
    const initialCart = await request(server).get(`${API_PREFIX}/cart`);
    expect(initialCart.status).toBe(200);
    const sessionId = initialCart.headers[CART_SESSION_HEADER];
    expect(typeof sessionId).toBe('string');
    expect(sessionId.length).toBeGreaterThan(0);
    expect(initialCart.body.items).toEqual([]);

    // 2. POST /cart/items with that session header -> 201 (Nest default POST status).
    const addRes = await request(server)
      .post(`${API_PREFIX}/cart/items`)
      .set(CART_SESSION_HEADER, sessionId)
      .send({ productVariantId: variantId, quantity: 2 });

    expect(addRes.status).toBe(201);
    expect(addRes.body.items).toHaveLength(1);
    const item = addRes.body.items[0];
    expect(item.productVariantId).toBe(variantId);
    expect(item.quantity).toBe(2);
    expect(item.unitPrice).toBe(variantPrice);
    expect(item.lineTotal).toBe(variantPrice * 2);
    expect(addRes.body.subtotal).toBe(variantPrice * 2);

    // 3. PATCH /cart/items/:itemId to change quantity -> 200, lineTotal reflects new quantity.
    const patchRes = await request(server)
      .patch(`${API_PREFIX}/cart/items/${item.id}`)
      .set(CART_SESSION_HEADER, sessionId)
      .send({ quantity: 5 });

    expect(patchRes.status).toBe(200);
    const updatedItem = patchRes.body.items.find((i: any) => i.id === item.id);
    expect(updatedItem.quantity).toBe(5);
    expect(updatedItem.lineTotal).toBe(variantPrice * 5);

    // 4. POST /checkout (same session header) as a guest -> 201, real orderNumber, null redirectUrl for COD.
    const guestEmail = uniqueEmail('checkout-guest');
    const checkoutRes = await request(server)
      .post(`${API_PREFIX}/checkout`)
      .set(CART_SESSION_HEADER, sessionId)
      .send({
        guestEmail,
        shippingAddress: {
          fullName: 'Nguyen Van Test',
          phone: '0912345678',
          line1: '123 Le Loi Street',
          city: 'Ho Chi Minh City',
          country: 'Vietnam',
        },
        paymentProvider: 'COD',
      });

    expect(checkoutRes.status).toBe(201);
    expect(checkoutRes.body.order).toBeDefined();
    expect(typeof checkoutRes.body.order.orderNumber).toBe('string');
    expect(checkoutRes.body.order.orderNumber).toMatch(/^ORD-\d{4}-/);
    // Order.grandTotal is a Prisma Decimal(14,2) column, serialized to JSON as a string
    // (decimal.js's toJSON() -> toString()) since orders.service.ts returns the raw
    // Prisma record with no Number() conversion — wrap before any numeric comparison.
    expect(Number(checkoutRes.body.order.grandTotal)).toBeGreaterThan(0);
    expect(checkoutRes.body.redirectUrl).toBeNull();
    const orderNumber = checkoutRes.body.order.orderNumber;

    // 5. GET /orders/track/:orderNumber -> 404 with no email at all (security regression
    // guard: this endpoint is public/unauthenticated, so a matching email is the only proof
    // of ownership it can require — omitting it must never leak the order).
    const trackNoEmail = await request(server).get(`${API_PREFIX}/orders/track/${orderNumber}`);
    expect(trackNoEmail.status).toBe(404);

    // 5b. Same with a wrong email -> still 404.
    const trackWrongEmail = await request(server)
      .get(`${API_PREFIX}/orders/track/${orderNumber}`)
      .query({ email: 'not-the-owner@example.com' });
    expect(trackWrongEmail.status).toBe(404);

    // 5c. GET /orders/track/:orderNumber with the matching guest email -> 200.
    const trackRes = await request(server)
      .get(`${API_PREFIX}/orders/track/${orderNumber}`)
      .query({ email: guestEmail });
    expect(trackRes.status).toBe(200);
    expect(trackRes.body.orderNumber).toBe(orderNumber);
    expect(trackRes.body.guestEmail).toBe(guestEmail);
    // Regression guard: the order-confirmation page renders `order.items.map(...)` directly,
    // so this field must actually be populated, not just present-but-undefined.
    expect(Array.isArray(trackRes.body.items)).toBe(true);
    expect(trackRes.body.items.length).toBeGreaterThan(0);
    expect(trackRes.body).toHaveProperty('paymentProvider');
    expect(trackRes.body).toHaveProperty('paymentStatus');

    // 6. GET /cart with the same session header -> now empty (checkout clears cart items).
    const afterCart = await request(server).get(`${API_PREFIX}/cart`).set(CART_SESSION_HEADER, sessionId);
    expect(afterCart.status).toBe(200);
    expect(afterCart.body.items).toEqual([]);
    expect(afterCart.body.subtotal).toBe(0);
  });

  it('applies the WELCOME10 coupon at checkout -> discountTotal > 0', async () => {
    // Fresh guest session for an isolated cart.
    const initialCart = await request(server).get(`${API_PREFIX}/cart`);
    const sessionId = initialCart.headers[CART_SESSION_HEADER];

    const addRes = await request(server)
      .post(`${API_PREFIX}/cart/items`)
      .set(CART_SESSION_HEADER, sessionId)
      .send({ productVariantId: variantId, quantity: 1 });
    expect(addRes.status).toBe(201);
    const subtotalBeforeCheckout = addRes.body.subtotal;

    const guestEmail = uniqueEmail('checkout-coupon');
    const checkoutRes = await request(server)
      .post(`${API_PREFIX}/checkout`)
      .set(CART_SESSION_HEADER, sessionId)
      .send({
        guestEmail,
        shippingAddress: {
          fullName: 'Tran Thi Coupon',
          phone: '0987654321',
          line1: '45 Nguyen Hue Boulevard',
          city: 'Ho Chi Minh City',
          country: 'Vietnam',
        },
        paymentProvider: 'COD',
        couponCode: 'WELCOME10',
      });

    expect(checkoutRes.status).toBe(201);
    // discountTotal is a Prisma Decimal column serialized as a string; wrap before comparing.
    expect(Number(checkoutRes.body.order.discountTotal)).toBeGreaterThan(0);
    // WELCOME10 is a 10% PERCENTAGE coupon (see seed.ts).
    expect(Number(checkoutRes.body.order.discountTotal)).toBeCloseTo(subtotalBeforeCheckout * 0.1, 5);
  });

  it('rejects checkout with an empty cart -> 400', async () => {
    const initialCart = await request(server).get(`${API_PREFIX}/cart`);
    const sessionId = initialCart.headers[CART_SESSION_HEADER];

    const checkoutRes = await request(server)
      .post(`${API_PREFIX}/checkout`)
      .set(CART_SESSION_HEADER, sessionId)
      .send({
        guestEmail: uniqueEmail('checkout-empty'),
        shippingAddress: {
          fullName: 'Empty Cart',
          phone: '0900000001',
          line1: '1 Empty Street',
          city: 'Ho Chi Minh City',
          country: 'Vietnam',
        },
        paymentProvider: 'COD',
      });

    expect(checkoutRes.status).toBe(400);
  });

  it('rejects guest checkout without a guestEmail -> 400', async () => {
    const initialCart = await request(server).get(`${API_PREFIX}/cart`);
    const sessionId = initialCart.headers[CART_SESSION_HEADER];

    await request(server)
      .post(`${API_PREFIX}/cart/items`)
      .set(CART_SESSION_HEADER, sessionId)
      .send({ productVariantId: variantId, quantity: 1 });

    const checkoutRes = await request(server)
      .post(`${API_PREFIX}/checkout`)
      .set(CART_SESSION_HEADER, sessionId)
      .send({
        shippingAddress: {
          fullName: 'No Email',
          phone: '0900000002',
          line1: '2 No Email Street',
          city: 'Ho Chi Minh City',
          country: 'Vietnam',
        },
        paymentProvider: 'COD',
      });

    expect(checkoutRes.status).toBe(400);
  });

  it('security regression: a guest cannot reuse a registered customer\'s saved address by id', async () => {
    // 1. Register a real customer and let their checkout create a saved (userId-owned) address.
    const ownerEmail = uniqueEmail('address-owner');
    const registerRes = await request(server).post(`${API_PREFIX}/auth/register`).send({
      email: ownerEmail,
      password: 'SuperSecret1!',
      fullName: 'Address Owner',
      phone: '0900000099',
    });
    expect(registerRes.status).toBe(201);
    const ownerToken = registerRes.body.accessToken;

    const ownerCart = await request(server)
      .post(`${API_PREFIX}/cart/items`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ productVariantId: variantId, quantity: 1 });
    expect(ownerCart.status).toBe(201);

    const ownerCheckout = await request(server)
      .post(`${API_PREFIX}/checkout`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        shippingAddress: {
          fullName: 'Address Owner',
          phone: '0900000099',
          line1: '99 Private Street',
          city: 'Ho Chi Minh City',
          country: 'Vietnam',
        },
        paymentProvider: 'COD',
      });
    expect(ownerCheckout.status).toBe(201);
    const stolenAddressId = ownerCheckout.body.order.shippingAddressId;
    expect(typeof stolenAddressId).toBe('string');

    // 2. A completely unauthenticated guest tries to check out reusing that exact address id.
    const guestInitialCart = await request(server).get(`${API_PREFIX}/cart`);
    const guestSessionId = guestInitialCart.headers[CART_SESSION_HEADER];
    await request(server)
      .post(`${API_PREFIX}/cart/items`)
      .set(CART_SESSION_HEADER, guestSessionId)
      .send({ productVariantId: variantId, quantity: 1 });

    const idorAttempt = await request(server)
      .post(`${API_PREFIX}/checkout`)
      .set(CART_SESSION_HEADER, guestSessionId)
      .send({
        guestEmail: uniqueEmail('idor-attacker'),
        shippingAddressId: stolenAddressId,
        paymentProvider: 'COD',
      });

    // Must be rejected — never silently succeed using another customer's saved address.
    expect(idorAttempt.status).toBe(404);
  });
});
