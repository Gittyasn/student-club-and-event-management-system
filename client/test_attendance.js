
import { createClient } from '@supabase/supabase-js';
const url = "https://thvsjqghttadnqzhqskx.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRodnNqcWdodHRhZG5xemhxc2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTA0MTMsImV4cCI6MjA4NTk2NjQxM30.h0iUDwhqBgqDw8s-Kd5MMafkkG0Vl97RSMRAn4iQVoQ";
const supabase = createClient(url, key);

async function check() {
    console.log("Checking attendance_records table...");
    const { data, error } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true });
    if (error) {
        console.error("Table attendance_records error:", error.message);
    } else {
        console.log("Table attendance_records exists. Count:", data);
    }
}

check();
