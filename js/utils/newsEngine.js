/*
 * Project: NOUB SPORTS ECOSYSTEM
 * Filename: js/utils/newsEngine.js
 * Version: Noub Sports_beta 0.0.2 (PRESS ENGINE)
 * Status: Production Ready
 * 
 * -----------------------------------------------------------------------------
 * ARCHITECTURAL OVERVIEW:
 * -----------------------------------------------------------------------------
 * This utility acts as an "Automated Sports Journalist".
 * It analyzes raw match data (Scores, Teams) and generates narrative content.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Scenario Detection: Analyzes the score difference to categorize the match
 *    (e.g., Thrashing, Tight Win, Draw, Defensive Battle).
 * 2. Headline Generation: Selects a dynamic, exciting title for the match card.
 * 3. Report Generation: Creates a short summary text for the details view.
 * 
 * INPUT: Match Object { score_a, score_b, team_a_name, team_b_name }
 * OUTPUT: News Object { headline, body, mood }
 * -----------------------------------------------------------------------------
 */

export class NewsEngine {

    /**
     * Main Entry Point: Generates a full press report from match stats.
     * @param {string} teamA - Name of Home Team.
     * @param {string} teamB - Name of Away Team.
     * @param {number} scoreA - Score of Home Team.
     * @param {number} scoreB - Score of Away Team.
     * @returns {Object} { headline: string, body: string, mood: string }
     */
    static generateReport(teamA, teamB, scoreA, scoreB) {
        // 1. Calculate Metrics
        const diff = Math.abs(scoreA - scoreB);
        const totalGoals = scoreA + scoreB;
        const winner = scoreA > scoreB ? teamA : (scoreB > scoreA ? teamB : null);
        const loser = scoreA > scoreB ? teamB : (scoreB > scoreA ? teamA : null);

        // 2. Determine Scenario & Generate Content
        if (scoreA === scoreB) {
            return this._handleDraw(teamA, teamB, scoreA);
        } else if (diff >= 3) {
            return this._handleThrashing(winner, loser, scoreA, scoreB);
        } else if (diff === 1 && totalGoals > 5) {
            return this._handleThriller(winner, loser, scoreA, scoreB);
        } else if (scoreB > scoreA && scoreA === 0) {
            return this._handleCleanSheetWin(winner, loser, scoreB); // Away clean sheet
        } else if (scoreA > scoreB && scoreB === 0) {
            return this._handleCleanSheetWin(winner, loser, scoreA); // Home clean sheet
        } else {
            return this._handleStandardWin(winner, loser, scoreA, scoreB);
        }
    }

    /* =========================================================================
       INTERNAL SCENARIO HANDLERS (Private Logic)
       ========================================================================= */

    /**
     * Scenario: Draw (Tie)
     */
    static _handleDraw(teamA, teamB, score) {
        if (score === 0) {
            // Boring 0-0
            return {
                headline: "شباك نظيفة وتعادل تكتيكي",
                body: `سيطر الحذر على لقاء ${teamA} و ${teamB}، حيث فشل المهاجمون في فك شفرة الدفاعات لتنتهي المباراة بلا أهداف.`,
                mood: 'NEUTRAL'
            };
        } else if (score >= 3) {
            // Exciting 3-3+
            return {
                headline: "مهرجان أهداف ينتهي حبايب!",
                body: `مباراة مجنونة شهدت ${score * 2} هدفاً! تبادل ${teamA} و ${teamB} اللكمات الهجومية طوال المباراة ولم يستطع أحدهما حسم النتيجة.`,
                mood: 'EXCITING'
            };
        } else {
            // Standard Draw
            return {
                headline: "التعادل يحسم ديربي المنطقة",
                body: `نقطة لكل فريق بعد مباراة متكافئة بين ${teamA} و ${teamB}.`,
                mood: 'NEUTRAL'
            };
        }
    }

    /**
     * Scenario: Thrashing (Diff >= 3)
     * e.g. 5-0, 6-1
     */
    static _handleThrashing(winner, loser, sA, sB) {
        return {
            headline: `طوفان ${winner} يغرق ${loser}!`,
            body: `في ليلة للتاريخ، فرض فريق ${winner} سيطرته المطلقة واكتسح خصمه ${loser} بنتيجة ثقيلة قوامها ${Math.max(sA, sB)} أهداف.`,
            mood: 'DOMINANT'
        };
    }

    /**
     * Scenario: Thriller (Diff = 1, High Score)
     * e.g. 4-3, 5-4
     */
    static _handleThriller(winner, loser, sA, sB) {
        return {
            headline: "موقعة تكسير عظام حتى الدقيقة الأخيرة!",
            body: `خطف ${winner} فوزاً درامياً من أنياب ${loser} في مباراة حبست الأنفاس وشهدت غزارة تهديفية متبادلة.`,
            mood: 'INTENSE'
        };
    }

    /**
     * Scenario: Clean Sheet Win
     * e.g. 2-0, 3-0
     */
    static _handleCleanSheetWin(winner, loser, winnerScore) {
        return {
            headline: `${winner} يغلق مرماه ويخطف الثلاث نقاط`,
            body: `بأداء دفاعي صلب وفاعلية هجومية، نجح ${winner} في إسقاط ${loser} بنتيجة ${winnerScore} مقابل لا شيء.`,
            mood: 'SOLID'
        };
    }

    /**
     * Scenario: Standard Win
     * e.g. 2-1, 3-1
     */
    static _handleStandardWin(winner, loser, sA, sB) {
        return {
            headline: `${winner} يفرض كلمته على ${loser}`,
            body: `حقق فريق ${winner} انتصاراً مستحقاً على ${loser} وحصد نقاط المباراة كاملة بعد أداء قوي.`,
            mood: 'POSITIVE'
        };
    }
}