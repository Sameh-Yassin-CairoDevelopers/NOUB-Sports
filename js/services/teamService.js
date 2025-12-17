/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/services/teamService.js
 * Version: Noub Sports_beta 0.0.1
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL RESPONSIBILITIES (مسؤوليات الخدمة):
 * -----------------------------------------------------------------------------
 * 1. Team Creation: Transactional insert (Team + Captain Member).
 * 2. Integrity Checks: Name uniqueness, Member limits (Max 16).
 * 3. Roster Management: Complex joins to fetch Members + User Info + Player Card.
 *    * FIX APPLIED: Resolved ambiguous relationship using '!owner_id' hint.
 * 4. Membership Logic: Join via invite (Auto-Active Logic), Leave team.
 * 5. Administrative Actions: Kick member, Promote to Vice Captain.
 * -----------------------------------------------------------------------------
 */

import { supabase } from '../core/supabaseClient.js';

export class TeamService {

    /**
     * [1] CHECK NAME AVAILABILITY
     * Checks if a team name is available in a specific zone.
     * Constraint: Team names must be unique within the same zone.
     * 
     * @param {string} name - Desired team name.
     * @param {number} zoneId - The zone ID to check within.
     * @returns {Promise<boolean>} True if name exists (taken), False if available.
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
            
            // If data exists, name is taken
            return !!data; 

        } catch (error) {
            console.error("TeamService: Name Check Error", error);
            throw new Error("فشل التحقق من توفر اسم الفريق.");
        }
    }

    /**
     * [2] CREATE TEAM
     * Creates a new Team and assigns the creator as Captain.
     * 
     * @param {string} captainId - User UUID.
     * @param {string} teamName - Validated name of the team.
     * @param {number} zoneId - Geographic zone ID.
     * @param {Object} logoDna - JSON object describing the logo colors.
     * @returns {Promise<Object>} - The newly created team object.
     */
    async createTeam(captainId, teamName, zoneId, logoDna) {
        console.log(`🛡️ TeamService: Creating Team '${teamName}'...`);

        // A. Insert the Team Record
        const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .insert([{
                name: teamName,
                captain_id: captainId,
                zone_id: zoneId,
                logo_dna: logoDna,
                total_matches: 0,
                status: 'DRAFT' // Default state until 5 members join
            }])
            .select()
            .single();

        if (teamError) {
            console.error("Team Insert Error:", teamError);
            throw new Error(`فشل إنشاء سجل الفريق: ${teamError.message}`);
        }

        const newTeamId = teamData.id;

        // B. Insert the Captain into Team Members
        const { error: memberError } = await supabase
            .from('team_members')
            .insert([{
                team_id: newTeamId,
                user_id: captainId,
                role: 'CAPTAIN',
                jersey_number: 10, // Default jersey for Captain
                joined_at: new Date().toISOString()
            }]);

        if (memberError) {
            console.error("Member Insert Error:", memberError);
            // Cleanup: Try to delete the orphaned team
            await supabase.from('teams').delete().eq('id', newTeamId);
            throw new Error("تم إنشاء الفريق ولكن فشل تعيين الكابتن. حاول مرة أخرى.");
        }

        return teamData;
    }

    /**
     * [3] GET MY TEAM
     * Retrieves the team associated with a specific user.
     * Used to determine UI state (Dashboard vs Create Form).
     * 
     * @param {string} userId - UUID of the user.
     * @returns {Promise<Object|null>} - Returns Team object with 'my_role' injected, or null.
     */
    async getMyTeam(userId) {
        // Query 'team_members' to find the link
        const { data: memberData, error } = await supabase
            .from('team_members')
            .select('team_id, role, teams (*)') // Inner Join with teams table
            .eq('user_id', userId)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            console.error("GetMyTeam Error:", error);
            return null;
        }

        if (!memberData) return null; // User has no team

