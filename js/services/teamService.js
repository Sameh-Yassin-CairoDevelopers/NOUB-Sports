/*
 * Filename: js/services/teamService.js
 * Version: 6.0.0 (FINAL PRODUCTION)
 * Description: Service layer for Team Management.
 * 
 * RESPONSIBILITIES:
 * 1. Team Creation: Transactional insert of Team + Captain Member.
 * 2. Roster Management: Fetching members with nested User/Card data.
 * 3. Membership Logic: Joining via Invite, Leaving, and Kicking.
 * 4. Role Management: Promoting members to Vice Captain.
 * 
 * DEPENDENCIES:
 * - Supabase Client (Singleton)
 */

import { supabase } from '../core/supabaseClient.js';

export class TeamService {

    /**
     * Checks if a team name is available in a specific zone.
     * Constraint: Team names must be unique within the same zone.
     * 
     * @param {string} name - Desired team name.
     * @param {number} zoneId - The zone ID.
     * @returns {Promise<boolean>} True if name exists (taken).
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
     * Creates a new Team and assigns the creator as Captain.
     * 
     * @param {string} captainId - User UUID.
     * @param {string} teamName - Team Name.
     * @param {number} zoneId - Zone ID.
     * @param {Object} logoDna - JSON for logo colors.
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
                status: 'DRAFT'
            }])
            .select()
            .single();

        if (teamError) {
            console.error("Team Insert Error:", teamError);
            throw new Error(`فشل إنشاء سجل الفريق: ${teamError.message}`);
        }

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
            // Cleanup: Try to delete the orphaned team (Best effort)
            await supabase.from('teams').delete().eq('id', teamData.id);
            throw new Error("فشل تعيين الكابتن. حاول مرة أخرى.");
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

        // Flatten response
        return {
            ...memberData.teams,
            my_role: memberData.role
        };
    }

    /**
     * Fetches the full Team Roster with Player Details.
     * Uses explicit Foreign Key hints to avoid Ambiguous Relationship errors.
     * 
     * @param {string} teamId - Team UUID.
     */
    async getTeamRoster(teamId) {
        // Query: Select members, join users, join cards (via owner_id)
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
        
        // Map to UI Structure
        return data.map(member => {
            // Cards relation returns an array (usually 1 item)
            // We find the GENESIS card or take the first one
            let cardInfo = null;
            if (member.users?.cards && Array.isArray(member.users.cards)) {
                cardInfo = member.users.cards[0]; 
            } else if (member.cards) {
                // If Supabase flattened it differently based on version
                 cardInfo = Array.isArray(member.cards) ? member.cards[0] : member.cards;
            }

            return {
                userId: member.user_id,
                name: cardInfo?.display_name || member.users?.username || 'غير معروف',
                role: member.role,
                position: cardInfo?.position || 'N/A',
                rating: cardInfo?.stats?.rating || 60,
                visual: cardInfo?.visual_dna || {},
                joinedAt: member.joined_at,
                reputation: member.users?.reputation_score
            };
        });
    }

    /**
     * Join Team via Invite.
     * Validates capacity (Max 16).
     */
    async joinTeam(userId, teamId) {
        // 1. Validation
        const currentTeam = await this.getMyTeam(userId);
        if (currentTeam) throw new Error("أنت بالفعل عضو في فريق.");

        const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamId);
        
        if (count >= 16) throw new Error("الفريق مكتمل العدد.");

        // 2. Insert
        const { error } = await supabase
            .from('team_members')
            .insert([{
                team_id: teamId,
                user_id: userId,
                role: 'PLAYER',
                joined_at: new Date().toISOString()
            }]);

        if (error) throw new Error("فشل الانضمام.");
        
        // 3. Auto-Activate Logic
        if (count + 1 >= 5) {
            await supabase.from('teams').update({ status: 'ACTIVE' }).eq('id', teamId).eq('status', 'DRAFT');
        }

        return true;
    }

    /**
     * Leave Team.
     */
    async leaveTeam(userId, teamId) {
        const myTeam = await this.getMyTeam(userId);
        if (myTeam.my_role === 'CAPTAIN') {
            throw new Error("الكابتن لا يمكنه المغادرة. عين بديلاً أولاً.");
        }

        const { error } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', teamId)
            .eq('user_id', userId);

        if (error) throw new Error("فشل الخروج.");
        return true;
    }

    /**
     * Kick Member (Captain Only).
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
     * Promote Member (Captain Only).
     */
    async promoteMember(captainId, teamId, memberId) {
        const myTeam = await this.getMyTeam(captainId);
        if (myTeam.my_role !== 'CAPTAIN') throw new Error("صلاحيات غير كافية.");

        const { error } = await supabase
            .from('team_members')
            .update({ role: 'VICE' })
            .eq('team_id', teamId)
            .eq('user_id', memberId);

        if (error) throw new Error("فشل الترقية.");
        return true;
    }
}
