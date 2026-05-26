rules_version = '2';

service cloud.firestore {

  match /databases/{database}/documents {

    // USERS

    match /users/{userId} {

      allow read:
      if request.auth != null;

      allow create:
      if request.auth != null;

      allow update:
      if request.auth != null;

      allow delete:
      if false;
    }

    // PRODUCTS

    match /products/{productId} {

      allow read:
      if true;

      allow create:
      if request.auth != null;

      allow update:
      if request.auth != null;

      allow delete:
      if request.auth != null;
    }

    // ORDERS

    match /orders/{orderId} {

      allow read:
      if request.auth != null;

      allow create:
      if request.auth != null;

      allow update:
      if request.auth != null;

      allow delete:
      if false;
    }
  }
}
