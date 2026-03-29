import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const buildFallbackReply = (question: string, context: { events?: any[]; clubs?: any[] } = {}) => {
    const lower = question.toLowerCase()
    const events = Array.isArray(context?.events) ? context.events : []
    const clubs = Array.isArray(context?.clubs) ? context.clubs : []

    const visibleEvents = events.filter((event) =>
        ['approved', 'registration_open', 'published', 'open'].includes(String(event?.status || '').toLowerCase())
    )
    const activeClubs = clubs.filter((club) =>
        ['active', 'approved'].includes(String(club?.status || '').toLowerCase())
    )

    if (lower.includes('event')) {
        if (visibleEvents.length > 0) {
            const titles = visibleEvents
                .slice(0, 3)
                .map((event) => event?.title)
                .filter(Boolean)
                .join(', ')
            return `Campus support is currently running in fallback mode. Current event highlights from the platform are: ${titles}. You can open the Events page for full details.`
        }
        return 'Campus support is currently running in fallback mode. I could not find active events in the current context, so please open the Events page for the latest information.'
    }

    if (lower.includes('club')) {
        if (activeClubs.length > 0) {
            const names = activeClubs
                .slice(0, 4)
                .map((club) => club?.name)
                .filter(Boolean)
                .join(', ')
            return `Campus support is currently running in fallback mode. Active clubs visible in the platform include: ${names}. You can open the Clubs page to explore them in detail.`
        }
        return 'Campus support is currently running in fallback mode. I could not find active clubs in the current context, so please open the Clubs page directly.'
    }

    if (lower.includes('register') || lower.includes('registration')) {
        return 'To register for an event, open the Events section, select an approved event with registration open, and use the Register action. If seats are full, the system may place you on the waitlist.'
    }

    if (lower.includes('attendance')) {
        return 'Attendance is recorded by coordinators during or after the event. You can review your attendance records from the dashboard once they are updated.'
    }

    if (lower.includes('certificate')) {
        return 'Certificates become available after the event workflow is completed and certificate generation is run. You can check the Certificates section in your dashboard to download them.'
    }

    if (lower.includes('result') || lower.includes('rank')) {
        return 'Results and rankings appear after coordinators publish them. You can review them from your dashboard results section or the event results page.'
    }

    return 'Campus support is temporarily running in fallback mode. You can still use the Clubs, Events, Registrations, Attendance, Results, and Certificates sections directly while AI replies are limited.'
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { messages, context } = await req.json()
        const latestUserMessage = [...(messages || [])].reverse().find((message) => message?.role === 'user')?.content || ''

        if (!OPENAI_API_KEY) {
            return new Response(JSON.stringify({
                choices: [
                    {
                        message: {
                            role: 'assistant',
                            content: `${buildFallbackReply(latestUserMessage, context)}\n\nNote: live AI replies are unavailable because OPENAI_API_KEY is not configured for the chat assistant.`
                        }
                    }
                ],
                fallback: true,
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // Build the system prompt using Supabase context data
        const systemPrompt = `You are a helpful university AI assistant for NextGen Edutech University.
Current university context:
Events: ${JSON.stringify(context?.events || [])}
Clubs: ${JSON.stringify(context?.clubs || [])}

Use the above real context from our Supabase database to answer the user's questions about clubs, events, or general university queries. If you don't know, suggest they check the dashboard. Keep responses brief, polite, and directly address the user.`

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                max_tokens: 250,
                temperature: 0.7,
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            const upstreamMessage = data?.error?.message || 'OpenAI request failed.'
            return new Response(JSON.stringify({
                choices: [
                    {
                        message: {
                            role: 'assistant',
                            content: `${buildFallbackReply(latestUserMessage, context)}\n\nNote: live AI replies are temporarily unavailable because ${upstreamMessage}`
                        }
                    }
                ],
                fallback: true,
                error: upstreamMessage,
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
