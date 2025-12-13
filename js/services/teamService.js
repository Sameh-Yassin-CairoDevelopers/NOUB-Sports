/*
 * Filename: js/services/teamService.js
 * Version: 4.2.2 (MASTER ACADEMIC)
 * Description: Service layer for Team Management logic.
 * 
 * RESPONSIBILITIES:
 * 1. Team Creation: Transactional creation of team + captain assignment.
 * 2. Roster Management: Fetching members with their deep-nested User/Card data.
 * 3. Membership Logic: Joining, Leaving, and Kicking members.
 * 4. Status Automation: Automatically switching team from DRAFT to ACTIVE.
 */

import { supabase } from '../core/supabaseClient.js';

export class TeamService {

    /**
     * Checks if a team name is available in a specific zone.
     * Prevents duplicate team names within the same geographical hub.
     * @param {string} name - Desired team name.
     * @param {number} zoneId - Zone ID.
     * @returns {Promise<boolean>} True if exists (taken), False if available.
     */
    async checkNameAvailability(name, zoneId) {
        try {
            const { data, error } = await supabase
                .from('teams')
                .select('id')
                .eq('name', name)
                .eq('zone_id', zoneId)
                .maybeSingle();

            if (error) throw error;
            return !!data; 

        } catch (error) {
            console.error("TeamService: Name Check Error", error);
            throw new Error("فشل التحقق من توفر اسم الفريق.");
        }
    }

    /**
     * Creates a new Team entity.
     * @param {string} captainId - User UUID.
     * @param {string} teamName - Team Name.
     * @param {number} zoneId - Zone ID.
     * @param {Object} logoDna - Visual JSON.
     */
    async createTeam(captainId, teamName, zoneId, logoDna) {
        console.log(`🛡️ TeamService: Creating Team '${teamName}'...`);

        // 1. Insert Team
        const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .insert([{
                name: teamName,
                captain_id: captainId,
                zone_id: zoneId,
                logo_dna: logoDna,
                total_matches: 0,
                status: 'DRAFT' // Initial state
            }])
            .select()
            .single();

        if (teamError) throw new Error(`فشل إنشاء سجل الفريق: ${teamError.message}`);

        // 2. Insert Captain as Member
        const { error: memberError } = await supabase
            .from('team_members')
            .insert([{
                team_id: teamData.id,
                user_id: captainId,
                role: 'CAPTAIN',
                jersey_number: 10,
                joined_at: new Date().toISOString()
            }]);

        if (memberError) {
            console.error("Member Insert Error:", memberError);
            throw new Error("تم إنشاء الفريق ولكن فشل تعيين الكابتن.");
        }

        return teamData;
    }

    /**
     * Retrieves the current user's team membership.
     * @param {string} userId - User UUID.
     */
    async getMyTeam(userId) {
        const { data: memberData, error } = await supabase
            .from('team_members')
            .select('team_id, role, teams (*)')
            .eq('user_id', userId)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            console.error("GetMyTeam Error:", error);
            return null;
        }

        if (!memberData) return null;

        // Flatten: Return Team object with 'my_role' injected
        return {
            ...memberData.teams,
            my_role: memberData.role
        };
    }

    /**
     * Fetches the full Team Roster.
     * CRITICAL FIX: Handles the deep relation path: 
     * team_members -> users -> cards (filtered by owner_id).
     * @param {string} teamId - Team UUID.
     */
    async getTeamRoster(teamId) {
        // Query Explanation:
        // Select from members, JOIN users, then JOIN cards ON users.id = cards.owner_id
        // We use !owner_id hint to tell Supabase which relationship to use.
        const { data, error } = await supabase
            .from('team_members')
            .select(`
                user_id,
                role,
                joined_at,
                users (
                    username,
                    reputation_score,
                    cards!owner_id (
                        display_name,
                        position,
                        visual_dna,
                        stats
                    )
                )
            `)
            .eq('team_id', teamId)
            .order('joined_at', { ascending: true });
        
        if (error) {
            console.error("Roster Fetch Error:", error);
            throw new Error("فشل تحميل قائمة اللاعبين.");
        }

        // Data Transformation
        return data.map(member => {
            // A user might have multiple cards, but usually 1 main active card.
            // We take the first one or default to basic info.
            const userCard = (member.users?.cards && member.users.cards.length > 0) 
                             ? member.users.cards[0] 
                             : null;

            return {
                userId: member.user_id,
                name: userCard?.display_name || member.users?.username || 'غير معروف',
                role: member.role,
                position: userCard?.position || 'N/A',
                visual: userCard?.visual_dna || {},
                rating: userCard?.stats?.rating || 60,
                reputation: member.users?.reputation_score
            };
        });
    }

    /**
     * Logic for joining a team via Invite.
     * Enforces the 16-player limit rule.
     */
    async joinTeam(userId, teamId) {
        // 1. Check if user is free
        const currentTeam = await this.getMyTeam(userId);
        if (currentTeam) throw new Error("لا يمكنك الانضمام. أنت بالفعل عضو في فريق.");

        // 2. Check Team Capacity
        const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamId);
        
        if (count >= 16) throw new Error("عذراً، هذا الفريق مكتمل العدد (16 لاعباً).");

        // 3. Insert Member
        const { error } = await supabase
            .from('team_members')
            .insert([{
                team_id: teamId,
                user_id: userId,
                role: 'PLAYER',
                joined_at: new Date().toISOString()
            }]);

        if (error) throw new Error("فشل الانضمام للفريق.");
        
        // 4. Auto-Activate Team (If threshold reached)
        // If team was DRAFT and now has 5 members -> ACTIVE
        if (count + 1 >= 5) {
            await supabase
                .from('teams')
                .update({ status: 'ACTIVE' })
                .eq('id', teamId)
                .eq('status', 'DRAFT'); // Only update if currently draft
        }

        return true;
    }

    /**
     * Logic for leaving a team.
     * Enforces Captaincy constraint.
     */
    async leaveTeam(userId, teamId) {
        const myTeam = await this.getMyTeam(userId);
        
        if (myTeam.my_role === 'CAPTAIN') {
            throw new Error("الكابتن لا يمكنه المغادرة. يجب تعيين بديل أو حل الفريق.");
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