        // Flatten the response
        return {
            ...memberData.teams,
            my_role: memberData.role
        };
    }

    /**
     * [4] GET TEAM ROSTER (CRITICAL FIX)
     * Fetches the full list of players in a team.
     * FIX: Uses explicit Foreign Key hints (cards!owner_id) to resolve ambiguous joins.
     * 
     * @param {string} teamId - UUID of the team.
     * @returns {Promise<Array>} - List of mapped member objects.
     */
    async getTeamRoster(teamId) {
        const { data, error } = await supabase
            .from('team_members')
            .select(`
                user_id,
                role,
                jersey_number,
                joined_at,
                users (
                    username,
                    reputation_score
                ),
                cards!owner_id (
                    display_name,
                    position,
                    visual_dna,
                    stats
                )
            `)
            .eq('team_id', teamId)
            .order('joined_at', { ascending: true });
        
        if (error) {
            console.error("Roster Fetch Error:", error);
            throw new Error("فشل تحميل قائمة اللاعبين.");
        }
        
        // Map DB structure to cleaner UI structure
        return data.map(member => {
            // Select the first card found (handling array response from relation)
            let cardInfo = null;
            if (member.cards) {
                 cardInfo = Array.isArray(member.cards) ? member.cards[0] : member.cards;
            }

            return {
                userId: member.user_id,
                name: cardInfo?.display_name || member.users?.username || 'غير معروف',
                role: member.role,
                position: cardInfo?.position || 'N/A',
                rating: cardInfo?.stats?.rating || 60,
                visual: cardInfo?.visual_dna || { skin: 1, kit: 1 },
                joinedAt: member.joined_at,
                reputation: member.users?.reputation_score
            };
        });
    }

    /**
     * [5] JOIN TEAM
     * Join an existing team via Invite.
     * Enforces Capacity Constraint (Max 16).
     * Updates Team Status to ACTIVE if threshold reached (5 members).
     * 
     * @param {string} userId - User UUID.
     * @param {string} teamId - Team UUID.
     */
    async joinTeam(userId, teamId) {
        // 1. Validation: Already in team?
        const currentTeam = await this.getMyTeam(userId);
        if (currentTeam) throw new Error("لا يمكنك الانضمام. أنت بالفعل عضو في فريق.");

        // 2. Validation: Capacity Check
        const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamId);
        
        if (count >= 16) throw new Error("عذراً، هذا الفريق مكتمل العدد (16 لاعباً).");

        // 3. Execute Join
        const { error } = await supabase
            .from('team_members')
            .insert([{
                team_id: teamId,
                user_id: userId,
                role: 'PLAYER',
                joined_at: new Date().toISOString()
            }]);

        if (error) throw new Error("فشل الانضمام للفريق.");
        
        // 4. Auto-Activate Team (If 5 members reached)
        if (count + 1 >= 5) {
            await supabase
                .from('teams')
                .update({ status: 'ACTIVE' })
                .eq('id', teamId)
                .eq('status', 'DRAFT');
        }

        return true;
    }

    /**
     * [6] LEAVE TEAM
     * Leave Team Logic. Enforces Captain Constraint.
     * 
     * @param {string} userId - User UUID.
     * @param {string} teamId - Team UUID.
     */
    async leaveTeam(userId, teamId) {
        // 1. Check Role
        const myTeam = await this.getMyTeam(userId);
        
        if (myTeam.my_role === 'CAPTAIN') {
            throw new Error("الكابتن لا يمكنه المغادرة. يجب تعيين بديل أولاً أو حل الفريق.");
        }

        // 2. Execute Leave
        const { error } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', teamId)
            .eq('user_id', userId);

        if (error) throw new Error("فشل الخروج من الفريق.");
        
        return true;
    }

    /**
     * [7] KICK MEMBER (Admin)
     * Allows Captain to remove a member.
     * 
     * @param {string} captainId - Current Captain ID (Security check).
     * @param {string} teamId - Team UUID.
     * @param {string} memberId - Member UUID to kick.
     */
    async kickMember(captainId, teamId, memberId) {
        // Double check captaincy server-side for security
        const myTeam = await this.getMyTeam(captainId);
        if (myTeam.my_role !== 'CAPTAIN') throw new Error("صلاحيات غير كافية.");

        const { error } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', teamId)
            .eq('user_id', memberId);

        if (error) throw new Error("فشل طرد اللاعب.");
        return true;
    }

    /**
     * [8] PROMOTE MEMBER (Admin)
     * Allows Captain to promote a member to Vice Captain.
     * 
     * @param {string} captainId - Current Captain ID.
     * @param {string} teamId - Team UUID.
     * @param {string} memberId - Member UUID to promote.
     */
    async promoteMember(captainId, teamId, memberId) {
        // 1. Verify Captaincy
        const myTeam = await this.getMyTeam(captainId);
        if (myTeam.my_role !== 'CAPTAIN') throw new Error("صلاحيات غير كافية.");

        // 2. Update DB
        const { error } = await supabase
            .from('team_members')
            .update({ role: 'VICE' })
            .eq('team_id', teamId)
            .eq('user_id', memberId);

        if (error) throw new Error("فشل الترقية.");
        return true;
    }
}
