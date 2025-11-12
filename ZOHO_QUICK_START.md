# ⚡ ZOHO MAIL QUICK SETUP (5 Steps)

## STEP 1️⃣: Regenerate SendGrid API Key
```
❌ DELETE OLD: SG.9VqgYd1yR92PqKAE5RAx2A...
✅ CREATE NEW: Go to https://app.sendgrid.com/settings/api_keys
   → Create API Key → Name: CGEIP-Production → Mail Send only
   → Copy the new key
```

## STEP 2️⃣: Create Zoho Mail Account (2 minutes)
```
1. Go: https://www.zoho.com/mail/
2. Click "Get Started Free"
3. Sign up with your Gmail (chukwudidivine20@gmail.com)
4. Organization: CGEIP
5. Select: Free Plan
```

## STEP 3️⃣: Create Sender Email in Zoho (2 minutes)
```
1. Log in to Zoho Mail
2. Settings → Accounts → Add Account
3. Create email: notifications@cgeip.zohomail.com
   (or: noreply@cgeip.zohomail.com)
4. Set password (strong!)
5. Save
```

## STEP 4️⃣: Verify in SendGrid (5 minutes)
```
1. Go: https://app.sendgrid.com/settings/sender_auth/senders
2. Create New Sender
3. From Email: notifications@cgeip.zohomail.com
4. From Name: Career Portal
5. Reply To: notifications@cgeip.zohomail.com
6. Create Sender
7. Check Zoho Mail inbox for verification email
8. Click verification link in email
```

## STEP 5️⃣: Update Your Code (3 minutes)
```
File: .env
SENDGRID_API_KEY=SG.YOUR_NEW_KEY_HERE
SENDER_EMAIL=notifications@cgeip.zohomail.com

File: server/.env
SENDGRID_API_KEY=SG.YOUR_NEW_KEY_HERE
SENDER_EMAIL=notifications@cgeip.zohomail.com

Terminal:
cd c:\Users\chukw\Documents\reactProjects\CGIEP
git rm --cached .env server/.env
git commit -m "Remove .env from git tracking"
git push
```

## STEP 6️⃣: Restart & Test (2 minutes)
```
Terminal 1: Ctrl+C to stop server
Terminal 2:
cd server
npm start

When you see "✅ SendGrid initialized"
→ Emails will now work!
```

---

## 🎯 Expected Results

**Before (Gmail)**: Emails → Spam folder ❌
**After (Zoho)**: Emails → Main inbox ✅

---

## ✅ Success Checklist

- [ ] Created Zoho Mail account
- [ ] Created sender email in Zoho
- [ ] Verified sender in SendGrid
- [ ] Updated .env files
- [ ] Removed .env from git
- [ ] Restarted server
- [ ] Tested email delivery
- [ ] Email in main inbox (not spam)

---

**Total time: ~20 minutes | Difficulty: Easy | Cost: FREE ✅**
