/*
 * Filename: js/services/teamService.js
 * Version: 3.3.0 (FIX: Roster Relations)
 */

import { supabase } from '../core/supabaseClient.js';

export class TeamService {

    async checkNameAvailability(name, zoneId) {
        const { data, error } = await supabase
            .from('teams').select('id').eq('name', name).eq('zone_id', zoneId).maybeSingle();
        if (error) throw new Error("فشل التحقق من الاسم");
        return !!data;
    }

    async createTeam(captainId, teamName, zoneId, logoDna) {
        // 1. Create Team
        const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .insert([{
                name: teamName,
                captain_id: captainId,
                zone_id: zoneId,
                logo_dna: logoDna,
                total_matches: 0,
                status: 'DRAFT'
            }])
            .select()
            .single();

        if (teamError) throw new Error(`فشل إنشاء الفريق: ${teamError.message}`);

        // 2. Add Captain
        const { error: memberError } = await supabase
            .from('team_members')
            .insert([{
                team_id: teamData.id,
                user_id: captainId,
                role: 'CAPTAIN',
                jersey_number: 10,
                joined_at: new Date().toISOString()
            }]);

        if (memberError) throw new Error("فشل تعيين الكابتن.");
        return teamData;
    }

    async getMyTeam(userId) {
        const { data: memberData, error } = await supabase
            .from('team_members')
            .select('team_id, role, teams (*)')
            .eq('user_id', userId)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') return null;
        if (!memberData) return null;
        return { ...memberData.teams, my_role: memberData.role };
    }

    // --- FIX IS HERE ---
    async getTeamRoster(teamId) {
        // Correct Path: TeamMembers -> Users -> Cards
        const { data, error } = await supabase
            .from('team_members')
            .select(`
                user_id, role, joined_at,
                users (
                    username, reputation_score,
                    cards ( display_name, position, visual_dna, stats )
                )
            `)
            .eq('team_id', teamId)
            .order('joined_at', { ascending: true });
        
        if (error) {
            console.error("Roster Error:", error);
            throw new Error("فشل تحميل القائمة");
        }

        // Mapping logic updated to handle nested structure
        return data.map(m => {
            // User might have multiple cards, we take the first one (Genesis usually)
            const card = (m.users?.cards && m.users.cards.length > 0) ? m.users.cards[0] : null;
            
            return {
                userId: m.user_id,
                name: card?.display_name || m.users?.username || 'Unknown',
                role: m.role,
                position: card?.position || 'N/A',
                visual: card?.visual_dna || {},
                rating: card?.stats?.rating || 60,
                reputation: m.users?.reputation_score
            };
        });
    }

    async joinTeam(userId, teamId) {
        const currentTeam = await this.getMyTeam(userId);
        if (currentTeam) throw new Error("أنت بالفعل في فريق.");

        const { count } = await supabase
            .from('team_members').select('*', { count: 'exact', head: true }).eq('team_id', teamId);
        
        if (count >= 16) throw new Error("الفريق مكتمل.");

        const { error } = await supabase
            .from('team_members')
            .insert([{ team_id: teamId, user_id: userId, role: 'PLAYER', joined_at: new Date().toISOString() }]);

        if (error) throw new Error("فشل الانضمام.");
        
        if (count + 1 >= 5) {
            await supabase.from('teams').update({ status: 'ACTIVE' }).eq('id', teamId);
        }
        return true;
    }

    async leaveTeam(userId, teamId) {
        const myTeam = await this.getMyTeam(userId);
        if (myTeam.my_role === 'CAPTAIN') throw new Error("الكابتن لا يمكنه المغادرة.");
        
        const { error } = await supabase
            .from('team_members').delete().eq('team_id', teamId).eq('user_id', userId);
            
        if (error) throw new Error("فشل المغادرة.");
        return true;
    }
}
