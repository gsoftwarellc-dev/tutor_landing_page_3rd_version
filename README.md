# ACE Lab Landing Page - README

A submission form application for ACE Lab with admin dashboard.

## 🚀 Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start
```

Visit `http://localhost:3000` to see the application.

## 📁 Project Structure

```
Landing/
├── server.js           # Main Express server
├── package.json        # Dependencies and scripts
├── nodemon.json        # Nodemon configuration
├── public/            # Static files
│   ├── index.html     # Main landing page
│   ├── admin.html     # Admin dashboard
│   ├── view.html      # Submission detail view
│   ├── style.css      # Main styles
│   ├── script.js      # Frontend logic
│   └── logo.png       # Logo image
└── data/              # Data storage
    ├── submissions.json   # Form submissions
    ├── admin.json        # Admin credentials
    └── backups/          # Auto backups
```

## 🌐 Deployment to Hostinger

See **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** for quick steps.

For detailed instructions, see the full deployment guide in the artifacts folder.

### Quick Steps:
1. Upload files to Hostinger (exclude node_modules)
2. Configure Node.js app in Hostinger control panel
3. Set startup file to `server.js`
4. Run `npm install --production` via SSH
5. Start application in Node.js Manager

## 🔐 Admin Access

Default credentials (⚠️ CHANGE IMMEDIATELY):
- Email: `admin@acelab.com`
- Password: `admin123`

Access admin panel at: `/admin`

## 🛠️ Features

### Frontend
- Clean, responsive submission form
- Multiple subject selection
- Form validation
- Success/error notifications

### Admin Dashboard
- View all submissions
- Search and filter
- Trash/restore submissions
- Export to CSV
- Automatic backups (keeps last 30)
- Password change functionality

## 📝 API Endpoints

### Public
- `POST /submit` - Submit form

### Admin (requires authentication)
- `POST /admin/login` - Admin login
- `GET /admin/submissions` - List submissions
- `GET /admin/submissions/:id` - Get single submission
- `DELETE /admin/submissions/:id` - Trash submission
- `POST /admin/submissions/:id/restore` - Restore submission
- `DELETE /admin/submissions/:id/permanent` - Permanently delete
- `GET /admin/export` - Export CSV
- `POST /admin/backup` - Create backup
- `POST /admin/change-password` - Change admin password

## 🔒 Security Notes

1. Change default admin credentials immediately
2. Use HTTPS in production (free SSL on Hostinger)
3. Keep data/ directory protected (not web-accessible)
4. Regular backups are automatic (last 30 kept)

## 📦 Dependencies

- **express** - Web framework
- **cors** - CORS middleware
- **body-parser** - Request body parsing
- **uuid** - Unique ID generation

## 🐛 Troubleshooting

**Port already in use?**
```bash
# Change PORT in environment or package.json
PORT=4000 npm start
```

**Data not saving?**
```bash
# Check/fix permissions
chmod -R 755 data
```

**Cannot access admin?**
- Try accessing `/admin.html` directly
- Check console for JavaScript errors

## 📞 Support

For deployment issues, contact Hostinger support or check their Node.js documentation.

## 📄 License

ISC
