/*
 * Filename: js/utils/helpers.js
 * Description: General formatting utilities.
 */


export const Helpers = {
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-US').format(amount);
    },
    formatDate: (dateObj) => {
        return dateObj.toLocaleDateString('ar-EG');
    }
};

