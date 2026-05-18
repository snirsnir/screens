# Firebase Rules Setup

## Realtime Database Rules
Go to: Firebase Console → Realtime Database → Rules

```json
{
  "rules": {
    "screens": {
      ".read": true,
      ".write": true
    }
  }
}
```

> בהמשך ניתן להגביל כתיבה לאדמינים בלבד עם Authentication.

## Storage Rules
Go to: Firebase Console → Storage → Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /screens/{screenId}/{allPaths=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

> גם כאן ניתן לנעול בהמשך עם Auth.
