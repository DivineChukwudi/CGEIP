# 🚀 FREE Domain Email Setup with Zoho Mail + SendGrid

## ⚠️ CRITICAL FIRST STEP: Regenerate Your API Key

Your SendGrid API key is exposed in public GitHub. **This must be done FIRST:**

1. Go to: https://app.sendgrid.com/settings/api_keys
2. Find and **DELETE** the key starting with `SG.9VqgYd1yR92...`
3. Click **"Create API Key"**
4. Name it: `CGEIP-Production`
5. Give it **Mail Send** permission only
6. Copy the new key (you'll use it later)
7. **Never commit .env files to GitHub again!**

---

## 📋 Step 1: Create a Free Zoho Mail Account

**Zoho Mail** gives you:
- ✅ Free professional domain email
- ✅ 5 GB email storage
- ✅ Works perfectly with SendGrid
- ✅ No credit card required

### 1.1: Go to Zoho Mail Signup
https://www.zoho.com/mail/

**Click "Get Started Free"**

### 1.2: Choose a Domain
You have two options:

**Option A: Use a Zoho Sub-domain (EASIEST - Recommended for testing)**
```
noreply@yourname.zohomail.com
Example: noreply@cgeip.zohomail.com
```
- ✅ Setup takes 2 minutes
- ✅ No DNS configuration needed
- ✅ Works immediately

**Option B: Use Your Own Domain (BETTER for production)**
```
noreply@yourdomain.com
Example: noreply@cgeip.ls (if you own cgeip.ls)
```
- ⚠️ Requires DNS access
- ⚠️ Takes 24-48 hours to propagate
- ✅ More professional

**→ For now, use Option A (Zoho subdomain) - faster and free**

### 1.3: Create Account
- Email: `your-email@gmail.com`
- Password: Create a strong password
- Organization: `CGEIP`
- Select: **Free Plan**

### 1.4: Create Your Sender Email
In Zoho Mail admin:
1. Go to **Settings** → **Accounts** → **Add Account**
2. Create email: `noreply@yourname.zohomail.com`
   - Or pick any name: `careers`, `support`, `notifications`
   - Example: `notifications@cgeip.zohomail.com`
3. Set a strong password
4. Click **Save**

✅ **Your sender email is now ready!**

---

## 📧 Step 2: Configure SendGrid to Use Zoho Mail

### 2.1: Verify Sender in SendGrid
1. Go to: https://app.sendgrid.com/settings/sender_auth/senders
2. Click **"Create New Sender"**
3. Fill in:
   - **From Email:** `noreply@cgeip.zohomail.com` (your Zoho email)
   - **From Name:** `Career Portal` or `CGEIP`
   - **Reply To:** `noreply@cgeip.zohomail.com`
   - **Company Address:** Your address or institution address
   - **City, State, Zip:** Your location

4. Click **"Create Sender"**

SendGrid will send a **verification email** to your Zoho Mail inbox.

### 2.2: Verify the Email
1. Log in to Zoho Mail: https://mail.zoho.com
2. Open the verification email from SendGrid
3. Click the **verification link**
4. ✅ Sender is now verified in SendGrid!

---

## 🔧 Step 3: Update Your Project Code

### 3.1: Update .env Files

Replace the SENDER_EMAIL with your new Zoho email:

**File: `.env`**
```env
SENDGRID_API_KEY=SG.YOUR_NEW_API_KEY_HERE
SENDER_EMAIL=noreply@cgeip.zohomail.com
```

**File: `server/.env`**
```env
SENDGRID_API_KEY=SG.YOUR_NEW_API_KEY_HERE
SENDER_EMAIL=noreply@cgeip.zohomail.com
```

### 3.2: Keep .env Out of Git

**CRITICAL: Add to `.gitignore`**

Open `.gitignore` and ensure these lines exist:
```
.env
.env.local
.env.*.local
server/.env
server/.env.local
```

Run in terminal:
```powershell
cd c:\Users\chukw\Documents\reactProjects\CGIEP
git rm --cached .env server/.env
git commit -m "Remove .env files from git tracking (security fix)"
git push
```

This prevents API keys from being exposed again.

---

## ✅ Step 4: Test Your Setup

### 4.1: Restart Your Server
```powershell
# Terminal 1: Stop current server (Ctrl+C)
# Then restart:
cd c:\Users\chukw\Documents\reactProjects\CGIEP\server
npm start
```

### 4.2: Send a Test Email
Use Postman or Terminal:

**POST** `http://localhost:3001/auth/send-verification-email`
```json
{
  "email": "your-personal-email@gmail.com",
  "name": "Test User",
  "verificationLink": "http://localhost:3001/verify?token=test123"
}
```

### 4.3: Check Your Gmail Inbox
The email should arrive in your **main inbox**, NOT spam folder!

✅ If email arrives in inbox → **SUCCESS!**
❌ If still in spam → See troubleshooting below

---

## 🔍 Troubleshooting

### Email Still Goes to Spam?

**Check 1: Sender is Verified in SendGrid**
- Go to: https://app.sendgrid.com/settings/sender_auth/senders
- Verify sender has a ✅ checkmark
- If not, click "Verify" and follow the email steps

**Check 2: Using Correct Email in Code**
- Run this in server terminal after restart:
```
Look for: "✅ SendGrid initialized successfully"
Look for: "SENDER_EMAIL=noreply@cgeip.zohomail.com"
```

**Check 3: Clear Email Cache**
- Gmail caches sender reputation
- Test with different email providers:
  - Yahoo Mail
  - Outlook.com
  - Corporate email
- If some work, it's just Gmail's cache

**Check 4: Use Zoho Mail Admin to Monitor**
1. Log in: https://mail.zoho.com
2. Go to **Settings** → **Outbound Mails**
3. Check your email is sending correctly
4. Monitor bounce rates and complaints

### API Key Invalid Error?

If you see: `"401 Unauthorized"` in console:

1. Check you copied the NEW API key correctly
2. Verify it in .env files matches exactly
3. Restart server
4. Try again

---

## 🎯 Next Steps

1. ✅ Create Zoho Mail account (5 minutes)
2. ✅ Create Zoho Mail sender email (2 minutes)
3. ✅ Verify sender in SendGrid (5 minutes)
4. ✅ Update .env files (2 minutes)
5. ✅ Remove .env from git (2 minutes)
6. ✅ Test email delivery (2 minutes)

**Total time: ~20 minutes**

---

## 📊 Comparison: Zoho vs Gmail

| Feature | Gmail | Zoho Mail Free |
|---------|-------|----------------|
| Domain Email | ❌ No | ✅ Yes |
| Deliverability | 🔴 Poor (spam folder) | 🟢 Excellent |
| Professional | ❌ No | ✅ Yes |
| Free | ✅ Yes | ✅ Yes |
| Setup Time | 1 min | 5 min |
| **Recommended** | ❌ No | ✅ YES |

---

## 🚀 After Everything Works

Once emails deliver successfully:

### Option 1: Keep Using Zoho (Simple)
- Free forever
- Professional domain email
- Good for small projects
- ✅ Recommended for your project

### Option 2: Use Custom Domain (Advanced)
- Point your own domain to Zoho
- Example: `noreply@yourdomain.com`
- Requires domain ownership
- Takes 24-48 hours for DNS to propagate

### Option 3: SendGrid Premium (Later)
- If you need advanced features
- Analytics, A/B testing, etc.
- Only do this after basic emails work

---

## 💡 Pro Tips

1. **Monitor Zoho Mail** regularly
   - Check sent emails log
   - Monitor for bounces
   - Address any issues quickly

2. **Use Different Sender Emails for Different Purposes**
   - `noreply@cgeip.zohomail.com` for alerts
   - `support@cgeip.zohomail.com` for support
   - Zoho Mail free tier allows multiple emails

3. **Keep API Key Secure**
   - Never commit .env to git
   - Use environment variables in production
   - Regenerate API keys periodically

4. **Test Before Production**
   - Test with multiple email providers
   - Monitor deliverability rate
   - Adjust as needed

---

## 📞 Support Links

- **Zoho Mail Help**: https://www.zoho.com/mail/help/
- **SendGrid Docs**: https://docs.sendgrid.com/
- **Email Deliverability Guide**: See `EMAIL_DELIVERABILITY_GUIDE.md`

---

## ✨ Summary

Your emails will **stop going to spam** because:

1. ✅ Using a **proper domain email** (not Gmail)
2. ✅ Domain is **verified in SendGrid**
3. ✅ Sending through **SendGrid infrastructure** (trusted by ISPs)
4. ✅ Anti-spam **headers already added** to your code
5. ✅ **No more API key exposure** in git

The combination of a domain email + SendGrid + anti-spam headers = **professional email deliverability** ✅

---

**Ready? Start with Step 1 and let me know when you complete each step!**
