/**
 * Script to clean up duplicate calendar events
 * This script removes duplicate events and keeps only one instance of each unique event
 */

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function cleanupDuplicateEvents() {
  try {
    console.log('Starting cleanup of duplicate calendar events...')
    
    // Get all calendar events
    const { data: events, error: fetchError } = await supabase
      .from('generated_content')
      .select('*')
      .eq('content_type', 'calendar_event')
      .order('created_at', { ascending: true })

    if (fetchError) {
      throw fetchError
    }

    console.log(`Found ${events.length} calendar events`)

    // Group events by user and event signature
    const eventGroups = new Map()
    
    events.forEach(event => {
      const eventData = event.content_data
      const signature = `${event.user_id}-${event.title}-${eventData.start_time}-${eventData.end_time}-${eventData.course_id || 'no-course'}`
      
      if (!eventGroups.has(signature)) {
        eventGroups.set(signature, [])
      }
      eventGroups.get(signature).push(event)
    })

    console.log(`Found ${eventGroups.size} unique event signatures`)

    let duplicatesRemoved = 0
    const eventsToDelete = []

    // For each group, keep the first (oldest) event and mark others for deletion
    for (const [signature, eventGroup] of eventGroups) {
      if (eventGroup.length > 1) {
        console.log(`Found ${eventGroup.length} duplicates for: ${eventGroup[0].title}`)
        
        // Keep the first event (oldest), delete the rest
        const eventsToRemove = eventGroup.slice(1)
        eventsToDelete.push(...eventsToRemove)
        duplicatesRemoved += eventsToRemove.length
      }
    }

    if (eventsToDelete.length === 0) {
      console.log('No duplicate events found!')
      return
    }

    console.log(`Removing ${eventsToDelete.length} duplicate events...`)

    // Delete duplicate events
    const eventIdsToDelete = eventsToDelete.map(event => event.id)
    
    const { error: deleteError } = await supabase
      .from('generated_content')
      .delete()
      .in('id', eventIdsToDelete)

    if (deleteError) {
      throw deleteError
    }

    console.log(`Successfully removed ${duplicatesRemoved} duplicate events!`)
    console.log(`Kept ${events.length - duplicatesRemoved} unique events`)

  } catch (error) {
    console.error('Error cleaning up duplicate events:', error)
    process.exit(1)
  }
}

// Run the cleanup
cleanupDuplicateEvents()
  .then(() => {
    console.log('Cleanup completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Cleanup failed:', error)
    process.exit(1)
  })
