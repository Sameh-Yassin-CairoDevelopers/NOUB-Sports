/*
 * Filename: js/services/teamService.js
 * Version: 3.1.0 (Roster Logic Added)
 * Description: Service layer for Team Management.
 * Handles: Creation, Roster Fetching, Joining, Leaving, and Kicking.
 */

import { supabase } from '../core/supabaseClient.js';

export class TeamService {

    /**
     * Checks name availability in zone.
     */
    async checkNameAvailability(name, zoneId) {
        const { data, error } = await supabase
            .from('teams')
            .select('id')
            .eq('name', name)
            .eq('zone_id', zoneId)
            .maybeSingle();

        if (error) throw new Error("فشل التحقق من الاسم");
        return !!data;
    }

    /**
     * Create Team & Assign Captain.
     */
    async createTeam(captainId, teamName, zoneId, logoDna) {
        console.log(`🛡️ TeamService: Creating Team '${teamName}'...`);

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

    /**
     * Get user's current team.
     */
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

    /**
     * Get Team Roster with Player Details.
     * Joins with 'cards' to get Visual DNA and Stats.
     */
    async getTeamRoster(teamId) {
        // We fetch members and join with their CARD data (where card.owner_id = member.user_id)
        // We assume 1 main card per user for simplicity in this query
        const { data, error } = await supabase
            .from('team_members')
            .select(`
                user_id,
                role,
                joined_at,
                users ( username, reputation_score ),
                cards!inner ( display_name, position, visual_dna, stats )
            `)
            .eq('team_id', teamId)
            .order('joined_at', { ascending: true });
        
        if (error) {
            console.error("Roster Error:", error);
            throw new Error("فشل تحميل القائمة");
        }

        return data.map(m => ({
            userId: m.user_id,
            name: m.cards?.display_name || m.users?.username,
            role: m.role,
            position: m.cards?.position,
            visual: m.cards?.visual_dna,
            rating: m.cards?.stats?.rating || 60,
            reputation: m.users?.reputation_score
        }));
    }

    /**
     * Join an existing team via Invite.
     * Constraints: User not in team, Team < 16 members.
     */
    async joinTeam(userId, teamId) {
        // 1. Check if user is already in a team
        const currentTeam = await this.getMyTeam(userId);
        if (currentTeam) throw new Error("لا يمكنك الانضمام. أنت بالفعل في فريق.");

        // 2. Check Team Capacity
        const { count, error: countError } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamId);
        
        if (count >= 16) throw new Error("هذا الفريق مكتمل (الحد الأقصى 16 لاعباً).");

        // 3. Insert Member
        const { error } = await supabase
            .from('team_members')
            .insert([{
                team_id: teamId,
                user_id: userId,
                role: 'PLAYER', // Default role
                joined_at: new Date().toISOString()
            }]);

        if (error) throw new Error("فشل الانضمام للفريق.");
        
        // 4. Update Team Status if count >= 5
        if (count + 1 >= 5) {
            await supabase.from('teams').update({ status: 'ACTIVE' }).eq('id', teamId);
        }

        return true;
    }

    /**
     * Leave Team (Self-Action).
     * Constraint: Captain cannot leave without handing over badge.
     */
    async leaveTeam(userId, teamId) {
        const myTeam = await this.getMyTeam(userId);
        if (myTeam.my_role === 'CAPTAIN') {
            throw new Error("الكابتن لا يمكنه المغادرة. قم بتعيين بديل أولاً أو حل الفريق.");
        }

        const { error } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', teamId)
            .eq('user_id', userId);

        if (error) throw new Error("فشل الخروج من الفريق.");
        return true;
    }
}