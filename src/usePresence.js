import { useEffect } from 'react';
import { supabase } from './supabaseClient'; // Adjust path

export function usePresence(userId) {
    useEffect(() => {
        if (!userId) return;

        // Initialize the presence channel
        const channel = supabase.channel('online-users', {
            config: { presence: { key: userId } },
        });

        // Subscribe and track the user
        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            console.log("Current online users:", state);
            // Optional: Dispatch state to a global store (Zustand/Redux) if needed
        }).subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    online_at: new Date().toISOString(),
                    user_id: userId
                });
            }
        });

        // CRITICAL: Handle browser close (Incognito or normal)
        const handleBeforeUnload = () => {
            channel.untrack();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        // CRITICAL: Cleanup on component unmount
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            channel.untrack();
            supabase.removeChannel(channel);
        };
    }, [userId]); // Re-run only if the userId changes
}