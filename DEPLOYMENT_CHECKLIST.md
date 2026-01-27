# 🚀 Quick Deployment Checklist for Hostinger

## Before Deployment
- [ ] Test application locally: `npm start`
- [ ] Verify all dependencies in package.json
- [ ] Ensure data directory exists with proper structure
- [ ] Set strong admin password after first login

## Files to Upload
✅ Upload ALL files except:
- ❌ node_modules/ (install on server)
- ❌ .env (configure on Hostinger)
- ❌ data/*.json (will be created automatically)

## On Hostinger Control Panel

### 1. Create Node.js Application
- Go to: **Advanced** → **Node.js**
- Click **Create Application**
- Set **Startup File**: `server.js`
- Set **Application Root**: `/public_html` or your domain folder
- Choose **Node.js version**: Latest LTS (v18.x or v20.x)

### 2. Configure Environment
Add these environment variables in Node.js manager:
- `NODE_ENV` = `production`
- `PORT` = (auto-detected by Hostinger, usually 3000)

### 3. Upload Files via SSH or SFTP
```bash
# Via SSH
ssh your-username@your-server
cd public_html
# Upload your files here
```

### 4. Install Dependencies
```bash
npm install --production
```

### 5. Set Permissions
```bash
chmod -R 755 data
```

### 6. Start Application
- Return to Hostinger Node.js Manager
- Click **Start Application**

## After Deployment

### Verify Everything Works
- [ ] Visit your domain - main page loads
- [ ] Test form submission
- [ ] Access admin panel: `yourdomain.com/admin`
- [ ] Login with: admin@acelab.com / admin123
- [ ] **CHANGE ADMIN PASSWORD IMMEDIATELY**
- [ ] Test viewing submissions
- [ ] Test CSV export
- [ ] Test trash/restore functions

### Security Steps
- [ ] Change admin credentials from defaults
- [ ] Enable HTTPS/SSL in Hostinger
- [ ] Verify data directory is not publicly accessible
- [ ] Test backup creation

## Troubleshooting

**App won't start?**
- Check logs in Hostinger Node.js Manager
- Ensure npm install completed successfully
- Verify server.js exists and has no syntax errors

**502 Bad Gateway?**
- Application likely crashed - check logs
- Restart application in Node.js Manager

**Data not saving?**
- Check data/ directory permissions: `chmod -R 755 data`
- Ensure data files are writable: `chmod 666 data/*.json`

## Support Resources
- 📖 Full guide: See DEPLOYMENT_GUIDE.md  
- 💬 Hostinger Support: 24/7 live chat in control panel
- 📧 Your hosting email for technical support

## Quick Commands Reference

```bash
# SSH Connection
ssh username@server-address

# Navigate to app
cd domains/yourdomain.com/public_html

# Install dependencies
npm install --production

# Check if app runs manually
node server.js

# View running processes
ps aux | grep node

# Check permissions
ls -la data/

# Fix permissions
chmod -R 755 data
chmod 666 data/submissions.json data/admin.json
```

---

**🎉 Once deployed, your site will be live!**

Main Site: `https://yourdomain.com`  
Admin Panel: `https://yourdomain.com/admin`

**Don't forget to change the default admin password!**
