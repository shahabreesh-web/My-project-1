const functions = require("firebase-functions");

const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

// =============================
// ADMIN CHECK
// =============================

exports.isAdmin =
functions.https.onCall(
  async (data, context) => {

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Login required"
      );
    }

    const uid = context.auth.uid;

    const userSnap =
      await db
        .collection("users")
        .where("uid", "==", uid)
        .limit(1)
        .get();

    if (userSnap.empty) {
      return {
        admin: false,
      };
    }

    const userData =
      userSnap.docs[0].data();

    return {
      admin:
        userData.role === "admin",
    };
  }
);

// =============================
// SECURE ORDER CREATION
// =============================

exports.createOrder =
functions.https.onCall(
  async (data, context) => {

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Login required"
      );
    }

    const cart = data.cart;

    if (
      !cart ||
      !Array.isArray(cart)
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid cart"
      );
    }

    let total = 0;

    // =========================
    // SERVER VALIDATION
    // =========================

    for (const item of cart) {

      const productRef =
        db
          .collection("products")
          .doc(item.id);

      const productSnap =
        await productRef.get();

      if (!productSnap.exists) {

        throw new functions.https.HttpsError(
          "not-found",
          "Product missing"
        );
      }

      const product =
        productSnap.data();

      // STOCK CHECK

      if (
        product.stock <
        item.quantity
      ) {

        throw new functions.https.HttpsError(
          "failed-precondition",
          "Stock unavailable"
        );
      }

      total +=
        product.price *
        item.quantity;
    }

    // =========================
    // COMMISSION
    // =========================

    const commission =
      Number(
        (
          total * 0.08
        ).toFixed(2)
      );

    // =========================
    // CREATE ORDER
    // =========================

    await db
      .collection("orders")
      .add({

        customerId:
          context.auth.uid,

        items: cart,

        total,

        commission,

        sellerAmount:
          total - commission,

        status: "Paid",

        createdAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });

    // =========================
    // INVENTORY UPDATE
    // =========================

    for (const item of cart) {

      const productRef =
        db
          .collection("products")
          .doc(item.id);

      const productSnap =
        await productRef.get();

      const product =
        productSnap.data();

      await productRef.update({

        stock:
          product.stock -
          item.quantity,
      });
    }

    return {
      success: true,
      total,
      commission,
    };
  }
);

// =============================
// RATE LIMITING
// =============================

exports.rateLimit =
functions.https.onCall(
  async (data, context) => {

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Login required"
      );
    }

    const uid =
      context.auth.uid;

    const rateRef =
      db
        .collection("rateLimits")
        .doc(uid);

    const snap =
      await rateRef.get();

    const now = Date.now();

    if (snap.exists) {

      const data =
        snap.data();

      const last =
        data.lastRequest;

      if (
        now - last <
        3000
      ) {

        throw new functions.https.HttpsError(
          "resource-exhausted",
          "Too many requests"
        );
      }
    }

    await rateRef.set({
      lastRequest: now,
    });

    return {
      success: true,
    };
  }
);
