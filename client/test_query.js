
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://thvsjqghttadnqzhqskx.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRodnNqcWdodHRhZG5xemhxc2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTA0MTMsImV4cCI6MjA4NTk2NjQxM30.h0iUDwhqBgqDw8s-Kd5MMafkkG0Vl97RSMRAn4iQVoQ'
);

async function run() {
    console.log('Fetching profiles...');
    const { data, error } = await supabase
        .from('profiles')
        .select('*, club:clubs(id, name)');
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success, rows:', data?.length);
        console.log('Sample:', data?.[0]);
    }
}
run();
