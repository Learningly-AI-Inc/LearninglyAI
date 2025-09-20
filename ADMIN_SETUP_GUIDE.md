# Admin Panel Setup Guide

## 🚀 Environment-Based Admin Authentication

The admin panel now uses environment variables for authentication, making it simple and secure.

## 📋 Setup Instructions

### 1. Environment Variables

Add these variables to your `.env.local` file:

```bash
# Admin Credentials
ADMIN_EMAIL=admin@learningly.com
ADMIN_PASSWORD=learningly

# Your existing Supabase variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Default Credentials

The system comes with these default credentials:
- **Email**: `admin@learningly.com`
- **Password**: `learningly`

### 3. Access the Admin Panel

1. **Go to**: `http://localhost:3000/admin`
2. **You'll be redirected** to `/admin/login` if not authenticated
3. **Enter credentials**:
   - Email: `admin@learningly.com`
   - Password: `learningly`
4. **Click "Sign In"**
5. **You'll be redirected** to the admin dashboard

## 🔧 How It Works

### Authentication Flow
1. **Visit `/admin`** → Redirects to `/admin/login` if not authenticated
2. **Login form** → Validates against environment variables
3. **Success** → Stores session in localStorage and redirects to dashboard
4. **Logout** → Clears session and redirects to login

### Security Features
- ✅ **Environment-based credentials** (not hardcoded)
- ✅ **Client-side session management**
- ✅ **Automatic redirects** for unauthenticated users
- ✅ **Secure logout** functionality

## 🎯 Admin Panel Features

### Dashboard
- **User Statistics**: Total users, new users, active users
- **Content Analytics**: Processed content, AI requests
- **System Health**: Real-time system status
- **Quick Actions**: Common admin tasks

### User Management
- **View all users** with role-based filtering
- **Edit user details** and roles
- **Search and filter** users
- **Bulk operations**

### Analytics
- **User engagement** metrics
- **Content performance** analytics
- **AI usage** statistics
- **System performance** monitoring

## 🔒 Security Notes

1. **Change default credentials** in production
2. **Use strong passwords** for admin accounts
3. **Keep environment variables** secure
4. **Regularly rotate** admin passwords

## 🛠️ Customization

### Change Admin Credentials
Update your `.env.local` file:
```bash
ADMIN_EMAIL=your-admin@domain.com
ADMIN_PASSWORD=your-secure-password
```

### Add Multiple Admins
Currently supports one admin account. For multiple admins, you can:
1. Extend the API to support multiple credentials
2. Integrate with your existing user database
3. Use external authentication providers

## 🚨 Troubleshooting

### Can't Access Admin Panel
1. **Check environment variables** are set correctly
2. **Verify credentials** match exactly
3. **Clear browser localStorage** and try again
4. **Check console** for any errors

### Login Not Working
1. **Verify email/password** are correct
2. **Check API endpoint** is responding
3. **Ensure environment variables** are loaded
4. **Restart development server** if needed

## 📱 Mobile Support

The admin panel is fully responsive and works on:
- ✅ Desktop computers
- ✅ Tablets
- ✅ Mobile phones

## 🎨 UI Components

Built with:
- **shadcn/ui** components
- **Tailwind CSS** styling
- **Lucide React** icons
- **Responsive design** principles

---

## 🎉 You're All Set!

Your admin panel is now ready to use with environment-based authentication. Simply:

1. **Set your environment variables**
2. **Go to** `http://localhost:3000/admin`
3. **Login** with your credentials
4. **Start managing** your Learningly AI platform!

For any issues, check the troubleshooting section above or review the console for error messages.



