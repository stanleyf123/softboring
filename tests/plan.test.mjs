import assert from "node:assert/strict";
import test from "node:test";

const FREE_HISTORY_LIMIT = 4;
const PLUS_STATUSES = new Set(["active", "trialing", "past_due"]);

function isSoftPlusPlan(plan, status) {
  if (plan !== "soft_plus") return false;
  if (!status) return true;
  return PLUS_STATUSES.has(status);
}

function planFromStripeStatus(status) {
  const planStatus = (status ?? "").trim() || "canceled";
  if (PLUS_STATUSES.has(planStatus)) {
    return { plan: "soft_plus", planStatus };
  }
  return { plan: "free", planStatus };
}

function withHistoryAccess(reviews, softPlus) {
  if (softPlus) {
    return reviews.map((review) => ({ ...review, locked: false }));
  }
  return reviews.map((review, index) => ({
    ...review,
    locked: index >= FREE_HISTORY_LIMIT,
    summary: index >= FREE_HISTORY_LIMIT ? "" : review.summary,
  }));
}

test("Stripe status maps to Soft+ or Free", () => {
  assert.deepEqual(planFromStripeStatus("active"), {
    plan: "soft_plus",
    planStatus: "active",
  });
  assert.deepEqual(planFromStripeStatus("trialing"), {
    plan: "soft_plus",
    planStatus: "trialing",
  });
  assert.deepEqual(planFromStripeStatus("past_due"), {
    plan: "soft_plus",
    planStatus: "past_due",
  });
  assert.deepEqual(planFromStripeStatus("canceled"), {
    plan: "free",
    planStatus: "canceled",
  });
  assert.deepEqual(planFromStripeStatus("unpaid"), {
    plan: "free",
    planStatus: "unpaid",
  });
  assert.ok(isSoftPlusPlan("soft_plus", null));
  assert.ok(!isSoftPlusPlan("free", "active"));
});

test("free history keeps the latest four open", () => {
  const reviews = Array.from({ length: 6 }, (_, index) => ({
    id: `r${index}`,
    summary: `week ${index}`,
  }));
  const free = withHistoryAccess(reviews, false);
  assert.equal(free.filter((review) => !review.locked).length, 4);
  assert.equal(free.filter((review) => review.locked).length, 2);
  assert.equal(free[0].summary, "week 0");
  assert.equal(free[4].summary, "");
  const plus = withHistoryAccess(reviews, true);
  assert.equal(plus.every((review) => !review.locked), true);
  assert.equal(plus[5].summary, "week 5");
});

test("Stripe checkout is configured only with secret, webhook, and monthly price", () => {
  function isStripeConfigured(env) {
    return Boolean(
      env.STRIPE_SECRET_KEY?.trim() &&
        env.STRIPE_WEBHOOK_SECRET?.trim() &&
        env.STRIPE_PRICE_MONTHLY?.trim(),
    );
  }
  assert.equal(isStripeConfigured({}), false);
  assert.equal(
    isStripeConfigured({
      STRIPE_SECRET_KEY: "sk_test_x",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
      STRIPE_PRICE_MONTHLY: "price_x",
    }),
    true,
  );
  assert.equal(
    isStripeConfigured({
      STRIPE_SECRET_KEY: "sk_test_x",
      STRIPE_PRICE_MONTHLY: "price_x",
    }),
    false,
  );
});
