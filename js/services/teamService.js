/*
 * Filename: js/services/teamService.js
 * Version: 3.2.0 (FIX: Creation Error)
 */

import { supabase } from '../core/supabaseClient.js';

export class TeamService {

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

    async createTeam(captainId, teamName, zoneId, logoDna) {
        console.log(`🛡️ TeamService: Creating Team '${teamName}'...`);

        // FIX: Ensure logoDna is a valid JSON object (it usually is, but let's be safe)
        // Also ensure status is uppercase 'DRAFT'
        
        const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .insert([{
                name: teamName,
                captain_id: captainId,
                zone_id: zoneId,
                logo_dna: logoDna, // Supabase handles Object -> JSONB auto-conversion
                total_matches: 0,
                status: 'DRAFT'
            }])
            .select()
            .single();

        if (teamError) {
            console.error("Team Insert Error:", teamError);
            throw new Error(`فشل إنشاء الفريق: ${teamError.message}`);
        }

        const newTeamId = teamData.id;

        const { error: memberError } = await supabase
            .from('team_members')
            .insert([{
                team_id: newTeamId,
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

    // ... (باقي الدوال getMyTeam, getTeamRoster, joinTeam, leaveTeam كما هي في النسخة 3.1.0) ...
    // يرجى نسخ الدوال المتبقية من الملف السابق لضمان الاكتمال
    // (سأضعها لك هنا لعدم التشتت)

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

    async getTeamRoster(teamId) {
        // FIX: Explicit Join here too if needed, but usually works if unique FK
        // But for safety:
        const { data, error } = await supabase
            .from('team_members')
            .select(`
                user_id, role, joined_at,
                users ( username, reputation_score ),
                cards ( display_name, position, visual_dna, stats )
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

    async joinTeam(userId, teamId) {
        const currentTeam = await this.getMyTeam(userId);
        if (currentTeam) throw new Error("لا يمكنك الانضمام. أنت بالفعل في فريق.");

        const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamId);
        
        if (count >= 16) throw new Error("هذا الفريق مكتمل (الحد الأقصى 16).");

        const { error } = await supabase
            .from('team_members')
            .insert([{
                team_id: teamId,
                user_id: userId,
                role: 'PLAYER',
                joined_at: new Date().toISOString()
            }]);

        if (error) throw new Error("فشل الانضمام للفريق.");
        
        if (count + 1 >= 5) {
            await supabase.from('teams').update({ status: 'ACTIVE' }).eq('id', teamId);
        }
        return true;
    }

    async leaveTeam(userId, teamId) {
        const myTeam = await this.getMyTeam(userId);
        if (myTeam.my_role === 'CAPTAIN') {
            throw new Error("الكابتن لا يمكنه المغادرة. قم بتعيين بديل أولاً.");
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
