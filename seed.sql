-- 1. Insert Clubs (No 'category' column as per schema)
INSERT INTO public.clubs (name, description, logo_url)
VALUES
    ('Tech Innovators Club', 'A community for tech enthusiasts to build, learn, and innovate together. We organize hackathons, coding workshops, and tech talks.', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800'),
    ('Creative Arts Society', 'Unleash your creativity with painting, digital art, and design workshops. Join us to explore the artistic side of campus life.', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=2071&auto=format&fit=crop'),
    ('Automation & Smart Systems League', 'Building the future with robotics and high-performance automation systems. Participate in competitions and hands-on projects.', 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=800'),
    ('Debate & Oratory Club', 'Sharpen your public speaking and argumentation skills. We host weekly debates and participate in inter-college tournaments.', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop'),
    ('Eco-Warriors', 'Dedicated to sustainability and environmental awareness. Join our green initiatives and campus clean-up drives.', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=2013&auto=format&fit=crop'),
    ('Music & Jamming Society', 'For musicians and music lovers. Jam sessions, open mics, and concert organizations.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=2070&auto=format&fit=crop')
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Events (Linking to Clubs via Subquery)
INSERT INTO public.events (title, description, date, venue, event_type, status, approval_status, poster_url, max_participants, club_id)
VALUES
    (
        'Annual Hackathon 2026',
        '24-hour coding marathon to solve real-world problems. Great prizes and networking opportunities.',
        NOW() + interval '10 days',
        'Main Auditorium',
        'hackathon',
        'open',
        'approved',
        'https://images.unsplash.com/photo-1504384308090-c54be3855833?q=80&w=2058&auto=format&fit=crop',
        200,
        (SELECT id FROM public.clubs WHERE name = 'Tech Innovators Club')
    ),
    (
        'Smart Workshop: Basics to Advanced',
        'Learn the fundamentals of Smart Systems and Automation in this hands-on workshop.',
        NOW() + interval '5 days',
        'Lab 305',
        'normal', -- Adjusted to match enum if needed, or 'workshop' if enum allows. Schema says: check (event_type in ('normal', 'hackathon')) default 'normal'
        'open',
        'approved',
        'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800',
        50,
        (SELECT id FROM public.clubs WHERE name = 'Automation & Smart Systems League')
    ),
    (
        'Inter-College Debate Championship',
        'Witness the best orators battle it out on trending topics.',
        NOW() + interval '15 days',
        'Conference Hall A',
        'normal',
        'open',
        'approved',
        'https://images.unsplash.com/photo-1475721027767-4d06cdd043e9?q=80&w=2070&auto=format&fit=crop',
        100,
        (SELECT id FROM public.clubs WHERE name = 'Debate & Oratory Club')
    ),
    (
        'Campus Clean-up Drive',
        'Join us to make our campus greener and cleaner. Refreshments provided.',
        NOW() + interval '2 days',
        'Campus Grounds',
        'normal',
        'open',
        'approved',
        'https://images.unsplash.com/photo-1562684759-f5291886331d?q=80&w=2070&auto=format&fit=crop',
        500,
        (SELECT id FROM public.clubs WHERE name = 'Eco-Warriors')
    ),
    (
        'Digital Art Masterclass',
        'Learn digital painting techniques from industry experts.',
        NOW() + interval '20 days',
        'Virtual (Zoom)',
        'normal',
        'open',
        'approved',
        'https://images.unsplash.com/photo-1626785774573-4b799314346d?q=80&w=2070&auto=format&fit=crop',
        100,
        (SELECT id FROM public.clubs WHERE name = 'Creative Arts Society')
    ),
    (
        'Unplugged Night',
        'An evening of acoustic music and performances under the stars.',
        NOW() + interval '12 days',
        'Amphitheater',
        'normal',
        'open',
        'approved',
        'https://images.unsplash.com/photo-1501612780327-45045538702b?q=80&w=2070&auto=format&fit=crop',
        300,
        (SELECT id FROM public.clubs WHERE name = 'Music & Jamming Society')
    );
