# User Synchronization System

This system automatically keeps your database `users` table in sync with Supabase Auth users. When you manually remove users from the Supabase Auth dashboard, this system will automatically detect and remove the corresponding records from your database.

## Features

- **Automatic Sync**: Automatically syncs users every 24 hours for admin users
- **Manual Sync**: Admin interface to manually trigger sync operations
- **Dry Run**: Preview changes before applying them
- **Real-time Stats**: View sync statistics and pending changes
- **Error Handling**: Comprehensive error reporting and logging
- **Script Support**: Command-line script for manual operations

## Components

### 1. User Sync Service (`lib/user-sync-service.ts`)
Core service that handles the synchronization logic:
- Fetches users from Supabase Auth
- Fetches users from database
- Compares and identifies differences
- Performs add/update/remove operations
- Returns detailed statistics

### 2. API Endpoint (`app/api/admin/sync-users/route.ts`)
REST API for triggering sync operations:
- `GET /api/admin/sync-users` - Get sync statistics
- `POST /api/admin/sync-users` - Perform sync (with optional dry-run)

### 3. Admin Interface (`components/admin/user-sync-panel.tsx`)
React component for the admin dashboard:
- View current sync status
- Trigger manual sync operations
- Preview changes with dry run
- View detailed statistics and errors

### 4. Auto Sync Service (`lib/auto-sync-service.ts`)
Handles automatic synchronization:
- 24-hour sync interval
- Minimum 1-hour cooldown
- Force sync capability
- Sync status tracking

### 5. Server Auto Sync (`components/admin/server-auto-sync.tsx`)
Server-side component for automatic synchronization:
- Runs on admin page load
- Server-side sync execution
- No client-side dependencies

### 6. Command Line Script (`scripts/sync-users.js`)
Node.js script for manual operations:
- Can be run from command line
- Supports dry-run mode
- Detailed logging and error reporting

## Setup Instructions

### 1. Environment Variables
Ensure you have the required environment variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Required for admin operations
```

### 2. Database Permissions
The service role key needs the following permissions:
- Read access to `auth.users` table
- Full access to `public.users` table
- Admin access to Supabase Auth

### 3. Admin Access
Only users with `role = 'admin'` in the `users` table can:
- Access the sync interface
- Trigger manual sync operations
- View sync statistics

## Usage

### Admin Dashboard
1. Navigate to `/admin`
2. Go to the "System Health" tab
3. Use the "User Synchronization" panel to:
   - View current sync status
   - Refresh statistics
   - Run dry-run to preview changes
   - Perform actual sync

### Command Line
```bash
# Dry run (preview changes without applying)
node scripts/sync-users.js --dry-run

# Actual sync
node scripts/sync-users.js
```

### API Usage
```javascript
// Get sync statistics
const stats = await fetch('/api/admin/sync-users').then(r => r.json())

// Perform dry run
const dryRun = await fetch('/api/admin/sync-users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ dryRun: true })
}).then(r => r.json())

// Perform actual sync
const sync = await fetch('/api/admin/sync-users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ dryRun: false })
}).then(r => r.json())
```

## How It Works

### Sync Process
1. **Fetch Users**: Retrieves all users from both Supabase Auth and database
2. **Compare**: Identifies differences between the two sources
3. **Add**: Creates new database records for Auth users not in database
4. **Update**: Updates existing database records with latest Auth data
5. **Remove**: Deletes database records for users no longer in Auth
6. **Report**: Returns detailed statistics and any errors

### Automatic Sync
- Triggers every 24 hours when admin page is loaded
- Minimum 1-hour cooldown between syncs
- Runs server-side for better performance
- Logs all operations to console

### Error Handling
- Continues processing even if individual operations fail
- Collects and reports all errors
- Provides detailed error messages
- Maintains data integrity

## Monitoring

### Console Logs
All sync operations are logged to the console with emojis for easy identification:
- 🔄 Starting sync process
- ✅ Successful operations
- ❌ Errors and failures
- 📊 Statistics and summaries

### Admin Interface
The admin panel provides:
- Real-time sync status
- Pending changes preview
- Last sync results
- Error details

### Statistics
Track these metrics:
- Total Auth users
- Total database users
- Users to add/update/remove
- Sync success/failure rates
- Error counts

## Troubleshooting

### Common Issues

1. **Permission Errors**
   - Ensure service role key has admin access
   - Check database RLS policies
   - Verify user has admin role

2. **Sync Not Running**
   - Check if user is admin
   - Verify environment variables
   - Check console for errors

3. **Users Not Syncing**
   - Check Auth user metadata
   - Verify email addresses
   - Check for duplicate usernames

### Debug Mode
Enable detailed logging by checking browser console and server logs during sync operations.

## Security Considerations

- Only admin users can trigger sync operations
- Service role key should be kept secure
- All operations are logged for audit trails
- Dry-run mode prevents accidental changes

## Future Enhancements

- Webhook-based real-time sync
- Batch processing for large user bases
- Custom sync rules and filters
- Integration with external user management systems
- Advanced error recovery mechanisms
